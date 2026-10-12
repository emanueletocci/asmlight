import type { HoverDoc, TokenKind } from "../tokenizer/types";
import { CONDITIONS, docTable } from "./table";

const INSTR = docTable(`
adc adcs ¦ Add with carry (adcs also sets NZCV) ¦ adc Rd, Rn, Rm ¦ Rd = Rn + Rm + C
add adds ¦ Add (adds also sets NZCV) ¦ add Rd, Rn, Op2 ¦ Rd = Rn + Op2
adr ¦ PC-relative address, ±1 MiB ¦ adr Xd, label ¦ Xd = address of label
adrp ¦ PC-relative 4 KiB page address, ±4 GiB; pair with add Xd, Xd, :lo12:sym ¦ adrp Xd, sym ¦ Xd = (PC & ~0xFFF) + page_offset(sym)
and ands ¦ Bitwise AND (ands also sets NZCV) ¦ and Rd, Rn, Op2 ¦ Rd = Rn & Op2
asr ¦ Arithmetic shift right ¦ asr Rd, Rn, #n / Rm ¦ Rd = Rn >>s n
at ¦ Address translate: run a translation and put the result in PAR_EL1 ¦ at s1e1r, Xt
autia autiasp ¦ Authenticate a pointer signed with key A (pointer authentication); autiasp checks LR against SP ¦ autia Xd, Xn
b ¦ Branch, ±128 MiB ¦ b label ¦ PC = label
b.cond ¦ Conditional branch, ±1 MiB ¦ b.<cond> label ¦ if (cond) PC = label
bc.cond bc ¦ Branch consistent conditionally (FEAT_HBC): a hint that the branch rarely changes direction ¦ bc.<cond> label ¦ if (cond) PC = label
bfi ¦ Bit field insert ¦ bfi Rd, Rn, #lsb, #width ¦ Rd[lsb+width-1:lsb] = Rn[width-1:0]
bfm ¦ Bit field move (base of bfi/bfxil) ¦ bfm Rd, Rn, #immr, #imms
bfxil ¦ Bit field extract and insert low ¦ bfxil Rd, Rn, #lsb, #width ¦ Rd[width-1:0] = Rn[lsb+width-1:lsb]
bic bics ¦ Bit clear (bics also sets NZCV) ¦ bic Rd, Rn, Op2 ¦ Rd = Rn & ~Op2
bl ¦ Branch with link (function call), ±128 MiB ¦ bl label ¦ X30 = return address; PC = label
blr ¦ Branch with link to register (indirect call) ¦ blr Xn ¦ X30 = return address; PC = Xn
br ¦ Branch to register ¦ br Xn ¦ PC = Xn
brk ¦ Breakpoint exception ¦ brk #imm16
bti ¦ Branch target identification landing pad ¦ bti {c, j, jc}
cbnz ¦ Compare and branch if non-zero ¦ cbnz Rt, label ¦ if (Rt != 0) PC = label
cbz ¦ Compare and branch if zero ¦ cbz Rt, label ¦ if (Rt == 0) PC = label
ccmn ¦ Conditional compare negative ¦ ccmn Rn, Op2, #nzcv, cond ¦ flags = cond ? flags(Rn + Op2) : #nzcv
ccmp ¦ Conditional compare, for chaining conditions (a && b) ¦ ccmp Rn, Op2, #nzcv, cond ¦ flags = cond ? flags(Rn - Op2) : #nzcv
cinc ¦ Conditional increment ¦ cinc Rd, Rn, cond ¦ Rd = cond ? Rn + 1 : Rn
cinv ¦ Conditional invert ¦ cinv Rd, Rn, cond ¦ Rd = cond ? ~Rn : Rn
cneg ¦ Conditional negate ¦ cneg Rd, Rn, cond ¦ Rd = cond ? -Rn : Rn
clrex ¦ Clear the local exclusive monitor ¦ clrex
cls ¦ Count leading sign bits ¦ cls Rd, Rn
clz ¦ Count leading zeros ¦ clz Rd, Rn
cmn ¦ Compare negative (alias of adds with zero register) ¦ cmn Rn, Op2 ¦ flags = Rn + Op2
cmp ¦ Compare (alias of subs with zero register) ¦ cmp Rn, Op2 ¦ flags = Rn - Op2
crc32b crc32h crc32w crc32x ¦ CRC-32 of a byte / halfword / word / doubleword ¦ crc32b Wd, Wn, Wm
csdb ¦ Consumption of speculative data barrier (Spectre mitigation) ¦ csdb
csel ¦ Conditional select ¦ csel Rd, Rn, Rm, cond ¦ Rd = cond ? Rn : Rm
cset ¦ Conditional set ¦ cset Rd, cond ¦ Rd = cond ? 1 : 0
csetm ¦ Conditional set mask ¦ csetm Rd, cond ¦ Rd = cond ? -1 : 0
csinc ¦ Conditional select increment ¦ csinc Rd, Rn, Rm, cond ¦ Rd = cond ? Rn : Rm + 1
csinv ¦ Conditional select invert ¦ csinv Rd, Rn, Rm, cond ¦ Rd = cond ? Rn : ~Rm
csneg ¦ Conditional select negate ¦ csneg Rd, Rn, Rm, cond ¦ Rd = cond ? Rn : -Rm
dc ¦ Data cache maintenance by VA or set/way (e.g. civac clean+invalidate to PoC, cvau clean to PoU, zva zero a block) ¦ dc civac, Xt
dmb ¦ Data memory barrier: orders memory accesses (ish = inner shareable, ld/st variants) ¦ dmb ish
dsb ¦ Data synchronization barrier: waits for memory accesses and maintenance (TLBI, DC) to complete ¦ dsb ish
eon ¦ Exclusive OR NOT ¦ eon Rd, Rn, Op2 ¦ Rd = Rn ^ ~Op2
eor ¦ Exclusive OR ¦ eor Rd, Rn, Op2 ¦ Rd = Rn ^ Op2
eret ¦ Exception return: restores PSTATE from SPSR_ELx and jumps to ELR_ELx (also how a kernel drops to EL0) ¦ eret ¦ PC = ELR_ELx; PSTATE = SPSR_ELx
esb ¦ Error synchronization barrier ¦ esb
extr ¦ Extract a register from a pair ¦ extr Rd, Rn, Rm, #lsb ¦ Rd = (Rn:Rm)[lsb+N-1:lsb]
hint ¦ Hint instruction (nop, yield, wfe, ... by number) ¦ hint #imm
hlt ¦ Halting debug breakpoint ¦ hlt #imm16
hvc ¦ Hypervisor call: synchronous exception to EL2 ¦ hvc #imm16
ic ¦ Instruction cache maintenance (e.g. ic iallu, ic ivau, Xt after writing code) ¦ ic ivau, Xt
isb ¦ Instruction synchronization barrier: later instructions see the effects of earlier system register writes ¦ isb
ldapr ¦ Load-acquire RCpc register ¦ ldapr Rt, [Xn]
ldar ldarb ldarh ¦ Load-acquire: no later access can be observed before it ¦ ldar Rt, [Xn]
ldaxr ldaxp ¦ Load-acquire exclusive (register / pair), for lock acquire loops ¦ ldaxr Rt, [Xn]
ldnp ¦ Load pair, non-temporal hint ¦ ldnp Rt1, Rt2, [Xn, #off]
ldp ¦ Load pair (e.g. restore frame: ldp x29, x30, [sp], #16) ¦ ldp Rt1, Rt2, [Xn, #off]{!} ¦ Rt1 = M[a]; Rt2 = M[a + size]
ldpsw ¦ Load pair of signed words ¦ ldpsw Xt1, Xt2, [Xn, #off]
ldr ¦ Load register; ldr Xt, =value is a literal-pool pseudo-instruction ¦ ldr Rt, [Xn, #off]{!} / ldr Rt, [Xn], #off / ldr Rt, label ¦ Rt = M[address]
ldrb ldrh ¦ Load byte / halfword, zero-extended ¦ ldrb Wt, [Xn, #off]
ldrsb ldrsh ldrsw ¦ Load byte / halfword / word, sign-extended ¦ ldrsw Xt, [Xn, #off]
ldur ldurb ldurh ldursb ldursh ldursw ¦ Load with unscaled (byte) offset, −256..255 ¦ ldur Rt, [Xn, #simm9]
ldxr ldxp ¦ Load exclusive (register / pair): starts a load-linked/store-conditional sequence ¦ ldxr Rt, [Xn]
lsl ¦ Logical shift left ¦ lsl Rd, Rn, #n / Rm ¦ Rd = Rn << n
lsr ¦ Logical shift right ¦ lsr Rd, Rn, #n / Rm ¦ Rd = Rn >>u n
madd ¦ Multiply-add ¦ madd Rd, Rn, Rm, Ra ¦ Rd = Ra + Rn × Rm
mneg ¦ Multiply-negate ¦ mneg Rd, Rn, Rm ¦ Rd = -(Rn × Rm)
mov ¦ Move register or immediate (alias of orr / movz / movn / add with sp) ¦ mov Rd, Rn / #imm ¦ Rd = Op
movk ¦ Move 16-bit immediate, keeping other bits ¦ movk Rd, #imm16{, lsl #s} ¦ Rd[s+15:s] = imm16
movn ¦ Move inverted 16-bit immediate ¦ movn Rd, #imm16{, lsl #s} ¦ Rd = ~(imm16 << s)
movz ¦ Move 16-bit immediate, zeroing other bits ¦ movz Rd, #imm16{, lsl #s} ¦ Rd = imm16 << s
mrs ¦ Read a system register ¦ mrs Xt, sysreg ¦ Xt = sysreg
msr ¦ Write a system register, or a PSTATE field with an immediate (msr daifset, #2 masks IRQs) ¦ msr sysreg, Xt / msr pstatefield, #imm ¦ sysreg = Xt
msub ¦ Multiply-subtract ¦ msub Rd, Rn, Rm, Ra ¦ Rd = Ra - Rn × Rm
mul ¦ Multiply ¦ mul Rd, Rn, Rm ¦ Rd = Rn × Rm
mvn ¦ Bitwise NOT ¦ mvn Rd, Op2 ¦ Rd = ~Op2
neg negs ¦ Negate (negs also sets NZCV) ¦ neg Rd, Op2 ¦ Rd = 0 - Op2
ngc ngcs ¦ Negate with carry ¦ ngc Rd, Rm ¦ Rd = 0 - Rm - !C
nop ¦ No operation ¦ nop
orn ¦ OR NOT ¦ orn Rd, Rn, Op2 ¦ Rd = Rn | ~Op2
orr ¦ Bitwise OR ¦ orr Rd, Rn, Op2 ¦ Rd = Rn | Op2
pacia paciasp ¦ Sign a pointer with key A (pointer authentication); paciasp signs LR using SP ¦ pacia Xd, Xn
prfm ¦ Prefetch memory hint ¦ prfm pldl1keep, [Xn, #off]
rbit ¦ Reverse bit order ¦ rbit Rd, Rn
ret ¦ Return from subroutine (default register X30) ¦ ret {Xn} ¦ PC = X30
retaa ¦ Return with pointer authentication (key A, modifier SP) ¦ retaa
rev ¦ Reverse byte order (endianness swap) ¦ rev Rd, Rn
rev16 rev32 ¦ Reverse bytes within each halfword / word ¦ rev16 Rd, Rn
ror ¦ Rotate right ¦ ror Rd, Rn, #n / Rm ¦ Rd = Rn rotr n
sbc sbcs ¦ Subtract with carry ¦ sbc Rd, Rn, Rm ¦ Rd = Rn - Rm - !C
sbfiz ¦ Signed bit field insert in zeros ¦ sbfiz Rd, Rn, #lsb, #width
sbfm ¦ Signed bit field move (base of asr / sbfx / sxt*) ¦ sbfm Rd, Rn, #immr, #imms
sbfx ¦ Signed bit field extract ¦ sbfx Rd, Rn, #lsb, #width ¦ Rd = sext(Rn[lsb+width-1:lsb])
sdiv ¦ Signed divide (divide by zero gives 0, no trap) ¦ sdiv Rd, Rn, Rm ¦ Rd = Rn /s Rm
sev sevl ¦ Send event (sevl: to this PE only) ¦ sev
smaddl ¦ Signed multiply-add long ¦ smaddl Xd, Wn, Wm, Xa ¦ Xd = Xa + Wn ×s Wm
smc ¦ Secure monitor call: synchronous exception to EL3 (e.g. PSCI) ¦ smc #imm16
smnegl smsubl ¦ Signed multiply-negate / multiply-subtract long ¦ smsubl Xd, Wn, Wm, Xa
smulh ¦ Signed multiply high: upper 64 bits of a 128-bit product ¦ smulh Xd, Xn, Xm
smull ¦ Signed multiply long ¦ smull Xd, Wn, Wm ¦ Xd = Wn ×s Wm
stlr stlrb stlrh ¦ Store-release: no earlier access can be observed after it ¦ stlr Rt, [Xn]
stlxr stlxp ¦ Store-release exclusive; status register is 0 on success ¦ stlxr Ws, Rt, [Xn]
stnp ¦ Store pair, non-temporal hint ¦ stnp Rt1, Rt2, [Xn, #off]
stp ¦ Store pair (e.g. save frame: stp x29, x30, [sp, #-16]!) ¦ stp Rt1, Rt2, [Xn, #off]{!} ¦ M[a] = Rt1; M[a + size] = Rt2
str ¦ Store register ¦ str Rt, [Xn, #off]{!} / str Rt, [Xn], #off ¦ M[address] = Rt
strb strh ¦ Store byte / halfword ¦ strb Wt, [Xn, #off]
stur sturb sturh ¦ Store with unscaled (byte) offset ¦ stur Rt, [Xn, #simm9]
stxr stxp ¦ Store exclusive; status register is 0 on success, 1 if the monitor was lost ¦ stxr Ws, Rt, [Xn]
sub subs ¦ Subtract (subs also sets NZCV) ¦ sub Rd, Rn, Op2 ¦ Rd = Rn - Op2
svc ¦ Supervisor call: synchronous exception to EL1 (system call; Linux passes the number in x8) ¦ svc #imm16
sxtb sxth sxtw ¦ Sign-extend byte / halfword / word ¦ sxtw Xd, Wn
sys sysl ¦ Generic system instruction (DC, IC, AT, TLBI are aliases) ¦ sys #op1, Cn, Cm, #op2, Xt
tbnz ¦ Test bit and branch if non-zero ¦ tbnz Rt, #bit, label ¦ if (Rt[bit] == 1) PC = label
tbz ¦ Test bit and branch if zero ¦ tbz Rt, #bit, label ¦ if (Rt[bit] == 0) PC = label
tlbi ¦ TLB invalidate (e.g. tlbi vmalle1is, tlbi vae1, Xt); follow with dsb + isb ¦ tlbi op{, Xt}
tst ¦ Test bits (alias of ands with zero register) ¦ tst Rn, Op2 ¦ flags = Rn & Op2
ubfiz ¦ Unsigned bit field insert in zeros ¦ ubfiz Rd, Rn, #lsb, #width
ubfm ¦ Unsigned bit field move (base of lsl / lsr / ubfx / uxt*) ¦ ubfm Rd, Rn, #immr, #imms
ubfx ¦ Unsigned bit field extract ¦ ubfx Rd, Rn, #lsb, #width ¦ Rd = zext(Rn[lsb+width-1:lsb])
udf ¦ Permanently undefined ¦ udf #imm16
udiv ¦ Unsigned divide (divide by zero gives 0) ¦ udiv Rd, Rn, Rm ¦ Rd = Rn /u Rm
umaddl ¦ Unsigned multiply-add long ¦ umaddl Xd, Wn, Wm, Xa ¦ Xd = Xa + Wn ×u Wm
umnegl umsubl ¦ Unsigned multiply-negate / multiply-subtract long ¦ umsubl Xd, Wn, Wm, Xa
umulh ¦ Unsigned multiply high: upper 64 bits of a 128-bit product ¦ umulh Xd, Xn, Xm
umull ¦ Unsigned multiply long ¦ umull Xd, Wn, Wm ¦ Xd = Wn ×u Wm
uxtb uxth ¦ Zero-extend byte / halfword ¦ uxtb Wd, Wn
wfe ¦ Wait for event (low-power spin-lock waiting) ¦ wfe
wfi ¦ Wait for interrupt (idle loop) ¦ wfi
yield ¦ Hint that the thread is spinning ¦ yield
fabs ¦ FP absolute value ¦ fabs Dd, Dn
fadd ¦ FP add ¦ fadd Dd, Dn, Dm ¦ Dd = Dn + Dm
fcmp fcmpe ¦ FP compare, sets NZCV (fcmpe also signals on quiet NaN) ¦ fcmp Dn, Dm / #0.0
fcsel ¦ FP conditional select ¦ fcsel Dd, Dn, Dm, cond ¦ Dd = cond ? Dn : Dm
fcvt ¦ FP convert between precisions ¦ fcvt Dd, Sn
fcvtzs fcvtzu ¦ FP to signed / unsigned integer, rounding toward zero ¦ fcvtzs Xd, Dn
fdiv ¦ FP divide ¦ fdiv Dd, Dn, Dm ¦ Dd = Dn / Dm
fmadd ¦ FP fused multiply-add ¦ fmadd Dd, Dn, Dm, Da ¦ Dd = Da + Dn × Dm
fmsub ¦ FP fused multiply-subtract ¦ fmsub Dd, Dn, Dm, Da ¦ Dd = Da - Dn × Dm
fmax fmin ¦ FP maximum / minimum ¦ fmax Dd, Dn, Dm
fmov ¦ FP move register, immediate, or bits to/from a general register ¦ fmov Dd, Xn / fmov Dd, #imm
fmul ¦ FP multiply ¦ fmul Dd, Dn, Dm ¦ Dd = Dn × Dm
fneg ¦ FP negate ¦ fneg Dd, Dn
fnmadd fnmsub fnmul ¦ FP negated multiply-add / multiply-subtract / multiply ¦ fnmul Dd, Dn, Dm
frinta frintm frintn frintp frintx frintz ¦ FP round to integral (a away, m −∞, n even, p +∞, x current mode exact, z toward zero) ¦ frintz Dd, Dn
fsqrt ¦ FP square root ¦ fsqrt Dd, Dn
fsub ¦ FP subtract ¦ fsub Dd, Dn, Dm ¦ Dd = Dn - Dm
scvtf ucvtf ¦ Signed / unsigned integer to FP ¦ scvtf Dd, Xn
ld1 ld2 ld3 ld4 ¦ SIMD load with 1–4-way de-interleave ¦ ld1 {v0.4s}, [x0]
st1 st2 st3 st4 ¦ SIMD store with 1–4-way interleave ¦ st1 {v0.4s}, [x0]
dup ¦ SIMD duplicate an element or register into all lanes ¦ dup v0.4s, w1
ins ¦ SIMD insert an element ¦ ins v0.s[1], w1
umov smov ¦ SIMD move an element to a general register (zero / sign extended) ¦ umov w0, v1.s[0]
addv ¦ SIMD add across lanes ¦ addv s0, v1.4s
addp ¦ SIMD add pairwise ¦ addp v0.4s, v1.4s, v2.4s
cnt ¦ SIMD count set bits per byte ¦ cnt v0.8b, v1.8b
ext ¦ SIMD extract a vector from a pair ¦ ext v0.16b, v1.16b, v2.16b, #n
tbl tbx ¦ SIMD table lookup (tbx keeps out-of-range lanes) ¦ tbl v0.16b, {v1.16b}, v2.16b
zip1 zip2 uzp1 uzp2 trn1 trn2 ¦ SIMD interleave / de-interleave / transpose ¦ zip1 v0.4s, v1.4s, v2.4s
movi mvni ¦ SIMD move (inverted) immediate ¦ movi v0.16b, #0
xtn ¦ SIMD extract narrow ¦ xtn v0.4h, v1.4s
uaddlv saddlv ¦ SIMD add long across lanes ¦ uaddlv h0, v1.16b
cas casa casl casal ¦ Compare and swap (LSE atomics; a = acquire, l = release) ¦ cas Ws, Wt, [Xn] ¦ atomically: if (M[Xn] == Ws) M[Xn] = Wt; Ws = old
ldadd ldadda ldaddl ldaddal ¦ Atomic add (LSE; a = acquire, l = release) ¦ ldadd Ws, Wt, [Xn] ¦ atomically: Wt = M[Xn]; M[Xn] += Ws
swp swpa swpl swpal ¦ Atomic swap (LSE; a = acquire, l = release) ¦ swp Ws, Wt, [Xn] ¦ atomically: Wt = M[Xn]; M[Xn] = Ws
`);

const SYSREGS = docTable(`
nzcv ¦ Condition flags N Z C V (bits 31:28)
fpcr ¦ Floating-point control: rounding mode, flush-to-zero, default NaN, trap enables
fpsr ¦ Floating-point status: cumulative exception flags
daif ¦ Interrupt masks D (debug), A (SError), I (IRQ), F (FIQ) in bits 9:6
daifset ¦ Set DAIF mask bits with an immediate: msr daifset, #2 masks IRQs (#0b1111 masks all)
daifclr ¦ Clear DAIF mask bits with an immediate: msr daifclr, #2 unmasks IRQs
spsel ¦ Stack pointer select: 0 = use SP_EL0 at the current EL, 1 = use SP_ELx
currentel ¦ Current exception level in bits 3:2 (read-only)
sp_el0 ¦ Stack pointer for EL0 (user stack, saved/restored on context switch)
sp_el1 ¦ Stack pointer for EL1 (kernel)
sp_el2 ¦ Stack pointer for EL2 (hypervisor)
elr_el1 elr_el2 elr_el3 ¦ Exception link register: return address used by eret
spsr_el1 spsr_el2 spsr_el3 ¦ Saved program status: PSTATE at exception entry (M[3:0] = EL and SP, DAIF, NZCV), restored by eret
esr_el1 esr_el2 esr_el3 ¦ Exception syndrome: EC[31:26] class (0x15 SVC from AArch64, 0x20/0x21 instruction abort, 0x24/0x25 data abort, 0x3C BRK), IL, ISS details
far_el1 far_el2 far_el3 ¦ Fault address register: virtual address of an instruction/data abort
vbar_el1 vbar_el2 vbar_el3 ¦ Vector base address: 2 KiB-aligned table of 16 entries × 0x80 (current EL SP0 / SPx, lower EL AArch64 / AArch32 × sync / IRQ / FIQ / SError)
sctlr_el1 sctlr_el2 sctlr_el3 ¦ System control: M(0) MMU enable, A(1) alignment check, C(2) data cache, SA(3) stack alignment, I(12) instruction cache, WXN(19), EE(25) endianness
tcr_el1 tcr_el2 tcr_el3 ¦ Translation control: T0SZ/T1SZ address sizes, TG0/TG1 granule (4/16/64 KiB), cacheability and shareability of table walks, IPS physical address size
ttbr0_el1 ttbr0_el2 ttbr0_el3 ¦ Translation table base 0: root table for the lower VA range (user space at EL1), with ASID in the top bits
ttbr1_el1 ttbr1_el2 ¦ Translation table base 1: root table for the upper VA range (kernel space)
mair_el1 mair_el2 mair_el3 ¦ Memory attribute indirection: 8 attribute bytes (e.g. 0x00 Device-nGnRnE, 0xFF Normal write-back) indexed by AttrIndx in page table entries
amair_el1 ¦ Auxiliary memory attribute indirection (implementation defined)
tpidr_el0 ¦ Thread ID register, EL0 read/write (user TLS pointer)
tpidrro_el0 ¦ Thread ID register, read-only at EL0
tpidr_el1 tpidr_el2 tpidr_el3 ¦ Thread ID register for the EL (kernels keep per-CPU data here)
contextidr_el1 ¦ Context ID (current process ID for debug/trace)
cpacr_el1 ¦ Architectural feature access control: FPEN (bits 21:20) enables FP/SIMD at EL0/EL1
cptr_el2 cptr_el3 ¦ Architectural feature trap register (FP/SIMD, SVE traps)
actlr_el1 ¦ Auxiliary control (implementation defined)
mdscr_el1 ¦ Monitor debug system control
par_el1 ¦ Physical address register: result of an AT instruction
mpidr_el1 ¦ Multiprocessor affinity: Aff3/Aff2/Aff1/Aff0 identify the core (read-only)
midr_el1 ¦ Main ID: implementer, variant, part number, revision (read-only)
id_aa64pfr0_el1 ¦ Processor feature register 0: supported ELs, FP, SIMD, GIC system registers
id_aa64mmfr0_el1 ¦ Memory model feature register 0: PA range, supported granules, ASID size
id_aa64isar0_el1 ¦ Instruction set attribute register 0: AES, SHA, CRC32, atomics
hcr_el2 ¦ Hypervisor configuration: VM(0) stage-2 translation, IMO/FMO route IRQ/FIQ to EL2, RW(31) EL1 is AArch64, TGE
vttbr_el2 ¦ Stage-2 translation table base (with VMID)
vtcr_el2 ¦ Stage-2 translation control
hpfar_el2 ¦ Hypervisor IPA fault address
scr_el3 ¦ Secure configuration: NS(0) non-secure, IRQ/FIQ/EA routing to EL3, RW(10) lower EL is AArch64
cntfrq_el0 ¦ Generic timer frequency in Hz (set by firmware)
cntpct_el0 ¦ Physical count: 64-bit system counter
cntvct_el0 ¦ Virtual count: system counter minus CNTVOFF_EL2
cntp_ctl_el0 cntv_ctl_el0 ¦ Physical / virtual timer control: ENABLE(0), IMASK(1), ISTATUS(2)
cntp_cval_el0 cntv_cval_el0 ¦ Physical / virtual timer compare value: fires when the count ≥ CVAL
cntp_tval_el0 cntv_tval_el0 ¦ Physical / virtual timer value: down-counter view, fires at 0 (write ticks-until-interrupt)
cntkctl_el1 ¦ Counter-timer kernel control: EL0 access to the counters and timers
cnthctl_el2 ¦ Counter-timer hypervisor control
cntvoff_el2 ¦ Counter-timer virtual offset
icc_iar1_el1 ¦ GICv3 interrupt acknowledge (group 1): read to get the pending INTID (1020–1023 = spurious)
icc_eoir1_el1 ¦ GICv3 end of interrupt (group 1): write the INTID when done
icc_dir_el1 ¦ GICv3 deactivate interrupt (when EOImode = 1)
icc_pmr_el1 ¦ GICv3 priority mask: only interrupts with priority value lower than this are signalled
icc_bpr1_el1 ¦ GICv3 binary point (group 1): splits priority into preemption group and subpriority
icc_ctlr_el1 ¦ GICv3 CPU interface control
icc_sre_el1 ¦ GICv3 system register enable: SRE(0) = use system registers instead of MMIO
icc_igrpen1_el1 ¦ GICv3 enable group 1 interrupts
icc_sgi1r_el1 ¦ GICv3 generate a software-generated interrupt (IPI) to other cores
`);

const GP = (n: number): string =>
  n <= 7 ? "Argument / result register (AAPCS64, caller-saved)"
  : n === 8 ? "Indirect result location (caller-saved); syscall number on Linux"
  : n <= 15 ? "Temporary (caller-saved)"
  : n <= 17 ? `IP${n - 16}: intra-procedure-call scratch, used by veneers and PLT stubs`
  : n === 18 ? "Platform register (reserved on some OSes), otherwise temporary"
  : n <= 28 ? "Callee-saved"
  : n === 29 ? "Frame pointer (FP, callee-saved)"
  : "Link register (LR): return address after bl/blr";

const VIEWS: Record<string, string> = { b: "8-bit", h: "16-bit", s: "32-bit", d: "64-bit", q: "128-bit" };

function describeRegister(word: string): HoverDoc | undefined {
  const raw = word.toLowerCase();
  const arrangement = /\.(\d*[bhsdq])$/.exec(raw);
  const w = arrangement ? raw.slice(0, -arrangement[0].length) : raw;
  const reg = (tag: string, summary: string, notes?: string[]): HoverDoc =>
    ({ title: word, tag, summary, ...(notes ? { notes } : {}) });

  let m = /^([xw])(\d+)$/.exec(w);
  if (m && Number(m[2]) <= 30) {
    const n = Number(m[2]);
    return m[1] === "x"
      ? reg("ARM AArch64 register", `x${n}. ${GP(n)}`)
      : reg("ARM AArch64 register", `w${n}: low 32 bits of x${n} (writing it zeroes the upper half). ${GP(n)}`);
  }
  if (w === "lr") return reg("ARM AArch64 register", `lr = x30. ${GP(30)}`);
  if (w === "fp") return reg("ARM AArch64 register", `fp = x29. ${GP(29)}`);
  if (w === "sp" || w === "wsp") return reg("ARM AArch64 register", "Stack pointer, 16-byte aligned when used for memory access; the current EL's SP_ELx (or SP_EL0 when SPSel = 0)");
  if (w === "xzr" || w === "wzr") return reg("ARM AArch64 register", "Zero register: reads 0, writes are discarded (same encoding as sp, chosen by instruction)");

  m = /^([vqdshb])(\d+)$/.exec(w);
  if (m && Number(m[2]) <= 31) {
    const n = Number(m[2]);
    const abi = n <= 7 ? "argument / result (caller-saved)" : n <= 15 ? "callee-saved (low 64 bits only)" : "temporary (caller-saved)";
    const notes = arrangement ? [`.${arrangement[1]}: ${arrangement[1].replace(/^(\d+)(\w)$/, (_, c, t) => `${c} lanes of ${VIEWS[t]}`).replace(/^([bhsdq])$/, (t) => `one ${VIEWS[t]} element`)}`] : undefined;
    return m[1] === "v"
      ? reg("ARM SIMD/FP register", `v${n}: 128-bit SIMD & FP register, ${abi}`, notes)
      : reg("ARM SIMD/FP register", `${m[1]}${n}: ${VIEWS[m[1]]} view of v${n}, ${abi}`);
  }
  const sys = SYSREGS.get(w);
  return sys && reg("ARM system register", sys.summary);
}

function describeInstr(word: string): HoverDoc | undefined {
  const w = word.toLowerCase();
  const cond = /^(b|bc)\.(\w+)$/.exec(w);
  if (cond && CONDITIONS[cond[2]]) {
    const e = INSTR.get(`${cond[1]}.cond`)!;
    return { title: word, tag: "ARM AArch64 instruction", ...e, notes: [`Branches if ${CONDITIONS[cond[2]]}`] };
  }
  const e = INSTR.get(w);
  return e && { title: word, tag: "ARM AArch64 instruction", ...e };
}

export const SYSREG_NAMES: readonly string[] = [...SYSREGS.keys()];

export function describeArm64(text: string, kind: TokenKind): HoverDoc | undefined {
  if (kind === "mnemonic") return describeInstr(text);
  if (kind === "register") return describeRegister(text);
  return undefined;
}
