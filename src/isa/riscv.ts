import { CSR_NAMES, describeRiscv } from "../docs/riscv";
import type { IsaSpec } from "../tokenizer/types";
import { range, words } from "./common";

export const MNEMONICS = new Set(words(`
  lui auipc jal jalr beq bne blt bge bltu bgeu lb lh lw lbu lhu sb sh sw
  addi slti sltiu xori ori andi slli srli srai add sub sll slt sltu xor srl sra or and
  fence ecall ebreak
  lwu ld sd addiw slliw srliw sraiw addw subw sllw srlw sraw
  mul mulh mulhsu mulhu div divu rem remu mulw divw divuw remw remuw
  csrrw csrrs csrrc csrrwi csrrsi csrrci mret sret wfi
  flw fsw fld fsd flh fsh flq fsq
  sh1add sh2add sh3add andn orn xnor clz ctz cpop max maxu min minu rol ror rori rev8
  clzw ctzw cpopw rolw rorw roriw
  vsetvli vsetivli vsetvl
  nop li la lla mv not neg negw seqz snez sltz sgtz
  beqz bnez blez bgez bltz bgtz bgt ble bgtu bleu j jr ret call tail
  csrr csrw csrs csrc csrwi csrsi csrci
  rdcycle rdtime rdinstret rdcycleh rdtimeh rdinstreth
  frcsr fscsr frrm fsrm frflags fsflags
`));

/** Bases that only appear with a `.suffix` (fadd.s, lr.w, c.addi, vadd.vv, sext.w ...). */
export const DOTTED_BASES = new Set(words(`
  lr sc amoswap amoadd amoxor amoand amoor amomin amomax amominu amomaxu
  fadd fsub fmul fdiv fsqrt fmin fmax fmadd fmsub fnmadd fnmsub fcvt fmv fsgnj fsgnjn fsgnjx
  feq flt fle fclass fneg fabs fli
  fence sfence c sext zext add orc
  vle8 vle16 vle32 vle64 vse8 vse16 vse32 vse64 vlse8 vlse16 vlse32 vlse64
  vadd vsub vrsub vmul vdiv vdivu vrem vand vor vxor vsll vsrl vsra vmin vmax
  vmv vmerge vredsum vredmax vredmin vmacc vnmsac vslideup vslidedown vrgather
  vmseq vmsne vmslt vmsltu vmsle vmsleu vmsgt vmsgtu
  vfadd vfsub vfmul vfdiv vfmacc vfmin vfmax vfmv vfcvt vfredosum vfredusum
`));

export const REGISTERS: ReadonlySet<string> = new Set([
  ...range("x", 0, 31), ...range("f", 0, 31), ...range("v", 0, 31),
  "zero", "ra", "sp", "gp", "tp", "fp",
  ...range("t", 0, 6), ...range("s", 0, 11), ...range("a", 0, 7),
  ...range("ft", 0, 11), ...range("fs", 0, 11), ...range("fa", 0, 7),
  ...CSR_NAMES,
]);

export function isRiscvMnemonic(word: string): boolean {
  const w = word.replace(/\.(aq|rl|aqrl)$/, "");
  if (MNEMONICS.has(w)) return true;
  const dot = w.indexOf(".");
  return dot > 0 && DOTTED_BASES.has(w.slice(0, dot));
}

export const RISCV: IsaSpec = {
  id: "riscv",
  aliases: ["risc-v", "rv", "rv32", "rv64"],
  isMnemonic: isRiscvMnemonic,
  registers: REGISTERS,
  lineComments: ["#", "//"],
  hashIsImmediate: false,
  describe: describeRiscv,
};
