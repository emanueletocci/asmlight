export type TokenKind =
  | "comment" | "label" | "mnemonic" | "directive"
  | "register" | "number" | "string" | "reloc";

export interface IsaSpec {
  id: string;
  aliases: string[];
  isMnemonic(word: string): boolean;     // word is lowercase
  registers: ReadonlySet<string>;        // lowercase
  lineComments: string[];
  hashIsImmediate: boolean;              // ARM: "#4" is an immediate
}

export interface AsmState {
  inBlockComment: boolean;
  sawMnemonic: boolean;                  // reset at start of each line
}

/** Subset shared by CodeMirror 5 and 6 StringStream. */
export interface Stream {
  sol(): boolean;
  eol(): boolean;
  peek(): string | null | undefined;
  next(): string | null | undefined | void;
  eatSpace(): boolean;
  skipToEnd(): void;
  match(pattern: string | RegExp, consume?: boolean, caseFold?: boolean): unknown;
  current(): string;
}

export interface AsmParser {
  startState(): AsmState;
  copyState(s: AsmState): AsmState;
  token(stream: Stream, state: AsmState): TokenKind | null;
}
