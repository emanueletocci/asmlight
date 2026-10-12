import { makeParser } from "../tokenizer/parser";
import type { AsmState, IsaSpec, Stream } from "../tokenizer/types";
import { CM_STYLE } from "./styles";

export function toCm5Mode(isa: IsaSpec) {
  const parser = makeParser(isa);
  return {
    name: isa.id,
    startState: parser.startState,
    copyState: parser.copyState,
    token(stream: Stream, state: AsmState): string | null {
      const kind = parser.token(stream, state);
      return kind ? `${CM_STYLE[kind]} asmligh-${kind}` : null;
    },
    lineComment: isa.lineComments[0],
    blockCommentStart: "/*",
    blockCommentEnd: "*/",
  };
}

/** Minimal view of the global CodeMirror 5 object that we touch. */
export interface Cm5Like {
  defineMode?: (name: string, factory: () => unknown) => void;
  defineMIME?: (mime: string, spec: unknown) => void;
  modes?: Record<string, unknown>;
  mimeModes?: Record<string, unknown>;
  modeInfo?: Array<{ name: string; mime?: string; mode?: string; alias?: string[] }>;
}

const mimeFor = (isa: IsaSpec) => `text/x-asmligh-${isa.id}`;
const infoName = (isa: IsaSpec) => `Asmligh ${isa.id}`;

/** Registers modes under every tag, plus modeInfo so findModeByName resolves any case. */
export function registerCm5Modes(CM: Cm5Like | undefined, isas: readonly IsaSpec[]): void {
  if (!CM) return;
  for (const isa of isas) {
    const tags = [isa.id, ...isa.aliases];
    for (const tag of tags) CM.defineMode?.(tag, () => toCm5Mode(isa));
    CM.defineMIME?.(mimeFor(isa), isa.id);
    if (Array.isArray(CM.modeInfo)) {
      const taken = new Set<string>();
      for (const m of CM.modeInfo) {
        taken.add(m.name.toLowerCase());
        for (const a of m.alias ?? []) taken.add(a.toLowerCase());
      }
      const free = tags.filter((t) => !taken.has(t.toLowerCase()));
      if (free.length && !taken.has(infoName(isa).toLowerCase())) {
        CM.modeInfo.push({ name: infoName(isa), mime: mimeFor(isa), mode: isa.id, alias: free });
      }
    }
  }
}

export function unregisterCm5Modes(CM: Cm5Like | undefined, isas: readonly IsaSpec[]): void {
  if (!CM) return;
  for (const isa of isas) {
    for (const tag of [isa.id, ...isa.aliases]) delete CM.modes?.[tag];
    delete CM.mimeModes?.[mimeFor(isa)];
    if (Array.isArray(CM.modeInfo)) {
      for (let i = CM.modeInfo.length - 1; i >= 0; i--) {
        if (CM.modeInfo[i].name === infoName(isa) && CM.modeInfo[i].mime === mimeFor(isa)) CM.modeInfo.splice(i, 1);
      }
    }
  }
}
