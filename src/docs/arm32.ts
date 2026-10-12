import type { HoverDoc, TokenKind } from "../tokenizer/types";
import { CONDITIONS, docTable, type DocEntry } from "./table";

const INSTR = docTable(`
adc ¦ Add with carry ¦ adc{s}{cond} Rd, Rn, Op2 ¦ Rd = Rn + Op2 + C
add ¦ Add ¦ add{s}{cond} Rd, Rn, Op2 ¦ Rd = Rn + Op2
adr ¦ Form a PC-relative address ¦ adr{cond} Rd, label ¦ Rd = address of label
and ¦ Bitwise AND ¦ and{s}{cond} Rd, Rn, Op2 ¦ Rd = Rn & Op2
asr ¦ Arithmetic shift right ¦ asr{s}{cond} Rd, Rm, #n / Rs ¦ Rd = Rm >>s n
b ¦ Branch ¦ b{cond} label ¦ PC = label
bfc ¦ Bit field clear ¦ bfc Rd, #lsb, #width ¦ Rd[lsb+width-1:lsb] = 0
bfi ¦ Bit field insert ¦ bfi Rd, Rn, #lsb, #width ¦ Rd[lsb+width-1:lsb] = Rn[width-1:0]
bic ¦ Bit clear ¦ bic{s}{cond} Rd, Rn, Op2 ¦ Rd = Rn & ~Op2
bkpt ¦ Breakpoint: halts into the debugger (a HardFault on Cortex-M with no debugger attached) ¦ bkpt #imm
bl ¦ Branch with link (function call) ¦ bl{cond} label ¦ LR = return address; PC = label
blx ¦ Branch with link and exchange instruction set ¦ blx Rm / blx label ¦ LR = return address; PC = Rm & ~1; Thumb = Rm[0]
bx ¦ Branch and exchange instruction set; bx lr returns from a function, and on Cortex-M an EXC_RETURN value in LR returns from an exception ¦ bx{cond} Rm ¦ PC = Rm & ~1; Thumb = Rm[0]
bxj ¦ Branch and change to Jazelle state (legacy) ¦ bxj Rm
cbnz ¦ Compare and branch if non-zero (Thumb; forward only, r0–r7) ¦ cbnz Rn, label ¦ if (Rn != 0) PC = label
cbz ¦ Compare and branch if zero (Thumb; forward only, r0–r7) ¦ cbz Rn, label ¦ if (Rn == 0) PC = label
clrex ¦ Clear the local exclusive monitor (e.g. on context switch) ¦ clrex
clz ¦ Count leading zeros ¦ clz Rd, Rm
cmn ¦ Compare negative: sets flags from an addition ¦ cmn Rn, Op2 ¦ flags = Rn + Op2
cmp ¦ Compare: sets flags from a subtraction ¦ cmp Rn, Op2 ¦ flags = Rn - Op2
cps ¦ Change processor state / mode (A-profile, privileged) ¦ cps #mode
cpsid ¦ Disable interrupts. Cortex-M: i sets PRIMASK (masks all configurable-priority exceptions), f sets FAULTMASK. A-profile: sets CPSR.I / CPSR.F ¦ cpsid i / cpsid f
cpsie ¦ Enable interrupts. Cortex-M: i clears PRIMASK, f clears FAULTMASK. A-profile: clears CPSR.I / CPSR.F ¦ cpsie i / cpsie f
dmb ¦ Data memory barrier: memory accesses before it are observed before those after it ¦ dmb {sy, ish, ...}
dsb ¦ Data synchronization barrier: waits until all earlier memory accesses complete ¦ dsb {sy, ish, ...}
eor ¦ Bitwise exclusive OR ¦ eor{s}{cond} Rd, Rn, Op2 ¦ Rd = Rn ^ Op2
isb ¦ Instruction synchronization barrier: flushes the pipeline so later instructions see earlier changes (needed after writing CONTROL, system registers or code) ¦ isb
it ¦ If-Then (Thumb-2): makes up to 4 following instructions conditional; each T executes on cond, each E on the inverse ¦ it{x{y{z}}} cond
ldm ldmia ldmfd ¦ Load multiple, increment after (ldmfd = pop from a full-descending stack) ¦ ldm Rn{!}, {reglist} ¦ for each r: r = M[Rn]; Rn += 4
ldmib ¦ Load multiple, increment before (A32) ¦ ldmib Rn{!}, {reglist}
ldmda ¦ Load multiple, decrement after (A32) ¦ ldmda Rn{!}, {reglist}
ldmdb ¦ Load multiple, decrement before ¦ ldmdb Rn{!}, {reglist}
ldr ¦ Load word; ldr Rt, =value is a pseudo-instruction that loads from a literal pool ¦ ldr Rt, [Rn, #off]{!} / ldr Rt, [Rn], #off ¦ Rt = M32[address]
ldrb ¦ Load byte, zero-extended ¦ ldrb Rt, [Rn, #off] ¦ Rt = zext(M8[address])
ldrh ¦ Load halfword, zero-extended ¦ ldrh Rt, [Rn, #off] ¦ Rt = zext(M16[address])
ldrsb ¦ Load byte, sign-extended ¦ ldrsb Rt, [Rn, #off] ¦ Rt = sext(M8[address])
ldrsh ¦ Load halfword, sign-extended ¦ ldrsh Rt, [Rn, #off] ¦ Rt = sext(M16[address])
ldrd ¦ Load two consecutive words ¦ ldrd Rt, Rt2, [Rn, #off] ¦ Rt = M32[a]; Rt2 = M32[a + 4]
ldrex ¦ Load exclusive: loads and marks the address in the exclusive monitor (pair with strex for atomics / mutexes) ¦ ldrex Rt, [Rn] ¦ Rt = M32[Rn]; monitor = Rn
ldrexb ldrexh ldrexd ¦ Load exclusive byte / halfword / doubleword ¦ ldrexb Rt, [Rn]
ldrt ¦ Load word with unprivileged access (as if from user mode) ¦ ldrt Rt, [Rn], #off
lsl ¦ Logical shift left ¦ lsl{s}{cond} Rd, Rm, #n / Rs ¦ Rd = Rm << n
lsr ¦ Logical shift right ¦ lsr{s}{cond} Rd, Rm, #n / Rs ¦ Rd = Rm >>u n
mcr ¦ Move to coprocessor from register (e.g. write a CP15 system register) ¦ mcr p15, op1, Rt, CRn, CRm, op2
mrc ¦ Move to register from coprocessor (e.g. read a CP15 system register) ¦ mrc p15, op1, Rt, CRn, CRm, op2
mla ¦ Multiply-accumulate ¦ mla Rd, Rn, Rm, Ra ¦ Rd = Ra + Rn × Rm
mls ¦ Multiply-subtract ¦ mls Rd, Rn, Rm, Ra ¦ Rd = Ra - Rn × Rm
mov ¦ Move ¦ mov{s}{cond} Rd, Op2 ¦ Rd = Op2
movt ¦ Move to top halfword (pair with movw to build a 32-bit constant) ¦ movt Rd, #imm16 ¦ Rd[31:16] = imm16
movw ¦ Move 16-bit immediate, zero-extended ¦ movw Rd, #imm16 ¦ Rd = imm16
mrs ¦ Read a special register: CPSR/SPSR on A-profile; APSR, IPSR, MSP, PSP, PRIMASK, BASEPRI, CONTROL ... on Cortex-M ¦ mrs Rd, spec_reg ¦ Rd = spec_reg
msr ¦ Write a special register (e.g. msr PSP, r0 when switching RTOS tasks) ¦ msr spec_reg, Rn ¦ spec_reg = Rn
mul ¦ Multiply, low 32 bits ¦ mul{s} Rd, Rn, Rm ¦ Rd = (Rn × Rm)[31:0]
mvn ¦ Move NOT ¦ mvn{s}{cond} Rd, Op2 ¦ Rd = ~Op2
neg ¦ Negate (alias of rsb Rd, Rm, #0) ¦ neg Rd, Rm ¦ Rd = 0 - Rm
nop ¦ No operation ¦ nop
orn ¦ OR NOT (Thumb-2) ¦ orn{s} Rd, Rn, Op2 ¦ Rd = Rn | ~Op2
orr ¦ Bitwise OR ¦ orr{s}{cond} Rd, Rn, Op2 ¦ Rd = Rn | Op2
pkhbt ¦ Pack halfword: bottom from Rn, top from shifted Rm ¦ pkhbt Rd, Rn, Rm{, lsl #n} ¦ Rd = {Rm'[31:16], Rn[15:0]}
pop ¦ Pop registers from the stack; popping PC returns ¦ pop {reglist} ¦ ldmia sp!, {reglist}
push ¦ Push registers onto the stack (full descending) ¦ push {reglist} ¦ stmdb sp!, {reglist}
qadd ¦ Saturating add ¦ qadd Rd, Rm, Rn ¦ Rd = sat32(Rm + Rn); sets Q on saturation
qsub ¦ Saturating subtract ¦ qsub Rd, Rm, Rn ¦ Rd = sat32(Rm - Rn); sets Q on saturation
rbit ¦ Reverse bit order ¦ rbit Rd, Rm
rev ¦ Reverse byte order in a word (endianness swap) ¦ rev Rd, Rm
rev16 ¦ Reverse byte order in each halfword ¦ rev16 Rd, Rm
revsh ¦ Reverse bytes in the low halfword, sign-extend ¦ revsh Rd, Rm
ror ¦ Rotate right ¦ ror{s} Rd, Rm, #n / Rs ¦ Rd = Rm rotr n
rrx ¦ Rotate right by one through carry ¦ rrx{s} Rd, Rm ¦ Rd = {C, Rm[31:1]}
rsb ¦ Reverse subtract ¦ rsb{s}{cond} Rd, Rn, Op2 ¦ Rd = Op2 - Rn
rsc ¦ Reverse subtract with carry (A32 only) ¦ rsc{s} Rd, Rn, Op2 ¦ Rd = Op2 - Rn - !C
sbc ¦ Subtract with carry ¦ sbc{s}{cond} Rd, Rn, Op2 ¦ Rd = Rn - Op2 - !C
sbfx ¦ Signed bit field extract ¦ sbfx Rd, Rn, #lsb, #width ¦ Rd = sext(Rn[lsb+width-1:lsb])
sdiv ¦ Signed divide (result truncated toward zero) ¦ sdiv Rd, Rn, Rm ¦ Rd = Rn /s Rm
sev ¦ Send event: wakes cores waiting in wfe ¦ sev
smlal ¦ Signed multiply-accumulate long (64-bit) ¦ smlal RdLo, RdHi, Rn, Rm ¦ RdHi:RdLo += Rn ×s Rm
smull ¦ Signed multiply long (64-bit result) ¦ smull RdLo, RdHi, Rn, Rm ¦ RdHi:RdLo = Rn ×s Rm
ssat ¦ Signed saturate to n bits ¦ ssat Rd, #n, Rm ¦ Rd = clamp(Rm, -2^(n-1), 2^(n-1)-1)
stm stmia stmea ¦ Store multiple, increment after ¦ stm Rn{!}, {reglist} ¦ for each r: M[Rn] = r; Rn += 4
stmib ¦ Store multiple, increment before (A32) ¦ stmib Rn{!}, {reglist}
stmda ¦ Store multiple, decrement after (A32) ¦ stmda Rn{!}, {reglist}
stmdb stmfd ¦ Store multiple, decrement before (stmfd = push onto a full-descending stack) ¦ stmdb Rn{!}, {reglist}
str ¦ Store word ¦ str Rt, [Rn, #off]{!} / str Rt, [Rn], #off ¦ M32[address] = Rt
strb ¦ Store byte ¦ strb Rt, [Rn, #off] ¦ M8[address] = Rt[7:0]
strh ¦ Store halfword ¦ strh Rt, [Rn, #off] ¦ M16[address] = Rt[15:0]
strd ¦ Store two consecutive words ¦ strd Rt, Rt2, [Rn, #off] ¦ M32[a] = Rt; M32[a + 4] = Rt2
strex ¦ Store exclusive: stores only if the exclusive monitor still holds the address ¦ strex Rd, Rt, [Rn] ¦ if exclusive { M32[Rn] = Rt; Rd = 0 } else Rd = 1
strexb strexh strexd ¦ Store exclusive byte / halfword / doubleword ¦ strexb Rd, Rt, [Rn]
strt ¦ Store word with unprivileged access ¦ strt Rt, [Rn], #off
sub ¦ Subtract ¦ sub{s}{cond} Rd, Rn, Op2 ¦ Rd = Rn - Op2
svc swi ¦ Supervisor call: raises the SVC exception (system call; SVCall handler on Cortex-M, often used to start the first RTOS task) ¦ svc #imm
swp ¦ Swap word (deprecated; use ldrex/strex) ¦ swp Rt, Rt2, [Rn]
sxtb ¦ Sign-extend byte ¦ sxtb Rd, Rm ¦ Rd = sext(Rm[7:0])
sxth ¦ Sign-extend halfword ¦ sxth Rd, Rm ¦ Rd = sext(Rm[15:0])
tbb ¦ Table branch byte (Thumb-2 switch statement) ¦ tbb [Rn, Rm] ¦ PC += 2 × M8[Rn + Rm]
tbh ¦ Table branch halfword (Thumb-2 switch statement) ¦ tbh [Rn, Rm, lsl #1] ¦ PC += 2 × M16[Rn + 2×Rm]
teq ¦ Test equivalence: sets flags from XOR ¦ teq Rn, Op2 ¦ flags = Rn ^ Op2
tst ¦ Test bits: sets flags from AND ¦ tst Rn, Op2 ¦ flags = Rn & Op2
ubfx ¦ Unsigned bit field extract ¦ ubfx Rd, Rn, #lsb, #width ¦ Rd = zext(Rn[lsb+width-1:lsb])
udf ¦ Permanently undefined: always raises an undefined-instruction exception ¦ udf #imm
udiv ¦ Unsigned divide ¦ udiv Rd, Rn, Rm ¦ Rd = Rn /u Rm
umlal ¦ Unsigned multiply-accumulate long (64-bit) ¦ umlal RdLo, RdHi, Rn, Rm ¦ RdHi:RdLo += Rn ×u Rm
umull ¦ Unsigned multiply long (64-bit result) ¦ umull RdLo, RdHi, Rn, Rm ¦ RdHi:RdLo = Rn ×u Rm
usat ¦ Unsigned saturate to n bits ¦ usat Rd, #n, Rm ¦ Rd = clamp(Rm, 0, 2^n - 1)
uxtb ¦ Zero-extend byte ¦ uxtb Rd, Rm ¦ Rd = Rm[7:0]
uxth ¦ Zero-extend halfword ¦ uxth Rd, Rm ¦ Rd = Rm[15:0]
wfe ¦ Wait for event: sleep until an event (sev, interrupt, exclusive monitor clear) ¦ wfe
wfi ¦ Wait for interrupt: sleep until an interrupt is pending (RTOS idle loop) ¦ wfi
yield ¦ Hint that the thread is spinning ¦ yield
vabs ¦ VFP/NEON absolute value ¦ vabs.f32 Sd, Sm ¦ Sd = |Sm|
vadd ¦ VFP/NEON add ¦ vadd.f32 Sd, Sn, Sm ¦ Sd = Sn + Sm
vcmp ¦ VFP compare; flags go to FPSCR, copy them with vmrs APSR_nzcv, fpscr ¦ vcmp.f32 Sd, Sm
vcvt ¦ VFP/NEON convert between float and integer / fixed-point formats ¦ vcvt.s32.f32 Sd, Sm
vdiv ¦ VFP divide ¦ vdiv.f32 Sd, Sn, Sm ¦ Sd = Sn / Sm
vdup ¦ NEON duplicate a scalar into all lanes ¦ vdup.32 Qd, Rm
vext ¦ NEON extract a vector from a pair ¦ vext.8 Qd, Qn, Qm, #imm
vld1 vld2 vld3 vld4 ¦ NEON load with 1–4-way (de)interleave ¦ vld1.32 {Dd, Dd2}, [Rn]
vldm ¦ VFP load multiple ¦ vldm Rn{!}, {reglist}
vldr ¦ VFP load single register ¦ vldr Sd, [Rn, #off]
vmla ¦ VFP/NEON multiply-accumulate ¦ vmla.f32 Sd, Sn, Sm ¦ Sd += Sn × Sm
vmls ¦ VFP/NEON multiply-subtract ¦ vmls.f32 Sd, Sn, Sm ¦ Sd -= Sn × Sm
vmov ¦ VFP/NEON move between core, single, double and vector registers, or load an immediate ¦ vmov Sd, Rt / vmov.f32 Sd, #imm
vmrs ¦ Move from VFP system register (e.g. FPSCR) ¦ vmrs Rt, fpscr
vmsr ¦ Move to VFP system register ¦ vmsr fpscr, Rt
vmul ¦ VFP/NEON multiply ¦ vmul.f32 Sd, Sn, Sm ¦ Sd = Sn × Sm
vneg ¦ VFP/NEON negate ¦ vneg.f32 Sd, Sm ¦ Sd = -Sm
vpop ¦ Pop VFP registers from the stack ¦ vpop {reglist}
vpush ¦ Push VFP registers onto the stack (s16–s31 are callee-saved) ¦ vpush {reglist}
vsqrt ¦ VFP square root ¦ vsqrt.f32 Sd, Sm ¦ Sd = √Sm
vst1 vst2 vst3 vst4 ¦ NEON store with 1–4-way interleave ¦ vst1.32 {Dd}, [Rn]
vstm ¦ VFP store multiple ¦ vstm Rn{!}, {reglist}
vstr ¦ VFP store single register ¦ vstr Sd, [Rn, #off]
vsub ¦ VFP/NEON subtract ¦ vsub.f32 Sd, Sn, Sm ¦ Sd = Sn - Sm
vand vorr veor vbic ¦ NEON bitwise AND / OR / XOR / bit clear ¦ vand Qd, Qn, Qm
vmax vmin ¦ NEON lane-wise maximum / minimum ¦ vmax.s32 Qd, Qn, Qm
vshl vshr ¦ NEON shift left / right ¦ vshr.u32 Qd, Qm, #n
vqadd vqsub ¦ NEON saturating add / subtract ¦ vqadd.s16 Qd, Qn, Qm
vtbl ¦ NEON table lookup (byte permute) ¦ vtbl.8 Dd, {Dn}, Dm
vzip vuzp vtrn ¦ NEON interleave / de-interleave / transpose ¦ vzip.16 Dd, Dm
vrev64 ¦ NEON reverse elements within 64-bit doublewords ¦ vrev64.32 Qd, Qm
vcnt ¦ NEON count set bits per byte ¦ vcnt.8 Dd, Dm
`);

/** Picks the reading that names a documented instruction: exact, cond, s+cond, s, pre-UAL cond+s. */
function decompose(base: string): { key: string; s: boolean; cond?: string } | undefined {
  const cond2 = base.slice(-2);
  const tries: Array<{ key: string; s: boolean; cond?: string }> = [{ key: base, s: false }];
  if (CONDITIONS[cond2]) {
    const rest = base.slice(0, -2);
    tries.push({ key: rest, s: false, cond: cond2 });
    if (rest.endsWith("s")) tries.push({ key: rest.slice(0, -1), s: true, cond: cond2 });
  }
  if (base.endsWith("s")) tries.push({ key: base.slice(0, -1), s: true });
  const preUal = base.slice(-3, -1);
  if (base.endsWith("s") && CONDITIONS[preUal]) tries.push({ key: base.slice(0, -3), s: true, cond: preUal });
  return tries.find((t) => INSTR.has(t.key));
}

const QUALIFIER: Record<string, string> = {
  w: ".w: force the 32-bit Thumb-2 encoding", n: ".n: force the 16-bit Thumb encoding",
  f16: ".f16: half-precision float", f32: ".f32: single-precision float", f64: ".f64: double-precision float",
};

function describeInstr(word: string): HoverDoc | undefined {
  const w = word.toLowerCase();
  const [base, ...quals] = w.split(".");
  const notes: string[] = [];
  let e: DocEntry | undefined;

  const it = /^it([te]{0,3})$/.exec(base);
  if (it) {
    e = INSTR.get("it");
    if (it[1]) notes.push(`Block: 1st on cond, then ${it[1].split("").map((c) => (c === "t" ? "then (cond)" : "else (!cond)")).join(", ")}`);
  } else {
    const d = decompose(base);
    if (!d) return undefined;
    e = INSTR.get(d.key);
    if (d.s) notes.push("S: updates the N, Z, C, V flags");
    if (d.cond) notes.push(`Executes only if ${CONDITIONS[d.cond]}`);
  }
  for (const q of quals) {
    if (QUALIFIER[q]) notes.push(QUALIFIER[q]);
    else if (/^[siup]?\d+$/.test(q)) notes.push(`.${q}: ${q[0] === "s" ? "signed " : q[0] === "u" ? "unsigned " : q[0] === "i" ? "integer " : ""}${q.replace(/^\D/, "")}-bit elements`);
  }
  return e && { title: word, tag: "ARM AArch32 instruction", ...e, ...(notes.length ? { notes } : {}) };
}

const CORE: Array<[string[], string]> = [
  [["r0", "a1"], "Argument 1 / return value (AAPCS, caller-saved); syscall return on Linux"],
  [["r1", "a2"], "Argument 2 / high word of a 64-bit return value (caller-saved)"],
  [["r2", "a3"], "Argument 3 (caller-saved)"],
  [["r3", "a4"], "Argument 4 (caller-saved)"],
  [["r4", "v1"], "Callee-saved variable register"],
  [["r5", "v2"], "Callee-saved variable register"],
  [["r6", "v3"], "Callee-saved variable register"],
  [["r7", "v4"], "Callee-saved; frame pointer in Thumb code; syscall number in the Linux EABI"],
  [["r8", "v5"], "Callee-saved variable register"],
  [["r9", "v6", "sb"], "Platform register (static base / TLS), otherwise callee-saved"],
  [["r10", "v7", "sl"], "Callee-saved (historically the stack limit)"],
  [["r11", "v8", "fp"], "Callee-saved; frame pointer in ARM (A32) code"],
  [["r12", "ip"], "Intra-procedure-call scratch, used by linker veneers (caller-saved)"],
  [["r13", "sp"], "Stack pointer. On Cortex-M it is banked: MSP or PSP, chosen by mode and CONTROL.SPSEL"],
  [["r14", "lr"], "Link register: return address after bl/blx. In a Cortex-M exception handler it holds EXC_RETURN (e.g. 0xFFFFFFFD = return to thread mode on PSP)"],
  [["r15", "pc"], "Program counter (reads as current instruction + 8 in A32, + 4 in Thumb)"],
];

const SPECIAL = docTable(`
cpsr ¦ Current program status register: N Z C V Q flags, GE, I/F interrupt masks, T (Thumb), M[4:0] processor mode
spsr ¦ Saved program status register: CPSR of the interrupted code, restored on exception return
apsr ¦ Application program status register: N Z C V Q (and GE) flags
fpscr ¦ Floating-point status and control: N Z C V compare flags, rounding mode, exception flags
msp ¦ Main stack pointer (Cortex-M): used by exception handlers, and by thread mode when CONTROL.SPSEL = 0. Reset loads it from vector table entry 0
psp ¦ Process stack pointer (Cortex-M): used in thread mode when CONTROL.SPSEL = 1; an RTOS gives each task its own PSP and swaps it in PendSV
primask ¦ Priority mask (Cortex-M): 1 masks every exception with configurable priority (all but NMI and HardFault). Set by cpsid i
faultmask ¦ Fault mask (Cortex-M, v7-M+): 1 also masks HardFault, only NMI can preempt. Set by cpsid f
basepri ¦ Base priority mask (Cortex-M, v7-M+): masks exceptions whose priority value is ≥ BASEPRI (lower urgency); 0 disables masking. Used by RTOS critical sections
basepri_max ¦ Conditional write to BASEPRI (Cortex-M): only takes effect if it raises the masking level
control ¦ CONTROL (Cortex-M): bit 0 nPRIV (thread mode unprivileged), bit 1 SPSEL (thread mode uses PSP), bit 2 FPCA (FP context active). Follow writes with isb
xpsr ¦ Combined program status register (Cortex-M): APSR + IPSR + EPSR; the top word of the 8-word exception stack frame (r0–r3, r12, lr, pc, xPSR)
ipsr ¦ Interrupt program status register (Cortex-M): number of the exception being handled (0 = thread mode, 2 NMI, 3 HardFault, 11 SVCall, 14 PendSV, 15 SysTick, 16+ external IRQ n−16)
epsr ¦ Execution program status register (Cortex-M): Thumb bit and IT/ICI state
iapsr eapsr iepsr ¦ Combined views of IPSR/EPSR/APSR (Cortex-M)
msplim psplim ¦ Stack limit registers (ARMv8-M): a stack overflow below the limit raises a fault
`);

function describeRegister(word: string): HoverDoc | undefined {
  const w = word.toLowerCase();
  const psr = /^(cpsr|spsr|apsr)_(\w+)$/.exec(w);
  const key = psr ? psr[1] : w;
  for (const [names, summary] of CORE) {
    if (names.includes(key)) {
      const alias = names.filter((n) => n !== key).join(" = ");
      return { title: word, tag: "ARM AArch32 register", summary: `${key}${alias ? ` = ${alias}` : ""}. ${summary}` };
    }
  }
  const special = SPECIAL.get(key);
  if (special) {
    return {
      title: word, tag: "ARM special register", ...special,
      ...(psr ? { notes: [`_${psr[2]}: write only these fields (f flags, s status, x extension, c control; nzcvq = flags)`] } : {}),
    };
  }
  let m = /^s(\d+)$/.exec(key);
  if (m && Number(m[1]) <= 31) {
    return { title: word, tag: "ARM VFP register", summary: `Single-precision register, overlaps the ${Number(m[1]) % 2 ? "upper" : "lower"} half of d${Math.floor(Number(m[1]) / 2)}. s0–s15 are arguments/scratch, s16–s31 callee-saved` };
  }
  m = /^d(\d+)$/.exec(key);
  if (m && Number(m[1]) <= 31) {
    const n = Number(m[1]);
    return { title: word, tag: "ARM VFP/NEON register", summary: `Double-precision / 64-bit vector register${n < 16 ? ` = s${2 * n}:s${2 * n + 1}` : ""}, half of q${n >> 1}. d0–d7 arguments/scratch, d8–d15 callee-saved` };
  }
  m = /^q(\d+)$/.exec(key);
  if (m && Number(m[1]) <= 15) {
    const n = Number(m[1]);
    return { title: word, tag: "ARM NEON register", summary: `128-bit vector register = d${2 * n}:d${2 * n + 1}. q4–q7 are callee-saved` };
  }
  return undefined;
}

export const SPECIAL_NAMES: readonly string[] = [...SPECIAL.keys()];

export function describeArm32(text: string, kind: TokenKind): HoverDoc | undefined {
  if (kind === "mnemonic") return describeInstr(text);
  if (kind === "register") return describeRegister(text);
  return undefined;
}
