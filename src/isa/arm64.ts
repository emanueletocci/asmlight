import { describeArm64, SYSREG_NAMES } from "../docs/arm64";
import type { IsaSpec } from "../tokenizer/types";
import { COND_SET, range, words } from "./common";

export const MNEMONICS = new Set(words(`
  adc adcs add adds adr adrp and ands asr at autia autiasp b bc bfi bfm bfxil bic bics bl blr br brk bti
  cbnz cbz ccmn ccmp cinc cinv clrex cls clz cmn cmp cneg crc32b crc32h crc32w crc32x
  csdb csel cset csetm csinc csinv csneg dc dmb dsb eon eor eret esb extr hint hlt hvc ic isb
  ldapr ldar ldarb ldarh ldaxr ldaxp ldnp ldp ldpsw ldr ldrb ldrh ldrsb ldrsh ldrsw
  ldur ldurb ldurh ldursb ldursh ldursw ldxr ldxp lsl lsr madd mneg mov movk movn movz
  mrs msr msub mul mvn neg negs ngc ngcs nop orn orr pacia paciasp prfm rbit ret retaa
  rev rev16 rev32 ror sbc sbcs sbfiz sbfm sbfx sdiv sev sevl smaddl smc smnegl smsubl smulh smull
  stlr stlrb stlrh stlxr stlxp stnp stp str strb strh stur sturb sturh stxr stxp sub subs svc
  sxtb sxth sxtw sys sysl tbnz tbz tlbi tst ubfiz ubfm ubfx udf udiv umaddl umnegl umsubl umulh umull
  uxtb uxth wfe wfi yield
  fabs fadd fcmp fcmpe fcsel fcvt fcvtzs fcvtzu fdiv fmadd fmax fmin fmov fmsub fmul fneg
  fnmadd fnmsub fnmul frinta frintm frintn frintp frintx frintz fsqrt fsub scvtf ucvtf
  ld1 ld2 ld3 ld4 st1 st2 st3 st4 dup ins umov smov addv addp cnt ext tbl tbx
  zip1 zip2 uzp1 uzp2 trn1 trn2 movi mvni xtn uaddlv saddlv
  cas casa casal casl ldadd ldadda ldaddal ldaddl swp swpa swpal swpl
`));

export const REGISTERS: ReadonlySet<string> = new Set([
  ...range("x", 0, 30), ...range("w", 0, 30), "sp", "wsp", "xzr", "wzr", "lr", "fp",
  ...range("v", 0, 31), ...range("q", 0, 31), ...range("d", 0, 31),
  ...range("s", 0, 31), ...range("h", 0, 31), ...range("b", 0, 31),
  ...SYSREG_NAMES,
]);

export function isArm64Mnemonic(word: string): boolean {
  if (MNEMONICS.has(word)) return true;
  const [base, suffix] = word.split(".");
  return (base === "b" || base === "bc") && suffix !== undefined && COND_SET.has(suffix);
}

export const ARM64: IsaSpec = {
  id: "arm64",
  aliases: ["aarch64", "a64"],
  isMnemonic: isArm64Mnemonic,
  registers: REGISTERS,
  lineComments: ["//", ";"],
  hashIsImmediate: true,
  describe: describeArm64,
};
