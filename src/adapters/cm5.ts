import type { Language, Stream } from "../tokenizer/types";
import { CM_STYLE } from "./styles";

export function toCm5Mode(lang: Language) {
  const parser = lang.makeParser();
  return {
    name: lang.id,
    startState: parser.startState,
    copyState: parser.copyState,
    token(stream: Stream, state: unknown): string | null {
      const kind = parser.token(stream, state);
      return kind ? `${CM_STYLE[kind]} asmlight-${kind} asmlight-lang-${lang.id}` : null;
    },
    lineComment: lang.lineComment,
    blockCommentStart: lang.blockComment?.[0],
    blockCommentEnd: lang.blockComment?.[1],
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

const mimeFor = (lang: Language) => `text/x-asmlight-${lang.id}`;
const infoName = (lang: Language) => `Asmlight ${lang.id}`;

/** Registers modes under every tag, plus modeInfo so findModeByName resolves any case. */
export function registerCm5Modes(CM: Cm5Like | undefined, langs: readonly Language[]): void {
  if (!CM) return;
  for (const lang of langs) {
    const tags = [lang.id, ...lang.aliases];
    for (const tag of tags) CM.defineMode?.(tag, () => toCm5Mode(lang));
    CM.defineMIME?.(mimeFor(lang), lang.id);
    if (Array.isArray(CM.modeInfo)) {
      const taken = new Set<string>();
      for (const m of CM.modeInfo) {
        taken.add(m.name.toLowerCase());
        for (const a of m.alias ?? []) taken.add(a.toLowerCase());
      }
      const free = tags.filter((t) => !taken.has(t.toLowerCase()));
      if (free.length && !taken.has(infoName(lang).toLowerCase())) {
        CM.modeInfo.push({ name: infoName(lang), mime: mimeFor(lang), mode: lang.id, alias: free });
      }
    }
  }
}

export function unregisterCm5Modes(CM: Cm5Like | undefined, langs: readonly Language[]): void {
  if (!CM) return;
  for (const lang of langs) {
    for (const tag of [lang.id, ...lang.aliases]) delete CM.modes?.[tag];
    delete CM.mimeModes?.[mimeFor(lang)];
    if (Array.isArray(CM.modeInfo)) {
      for (let i = CM.modeInfo.length - 1; i >= 0; i--) {
        if (CM.modeInfo[i].name === infoName(lang) && CM.modeInfo[i].mime === mimeFor(lang)) CM.modeInfo.splice(i, 1);
      }
    }
  }
}
