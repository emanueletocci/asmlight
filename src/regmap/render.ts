import { box, colorMode, finish, line, startSvg, svgEl, text, textWidth, tooltip, type DiagramColors, type DiagramOptions } from "../svg/draw";
import { bitRange, fieldValue, formatValue, layoutRows, parseRegmap, type RegField, type Register } from "./parse";

/** Creates a child of `parent` with Obsidian's createEl, so it lands in the parent's window (popouts included). */
function el<K extends keyof HTMLElementTagNameMap>(parent: HTMLElement, tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  return parent.createEl(tag, { cls: cls || undefined, text });
}

function enumLabel(f: RegField, v: bigint): string | undefined {
  return f.enums.find(([k]) => k === v)?.[1];
}

const PAD = 4;          // outer margin of the drawing
const BITNO_H = 16;     // row of bit numbers
const VALUE_H = 18;     // row of decoded bits
const MIN_FIELD_H = 30;
const VALUE_FIELD_H = 38; // a field showing its value under its name

/** Short value for inside a field: binary up to 4 bits, hex above. */
function shortValue(v: bigint, bits: number): string {
  return bits <= 4 ? `0b${v.toString(2).padStart(bits, "0")}` : `0x${v.toString(16).toUpperCase()}`;
}

/** Screen-reader summary of a register. */
function label(reg: Register): string {
  const head = `Register ${reg.name || ""} ${reg.width}-bit`.replace(/\s+/g, " ").trim();
  const value = reg.value !== undefined ? `, value 0x${reg.value.toString(16).toUpperCase()}` : "";
  const fields = reg.fields.filter((f) => f.name !== "-").map((f) => `${f.name} [${bitRange(f.hi, f.lo)}]`);
  return `${head}${value}${fields.length ? `. Fields: ${fields.join(", ")}` : ""}`;
}

/** Draws the title line and the bit grid of one register as an SVG. */
function drawRegister(into: HTMLElement, reg: Register, colors: DiagramColors): void {
  const c = startSvg(into, "asmlight-regmap-svg", { scope: into, label: label(reg), colors });
  const P = c.pal;
  const cw = reg.perRow <= 16 ? 34 : 24;          // width of one bit column
  let y = PAD + 14;
  let x = PAD;

  // Title: name, width, decoded value, caption.
  if (reg.name) {
    text(c.svg, x, y, reg.name, 14, { bold: true, fill: P.text, cls: "asmlight-regmap-name" });
    x += textWidth(reg.name, 14, true) + 12;
  }
  const width = `${reg.width}-bit`;
  text(c.svg, x, y, width, 11, { fill: P.muted, cls: "asmlight-regmap-width" });
  x += textWidth(width, 11) + 12;
  if (reg.value !== undefined) {
    const hex = `= 0x${reg.value.toString(16).toUpperCase().padStart(Math.ceil(reg.width / 4), "0")}`;
    text(c.svg, x, y, hex, 12, { bold: true, fill: P.accent, cls: "asmlight-regmap-value" });
    x += textWidth(hex, 12, true) + 12;
  }
  let maxX = x;
  if (reg.caption) {
    y += 16;
    text(c.svg, PAD, y, reg.caption, 11, { fill: P.muted, cls: "asmlight-regmap-caption" });
    maxX = Math.max(maxX, PAD + textWidth(reg.caption, 11));
  }
  y += 10;

  for (const row of layoutRows(reg)) {
    const top = row[0].hi;
    const bottom = row[row.length - 1].lo;
    const bits = top - bottom + 1;
    const colX = (b: number) => PAD + (top - b) * cw;   // left edge of bit b's column
    maxX = Math.max(maxX, PAD + bits * cw);

    // Separators every 4 bits (one hex digit), drawn in the bit-number and value rows.
    const nibbles = (y0: number, h: number) => {
      for (let b = top; b > bottom; b--) {
        if (b % 4 === 0) line(c.svg, colX(b) + cw, y0, colX(b) + cw, y0 + h, P.faint).setAttribute("class", "asmlight-regmap-nibble");
      }
    };

    for (let b = top; b >= bottom; b--) {
      text(c.svg, colX(b) + cw / 2, y + 11, String(b), 9, { fill: P.faint, anchor: "middle", cls: "asmlight-regmap-bitno" });
    }
    nibbles(y + 2, BITNO_H - 4);
    y += BITNO_H;

    // A label that doesn't fit across its field is drawn vertically; the row grows to fit it.
    const fits = (f: RegField, span: number) => textWidth(f.name, 11, true) <= span * cw - 6;
    const showsValue = (f: RegField, span: number) =>
      reg.value !== undefined && span >= 2 && !f.reserved && f.name !== "-" && fits(f, span) &&
      textWidth(shortValue(fieldValue(reg.value, f.hi, f.lo), span), 10) <= span * cw - 6;
    let fieldH = MIN_FIELD_H;
    for (const seg of row) {
      const f = seg.field;
      const span = seg.hi - seg.lo + 1;
      if (!f || f.name === "-") continue;
      if (!fits(f, span)) fieldH = Math.max(fieldH, textWidth(f.name, 10, true) + 16);
      else if (showsValue(f, span)) fieldH = Math.max(fieldH, VALUE_FIELD_H);
    }

    for (const seg of row) {
      const span = seg.hi - seg.lo + 1;
      const fx = colX(seg.hi);
      const w = span * cw;
      const f = seg.field;
      const g = svgEl(c.svg, "g", {
        class: `asmlight-regmap-field${!f ? " is-gap" : f.reserved ? " is-reserved" : ""}`,
        "data-span": span,
      });
      box(g, fx, y, w, fieldH, !f || f.reserved ? c.hatch : P.fill, { stroke: P.line });
      if (f) {
        if (f.name !== "-") {
          const color = f.reserved ? P.muted : P.text;
          if (!fits(f, span)) {
            text(g, fx + w / 2 + 4, y + fieldH - 8, f.name, 10, { bold: !f.reserved, vertical: true, fill: color, cls: "asmlight-regmap-label is-vertical" });
          } else if (showsValue(f, span)) {
            text(g, fx + w / 2, y + fieldH / 2 - 2, f.name, 11, { bold: true, anchor: "middle", fill: color, cls: "asmlight-regmap-label" });
            const v = shortValue(fieldValue(reg.value!, f.hi, f.lo), span);
            text(g, fx + w / 2, y + fieldH / 2 + 12, v, 10, { anchor: "middle", fill: P.accent, cls: "asmlight-regmap-fieldval" });
          } else {
            text(g, fx + w / 2, y + fieldH / 2 + 4, f.name, 11, { bold: !f.reserved, anchor: "middle", fill: color, cls: "asmlight-regmap-label" });
          }
        }
        tooltip(g, `${f.name} [${bitRange(f.hi, f.lo)}]${f.desc ? ` ${f.desc}` : ""}`);
      } else {
        tooltip(g, `[${bitRange(seg.hi, seg.lo)}] not described`);
      }
    }
    y += fieldH;

    if (reg.value !== undefined) {
      for (let b = top; b >= bottom; b--) {
        const bit = fieldValue(reg.value, b, b) !== BigInt(0);
        const bx = colX(b);
        if (bit) svgEl(c.svg, "rect", { x: bx, y, width: cw, height: VALUE_H, style: `fill: ${P.setFill}` });
        text(c.svg, bx + cw / 2, y + 13, bit ? "1" : "0", 11, {
          anchor: "middle",
          bold: bit,
          fill: bit ? P.accent : P.faint,
          cls: `asmlight-regmap-bit${bit ? " is-set" : ""}`,
        });
      }
      nibbles(y + 2, VALUE_H - 4);
      y += VALUE_H;
    }
    y += 8;
  }
  finish(c, maxX + PAD, y);
}

function renderRegister(into: HTMLElement, reg: Register, colors: DiagramColors): void {
  const fig = el(into, "figure", "asmlight-regmap-reg");
  if (reg.errors.length) {
    const ul = el(fig, "ul", "asmlight-regmap-errors");
    for (const e of reg.errors) el(ul, "li", "", e);
  }
  drawRegister(fig, reg, colors);

  // The legend stays an HTML table: it is text, it wraps, and every exporter styles tables.
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
export function renderRegmap(source: string, container: HTMLElement, opts: DiagramOptions = {}): void {
  container.empty();
  const root = el(container, "div", "asmlight-regmap");
  const regs = parseRegmap(source);
  if (!regs.length) el(root, "div", "asmlight-regmap-empty", "regmap: describe a register, e.g. \"mstatus: 32\" followed by \"MIE 3 Machine interrupt enable\"");
  const colors = colorMode(opts);
  for (const reg of regs) renderRegister(root, reg, colors);
}
