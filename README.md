# Asmligh

Syntax highlighting for assembly, Makefile and linker script code blocks in Obsidian.

| Fence tag | Dialect |
|---|---|
| `riscv`, `risc-v`, `rv`, `rv32`, `rv64` | RISC-V (I, M, A, F, D, C, Zicsr, Zba/Zbb, common V) |
| `arm32`, `arm`, `thumb` | ARM AArch32 / Thumb-2, VFP/NEON |
| `arm64`, `aarch64`, `a64` | ARMv8 AArch64, FP/SIMD |
| `makefile`, `make`, `mk`, `mak` | GNU Make |
| `linker`, `ld`, `lds`, `linkerscript`, `linker-script` | GNU ld linker script |

Works in Reading view, Live Preview and Source mode, using your theme's code colors.

Every token gets an `asmligh-<kind>` class (`comment`, `label`, `mnemonic`, `directive`, `register`, `number`, `string`, `reloc`, plus `keyword`, `function`, `variable` and `operator` for Makefiles and linker scripts), which you can target from a CSS snippet. Use both selectors so it works in every view (the editor prefixes classes with `cm-`):

    .asmligh-register, .cm-asmligh-register { color: var(--color-orange); }

Token colors come from your theme's standard code colors (keyword, number, string, variable, and so on), so labels, directives and relocations pick up theme colors in both the editor and Reading view.

## Install

Build with `npm install && npm run build` (`main.js` is a build artifact), then copy `main.js` and `manifest.json` into `<vault>/.obsidian/plugins/asmligh/` and enable the plugin in Settings > Community plugins.

Unknown first words (macros, typos) are left uncolored on purpose.

## Makefiles and linker scripts

- **Makefile**: targets are `label`, special targets like `.PHONY` are `directive`, `ifeq`/`include`/`define`/... are `keyword`, variable names and `$(VAR)`/`$@` references are `variable`, `$(wildcard ...)`-style calls are `function`, and `:=`/`+=`/`:`/recipe prefixes (`@`, `-`, `+`) are `operator`. Recipe lines get shell strings and comments. Make requires tabs before recipes, but since notes often use spaces, any indented line after a rule is treated as a recipe.
- **Linker script**: commands such as `SECTIONS`, `MEMORY`, `KEEP` and `PROVIDE` are `keyword`, built-ins such as `ALIGN`, `ORIGIN` and `SIZEOF` are `function`, section names and memory regions are `label`, assigned symbols and `.` are `variable`, and assignment operators and region `>` are `operator`. Sizes like `64K` are numbers, and `#include`-style lines (for preprocessed `.lds.S` files) are `directive`.
