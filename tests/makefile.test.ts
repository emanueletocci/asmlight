import { describe, it, expect } from "vitest";
import { MAKEFILE } from "../src/lang/makefile";
import { tokenizeLines } from "../src/tokenizer/tokenizeLines";
import { kinds } from "./helpers";

const k = (src: string, line = 0) => kinds(src, MAKEFILE, line);

describe("Makefile", () => {
  it("assignments with every operator", () => {
    expect(k("CC := gcc # compiler")).toEqual([["CC", "variable"], [":=", "operator"], ["# compiler", "comment"]]);
    for (const op of ["=", "::=", ":::=", "+=", "?=", "!="]) {
      expect(k(`X ${op} y`)).toEqual([["X", "variable"], [op, "operator"]]);
    }
    expect(k("CFLAGS+=-O2")).toEqual([["CFLAGS", "variable"], ["+=", "operator"]]);
    expect(k("override export CFLAGS += -g")).toEqual([
      ["override", "keyword"], ["export", "keyword"], ["CFLAGS", "variable"], ["+=", "operator"],
    ]);
  });

  it("rules: targets, prerequisites, references", () => {
    expect(k("all: $(BIN) docs")).toEqual([["all", "label"], [":", "operator"], ["$(BIN)", "variable"]]);
    expect(k("a b:: c | d")).toEqual([["a", "label"], ["b", "label"], ["::", "operator"], ["|", "operator"]]);
    expect(k(".PHONY: all clean")).toEqual([[".PHONY", "directive"], [":", "operator"]]);
    expect(k("$(BUILD)/%.o: %.c")).toEqual([["$(BUILD)", "variable"], ["/%.o", "label"], [":", "operator"]]);
  });

  it("substitution refs don't split the target at their colon", () => {
    expect(k("$(SRC:.c=.d): x")).toEqual([["$(SRC", "variable"], [":", "operator"]]);
  });

  it("functions, nested references and automatic variables", () => {
    expect(k("OBJ = $(patsubst %.c,%.o,$(wildcard src/*.c))")).toEqual([
      ["OBJ", "variable"], ["=", "operator"], ["$(patsubst", "function"], ["$(wildcard", "function"],
    ]);
    expect(k("\t$(CC) -o $@ $^ $<", 0)).toEqual([["$(CC)", "variable"], ["$@", "variable"], ["$^", "variable"], ["$<", "variable"]]);
  });

  it("recipe lines: prefixes, strings, shell $$ and comments", () => {
    const src = "x: y\n\t@echo \"hi $(N)\" 'q' # note\n\t-rm -f $$tmp\n    +$(MAKE) -C sub";
    expect(k(src, 1)).toEqual([["@", "operator"], ['"hi $(N)"', "string"], ["'q'", "string"], ["# note", "comment"]]);
    expect(k(src, 2)).toEqual([["-", "operator"], ["$$tmp", "variable"]]);
    expect(k(src, 3)).toEqual([["+", "operator"], ["$(MAKE)", "variable"]]);
  });

  it("recipe lines don't look like rules or assignments", () => {
    const src = "x:\n\tgcc -o a: b\n\tFOO=1 ./run";
    expect(k(src, 1)).toEqual([]);
    expect(k(src, 2)).toEqual([]);
  });

  it("an unindented line ends the recipe", () => {
    const src = "x:\n\techo\nY = 1\n  z: w";
    expect(k(src, 2)).toEqual([["Y", "variable"], ["=", "operator"]]);
    expect(k(src, 3)).toEqual([["z", "label"], [":", "operator"]]);
  });

  it("conditionals and includes, also inside a recipe block", () => {
    const src = "ifeq ($(OS),Windows_NT)\nelse ifdef X\n-include $(DEPS)\nx:\n\tcmd\nifdef V\n\tcmd2\nendif";
    expect(k(src, 0)).toEqual([["ifeq", "keyword"], ["$(OS)", "variable"]]);
    expect(k(src, 1)).toEqual([["else", "keyword"], ["ifdef", "keyword"]]);
    expect(k(src, 2)).toEqual([["-include", "keyword"], ["$(DEPS)", "variable"]]);
    expect(k(src, 5)).toEqual([["ifdef", "keyword"]]);
    expect(k(src, 6)).toEqual([]);
    expect(k(src, 7)).toEqual([["endif", "keyword"]]);
  });

  it("define blocks are literal apart from references", () => {
    const src = "define RULE =\n# not a comment: $(1)\na := b\nendef";
    expect(k(src, 0)).toEqual([["define", "keyword"], ["RULE", "variable"], ["=", "operator"]]);
    expect(k(src, 1)).toEqual([["$(1)", "variable"]]);
    expect(k(src, 2)).toEqual([]);
    expect(k(src, 3)).toEqual([["endef", "keyword"]]);
  });

  it("backslash continuations keep the line's role", () => {
    const src = "SRC = a.c \\\n  $(B) \\\n  c.c\nall: x \\\n  y\n\techo \\\n  -n";
    expect(k(src, 1)).toEqual([["$(B)", "variable"]]);
    expect(k(src, 4)).toEqual([]);
    expect(k(src, 6)).toEqual([]);
  });

  it("target-specific variables", () => {
    expect(k("debug: CFLAGS += -g")).toEqual([
      ["debug", "label"], [":", "operator"], ["CFLAGS", "variable"], ["+=", "operator"],
    ]);
  });

  it("fuzz: always makes progress", () => {
    const all = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join("");
    for (const prefix of ["", "\t", "x: ", "X = ", "define X\n", "x:\n\t"]) {
      expect(() => tokenizeLines(prefix + all, MAKEFILE)).not.toThrow();
      for (const ch of all) expect(() => tokenizeLines(`${prefix}${ch}${ch}$(${ch} a`, MAKEFILE)).not.toThrow();
    }
  });
});
