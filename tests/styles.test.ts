import { describe, it, expect } from "vitest";
import { CM_STYLE } from "../src/adapters/styles";

const OBSIDIAN_COLORED = new Set([
  "keyword", "number", "string", "string-2", "qualifier", "operator",
  "variable", "variable-2", "variable-3", "link",
  "builtin", "property", "attribute", "type", "comment", "meta",
]);

describe("CM_STYLE", () => {
  it("only uses classes Obsidian colors in the editor (and never grey meta, uncolored def/atom)", () => {
    for (const [kind, style] of Object.entries(CM_STYLE)) {
      expect(OBSIDIAN_COLORED.has(style), `${kind} -> ${style}`).toBe(true);
      expect(["def", "atom", "meta"]).not.toContain(style);
    }
  });
});
