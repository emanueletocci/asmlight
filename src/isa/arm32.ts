import { describeArm32, SPECIAL_NAMES } from "../docs/arm32";
import type { IsaSpec } from "../tokenizer/types";
import { COND_SET, range, words } from "./common";

export const MNEMONICS = new Set(words(`
  adc add adr and asr b bfc bfi bic bkpt bl blx bx bxj cbnz cbz clrex clz cmn cmp cps cpsid cpsie
  dmb dsb eor isb ldm ldmia ldmib ldmda ldmdb ldmfd ldr ldrb ldrd ldrex ldrexb ldrexh ldrexd ldrh ldrsb ldrsh ldrt
  lsl lsr mcr mla mls mov movt movw mrc mrs msr mul mvn neg nop orn orr pkhbt pop push
  qadd qsub rbit rev rev16 revsh ror rrx rsb rsc sbc sbfx sdiv sev smlal smull ssat
  stm stmia stmea stmib stmda stmdb stmfd str strb strd strex strexb strexh strexd strh strt sub svc swi swp
  sxtb sxth tbb tbh teq tst ubfx udf udiv umlal umull usat uxtb uxth wfe wfi yield
  vabs vadd vcmp vcvt vdiv vdup vext vld1 vld2 vld3 vld4 vldm vldr vmla vmls vmov vmrs vmsr
  vmul vneg vpop vpush vsqrt vst1 vst2 vst3 vst4 vstm vstr vsub vand vorr veor vbic
  vmax vmin vshl vshr vqadd vqsub vtbl vzip vuzp vtrn vrev64 vcnt
`));

export const REGISTERS: ReadonlySet<string> = new Set([
  ...range("r", 0, 15), "sp", "lr", "pc", "fp", "ip", "sb", "sl",
  ...range("s", 0, 31), ...range("d", 0, 31), ...range("q", 0, 15),
  ...SPECIAL_NAMES,
]);

export function isArm32Mnemonic(word: string): boolean {
  const base = word.split(".")[0];                       // drop .w .n .f32 .i16 ...
  if (/^it[te]{0,3}$/.test(base)) return true;
  const candidates = [base];
  if (COND_SET.has(base.slice(-2))) candidates.push(base.slice(0, -2));              // addeq, addseq
  for (const c of [...candidates]) if (c.endsWith("s")) candidates.push(c.slice(0, -1)); // adds, adds(eq)
  if (base.endsWith("s") && COND_SET.has(base.slice(-3, -1))) candidates.push(base.slice(0, -3)); // addeqs
  return candidates.some((c) => MNEMONICS.has(c));
}

export const ARM32: IsaSpec = {
  id: "arm32",
  name: "ARM",
  aliases: ["arm", "thumb"],
  isMnemonic: isArm32Mnemonic,
  registers: REGISTERS,
  lineComments: ["@", "//", ";"],
  hashIsImmediate: true,
  describe: describeArm32,
};
