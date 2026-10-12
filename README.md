# Asmligh

Syntax highlighting for assembly code blocks in Obsidian.

| Fence tag | Dialect |
|---|---|
| `riscv`, `risc-v`, `rv`, `rv32`, `rv64` | RISC-V (I, M, A, F, D, C, Zicsr, Zba/Zbb, common V) |
| `arm32`, `arm`, `thumb` | ARM AArch32 / Thumb-2, VFP/NEON |
| `arm64`, `aarch64`, `a64` | ARMv8 AArch64, FP/SIMD |

Works in Reading view, Live Preview and Source mode, using your theme's code colors.

Every token gets an `asmligh-<kind>` class (`comment`, `label`, `mnemonic`, `directive`, `register`, `number`, `string`, `reloc`), which you can target from a CSS snippet:

    .asmligh-register { color: var(--color-orange); }

Unknown first words (macros, typos) are left uncolored on purpose.
