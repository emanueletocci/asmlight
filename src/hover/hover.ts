import { languageById } from "../languages";
import type { HoverDoc, TokenKind } from "../tokenizer/types";
import { describeNumber } from "./number";

const KINDS: ReadonlySet<string> = new Set<TokenKind>([
  "comment", "label", "mnemonic", "directive", "register", "number", "string", "reloc",
  "keyword", "function", "variable", "operator", "property",
]);

const ASMLIGHT_SELECTOR = '[class*="asmlight-lang-"]';
/** Numbers highlighted by Obsidian itself in other code blocks (C, …): Prism in Reading view, CodeMirror in the editor. */
const NUMBER_SELECTOR = "pre .token.number, .HyperMD-codeblock .cm-number";

/** Matches token spans in Reading view (`asmlight-…`) and the editor (`cm-asmlight-…`), plus other blocks' numbers. */
export const TOKEN_SELECTOR = `${ASMLIGHT_SELECTOR}, ${NUMBER_SELECTOR}`;

export function parseTokenClasses(classes: Iterable<string>): { kind: TokenKind; lang: string } | undefined {
  let kind: TokenKind | undefined;
  let lang: string | undefined;
  for (const raw of classes) {
    const cls = raw.replace(/^cm-/, "");
    if (cls.startsWith("asmlight-lang-")) lang = cls.slice("asmlight-lang-".length);
    else if (cls.startsWith("asmlight-") && KINDS.has(cls.slice("asmlight-".length))) kind = cls.slice("asmlight-".length) as TokenKind;
  }
  return kind && lang ? { kind, lang } : undefined;
}

export function docForElement(el: Element): HoverDoc | undefined {
  const info = parseTokenClasses(Array.from(el.classList));
  const text = el.textContent?.trim();
  if (!text) return undefined;
  if (!info) return el.matches(NUMBER_SELECTOR) ? describeNumber(text, "c") : undefined;
  if (info.kind === "number") return describeNumber(text, info.lang);
  return languageById(info.lang)?.describe?.(text, info.kind);
}

/** Builds the card as the last child of `parent` (normally the document body). */
export function renderCard(doc: HoverDoc, parent: HTMLElement): HTMLElement {
  const el = (into: HTMLElement, tag: keyof HTMLElementTagNameMap, cls: string, text?: string) =>
    into.createEl(tag, { cls: cls || undefined, text });
  const card = el(parent, "div", "asmlight-hover");
  card.setAttribute("role", "tooltip");
  const head = el(card, "div", "asmlight-hover-head");
  el(head, "code", "asmlight-hover-title", doc.title);
  el(head, "span", "asmlight-hover-tag", doc.tag);
  if (doc.summary) el(card, "div", "asmlight-hover-summary", doc.summary);
  if (doc.rows?.length) {
    const table = el(card, "table", "asmlight-hover-rows");
    for (const [label, value] of doc.rows) {
      const tr = el(table, "tr", "");
      el(tr, "th", "asmlight-hover-label", label);
      el(tr, "td", "asmlight-hover-value", value);
    }
  }
  for (const [label, body] of [["Syntax", doc.syntax], ["Operation", doc.operation]] as const) {
    if (!body) continue;
    const block = el(card, "div", "asmlight-hover-block");
    el(block, "div", "asmlight-hover-label", label);
    el(block, "code", "asmlight-hover-code", body);
  }
  if (doc.notes?.length) {
    const ul = el(card, "ul", "asmlight-hover-notes");
    for (const n of doc.notes) el(ul, "li", "", n);
  }
  return card;
}

/** Places the card under the anchor (or above when there is no room), inside the viewport. */
export function placeCard(
  anchor: { left: number; top: number; bottom: number },
  card: { width: number; height: number },
  viewport: { width: number; height: number },
  gap = 6,
  margin = 8,
): { left: number; top: number } {
  const left = Math.max(margin, Math.min(anchor.left, viewport.width - card.width - margin));
  const below = anchor.bottom + gap;
  const above = anchor.top - gap - card.height;
  const top = below + card.height <= viewport.height - margin || above < margin ? below : above;
  return { left, top: Math.max(margin, top) };
}

export interface HoverOptions {
  enabled(): boolean;
  requireModifier(): boolean;
  delay(): number;
}

/** Shows a hover card for highlighted tokens in one document (main window or a popout). */
export class HoverController {
  private card: HTMLElement | null = null;
  private current: Element | null = null;
  private timer: number | undefined;
  private readonly cleanups: Array<() => void> = [];

  constructor(private readonly doc: Document, private readonly opts: HoverOptions) {
    const win = doc.defaultView!;
    this.listen(doc, "mouseover", (e) => this.onOver(e as MouseEvent));
    this.listen(doc, "mousedown", (e) => {
      const token = (e.target as Element | null)?.closest?.(TOKEN_SELECTOR);
      if (token !== this.current) this.hide();
    });
    this.listen(doc, "keydown", (e) => {
      const k = e as KeyboardEvent;
      if ((k.key === "Control" || k.key === "Meta") && this.current && !this.card) this.show(this.current, 0);
      else if (k.key !== "Control" && k.key !== "Meta") this.hide();
    });
    this.listen(doc, "scroll", () => this.hide(), true);
    this.listen(win, "blur", () => this.hide());
    this.listen(doc.documentElement, "mouseleave", () => this.hide());
  }

  private listen(target: EventTarget, type: string, fn: (e: Event) => void, capture = false) {
    target.addEventListener(type, fn, capture);
    this.cleanups.push(() => target.removeEventListener(type, fn, capture));
  }

  private onOver(e: MouseEvent) {
    const token = (e.target as Element | null)?.closest?.(TOKEN_SELECTOR) ?? null;
    if (token === this.current) return;
    this.hide();
    this.current = token;
    if (!token || !this.opts.enabled()) return;
    if (this.opts.requireModifier() && !(e.ctrlKey || e.metaKey)) return;
    this.show(token, this.opts.delay());
  }

  private show(token: Element, delay: number) {
    const win = this.doc.defaultView!;
    win.clearTimeout(this.timer);
    this.timer = win.setTimeout(() => {
      if (this.current !== token || !token.isConnected) return;
      const doc = docForElement(token);
      if (!doc) return;
      this.removeCard();
      const card = renderCard(doc, this.doc.body);
      card.classList.add("is-measuring");
      const r = token.getBoundingClientRect();
      const pos = placeCard(r, { width: card.offsetWidth, height: card.offsetHeight }, { width: win.innerWidth, height: win.innerHeight });
      card.setCssProps({ "--asmlight-hover-left": `${pos.left}px`, "--asmlight-hover-top": `${pos.top}px` });
      card.classList.remove("is-measuring");
      this.card = card;
    }, delay);
  }

  private removeCard() {
    this.card?.remove();
    this.card = null;
  }

  hide() {
    this.doc.defaultView?.clearTimeout(this.timer);
    this.current = null;
    this.removeCard();
  }

  destroy() {
    this.hide();
    for (const c of this.cleanups.splice(0)) c();
  }
}
