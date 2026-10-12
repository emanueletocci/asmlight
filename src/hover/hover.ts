import { languageById } from "../languages";
import type { HoverDoc, TokenKind } from "../tokenizer/types";

const KINDS: ReadonlySet<string> = new Set<TokenKind>([
  "comment", "label", "mnemonic", "directive", "register", "number", "string", "reloc",
  "keyword", "function", "variable", "operator", "property",
]);

/** Matches token spans in Reading view (`asmlight-…`) and the editor (`cm-asmlight-…`). */
export const TOKEN_SELECTOR = '[class*="asmlight-lang-"]';

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
  if (!info || !text) return undefined;
  return languageById(info.lang)?.describe?.(text, info.kind);
}

export function renderCard(doc: HoverDoc, d: Document): HTMLElement {
  const el = (tag: string, cls: string, text?: string) => {
    const e = d.createElement(tag);
    e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  };
  const card = el("div", "asmlight-hover");
  card.setAttribute("role", "tooltip");
  const head = el("div", "asmlight-hover-head");
  head.append(el("code", "asmlight-hover-title", doc.title), el("span", "asmlight-hover-tag", doc.tag));
  card.append(head, el("div", "asmlight-hover-summary", doc.summary));
  for (const [label, body] of [["Syntax", doc.syntax], ["Operation", doc.operation]] as const) {
    if (!body) continue;
    const block = el("div", "asmlight-hover-block");
    block.append(el("div", "asmlight-hover-label", label), el("code", "asmlight-hover-code", body));
    card.append(block);
  }
  if (doc.notes?.length) {
    const ul = el("ul", "asmlight-hover-notes");
    for (const n of doc.notes) ul.append(el("li", "", n));
    card.append(ul);
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
      const card = renderCard(doc, this.doc);
      card.style.visibility = "hidden";
      this.doc.body.append(card);
      const r = token.getBoundingClientRect();
      const pos = placeCard(r, { width: card.offsetWidth, height: card.offsetHeight }, { width: win.innerWidth, height: win.innerHeight });
      card.style.left = `${pos.left}px`;
      card.style.top = `${pos.top}px`;
      card.style.visibility = "";
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
