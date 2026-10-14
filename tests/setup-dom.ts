// Obsidian adds setCssProps to HTMLElement; happy-dom doesn't have it.
const proto = HTMLElement.prototype as HTMLElement & { setCssProps?: (props: Record<string, string>) => void };
proto.setCssProps ??= function (this: HTMLElement, props: Record<string, string>) {
  for (const [k, v] of Object.entries(props)) this.style.setProperty(k, v);
};
