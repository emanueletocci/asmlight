import { describeLinkmap } from "../docs/linkmap";
import { describeLinker } from "../docs/linker";
import type { Language, Parser, TokenKind } from "../tokenizer/types";

/**
 * GNU ld map files (`-Map=output.map`): what the linker actually did.
 *
 * Token kinds, chosen so each element has its own color and hover card:
 *   section headings ("Memory Configuration", …)  keyword
 *   column titles ("Name  Origin  Length")         comment
 *   memory region / output section (column 0)      label
 *   input section (indented, first on its line)    property
 *   region attributes ("xr", "rw !x")              property
 *   addresses and sizes                            number
 *   object files and archives                      string
 *   symbol after an address                        variable
 *   linker-script lines echoed into the map        keyword / function / directive (input patterns)
 */

/** Headings that start a part of the map file; matched on the whole trimmed line. */
export const HEADINGS = [
  "Archive member included to satisfy reference by file (symbol)",
  "Allocating common symbols",
  "Discarded input sections",
  "Memory Configuration",
  "Linker script and memory map",
  "Cross Reference Table",
];

const COLUMN_TITLES = /^\s*(?:Name\s+Origin\s+Length(?:\s+Attributes)?|Common symbol\s+size\s+file|Symbol\s+File)\s*$/;
const NUMBER = /^0x[0-9a-f]+\b/i;
const FILE = /^[\w.+\-/\\~]*[/\\]?[\w.+-]+\.(?:o|obj|a|lib|ld|lds|elf|axf|so)(?:\([^)\s]*\))?(?=\s|$)/i;
const SPECIAL = /^(?:\*fill\*|\*default\*|\[!provide\]|load address)/;

type Mode = "memory" | "map" | "other";

interface MapState {
  mode: Mode;
  /** What the first token of the current line was. */
  first: "none" | "number" | "word";
  /** The symbol of an address line (`0x48  Reset_Handler`) has been seen. */
  named: boolean;
}

const isAttributes = (w: string) => /^!?[rwxailRWXAIL]+$/.test(w);

export function makeLinkmapParser(): Parser<MapState> {
  return {
    startState: () => ({ mode: "other", first: "none", named: false }),
    copyState: (s) => ({ ...s }),
    token(stream, s): TokenKind | null {
      if (stream.sol()) {
        s.first = "none";
        s.named = false;
        const line = stream.string.trim();
        if (HEADINGS.includes(line)) {
          s.mode = line === "Memory Configuration" ? "memory" : line === "Linker script and memory map" ? "map" : "other";
          stream.skipToEnd();
          return "keyword";
        }
        if (COLUMN_TITLES.test(stream.string)) { stream.skipToEnd(); return "comment"; }
      }
      const atLineStart = s.first === "none";
      const indented = stream.string.length > 0 && /^\s/.test(stream.string);
      if (stream.eatSpace()) return null;

      if (stream.match(SPECIAL)) {
        if (atLineStart) s.first = "word";
        return "keyword";
      }
      if (stream.match(NUMBER)) {
        if (atLineStart) s.first = "number";
        return "number";
      }
      if (stream.match(FILE)) return "string";

      // Linker-script lines echoed into the map: input patterns such as *(.text*) or KEEP (*(.vec))
      if (stream.match(/^\*\([^)]*\)?\)?/)) return "directive";

      if (stream.match(/^[A-Za-z_.$][\w.$]*/)) {
        const word = stream.current();
        if (atLineStart) {
          s.first = "word";
          if (s.mode === "memory") return "label";                       // region name
          if (word === "LOAD" || word === "OUTPUT" || word === "START" || word === "END") return "keyword";
          return indented ? "property" : "label";                        // input / output section
        }
        if (s.mode === "memory" && isAttributes(word)) return "property";
        if (describeLinker(word, "keyword")) return "keyword";           // GROUP, KEEP, PROVIDE, …
        if (describeLinker(word, "function")) return "function";         // ALIGN, ORIGIN, LOADADDR, …
        if (word === ".") return "variable";                             // the location counter
        if (s.first === "number" && !s.named) {                          // the symbol after an address
          s.named = true;
          return "variable";
        }
        return null;
      }
      if (s.mode === "memory" && stream.match(/^!?[rwxailRWXAIL]+(?=\s|$)/)) return "property";
      if (stream.match(/^(?:<<|>>|[-+*/&|])?=(?!=)/)) return "operator";
      stream.next();
      return null;
    },
  };
}

export const LINKMAP: Language = {
  id: "linkmap",
  name: "Linker map file",
  aliases: ["map", "mapfile", "ldmap", "link-map"],
  makeParser: makeLinkmapParser,
  describe: describeLinkmap,
};
