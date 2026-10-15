// Obsidian adds setCssProps to HTMLElement; happy-dom doesn't have it.
const proto = HTMLElement.prototype as HTMLElement & { setCssProps?: (props: Record<string, string>) => void };
proto.setCssProps ??= function (this: HTMLElement, props: Record<string, string>) {
  for (const [k, v] of Object.entries(props)) this.style.setProperty(k, v);
};

// Obsidian's DOM helpers on Node (createEl, createSpan, appendText, empty).
type ElInfo = { cls?: string; text?: string };
const node = Node.prototype as unknown as Record<string, unknown>;
node.createEl ??= function (this: Node, tag: string, o: ElInfo = {}) {
  const e = (this.ownerDocument ?? (this as Document)).createElement(tag);
  if (o.cls) e.className = o.cls;
  if (o.text !== undefined) e.textContent = o.text;
  this.appendChild(e);
  return e;
};
node.createSpan ??= function (this: Node & { createEl: (t: string, o?: ElInfo) => HTMLElement }, o?: ElInfo) {
  return this.createEl("span", o);
};
node.appendText ??= function (this: Node, text: string) {
  this.appendChild((this.ownerDocument ?? (this as Document)).createTextNode(text));
};
node.empty ??= function (this: Node) {
  while (this.firstChild) this.removeChild(this.firstChild);
};
