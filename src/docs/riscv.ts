import type { HoverDoc, TokenKind } from "../tokenizer/types";
import { docTable, type DocEntry } from "./table";

const INSTR = docTable(`
lui ¦ Load upper immediate ¦ lui rd, imm20 ¦ rd = sext(imm20 << 12)
auipc ¦ Add upper immediate to PC ¦ auipc rd, imm20 ¦ rd = pc + sext(imm20 << 12)
jal ¦ Jump and link (±1 MiB) ¦ jal rd, offset ¦ rd = pc + 4; pc += sext(offset)
jalr ¦ Jump and link register ¦ jalr rd, offset(rs1) ¦ t = pc + 4; pc = (rs1 + sext(offset)) & ~1; rd = t
beq ¦ Branch if equal ¦ beq rs1, rs2, offset ¦ if (rs1 == rs2) pc += sext(offset)
bne ¦ Branch if not equal ¦ bne rs1, rs2, offset ¦ if (rs1 != rs2) pc += sext(offset)
blt ¦ Branch if less than (signed) ¦ blt rs1, rs2, offset ¦ if (rs1 <s rs2) pc += sext(offset)
bge ¦ Branch if greater or equal (signed) ¦ bge rs1, rs2, offset ¦ if (rs1 >=s rs2) pc += sext(offset)
bltu ¦ Branch if less than (unsigned) ¦ bltu rs1, rs2, offset ¦ if (rs1 <u rs2) pc += sext(offset)
bgeu ¦ Branch if greater or equal (unsigned) ¦ bgeu rs1, rs2, offset ¦ if (rs1 >=u rs2) pc += sext(offset)
lb ¦ Load byte, sign-extended ¦ lb rd, offset(rs1) ¦ rd = sext(M8[rs1 + sext(offset)])
lh ¦ Load halfword, sign-extended ¦ lh rd, offset(rs1) ¦ rd = sext(M16[rs1 + sext(offset)])
lw ¦ Load word (sign-extended on RV64) ¦ lw rd, offset(rs1) ¦ rd = sext(M32[rs1 + sext(offset)])
lbu ¦ Load byte, zero-extended ¦ lbu rd, offset(rs1) ¦ rd = zext(M8[rs1 + sext(offset)])
lhu ¦ Load halfword, zero-extended ¦ lhu rd, offset(rs1) ¦ rd = zext(M16[rs1 + sext(offset)])
lwu ¦ Load word, zero-extended (RV64) ¦ lwu rd, offset(rs1) ¦ rd = zext(M32[rs1 + sext(offset)])
ld ¦ Load doubleword (RV64) ¦ ld rd, offset(rs1) ¦ rd = M64[rs1 + sext(offset)]
sb ¦ Store byte ¦ sb rs2, offset(rs1) ¦ M8[rs1 + sext(offset)] = rs2[7:0]
sh ¦ Store halfword ¦ sh rs2, offset(rs1) ¦ M16[rs1 + sext(offset)] = rs2[15:0]
sw ¦ Store word ¦ sw rs2, offset(rs1) ¦ M32[rs1 + sext(offset)] = rs2[31:0]
sd ¦ Store doubleword (RV64) ¦ sd rs2, offset(rs1) ¦ M64[rs1 + sext(offset)] = rs2
addi ¦ Add immediate ¦ addi rd, rs1, imm12 ¦ rd = rs1 + sext(imm12)
slti ¦ Set if less than immediate (signed) ¦ slti rd, rs1, imm12 ¦ rd = (rs1 <s sext(imm12)) ? 1 : 0
sltiu ¦ Set if less than immediate (unsigned compare) ¦ sltiu rd, rs1, imm12 ¦ rd = (rs1 <u sext(imm12)) ? 1 : 0
xori ¦ XOR immediate ¦ xori rd, rs1, imm12 ¦ rd = rs1 ^ sext(imm12)
ori ¦ OR immediate ¦ ori rd, rs1, imm12 ¦ rd = rs1 | sext(imm12)
andi ¦ AND immediate ¦ andi rd, rs1, imm12 ¦ rd = rs1 & sext(imm12)
slli ¦ Shift left logical immediate ¦ slli rd, rs1, shamt ¦ rd = rs1 << shamt
srli ¦ Shift right logical immediate ¦ srli rd, rs1, shamt ¦ rd = rs1 >>u shamt
srai ¦ Shift right arithmetic immediate ¦ srai rd, rs1, shamt ¦ rd = rs1 >>s shamt
add ¦ Add ¦ add rd, rs1, rs2 ¦ rd = rs1 + rs2
sub ¦ Subtract ¦ sub rd, rs1, rs2 ¦ rd = rs1 - rs2
sll ¦ Shift left logical ¦ sll rd, rs1, rs2 ¦ rd = rs1 << rs2[log2(XLEN)-1:0]
slt ¦ Set if less than (signed) ¦ slt rd, rs1, rs2 ¦ rd = (rs1 <s rs2) ? 1 : 0
sltu ¦ Set if less than (unsigned) ¦ sltu rd, rs1, rs2 ¦ rd = (rs1 <u rs2) ? 1 : 0
xor ¦ Exclusive OR ¦ xor rd, rs1, rs2 ¦ rd = rs1 ^ rs2
srl ¦ Shift right logical ¦ srl rd, rs1, rs2 ¦ rd = rs1 >>u rs2[log2(XLEN)-1:0]
sra ¦ Shift right arithmetic ¦ sra rd, rs1, rs2 ¦ rd = rs1 >>s rs2[log2(XLEN)-1:0]
or ¦ OR ¦ or rd, rs1, rs2 ¦ rd = rs1 | rs2
and ¦ AND ¦ and rd, rs1, rs2 ¦ rd = rs1 & rs2
fence ¦ Memory ordering fence: accesses in pred complete before accesses in succ (i/o = device input/output, r/w = memory) ¦ fence pred, succ ¦ e.g. fence rw, rw = full barrier
fence.i ¦ Instruction fence (Zifencei): later instruction fetches see earlier stores, needed after writing code ¦ fence.i
fence.tso ¦ Total-store-order fence (orders all but store→load) ¦ fence.tso
ecall ¦ Environment call: traps to the next privilege level (system call, or SBI call from S-mode) ¦ ecall ¦ mcause/scause = 8 (from U), 9 (from S), 11 (from M)
ebreak ¦ Breakpoint exception (cause 3) ¦ ebreak
addiw ¦ Add immediate word (RV64) ¦ addiw rd, rs1, imm12 ¦ rd = sext((rs1 + sext(imm12))[31:0])
slliw ¦ Shift left logical immediate word (RV64) ¦ slliw rd, rs1, shamt ¦ rd = sext((rs1 << shamt)[31:0])
srliw ¦ Shift right logical immediate word (RV64) ¦ srliw rd, rs1, shamt ¦ rd = sext(rs1[31:0] >>u shamt)
sraiw ¦ Shift right arithmetic immediate word (RV64) ¦ sraiw rd, rs1, shamt ¦ rd = sext(rs1[31:0] >>s shamt)
addw ¦ Add word (RV64) ¦ addw rd, rs1, rs2 ¦ rd = sext((rs1 + rs2)[31:0])
subw ¦ Subtract word (RV64) ¦ subw rd, rs1, rs2 ¦ rd = sext((rs1 - rs2)[31:0])
sllw ¦ Shift left logical word (RV64) ¦ sllw rd, rs1, rs2 ¦ rd = sext((rs1 << rs2[4:0])[31:0])
srlw ¦ Shift right logical word (RV64) ¦ srlw rd, rs1, rs2 ¦ rd = sext(rs1[31:0] >>u rs2[4:0])
sraw ¦ Shift right arithmetic word (RV64) ¦ sraw rd, rs1, rs2 ¦ rd = sext(rs1[31:0] >>s rs2[4:0])
mul ¦ Multiply, low XLEN bits (M) ¦ mul rd, rs1, rs2 ¦ rd = (rs1 × rs2)[XLEN-1:0]
mulh ¦ Multiply high, signed × signed (M) ¦ mulh rd, rs1, rs2 ¦ rd = (rs1 ×s rs2) >> XLEN
mulhsu ¦ Multiply high, signed × unsigned (M) ¦ mulhsu rd, rs1, rs2 ¦ rd = (rs1 ×s rs2 unsigned) >> XLEN
mulhu ¦ Multiply high, unsigned × unsigned (M) ¦ mulhu rd, rs1, rs2 ¦ rd = (rs1 ×u rs2) >> XLEN
div ¦ Divide, signed (M); divide by zero gives -1, no trap ¦ div rd, rs1, rs2 ¦ rd = rs1 /s rs2
divu ¦ Divide, unsigned (M); divide by zero gives all ones ¦ divu rd, rs1, rs2 ¦ rd = rs1 /u rs2
rem ¦ Remainder, signed (M); by zero gives rs1 ¦ rem rd, rs1, rs2 ¦ rd = rs1 %s rs2
remu ¦ Remainder, unsigned (M); by zero gives rs1 ¦ remu rd, rs1, rs2 ¦ rd = rs1 %u rs2
mulw ¦ Multiply word (RV64 M) ¦ mulw rd, rs1, rs2 ¦ rd = sext((rs1 × rs2)[31:0])
divw ¦ Divide word, signed (RV64 M) ¦ divw rd, rs1, rs2 ¦ rd = sext(rs1[31:0] /s rs2[31:0])
divuw ¦ Divide word, unsigned (RV64 M) ¦ divuw rd, rs1, rs2 ¦ rd = sext(rs1[31:0] /u rs2[31:0])
remw ¦ Remainder word, signed (RV64 M) ¦ remw rd, rs1, rs2 ¦ rd = sext(rs1[31:0] %s rs2[31:0])
remuw ¦ Remainder word, unsigned (RV64 M) ¦ remuw rd, rs1, rs2 ¦ rd = sext(rs1[31:0] %u rs2[31:0])
lr ¦ Load-reserved (A): loads and registers a reservation on the address ¦ lr.{w,d} rd, (rs1) ¦ rd = M[rs1]; reserve(rs1)
sc ¦ Store-conditional (A): stores only if the reservation still holds ¦ sc.{w,d} rd, rs2, (rs1) ¦ if reserved(rs1) { M[rs1] = rs2; rd = 0 } else rd = nonzero
amoswap ¦ Atomic swap (A) ¦ amoswap.{w,d} rd, rs2, (rs1) ¦ atomically: rd = M[rs1]; M[rs1] = rs2
amoadd ¦ Atomic add (A) ¦ amoadd.{w,d} rd, rs2, (rs1) ¦ atomically: rd = M[rs1]; M[rs1] = rd + rs2
amoxor ¦ Atomic XOR (A) ¦ amoxor.{w,d} rd, rs2, (rs1) ¦ atomically: rd = M[rs1]; M[rs1] = rd ^ rs2
amoand ¦ Atomic AND (A) ¦ amoand.{w,d} rd, rs2, (rs1) ¦ atomically: rd = M[rs1]; M[rs1] = rd & rs2
amoor ¦ Atomic OR (A) ¦ amoor.{w,d} rd, rs2, (rs1) ¦ atomically: rd = M[rs1]; M[rs1] = rd | rs2
amomin ¦ Atomic minimum, signed (A) ¦ amomin.{w,d} rd, rs2, (rs1) ¦ atomically: rd = M[rs1]; M[rs1] = min_s(rd, rs2)
amomax ¦ Atomic maximum, signed (A) ¦ amomax.{w,d} rd, rs2, (rs1) ¦ atomically: rd = M[rs1]; M[rs1] = max_s(rd, rs2)
amominu ¦ Atomic minimum, unsigned (A) ¦ amominu.{w,d} rd, rs2, (rs1) ¦ atomically: rd = M[rs1]; M[rs1] = min_u(rd, rs2)
amomaxu ¦ Atomic maximum, unsigned (A) ¦ amomaxu.{w,d} rd, rs2, (rs1) ¦ atomically: rd = M[rs1]; M[rs1] = max_u(rd, rs2)
csrrw ¦ Atomic read/write CSR (Zicsr) ¦ csrrw rd, csr, rs1 ¦ t = CSR; CSR = rs1; rd = t (no read side effects if rd = x0)
csrrs ¦ Atomic read and set bits in CSR (Zicsr) ¦ csrrs rd, csr, rs1 ¦ t = CSR; CSR = t | rs1; rd = t
csrrc ¦ Atomic read and clear bits in CSR (Zicsr) ¦ csrrc rd, csr, rs1 ¦ t = CSR; CSR = t & ~rs1; rd = t
csrrwi ¦ Atomic read/write CSR, immediate (Zicsr) ¦ csrrwi rd, csr, uimm5 ¦ t = CSR; CSR = zext(uimm5); rd = t
csrrsi ¦ Atomic read and set bits in CSR, immediate (Zicsr) ¦ csrrsi rd, csr, uimm5 ¦ t = CSR; CSR = t | zext(uimm5); rd = t
csrrci ¦ Atomic read and clear bits in CSR, immediate (Zicsr) ¦ csrrci rd, csr, uimm5 ¦ t = CSR; CSR = t & ~zext(uimm5); rd = t
mret ¦ Return from machine-mode trap ¦ mret ¦ pc = mepc; priv = mstatus.MPP; mstatus.MIE = MPIE; MPIE = 1; MPP = U (or least privileged)
sret ¦ Return from supervisor-mode trap ¦ sret ¦ pc = sepc; priv = sstatus.SPP; sstatus.SIE = SPIE; SPIE = 1; SPP = U
wfi ¦ Wait for interrupt: hint to stall the hart until an interrupt is pending (may be a no-op) ¦ wfi
sfence.vma ¦ Supervisor fence for virtual memory: flush TLB entries after changing page tables or satp ¦ sfence.vma rs1, rs2 ¦ rs1 = virtual address (x0 = all), rs2 = ASID (x0 = all)
flw ¦ Load single-precision float (F) ¦ flw rd, offset(rs1) ¦ f[rd] = M32[rs1 + sext(offset)]
fsw ¦ Store single-precision float (F) ¦ fsw rs2, offset(rs1) ¦ M32[rs1 + sext(offset)] = f[rs2]
fld ¦ Load double-precision float (D) ¦ fld rd, offset(rs1) ¦ f[rd] = M64[rs1 + sext(offset)]
fsd ¦ Store double-precision float (D) ¦ fsd rs2, offset(rs1) ¦ M64[rs1 + sext(offset)] = f[rs2]
flh ¦ Load half-precision float (Zfh) ¦ flh rd, offset(rs1) ¦ f[rd] = M16[rs1 + sext(offset)]
fsh ¦ Store half-precision float (Zfh) ¦ fsh rs2, offset(rs1) ¦ M16[rs1 + sext(offset)] = f[rs2]
flq ¦ Load quad-precision float (Q) ¦ flq rd, offset(rs1) ¦ f[rd] = M128[rs1 + sext(offset)]
fsq ¦ Store quad-precision float (Q) ¦ fsq rs2, offset(rs1) ¦ M128[rs1 + sext(offset)] = f[rs2]
fadd ¦ Floating-point add ¦ fadd.{s,d,h,q} rd, rs1, rs2 ¦ rd = rs1 + rs2
fsub ¦ Floating-point subtract ¦ fsub.{s,d,h,q} rd, rs1, rs2 ¦ rd = rs1 - rs2
fmul ¦ Floating-point multiply ¦ fmul.{s,d,h,q} rd, rs1, rs2 ¦ rd = rs1 × rs2
fdiv ¦ Floating-point divide ¦ fdiv.{s,d,h,q} rd, rs1, rs2 ¦ rd = rs1 / rs2
fsqrt ¦ Floating-point square root ¦ fsqrt.{s,d,h,q} rd, rs1 ¦ rd = √rs1
fmin ¦ Floating-point minimum ¦ fmin.{s,d,h,q} rd, rs1, rs2 ¦ rd = min(rs1, rs2)
fmax ¦ Floating-point maximum ¦ fmax.{s,d,h,q} rd, rs1, rs2 ¦ rd = max(rs1, rs2)
fmadd ¦ Fused multiply-add ¦ fmadd.{s,d} rd, rs1, rs2, rs3 ¦ rd = rs1 × rs2 + rs3
fmsub ¦ Fused multiply-subtract ¦ fmsub.{s,d} rd, rs1, rs2, rs3 ¦ rd = rs1 × rs2 - rs3
fnmadd ¦ Fused negated multiply-add ¦ fnmadd.{s,d} rd, rs1, rs2, rs3 ¦ rd = -(rs1 × rs2) - rs3
fnmsub ¦ Fused negated multiply-subtract ¦ fnmsub.{s,d} rd, rs1, rs2, rs3 ¦ rd = -(rs1 × rs2) + rs3
fcvt ¦ Convert between integer and floating-point formats: fcvt.<to>.<from> ¦ fcvt.w.s rd, fs1 / fcvt.s.w fd, rs1 ¦ e.g. fcvt.w.s: int32 = (int)float, fcvt.d.s: double = float
fmv ¦ Move raw bits between integer and FP registers: fmv.x.w (FP→int), fmv.w.x (int→FP) ¦ fmv.x.{w,d} rd, fs1 / fmv.{w,d}.x fd, rs1 ¦ bit pattern copied unchanged
fsgnj ¦ Sign injection: magnitude of rs1, sign of rs2 (fmv.s is fsgnj.s rd, rs, rs) ¦ fsgnj.{s,d} rd, rs1, rs2 ¦ rd = {rs2.sign, rs1[exp,frac]}
fsgnjn ¦ Sign injection, negated (fneg.s is fsgnjn.s rd, rs, rs) ¦ fsgnjn.{s,d} rd, rs1, rs2 ¦ rd = {!rs2.sign, rs1[exp,frac]}
fsgnjx ¦ Sign injection, XOR (fabs.s is fsgnjx.s rd, rs, rs) ¦ fsgnjx.{s,d} rd, rs1, rs2 ¦ rd = {rs1.sign ^ rs2.sign, rs1[exp,frac]}
feq ¦ Floating-point compare equal (result in integer register) ¦ feq.{s,d} rd, fs1, fs2 ¦ rd = (fs1 == fs2) ? 1 : 0
flt ¦ Floating-point compare less than ¦ flt.{s,d} rd, fs1, fs2 ¦ rd = (fs1 < fs2) ? 1 : 0
fle ¦ Floating-point compare less or equal ¦ fle.{s,d} rd, fs1, fs2 ¦ rd = (fs1 <= fs2) ? 1 : 0
fclass ¦ Classify float into a 10-bit one-hot mask (−∞, normal, subnormal, ±0, NaN, ...) ¦ fclass.{s,d} rd, fs1
fneg ¦ Floating-point negate (pseudo for fsgnjn) ¦ fneg.{s,d} rd, rs ¦ rd = -rs
fabs ¦ Floating-point absolute value (pseudo for fsgnjx) ¦ fabs.{s,d} rd, rs ¦ rd = |rs|
fli ¦ Load floating-point constant from a fixed table (Zfa) ¦ fli.{s,d} rd, constant
sh1add ¦ Shift left by 1 and add (Zba) ¦ sh1add rd, rs1, rs2 ¦ rd = rs2 + (rs1 << 1)
sh2add ¦ Shift left by 2 and add (Zba), e.g. indexing a word array ¦ sh2add rd, rs1, rs2 ¦ rd = rs2 + (rs1 << 2)
sh3add ¦ Shift left by 3 and add (Zba), e.g. indexing a doubleword array ¦ sh3add rd, rs1, rs2 ¦ rd = rs2 + (rs1 << 3)
andn ¦ AND with inverted operand (Zbb) ¦ andn rd, rs1, rs2 ¦ rd = rs1 & ~rs2
orn ¦ OR with inverted operand (Zbb) ¦ orn rd, rs1, rs2 ¦ rd = rs1 | ~rs2
xnor ¦ Exclusive NOR (Zbb) ¦ xnor rd, rs1, rs2 ¦ rd = ~(rs1 ^ rs2)
clz ¦ Count leading zero bits (Zbb) ¦ clz rd, rs1
ctz ¦ Count trailing zero bits (Zbb) ¦ ctz rd, rs1
cpop ¦ Count set bits / population count (Zbb) ¦ cpop rd, rs1
max ¦ Maximum, signed (Zbb) ¦ max rd, rs1, rs2 ¦ rd = max_s(rs1, rs2)
maxu ¦ Maximum, unsigned (Zbb) ¦ maxu rd, rs1, rs2 ¦ rd = max_u(rs1, rs2)
min ¦ Minimum, signed (Zbb) ¦ min rd, rs1, rs2 ¦ rd = min_s(rs1, rs2)
minu ¦ Minimum, unsigned (Zbb) ¦ minu rd, rs1, rs2 ¦ rd = min_u(rs1, rs2)
rol ¦ Rotate left (Zbb) ¦ rol rd, rs1, rs2 ¦ rd = rs1 rotl rs2
ror ¦ Rotate right (Zbb) ¦ ror rd, rs1, rs2 ¦ rd = rs1 rotr rs2
rori ¦ Rotate right immediate (Zbb) ¦ rori rd, rs1, shamt ¦ rd = rs1 rotr shamt
rev8 ¦ Reverse byte order (Zbb), endianness swap ¦ rev8 rd, rs1
clzw ctzw cpopw ¦ Word versions of clz/ctz/cpop on rs1[31:0] (RV64 Zbb) ¦ clzw rd, rs1
rolw rorw roriw ¦ Word rotates on rs1[31:0], result sign-extended (RV64 Zbb) ¦ rolw rd, rs1, rs2
sext ¦ Sign-extend: sext.b/sext.h (Zbb) or sext.w (pseudo for addiw rd, rs, 0) ¦ sext.{b,h,w} rd, rs ¦ rd = sext(rs[n-1:0])
zext ¦ Zero-extend: zext.b (andi rd, rs, 255), zext.h (Zbb), zext.w (add.uw rd, rs, zero) ¦ zext.{b,h,w} rd, rs ¦ rd = zext(rs[n-1:0])
add.uw ¦ Add unsigned word (Zba) ¦ add.uw rd, rs1, rs2 ¦ rd = rs2 + zext(rs1[31:0])
orc.b ¦ OR-combine bytes (Zbb): each byte becomes 0x00 if zero else 0xFF, for fast strlen ¦ orc.b rd, rs1
vsetvli ¦ Set vector length and element type (V) ¦ vsetvli rd, rs1, e32, m1, ta, ma ¦ vl = min(AVL = rs1, VLMAX); rd = vl
vsetivli ¦ Set vector length from a 5-bit immediate (V) ¦ vsetivli rd, uimm5, e32, m1, ta, ma ¦ vl = min(uimm5, VLMAX); rd = vl
vsetvl ¦ Set vector length and type from registers (V) ¦ vsetvl rd, rs1, rs2 ¦ vtype = rs2; vl = min(rs1, VLMAX); rd = vl
vle8 vle16 vle32 vle64 ¦ Unit-stride vector load (V) ¦ vle<eew>.v vd, (rs1), v0.t ¦ vd[i] = M[rs1 + i × eew/8]
vse8 vse16 vse32 vse64 ¦ Unit-stride vector store (V) ¦ vse<eew>.v vs3, (rs1), v0.t ¦ M[rs1 + i × eew/8] = vs3[i]
vlse8 vlse16 vlse32 vlse64 ¦ Strided vector load (V) ¦ vlse<eew>.v vd, (rs1), rs2 ¦ vd[i] = M[rs1 + i × rs2]
vadd ¦ Vector add ¦ vadd.vv vd, vs2, vs1 ¦ vd[i] = vs2[i] + vs1[i]
vsub ¦ Vector subtract ¦ vsub.vv vd, vs2, vs1 ¦ vd[i] = vs2[i] - vs1[i]
vrsub ¦ Vector reverse subtract ¦ vrsub.vx vd, vs2, rs1 ¦ vd[i] = rs1 - vs2[i]
vmul ¦ Vector multiply, low bits ¦ vmul.vv vd, vs2, vs1 ¦ vd[i] = vs2[i] × vs1[i]
vdiv vdivu ¦ Vector divide (signed / unsigned) ¦ vdiv.vv vd, vs2, vs1 ¦ vd[i] = vs2[i] / vs1[i]
vrem ¦ Vector remainder ¦ vrem.vv vd, vs2, vs1 ¦ vd[i] = vs2[i] % vs1[i]
vand vor vxor ¦ Vector bitwise AND / OR / XOR ¦ vand.vv vd, vs2, vs1 ¦ vd[i] = vs2[i] op vs1[i]
vsll vsrl vsra ¦ Vector shift left / right logical / right arithmetic ¦ vsll.vv vd, vs2, vs1 ¦ vd[i] = vs2[i] shift vs1[i]
vmin vmax ¦ Vector signed minimum / maximum ¦ vmin.vv vd, vs2, vs1
vmv ¦ Vector move: vmv.v.v / .v.x / .v.i (splat), vmv.x.s (element 0 → x), vmv.s.x (x → element 0) ¦ vmv.v.x vd, rs1
vmerge ¦ Vector merge under mask v0 ¦ vmerge.vvm vd, vs2, vs1, v0 ¦ vd[i] = v0[i] ? vs1[i] : vs2[i]
vredsum ¦ Vector sum reduction ¦ vredsum.vs vd, vs2, vs1 ¦ vd[0] = vs1[0] + Σ vs2[i]
vredmax vredmin ¦ Vector max / min reduction ¦ vredmax.vs vd, vs2, vs1 ¦ vd[0] = max(vs1[0], vs2[*])
vmacc ¦ Vector multiply-accumulate ¦ vmacc.vv vd, vs1, vs2 ¦ vd[i] += vs1[i] × vs2[i]
vnmsac ¦ Vector negated multiply-subtract-accumulate ¦ vnmsac.vv vd, vs1, vs2 ¦ vd[i] -= vs1[i] × vs2[i]
vslideup ¦ Slide elements up by an offset ¦ vslideup.vx vd, vs2, rs1 ¦ vd[i + rs1] = vs2[i]
vslidedown ¦ Slide elements down by an offset ¦ vslidedown.vx vd, vs2, rs1 ¦ vd[i] = vs2[i + rs1]
vrgather ¦ Vector register gather (permute) ¦ vrgather.vv vd, vs2, vs1 ¦ vd[i] = vs2[vs1[i]]
vmseq vmsne vmslt vmsltu vmsle vmsleu vmsgt vmsgtu ¦ Vector compare, writes a mask register ¦ vmslt.vv vd, vs2, vs1 ¦ vd.mask[i] = vs2[i] cmp vs1[i]
vfadd vfsub vfmul vfdiv ¦ Vector floating-point add / subtract / multiply / divide ¦ vfadd.vv vd, vs2, vs1 ¦ vd[i] = vs2[i] op vs1[i]
vfmacc ¦ Vector floating-point multiply-accumulate ¦ vfmacc.vv vd, vs1, vs2 ¦ vd[i] += vs1[i] × vs2[i]
vfmin vfmax ¦ Vector floating-point minimum / maximum ¦ vfmin.vv vd, vs2, vs1
vfmv ¦ Vector floating-point move (vfmv.v.f splat, vfmv.f.s, vfmv.s.f) ¦ vfmv.v.f vd, fs1
vfcvt ¦ Vector floating-point / integer conversion ¦ vfcvt.x.f.v vd, vs2
vfredosum ¦ Vector floating-point ordered sum reduction ¦ vfredosum.vs vd, vs2, vs1
vfredusum ¦ Vector floating-point unordered sum reduction ¦ vfredusum.vs vd, vs2, vs1
nop ¦ No operation (pseudo) ¦ nop ¦ addi x0, x0, 0
li ¦ Load immediate (pseudo; expands to lui/addi or longer sequences) ¦ li rd, imm ¦ rd = imm
la ¦ Load address (pseudo): auipc + addi, or a GOT load in PIC code ¦ la rd, symbol ¦ rd = &symbol
lla ¦ Load local address (pseudo, always PC-relative) ¦ lla rd, symbol ¦ auipc rd, %pcrel_hi(sym); addi rd, rd, %pcrel_lo(sym)
mv ¦ Copy register (pseudo) ¦ mv rd, rs ¦ addi rd, rs, 0
not ¦ Bitwise NOT (pseudo) ¦ not rd, rs ¦ xori rd, rs, -1
neg ¦ Negate (pseudo) ¦ neg rd, rs ¦ sub rd, x0, rs
negw ¦ Negate word (RV64 pseudo) ¦ negw rd, rs ¦ subw rd, x0, rs
seqz ¦ Set if equal to zero (pseudo) ¦ seqz rd, rs ¦ sltiu rd, rs, 1
snez ¦ Set if not equal to zero (pseudo) ¦ snez rd, rs ¦ sltu rd, x0, rs
sltz ¦ Set if less than zero (pseudo) ¦ sltz rd, rs ¦ slt rd, rs, x0
sgtz ¦ Set if greater than zero (pseudo) ¦ sgtz rd, rs ¦ slt rd, x0, rs
beqz ¦ Branch if zero (pseudo) ¦ beqz rs, offset ¦ beq rs, x0, offset
bnez ¦ Branch if not zero (pseudo) ¦ bnez rs, offset ¦ bne rs, x0, offset
blez ¦ Branch if ≤ zero (pseudo) ¦ blez rs, offset ¦ bge x0, rs, offset
bgez ¦ Branch if ≥ zero (pseudo) ¦ bgez rs, offset ¦ bge rs, x0, offset
bltz ¦ Branch if < zero (pseudo) ¦ bltz rs, offset ¦ blt rs, x0, offset
bgtz ¦ Branch if > zero (pseudo) ¦ bgtz rs, offset ¦ blt x0, rs, offset
bgt ¦ Branch if greater than, signed (pseudo) ¦ bgt rs, rt, offset ¦ blt rt, rs, offset
ble ¦ Branch if less or equal, signed (pseudo) ¦ ble rs, rt, offset ¦ bge rt, rs, offset
bgtu ¦ Branch if greater than, unsigned (pseudo) ¦ bgtu rs, rt, offset ¦ bltu rt, rs, offset
bleu ¦ Branch if less or equal, unsigned (pseudo) ¦ bleu rs, rt, offset ¦ bgeu rt, rs, offset
j ¦ Jump (pseudo) ¦ j offset ¦ jal x0, offset
jr ¦ Jump to register (pseudo) ¦ jr rs ¦ jalr x0, 0(rs)
ret ¦ Return from function (pseudo) ¦ ret ¦ jalr x0, 0(ra)
call ¦ Call a function anywhere in ±2 GiB (pseudo) ¦ call symbol ¦ auipc ra, %pcrel_hi(sym); jalr ra, %pcrel_lo(sym)(ra)
tail ¦ Tail call (pseudo): jump without saving a return address ¦ tail symbol ¦ auipc t1, %pcrel_hi(sym); jalr x0, %pcrel_lo(sym)(t1)
csrr ¦ Read CSR (pseudo) ¦ csrr rd, csr ¦ csrrs rd, csr, x0
csrw ¦ Write CSR (pseudo) ¦ csrw csr, rs ¦ csrrw x0, csr, rs
csrs ¦ Set bits in CSR (pseudo) ¦ csrs csr, rs ¦ csrrs x0, csr, rs
csrc ¦ Clear bits in CSR (pseudo) ¦ csrc csr, rs ¦ csrrc x0, csr, rs
csrwi ¦ Write CSR, immediate (pseudo) ¦ csrwi csr, uimm5 ¦ csrrwi x0, csr, uimm5
csrsi ¦ Set bits in CSR, immediate (pseudo), e.g. csrsi mstatus, 8 enables MIE ¦ csrsi csr, uimm5 ¦ csrrsi x0, csr, uimm5
csrci ¦ Clear bits in CSR, immediate (pseudo), e.g. csrci mstatus, 8 disables MIE ¦ csrci csr, uimm5 ¦ csrrci x0, csr, uimm5
rdcycle ¦ Read cycle counter (pseudo) ¦ rdcycle rd ¦ csrrs rd, cycle, x0
rdtime ¦ Read real-time counter (pseudo) ¦ rdtime rd ¦ csrrs rd, time, x0
rdinstret ¦ Read retired-instruction counter (pseudo) ¦ rdinstret rd ¦ csrrs rd, instret, x0
rdcycleh rdtimeh rdinstreth ¦ Read upper 32 bits of a counter (RV32 pseudo) ¦ rdcycleh rd ¦ csrrs rd, cycleh, x0
frcsr fscsr ¦ Read / swap the FP control and status register (pseudo) ¦ frcsr rd ¦ csrrs rd, fcsr, x0
frrm fsrm ¦ Read / swap the FP rounding mode (pseudo) ¦ frrm rd ¦ csrrs rd, frm, x0
frflags fsflags ¦ Read / swap the FP exception flags (pseudo) ¦ frflags rd ¦ csrrs rd, fflags, x0
`);

const ORDERING: Record<string, string> = {
  aq: ".aq: acquire, no later access may be observed before this one",
  rl: ".rl: release, no earlier access may be observed after this one",
  aqrl: ".aqrl: acquire + release (sequentially consistent)",
};

const FP_SUFFIX: Record<string, string> = {
  s: ".s = single precision (32-bit float)", d: ".d = double precision (64-bit)",
  h: ".h = half precision (16-bit)", q: ".q = quad precision (128-bit)",
  w: ".w = 32-bit signed integer", wu: ".wu = 32-bit unsigned integer",
  l: ".l = 64-bit signed integer", lu: ".lu = 64-bit unsigned integer", x: ".x = integer register",
};

const V_SUFFIX: Record<string, string> = {
  vv: ".vv: vector-vector", vx: ".vx: vector-scalar (x register)", vi: ".vi: vector-immediate",
  vf: ".vf: vector-scalar (f register)", wv: ".wv: wide vector op narrow vector", wx: ".wx: wide vector op scalar",
  vvm: ".vvm: vector-vector under mask v0", vxm: ".vxm: vector-scalar under mask v0", vim: ".vim: vector-immediate under mask v0",
  vs: ".vs: reduction (vector into scalar element 0)", v: ".v: vector operand",
};

/** Compressed forms whose base name differs from the full instruction. */
const C_BASE: Record<string, [string, string]> = {
  lwsp: ["lw", "sp-relative: lw rd, offset(sp)"], swsp: ["sw", "sp-relative: sw rs2, offset(sp)"],
  ldsp: ["ld", "sp-relative: ld rd, offset(sp)"], sdsp: ["sd", "sp-relative: sd rs2, offset(sp)"],
  flwsp: ["flw", "sp-relative"], fswsp: ["fsw", "sp-relative"], fldsp: ["fld", "sp-relative"], fsdsp: ["fsd", "sp-relative"],
  addi16sp: ["addi", "addi sp, sp, nzimm×16 (stack adjust)"],
  addi4spn: ["addi", "addi rd', sp, nzuimm×4 (address of a stack slot)"],
};

function describeInstr(word: string): HoverDoc | undefined {
  let w = word.toLowerCase();
  const notes: string[] = [];
  const order = /^(.*)\.(aq|rl|aqrl)$/.exec(w);
  if (order) { w = order[1]; notes.push(ORDERING[order[2]]); }

  let e = INSTR.get(w);
  if (!e && w.startsWith("c.")) {
    const rest = w.slice(2);
    const mapped = C_BASE[rest];
    e = INSTR.get(mapped ? mapped[0] : rest);
    notes.unshift("C extension: 16-bit compressed encoding; operands written x' are limited to x8–x15");
    if (mapped) notes.push(mapped[1]);
  }
  if (!e) {
    const dot = w.indexOf(".");
    if (dot > 0) {
      const base = w.slice(0, dot);
      const parts = w.slice(dot + 1).split(".");
      e = INSTR.get(base);
      if (e && base.startsWith("v")) {
        const suffix = V_SUFFIX[parts.join(".")] ?? V_SUFFIX[parts[parts.length - 1]];
        if (suffix) notes.push(suffix);
      } else if (e && (base === "lr" || base === "sc" || base.startsWith("amo"))) {
        if (parts[0] === "w") notes.unshift(".w: 32-bit word (sign-extended into rd on RV64)");
        if (parts[0] === "d") notes.unshift(".d: 64-bit doubleword (RV64)");
      } else if (e) {
        for (const p of parts) if (FP_SUFFIX[p]) notes.push(FP_SUFFIX[p]);
      }
    }
  }
  return e && { title: word, tag: "RISC-V instruction", ...withNotes(e, notes) };
}

function withNotes(e: DocEntry, notes: string[]) {
  return notes.length ? { ...e, notes } : { ...e };
}

const ABI: Array<[string, string]> = [
  ["zero", "Hard-wired zero: reads 0, writes are ignored"],
  ["ra", "Return address (caller-saved); set by jal/call"],
  ["sp", "Stack pointer (callee-saved), 16-byte aligned"],
  ["gp", "Global pointer, used for linker relaxation of nearby globals"],
  ["tp", "Thread pointer (thread-local storage; often the hart/CPU struct in kernels)"],
  ["t0", "Temporary (caller-saved); alternate link register"],
  ["t1", "Temporary (caller-saved)"], ["t2", "Temporary (caller-saved)"],
  ["s0", "Saved register / frame pointer fp (callee-saved)"],
  ["s1", "Saved register (callee-saved)"],
  ["a0", "Argument 0 / return value 0 (caller-saved); syscall return value"],
  ["a1", "Argument 1 / return value 1 (caller-saved)"],
  ...[2, 3, 4, 5, 6].map((i): [string, string] => [`a${i}`, `Argument ${i} (caller-saved)`]),
  ["a7", "Argument 7 (caller-saved); syscall number on Linux, SBI extension ID"],
  ...[2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i): [string, string] => [`s${i}`, "Saved register (callee-saved)"]),
  ["t3", "Temporary (caller-saved)"], ["t4", "Temporary (caller-saved)"],
  ["t5", "Temporary (caller-saved)"], ["t6", "Temporary (caller-saved)"],
];

const FP_ABI = (i: number): [string, string] =>
  i <= 7 ? [`ft${i}`, "FP temporary (caller-saved)"]
  : i <= 9 ? [`fs${i - 8}`, "FP saved register (callee-saved)"]
  : i <= 17 ? [`fa${i - 10}`, i <= 11 ? "FP argument / return value (caller-saved)" : "FP argument (caller-saved)"]
  : i <= 27 ? [`fs${i - 16}`, "FP saved register (callee-saved)"]
  : [`ft${i - 20}`, "FP temporary (caller-saved)"];

const CSR = docTable(`
fflags ¦ Floating-point accrued exception flags: NV DZ OF UF NX ¦ 0x001
frm ¦ Floating-point dynamic rounding mode (0 RNE, 1 RTZ, 2 RDN, 3 RUP, 4 RMM) ¦ 0x002
fcsr ¦ Floating-point control and status: frm[7:5] + fflags[4:0] ¦ 0x003
cycle ¦ Cycle counter, read-only user view of mcycle ¦ 0xC00
time ¦ Real-time counter, read-only view of the memory-mapped mtime ¦ 0xC01
instret ¦ Instructions-retired counter, read-only view of minstret ¦ 0xC02
cycleh timeh instreth ¦ Upper 32 bits of cycle / time / instret (RV32 only) ¦ 0xC80–0xC82
sstatus ¦ Supervisor status, a restricted view of mstatus: SIE(1) S interrupt enable, SPIE(5) previous SIE, SPP(8) previous privilege (0 = U, 1 = S), FS(14:13), SUM(18) allow S access to U pages, MXR(19) ¦ 0x100
sie ¦ Supervisor interrupt enable: SSIE(1) software, STIE(5) timer, SEIE(9) external ¦ 0x104
stvec ¦ Supervisor trap vector: BASE (4-byte aligned) + MODE[1:0] (0 = direct, 1 = vectored: interrupts go to BASE + 4×cause) ¦ 0x105
scounteren ¦ Which counters (cycle, time, instret, ...) U-mode may read ¦ 0x106
senvcfg ¦ Supervisor environment configuration ¦ 0x10A
sscratch ¦ Scratch register for the S-mode trap handler; usually holds the kernel stack or per-hart data while in U-mode ¦ 0x140
sepc ¦ Supervisor exception PC: address of the trapping/interrupted instruction; sret returns here (add 4 to skip an ecall) ¦ 0x141
scause ¦ Supervisor trap cause: bit XLEN-1 set for interrupts (1 S-software, 5 S-timer, 9 S-external); exceptions 2 illegal instr, 3 breakpoint, 8 ecall from U, 12/13/15 instruction/load/store page fault ¦ 0x142
stval ¦ Supervisor trap value: faulting address or illegal instruction bits ¦ 0x143
sip ¦ Supervisor interrupt pending: SSIP(1), STIP(5), SEIP(9) ¦ 0x144
stimecmp ¦ Supervisor timer compare (Sstc): S-timer interrupt pends when time ≥ stimecmp ¦ 0x14D
satp ¦ Supervisor address translation and protection: MODE (RV64 bits 63:60: 0 Bare, 8 Sv39, 9 Sv48, 10 Sv57; RV32 bit 31: Sv32), ASID, and PPN of the root page table. Follow writes with sfence.vma ¦ 0x180
mvendorid ¦ Vendor ID (JEDEC), read-only ¦ 0xF11
marchid ¦ Architecture ID, read-only ¦ 0xF12
mimpid ¦ Implementation ID, read-only ¦ 0xF13
mhartid ¦ ID of the hart running this code, read-only; hart 0 is often the boot hart ¦ 0xF14
mconfigptr ¦ Pointer to the configuration data structure ¦ 0xF15
mstatus ¦ Machine status: MIE(3) global M interrupt enable, MPIE(7) previous MIE, MPP(12:11) previous privilege (0 U, 1 S, 3 M), SIE(1), SPIE(5), SPP(8), FS(14:13) FPU state, MPRV(17), SUM(18), MXR(19), TVM(20), TW(21), TSR(22) ¦ 0x300
misa ¦ ISA and extensions: MXL in the top 2 bits (1 = 32, 2 = 64), one bit per extension letter (bit 0 = A ... bit 25 = Z) ¦ 0x301
medeleg ¦ Machine exception delegation: set bit n to handle exception n in S-mode ¦ 0x302
mideleg ¦ Machine interrupt delegation: set bit n to handle interrupt n in S-mode ¦ 0x303
mie ¦ Machine interrupt enable: MSIE(3) software, MTIE(7) timer, MEIE(11) external; SSIE(1), STIE(5), SEIE(9) ¦ 0x304
mtvec ¦ Machine trap vector: BASE (4-byte aligned) + MODE[1:0] (0 = direct, all traps to BASE; 1 = vectored, interrupts to BASE + 4×cause) ¦ 0x305
mcounteren ¦ Which counters S-mode (and below) may read ¦ 0x306
menvcfg ¦ Machine environment configuration ¦ 0x30A
mstatush ¦ Upper half of mstatus (RV32 only) ¦ 0x310
mcountinhibit ¦ Stop individual counters from incrementing ¦ 0x320
mscratch ¦ Scratch register for the M-mode trap handler, typically a pointer to per-hart context ¦ 0x340
mepc ¦ Machine exception PC: address of the trapping/interrupted instruction; mret returns here (add 4 to skip an ecall) ¦ 0x341
mcause ¦ Machine trap cause: bit XLEN-1 set for interrupts (3 M-software, 7 M-timer, 11 M-external); exceptions 0 instr misaligned, 1 instr access fault, 2 illegal instr, 3 breakpoint, 4/6 load/store misaligned, 5/7 load/store access fault, 8/9/11 ecall from U/S/M, 12/13/15 page faults ¦ 0x342
mtval ¦ Machine trap value: faulting address, or the illegal instruction's bits ¦ 0x343
mip ¦ Machine interrupt pending: MSIP(3), MTIP(7), MEIP(11); SSIP(1), STIP(5), SEIP(9) ¦ 0x344
mtinst ¦ Machine trap instruction (transformed), hypervisor extension ¦ 0x34A
mtval2 ¦ Machine second trap value, hypervisor extension ¦ 0x34B
mcycle ¦ Machine cycle counter (writable) ¦ 0xB00
minstret ¦ Machine instructions-retired counter (writable) ¦ 0xB02
`);

function pmp(name: string): DocEntry | undefined {
  const m = /^pmp(cfg|addr)(\d+)$/.exec(name);
  if (!m) return undefined;
  const n = Number(m[2]);
  if (m[1] === "cfg" && n <= 15) {
    return { summary: "PMP configuration: one byte per entry with R(0) W(1) X(2) A(4:3: 0 OFF, 1 TOR, 2 NA4, 3 NAPOT) L(7) lock", syntax: `0x${(0x3a0 + n).toString(16).toUpperCase()}` };
  }
  if (m[1] === "addr" && n <= 63) {
    return { summary: "PMP address register: physical address bits [XLEN+1:2] (the address shifted right by 2); NAPOT encodes the size in trailing ones", syntax: `0x${(0x3b0 + n).toString(16).toUpperCase()}` };
  }
  return undefined;
}

function describeRegister(word: string): HoverDoc | undefined {
  const raw = word.toLowerCase();
  const w = raw.replace(/\.t$/, "");
  const notes = raw !== w ? ["v0.t: execute only where the mask in v0 is set"] : undefined;

  let m = /^x(\d+)$/.exec(w);
  if (m && Number(m[1]) <= 31) {
    const [abi, summary] = ABI[Number(m[1])];
    return { title: word, tag: "RISC-V register", summary: `${w} = ${abi}. ${summary}` };
  }
  const abiIdx = ABI.findIndex(([name]) => name === w);
  if (abiIdx >= 0) return { title: word, tag: "RISC-V register", summary: `${w} = x${abiIdx}. ${ABI[abiIdx][1]}` };
  if (w === "fp") return { title: word, tag: "RISC-V register", summary: "fp = s0 = x8. Frame pointer (callee-saved)" };

  m = /^f(\d+)$/.exec(w);
  if (m && Number(m[1]) <= 31) {
    const [abi, summary] = FP_ABI(Number(m[1]));
    return { title: word, tag: "RISC-V FP register", summary: `${w} = ${abi}. ${summary}` };
  }
  for (let i = 0; i < 32; i++) {
    const [abi, summary] = FP_ABI(i);
    if (abi === w) return { title: word, tag: "RISC-V FP register", summary: `${w} = f${i}. ${summary}` };
  }

  m = /^v(\d+)$/.exec(w);
  if (m && Number(m[1]) <= 31) {
    const summary = m[1] === "0"
      ? "Vector register 0, also the mask register for masked (v0.t) operations"
      : `Vector register ${m[1]} (all vector registers are caller-saved)`;
    return { title: word, tag: "RISC-V vector register", summary, notes };
  }

  const csr = CSR.get(w) ?? pmp(w);
  if (csr) {
    return { title: word, tag: `RISC-V CSR · ${csr.syntax}`, summary: csr.summary };
  }
  return undefined;
}

export const CSR_NAMES: readonly string[] = [
  ...CSR.keys(),
  ...Array.from({ length: 16 }, (_, i) => `pmpcfg${i}`),
  ...Array.from({ length: 64 }, (_, i) => `pmpaddr${i}`),
];

export function describeRiscv(text: string, kind: TokenKind): HoverDoc | undefined {
  if (kind === "mnemonic") return describeInstr(text);
  if (kind === "register") return describeRegister(text);
  return undefined;
}
