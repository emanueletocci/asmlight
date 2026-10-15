import { bitRange, fieldValue, formatValue, layoutRows, parseRegmap, type RegField, type Register } from "./parse";

/** Creates a child of `parent` with Obsidian's createEl, so it lands in the parent's window (popouts included). */
function el<K extends keyof HTMLElementTagNameMap>(parent: HTMLElement, tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  return parent.createEl(tag, { cls: cls || undefined, text });
}

function enumLabel(f: RegField, v: bigint): string | undefined {
  return f.enums.find(([k]) => k === v)?.[1];
}

function renderRegister(into: HTMLElement, reg: Register): void {
  const fig = el(into, "figure", "asmlight-regmap-reg");
  const cap = el(fig, "figcaption", "asmlight-regmap-title");
  if (reg.name) el(cap, "code", "asmlight-regmap-name", reg.name);
  el(cap, "span", "asmlight-regmap-width", `${reg.width}-bit`);
  if (reg.value !== undefined) {
    el(cap, "code", "asmlight-regmap-value", `= 0x${reg.value.toString(16).toUpperCase().padStart(Math.ceil(reg.width / 4), "0")}`);
  }
  if (reg.caption) el(cap, "span", "asmlight-regmap-caption", reg.caption);

  if (reg.errors.length) {
    const ul = el(fig, "ul", "asmlight-regmap-errors");
    for (const e of reg.errors) el(ul, "li", "", e);
  }

  const scroll = el(fig, "div", "asmlight-regmap-scroll");
  for (const row of layoutRows(reg)) {
    const top = row[0].hi;
    const bits = top - row[row.length - 1].lo + 1;
    const grid = el(scroll, "div", "asmlight-regmap-grid");
    grid.setCssProps({ "--asmlight-bits": String(bits) });
    for (let b = top; b > top - bits; b--) el(grid, "div", "asmlight-regmap-bitno", String(b));
    for (const seg of row) {
      const span = seg.hi - seg.lo + 1;
      const f = seg.field;
      const cell = el(grid, "div", `asmlight-regmap-field${!f ? " is-gap" : f.reserved ? " is-reserved" : ""}`);
      cell.setCssProps({ "--asmlight-span": String(span) });
      if (f) {
        if (f.name !== "-") {
          const label = el(cell, "span", "asmlight-regmap-label", f.name);
          if (f.name.length > span * 2.5) label.classList.add("is-vertical");
        }
        cell.title = `${f.name} [${bitRange(f.hi, f.lo)}]${f.desc ? ` ${f.desc}` : ""}`;
      } else {
        cell.title = `[${bitRange(seg.hi, seg.lo)}] not described`;
      }
    }
    if (reg.value !== undefined) {
      for (let b = top; b > top - bits; b--) {
        const bit = fieldValue(reg.value, b, b);
        el(grid, "div", `asmlight-regmap-bit${bit ? " is-set" : ""}`, bit.toString());
      }
    }
  }

  const named = reg.fields.filter((f) => f.name !== "-");
  if (named.length) {
    const table = el(fig, "table", "asmlight-regmap-legend");
    const head = el(el(table, "thead"), "tr");
    for (const h of ["Bits", "Field", ...(reg.value !== undefined ? ["Value"] : []), "Description"]) el(head, "th", "", h);
    const body = el(table, "tbody");
    for (const f of named) {
      const tr = el(body, "tr", f.reserved ? "is-reserved" : "");
      el(tr, "td", "asmlight-regmap-bits", bitRange(f.hi, f.lo));
      el(el(tr, "td"), "code", "", f.name);
      if (reg.value !== undefined) {
        const v = fieldValue(reg.value, f.hi, f.lo);
        const name = enumLabel(f, v);
        el(tr, "td", "asmlight-regmap-fieldvalue", `${formatValue(v, f.hi - f.lo + 1)}${name ? ` → ${name}` : ""}`);
      }
      const desc = el(tr, "td", "", f.desc);
      if (f.enums.length) el(desc, "div", "asmlight-regmap-enums", f.enums.map(([k, n]) => `${k} = ${n}`).join(", "));
    }
  }
}

/** Renders every register described in a `regmap` code block into `container`. */
export function renderRegmap(source: string, container: HTMLElement): void {
  container.empty();
  const root = el(container, "div", "asmlight-regmap");
  const regs = parseRegmap(source);
  if (!regs.length) el(root, "div", "asmlight-regmap-empty", "regmap: describe a register, e.g. \"mstatus: 32\" followed by \"MIE 3 Machine interrupt enable\"");
  for (const reg of regs) renderRegister(root, reg);
}
