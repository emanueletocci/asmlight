import { describeLinker } from "./linker";
import type { HoverDoc, TokenKind } from "../tokenizer/types";

const TAG = "Linker map file";

const HEADINGS: Record<string, string> = {
  "Archive member included to satisfy reference by file (symbol)":
    "Which archive members (.o files inside a .a library) the linker pulled in, and which file and symbol needed each one",
  "Allocating common symbols": "Common symbols (uninitialised globals in the COMMON pool) and the size given to each",
  "Discarded input sections":
    "Input sections that are not in the image: removed by --gc-sections or /DISCARD/. A section you expected here was never referenced, and was not protected by KEEP",
  "Memory Configuration": "The MEMORY regions of the linker script: name, start (Origin), size (Length) and attributes",
  "Linker script and memory map":
    "Every output section with its address and size, the input sections inside it with their object file, and the final address of each symbol",
  "Cross Reference Table": "For each symbol, the file that defines it and the files that use it (--cref)",
};

const SPECIAL: Record<string, HoverDoc> = {
  "*fill*": { title: "*fill*", tag: TAG, summary: "Padding bytes inserted by the linker, usually to satisfy an alignment (ALIGN) between input sections" },
  "*default*": { title: "*default*", tag: TAG, summary: "Implicit region covering the whole address space; used for sections not assigned to a MEMORY region" },
  "[!provide]": { title: "[!provide]", tag: TAG, summary: "A PROVIDE(sym = …) that was not used: nothing referenced the symbol, so the linker did not define it" },
  "load address": {
    title: "load address", tag: TAG,
    summary: "The section's LMA, where its bytes are stored in the image, when it differs from the run address (VMA) on the same line. Typical for .data: runs in RAM, stored in Flash, copied by the startup code",
  },
  LOAD: { title: "LOAD", tag: TAG, summary: "An input file passed to the linker, in command-line order" },
  OUTPUT: { title: "OUTPUT", tag: TAG, summary: "The output file and its BFD format", syntax: "OUTPUT(build/firmware.axf elf32-littlearm)" },
  START: { title: "START GROUP", tag: TAG, summary: "Start of a group of archives searched repeatedly until no new undefined symbols are resolved" },
  END: { title: "END GROUP", tag: TAG, summary: "End of a group of archives" },
};

const SECTIONS: Record<string, string> = {
  ".isr_vector": "Vector table: initial stack pointer and exception handler addresses, read by the CPU at reset",
  ".vectors": "Vector table: initial stack pointer and exception handler addresses",
  ".text": "Executable code (and, in many scripts, read-only data folded in)",
  ".rodata": "Read-only data: constants and string literals",
  ".data": "Initialised variables: run address (VMA) in RAM, initial values stored in Flash (LMA)",
  ".bss": "Zero-initialised variables: RAM only, zeroed by the startup code; no bytes in the image",
  ".heap": "Space reserved for dynamic allocation",
  ".stack": "Space reserved for the stack",
  ".init_array": "Pointers to constructors called before main()",
  ".fini_array": "Pointers to destructors",
  ".ARM.attributes": "ARM build attributes (CPU, ABI) for tools; not loaded on the target",
  ".ARM.exidx": "ARM exception unwinding index",
  ".comment": "Compiler version strings; not loaded on the target",
  COMMON: "Common symbols: uninitialised globals the compiler left for the linker to allocate, usually in .bss",
};

const SYMBOLS: Record<string, string> = {
  Reset_Handler: "First code executed after reset; its address (with the Thumb bit) is vector table word 1",
  main: "The C entry point, called by the startup code",
  _estack: "Initial stack pointer: one byte past the end of RAM",
  _sidata: "Load address (LMA) of .data in Flash: source of the startup copy",
  _sdata: "Start of .data in RAM: destination of the startup copy",
  _edata: "End of .data in RAM",
  _sbss: "Start of .bss: the startup code zeroes from here",
  _ebss: "End of .bss",
  _etext: "End of the code",
  end: "End of the static data: where a heap may start",
  _end: "End of the static data: where a heap may start",
  __StackLimit: "Lowest address the stack may reach",
  _heap_bottom: "Start of the heap reservation",
  _heap_top: "End of the heap reservation",
};

const sectionDoc = (name: string): string | undefined =>
  SECTIONS[name] ?? (name.startsWith(".debug") ? "DWARF debug information for gdb; not loaded on the target" : SECTIONS[name.replace(/^(\.[a-z_]+)\..*$/i, "$1")]);

export function describeLinkmap(text: string, kind: TokenKind): HoverDoc | undefined {
  switch (kind) {
    case "keyword": {
      const heading = HEADINGS[text.trim()];
      if (heading) return { title: text.trim(), tag: TAG, summary: heading };
      return SPECIAL[text] ?? describeLinker(text, "keyword");
    }
    case "function":
      return describeLinker(text, "function");
    case "comment":
      return { title: text.trim(), tag: TAG, summary: "Column titles of the table below" };
    case "label": {
      if (!text.startsWith(".") && !text.includes("*")) {
        return { title: text, tag: TAG, summary: "Memory region from the linker script's MEMORY block: start address (Origin), size (Length), attributes" };
      }
      const what = sectionDoc(text);
      return {
        title: text, tag: `${TAG}: output section`,
        summary: "A section of the final image. The two numbers are its run address (VMA) and its size; the indented lines below are the input sections it was built from",
        notes: what ? [what] : undefined,
      };
    }
    case "property": {
      if (/^!?[rwxailRWXAIL]+$/.test(text) && text.length <= 6 && !text.startsWith(".")) {
        return { title: text, tag: `${TAG}: region attributes`, summary: "r read, w write, x execute, a allocatable, i/l initialised; ! negates the attributes after it" };
      }
      const what = sectionDoc(text);
      return {
        title: text, tag: `${TAG}: input section`,
        summary: "A piece of an object file placed in the output section above: its address, its size, and the file it comes from",
        notes: what ? [what] : undefined,
      };
    }
    case "variable": {
      if (text === ".") return describeLinker(".", "variable");
      const what = SYMBOLS[text];
      return { title: text, tag: `${TAG}: symbol`, summary: "A symbol and its final address, on the left", notes: what ? [what] : undefined };
    }
    case "string":
      return /\.(?:a|lib)(?:\(|$)/i.test(text)
        ? { title: text, tag: TAG, summary: "An archive (library); in parentheses, the member object file the linker used" }
        : { title: text, tag: TAG, summary: "The object file this input section comes from" };
    case "directive":
      return { title: text, tag: TAG, summary: "An input-section pattern copied from the linker script: the rule that selected the input sections listed after it", syntax: "*(.text*) = every .text… section of every input file" };
    default:
      return undefined;
  }
}
