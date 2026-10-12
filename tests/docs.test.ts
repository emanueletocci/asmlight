import { describe, it, expect } from "vitest";
import * as rv from "../src/isa/riscv";
import * as a32 from "../src/isa/arm32";
import * as a64 from "../src/isa/arm64";
import { docTable } from "../src/docs/table";
import { describeMake } from "../src/docs/make";
import { describeLinker } from "../src/docs/linker";
import { describeDevicetree } from "../src/docs/devicetree";
import type { HoverDoc, IsaSpec } from "../src/tokenizer/types";

const d = (isa: IsaSpec, w: string, kind: "mnemonic" | "register" = "mnemonic"): HoverDoc | undefined => isa.describe!(w, kind);

describe("doc tables", () => {
  it("separates keys by whitespace and keeps | in operations", () => {
    const t = docTable("a b ¦ Sum ¦ syn ¦ x = y | z\nriscv,isa ¦ ISA");
    expect(t.get("a")).toEqual({ summary: "Sum", syntax: "syn", operation: "x = y | z" });
    expect(t.get("b")).toBe(t.get("a"));
    expect(t.get("riscv,isa")?.summary).toBe("ISA");
  });
  it("rejects rows without a summary", () => {
    expect(() => docTable("lonely")).toThrow();
  });
});

describe("every highlighted instruction and register has a hover card", () => {
  for (const [name, mod] of [["riscv", rv], ["arm32", a32], ["arm64", a64]] as const) {
    const isa = (mod as any)[name === "riscv" ? "RISCV" : name.toUpperCase()] as IsaSpec;
    it(`${name} mnemonics`, () => {
      const missing = [...mod.MNEMONICS].filter((m) => !d(isa, m));
      expect(missing).toEqual([]);
    });
    it(`${name} registers`, () => {
      const missing = [...mod.REGISTERS].filter((r) => !d(isa, r, "register"));
      expect(missing).toEqual([]);
    });
  }
  it("riscv dotted bases", () => {
    const real: Record<string, string> = { sfence: "sfence.vma", orc: "orc.b", fence: "fence.i", c: "c.addi" };
    const missing = [...rv.DOTTED_BASES].filter((b) => !d(rv.RISCV, real[b] ?? `${b}.s`));
    expect(missing).toEqual([]);
  });
});

describe("RISC-V lookups", () => {
  it("base instruction with syntax and operation", () => {
    expect(d(rv.RISCV, "ADDI")).toMatchObject({ title: "ADDI", tag: "RISC-V instruction", syntax: "addi rd, rs1, imm12" });
  });
  it("AMO with ordering suffix", () => {
    expect(d(rv.RISCV, "amoadd.w.aqrl")?.notes).toEqual([expect.stringMatching(/^\.w: 32-bit word/), expect.stringContaining("acquire + release")]);
    expect(d(rv.RISCV, "lr.d")?.notes).toEqual([expect.stringMatching(/^\.d: 64-bit/)]);
  });
  it("FP and vector suffixes", () => {
    expect(d(rv.RISCV, "fcvt.w.s")?.notes).toEqual([expect.stringContaining("32-bit signed integer"), expect.stringContaining("single")]);
    expect(d(rv.RISCV, "vadd.vx")?.notes).toEqual([expect.stringContaining("vector-scalar")]);
    expect(d(rv.RISCV, "vle32.v")?.summary).toMatch(/Unit-stride/);
  });
  it("compressed forms point at the full instruction", () => {
    const lwsp = d(rv.RISCV, "c.lwsp")!;
    expect(lwsp.syntax).toBe("lw rd, offset(rs1)");
    expect(lwsp.notes?.join(" ")).toMatch(/16-bit.*sp-relative/);
    expect(d(rv.RISCV, "c.addi16sp")?.notes?.[1]).toMatch(/stack adjust/);
  });
  it("registers: numeric, ABI, FP, CSR, PMP", () => {
    expect(d(rv.RISCV, "x10", "register")?.summary).toMatch(/^x10 = a0\. Argument 0/);
    expect(d(rv.RISCV, "s0", "register")?.summary).toMatch(/^s0 = x8/);
    expect(d(rv.RISCV, "f10", "register")?.summary).toMatch(/^f10 = fa0/);
    expect(d(rv.RISCV, "fs11", "register")?.summary).toMatch(/^fs11 = f27/);
    expect(d(rv.RISCV, "ft11", "register")?.summary).toMatch(/^ft11 = f31/);
    expect(d(rv.RISCV, "mstatus", "register")?.tag).toBe("RISC-V CSR · 0x300");
    expect(d(rv.RISCV, "pmpaddr3", "register")?.tag).toBe("RISC-V CSR · 0x3B3");
    expect(d(rv.RISCV, "v0.t", "register")?.notes?.[0]).toMatch(/mask/);
  });
  it("CSRs are highlighted as registers", async () => {
    const { kinds } = await import("./helpers");
    expect(kinds("csrw mtvec, t0", rv.RISCV)).toEqual([["csrw", "mnemonic"], ["mtvec", "register"], ["t0", "register"]]);
  });
});

describe("ARM32 lookups", () => {
  it("decomposes S and condition suffixes", () => {
    expect(d(a32.ARM32, "addseq")).toMatchObject({ syntax: "add{s}{cond} Rd, Rn, Op2", notes: [expect.stringMatching(/^S:/), expect.stringMatching(/EQ/)] });
    expect(d(a32.ARM32, "addeqs")?.notes).toHaveLength(2);
    expect(d(a32.ARM32, "bls")).toMatchObject({ summary: "Branch", notes: [expect.stringMatching(/LS/)] });
    expect(d(a32.ARM32, "blt")?.summary).toBe("Branch");
    expect(d(a32.ARM32, "bleq")?.summary).toMatch(/link/);
    expect(d(a32.ARM32, "lsls")?.notes).toEqual([expect.stringMatching(/^S:/)]);
    expect(d(a32.ARM32, "adcs")?.summary).toBe("Add with carry");
    expect(d(a32.ARM32, "mrs")?.notes).toBeUndefined();
  });
  it("IT blocks, width and type qualifiers", () => {
    expect(d(a32.ARM32, "itete")?.notes?.[0]).toMatch(/else.*then.*else/);
    expect(d(a32.ARM32, "add.w")?.notes).toEqual([expect.stringMatching(/32-bit Thumb-2/)]);
    expect(d(a32.ARM32, "vadd.f32")?.notes).toEqual([expect.stringMatching(/single/)]);
    expect(d(a32.ARM32, "vld1.32")?.notes).toEqual([".32: 32-bit elements"]);
  });
  it("Cortex-M special registers, aliases and PSR field masks", async () => {
    expect(d(a32.ARM32, "PSP", "register")?.summary).toMatch(/Process stack pointer/);
    expect(d(a32.ARM32, "basepri", "register")?.tag).toBe("ARM special register");
    expect(d(a32.ARM32, "r13", "register")?.summary).toMatch(/^r13 = sp\./);
    expect(d(a32.ARM32, "apsr_nzcvq", "register")?.notes?.[0]).toMatch(/_nzcvq/);
    const { kinds } = await import("./helpers");
    expect(kinds("msr PSP, r0", a32.ARM32)).toEqual([["msr", "mnemonic"], ["PSP", "register"], ["r0", "register"]]);
    expect(kinds("vmrs APSR_nzcv, fpscr", a32.ARM32).slice(1)).toEqual([["APSR_nzcv", "register"], ["fpscr", "register"]]);
  });
});

describe("AArch64 lookups", () => {
  it("conditional branches and plain instructions", () => {
    expect(d(a64.ARM64, "b.ne")).toMatchObject({ syntax: "b.<cond> label", notes: [expect.stringMatching(/NE/)] });
    expect(d(a64.ARM64, "eret")?.operation).toMatch(/ELR_ELx/);
    expect(d(a64.ARM64, "b.xx")).toBeUndefined();
  });
  it("registers, views and arrangements", () => {
    expect(d(a64.ARM64, "x30", "register")?.summary).toMatch(/Link register/);
    expect(d(a64.ARM64, "w8", "register")?.summary).toMatch(/syscall number/);
    expect(d(a64.ARM64, "v0.4s", "register")?.notes).toEqual([".4s: 4 lanes of 32-bit"]);
    expect(d(a64.ARM64, "q9", "register")?.summary).toMatch(/128-bit view of v9, callee-saved/);
    expect(d(a64.ARM64, "VBAR_EL1", "register")?.tag).toBe("ARM system register");
  });
  it("system registers are highlighted", async () => {
    const { kinds } = await import("./helpers");
    expect(kinds("msr vbar_el1, x0", a64.ARM64)).toEqual([["msr", "mnemonic"], ["vbar_el1", "register"], ["x0", "register"]]);
  });
});

describe("Make, linker and devicetree lookups", () => {
  it("make", () => {
    expect(describeMake("$(patsubst", "function")?.syntax).toMatch(/patsubst/);
    expect(describeMake("$@", "variable")?.summary).toMatch(/target/);
    expect(describeMake("$(@D)", "variable")?.summary).toMatch(/directory/);
    expect(describeMake("$$tmp", "variable")?.summary).toMatch(/literal \$/);
    expect(describeMake("$(CC)", "variable")?.summary).toMatch(/C compiler/);
    expect(describeMake("CFLAGS", "variable")?.summary).toMatch(/C compiler/);
    expect(describeMake("?=", "operator")?.summary).toMatch(/not already defined/);
    expect(describeMake("@-", "operator")?.summary).toMatch(/echo.*ignore/);
    expect(describeMake(".PHONY", "directive")?.summary).toMatch(/not files/);
    expect(describeMake("-include", "keyword")?.summary).toMatch(/ignored/);
    expect(describeMake("MYVAR", "variable")).toBeUndefined();
  });
  it("linker", () => {
    expect(describeLinker("KEEP", "keyword")?.summary).toMatch(/gc-sections/);
    expect(describeLinker("LOADADDR", "function")?.summary).toMatch(/LMA/);
    expect(describeLinker("OVERLAY", "keyword")?.summary).toMatch(/same run address/);
    expect(describeLinker(".", "variable")?.summary).toMatch(/Location counter/);
    expect(describeLinker(">", "operator")?.summary).toMatch(/memory region/);
    expect(describeLinker("_estack", "variable")).toBeUndefined();
  });
  it("devicetree", () => {
    expect(describeDevicetree("compatible", "property")?.tag).toBe("Devicetree property");
    expect(describeDevicetree("riscv,isa", "property")?.summary).toMatch(/ISA string/);
    expect(describeDevicetree("linux,initrd-end", "property")?.summary).toMatch(/initramfs/);
    expect(describeDevicetree("pinctrl-1", "property")?.summary).toMatch(/pin state 1/);
    expect(describeDevicetree("reset-gpios", "property")?.summary).toMatch(/"reset"/);
    expect(describeDevicetree("vdd-supply", "property")?.summary).toMatch(/regulator/);
    expect(describeDevicetree("#pwm-cells", "property")?.summary).toMatch(/PWM specifier/);
    expect(describeDevicetree("#mbox-cells", "property")?.summary).toMatch(/mbox specifier/);
    expect(describeDevicetree("/dts-v1/", "keyword")?.summary).toMatch(/version 1/);
    expect(describeDevicetree("chosen", "function")?.summary).toMatch(/bootloader/);
    expect(describeDevicetree("GIC_SPI", "variable")?.summary).toMatch(/INTID − 32/);
  });
});
