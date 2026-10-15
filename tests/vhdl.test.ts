import { describe, it, expect } from "vitest";
import { VHDL } from "../src/lang/vhdl";
import { tokenizeLines } from "../src/tokenizer/tokenizeLines";
import { kinds } from "./helpers";

const k = (src: string, line = 0) => kinds(src, VHDL, line);

describe("VHDL", () => {
  it("design units and their names, any case", () => {
    expect(k("ENTITY counter IS")).toEqual([["ENTITY", "keyword"], ["counter", "label"], ["IS", "keyword"]]);
    expect(k("architecture rtl of counter is")).toEqual([
      ["architecture", "keyword"], ["rtl", "label"], ["of", "keyword"], ["counter", "label"], ["is", "keyword"],
    ]);
    expect(k("end architecture rtl;")).toEqual([["end", "keyword"], ["architecture", "keyword"], ["rtl", "label"]]);
    expect(k("type mem_t is array (0 to 3) of byte_t;")).toEqual([
      ["type", "keyword"], ["is", "keyword"], ["array", "keyword"], ["0", "number"], ["to", "keyword"], ["3", "number"], ["of", "keyword"],
    ]);
  });

  it("ports, types and initial values", () => {
    expect(k("port (clk : in std_logic; q : out unsigned(7 downto 0));")).toEqual([
      ["port", "keyword"], ["in", "keyword"], ["std_logic", "keyword"], ["out", "keyword"], ["unsigned", "keyword"],
      ["7", "number"], ["downto", "keyword"], ["0", "number"],
    ]);
    expect(k("signal s : std_logic := '0';")).toEqual([
      ["signal", "keyword"], ["std_logic", "keyword"], [":=", "operator"], ["'0'", "string"],
    ]);
  });

  it("labels on processes and instances", () => {
    expect(k("tick : process (clk)")).toEqual([["tick", "label"], ["process", "keyword"]]);
    expect(k("u1 : entity work.counter port map (clk => clk);")).toEqual([
      ["u1", "label"], ["entity", "keyword"], ["work.counter", "label"], ["port", "keyword"], ["map", "keyword"], ["=>", "operator"],
    ]);
    expect(k("u2 : counter")).toEqual([["u2", "label"]]);
  });

  it("signal assignment vs less-or-equal", () => {
    expect(k("q <= d;")).toEqual([["<=", "operator"]]);
    expect(k("if cnt <= 10 then cnt <= cnt + 1; end if;")).toEqual([
      ["if", "keyword"], ["10", "number"], ["then", "keyword"], ["<=", "operator"], ["1", "number"], ["end", "keyword"], ["if", "keyword"],
    ]);
    expect(k("when IDLE => state <= RUN;")).toEqual([["when", "keyword"], ["=>", "operator"], ["<=", "operator"]]);
    expect(k("y <= a when s <= b else c;")).toEqual([["<=", "operator"], ["when", "keyword"], ["else", "keyword"]]);
  });

  it("attributes vs character literals", () => {
    expect(k("if clk'event and clk = '1' then")).toEqual([
      ["if", "keyword"], ["'event", "property"], ["and", "keyword"], ["'1'", "string"], ["then", "keyword"],
    ]);
    expect(k("for i in v'range loop")).toEqual([["for", "keyword"], ["in", "keyword"], ["'range", "property"], ["loop", "keyword"]]);
  });

  it("numbers and bit strings", () => {
    expect(k("x := 16#FF# + 2#1010# + 1.5e3 + x\"FF\" + 8ux\"1F\" + B\"1010\";").map(([t]) => t)).toEqual([
      ":=", "16#FF#", "2#1010#", "1.5e3", 'x"FF"', '8ux"1F"', 'B"1010"',
    ]);
  });

  it("functions, comments, strings", () => {
    expect(k('if rising_edge(clk) then -- clock')).toEqual([
      ["if", "keyword"], ["rising_edge", "function"], ["then", "keyword"], ["-- clock", "comment"],
    ]);
    expect(k('report "a ""quoted"" word";')).toEqual([["report", "keyword"], ['"a ""quoted"" word"', "string"]]);
  });

  it("fuzz: always makes progress", () => {
    const all = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join("");
    for (const prefix of ["", "entity ", "x", "/* ", "16#", "end "]) {
      expect(() => tokenizeLines(prefix + all, VHDL)).not.toThrow();
      for (const ch of all) expect(() => tokenizeLines(`${prefix}${ch}${ch}'${ch}"${ch} a`, VHDL)).not.toThrow();
    }
  });
});
