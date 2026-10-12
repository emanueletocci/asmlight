import { bitRange, fieldValue, formatValue, layoutRows, parseRegmap, type RegField, type Register } from "./parse";

type Make = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) => HTMLElementTagNameMap[K];

function maker(d: Document): Make {
  return (tag, cls, text) => {
    const e = d.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  };
}

function enumLabel(f: RegField, v: bigint): string | undefined {
  return f.enums.find(([k]) => k === v)?.[1];
}

function renderRegister(reg: Register, el: Make): HTMLElement {
  const fig = el("figure", "asmlight-regmap-reg");
  const cap = el("figcaption", "asmlight-regmap-title");
  if (reg.name) cap.append(el("code", "asmlight-regmap-name", reg.name));
  cap.append(el("span", "asmlight-regmap-width", `${reg.width}-bit`));
  if (reg.value !== undefined) {
    cap.append(el("code", "asmlight-regmap-value", `= 0x${reg.value.toString(16).toUpperCase().padStart(Math.ceil(reg.width / 4), "0")}`));
  }
  if (reg.caption) cap.append(el("span", "asmlight-regmap-caption", reg.caption));
  fig.append(cap);

  if (reg.errors.length) {
    const ul = el("ul", "asmlight-regmap-errors");
    for (const e of reg.errors) ul.append(el("li", "", e));
    fig.append(ul);
  }

  const scroll = el("div", "asmlight-regmap-scroll");
  for (const row of layoutRows(reg)) {
    const top = row[0].hi;
    const bits = top - row[row.length - 1].lo + 1;
    const grid = el("div", "asmlight-regmap-grid");
    grid.style.gridTemplateColumns = `repeat(${bits}, minmax(var(--asmlight-bit-width), 1fr))`;
    for (let b = top; b > top - bits; b--) {
      const n = el("div", "asmlight-regmap-bitno", String(b));
      n.style.gridRow = "1";
      grid.append(n);
    }
    for (const seg of row) {
      const span = seg.hi - seg.lo + 1;
      const f = seg.field;
      const cell = el("div", `asmlight-regmap-field${!f ? " is-gap" : f.reserved ? " is-reserved" : ""}`);
      cell.style.gridRow = "2";
      cell.style.gridColumn = `span ${span}`;
      if (f) {
        if (f.name !== "-") {
          const label = el("span", "asmlight-regmap-label", f.name);
          if (f.name.length > span * 2.5) label.classList.add("is-vertical");
          cell.append(label);
        }
        cell.title = `${f.name} [${bitRange(f.hi, f.lo)}]${f.desc ? ` ${f.desc}` : ""}`;
      } else {
        cell.title = `[${bitRange(seg.hi, seg.lo)}] not described`;
      }
      grid.append(cell);
    }
    if (reg.value !== undefined) {
      for (let b = top; b > top - bits; b--) {
        const bit = fieldValue(reg.value, b, b);
        const v = el("div", `asmlight-regmap-bit${bit ? " is-set" : ""}`, bit.toString());
        v.style.gridRow = "3";
        grid.append(v);
      }
    }
    scroll.append(grid);
  }
  fig.append(scroll);

  const named = reg.fields.filter((f) => f.name !== "-");
  if (named.length) {
    const table = el("table", "asmlight-regmap-legend");
    const head = el("tr");
    for (const h of ["Bits", "Field", ...(reg.value !== undefined ? ["Value"] : []), "Description"]) head.append(el("th", "", h));
    table.append(el("thead"), el("tbody"));
    table.tHead!.append(head);
    for (const f of named) {
      const tr = el("tr", f.reserved ? "is-reserved" : "");
      tr.append(el("td", "asmlight-regmap-bits", bitRange(f.hi, f.lo)), el("td", "", ""));
      tr.lastElementChild!.append(el("code", "", f.name));
      if (reg.value !== undefined) {
        const v = fieldValue(reg.value, f.hi, f.lo);
        const name = enumLabel(f, v);
        tr.append(el("td", "asmlight-regmap-fieldvalue", `${formatValue(v, f.hi - f.lo + 1)}${name ? ` → ${name}` : ""}`));
      }
      const desc = el("td", "", f.desc);
      if (f.enums.length) {
        desc.append(el("div", "asmlight-regmap-enums", f.enums.map(([k, n]) => `${k} = ${n}`).join(", ")));
      }
      tr.append(desc);
      table.tBodies[0].append(tr);
    }
    fig.append(table);
  }
  return fig;
}

/** Renders every register described in a `regmap` code block into `container`. */
export function renderRegmap(source: string, container: HTMLElement): void {
  const el = maker(container.ownerDocument);
  const root = el("div", "asmlight-regmap");
  const regs = parseRegmap(source);
  if (!regs.length) root.append(el("div", "asmlight-regmap-empty", "regmap: describe a register, e.g. \"mstatus: 32\" followed by \"MIE 3 Machine interrupt enable\""));
  for (const reg of regs) root.append(renderRegister(reg, el));
  container.replaceChildren(root);
}
