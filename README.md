# Asmlight

An Obsidian plugin for low-level and embedded-systems notes. It adds:

- **Syntax highlighting** for RISC-V, ARM (AArch32/Thumb and AArch64) assembly, Makefiles, GNU ld linker scripts and Devicetree source.
- **Hover cards** that explain the instruction, register, CSR or keyword under your mouse.
- **Register diagrams** that turn a short plain-text description into a bitfield drawing, and can decode a value for you.

![Hover card on a RISC-V CSR](docs/hover.png)

It works in Reading view, Live Preview and Source mode, on desktop and mobile, and uses your theme's colors.

- [Install](#install)
- [Quick start](#quick-start)
- [Languages](#languages)
- [Hover cards](#hover-cards)
- [Register diagrams](#register-diagrams)
- [Customizing colors](#customizing-colors)
- [Known limitations](#known-limitations)
- [Development](#development)

## Install

Asmlight isn't in the community plugin list yet, so install it by hand:

1. Build it: `git clone https://github.com/mecilh/asmlight && cd asmlight && npm install && npm run build`
2. Create the folder `<your vault>/.obsidian/plugins/asmlight/`.
3. Copy `main.js`, `manifest.json` and `styles.css` into that folder. All three are needed: `styles.css` styles the hover cards and diagrams.
4. In Obsidian, go to **Settings → Community plugins**, reload the list and enable **Asmlight**.

> **Upgrading from an `asmligh` build?** The plugin id was misspelled before 0.3.0. Delete the old `.obsidian/plugins/asmligh/` folder. Also change `asmligh` to `asmlight` in any CSS snippets you wrote.

## Quick start

Paste this into a note:

````markdown
```riscv
trap_entry:
    csrrw sp, mscratch, sp      # swap in the kernel stack
    csrr  t0, mcause
    bltz  t0, handle_irq        # top bit set = interrupt
    mret
```

```regmap
mstatus: 32 = 0x1888
MPP  12:11  Previous privilege {0: U, 1: S, 3: M}
MPIE 7      Previous MIE
MIE  3      Machine interrupt enable
```
````

The first block is highlighted: hover `mcause` or `mret` to see what they do. The second block becomes a diagram of `mstatus`, with the value decoded: MPP = M-mode, MPIE = 1, MIE = 1.

## Languages

Use one of these tags after the opening ```` ``` ````. Tags are case-insensitive.

| Language | Fence tags | What's covered |
|---|---|---|
| RISC-V | `riscv` `risc-v` `rv` `rv32` `rv64` | I, M, A, F, D, C, Zicsr, Zifencei, Zba/Zbb, common V, pseudo-instructions, all standard CSRs |
| ARM AArch32 | `arm32` `arm` `thumb` | ARM and Thumb-2, VFP/NEON, Cortex-M special registers (`MSP`, `PSP`, `BASEPRI`, …) |
| ARM AArch64 | `arm64` `aarch64` `a64` | ARMv8-A, FP/SIMD, LSE atomics, EL1–EL3 system registers, GICv3 CPU interface |
| Makefile | `makefile` `make` `mk` `mak` | GNU Make: rules, recipes, variables, functions, conditionals, `define` blocks |
| Linker script | `linker` `ld` `lds` `linkerscript` `linker-script` | GNU ld: `MEMORY`, `SECTIONS`, region placement, symbol assignments |
| Devicetree | `dts` `dtsi` `devicetree` `device-tree` | Nodes, labels, `&references`, properties, cells, `dt-bindings` macros, `/…/` directives |

![Devicetree highlighting](docs/devicetree.png)

All three assembly languages accept GNU-style comments and directives (`#`, `//`, `/* */`, `@`, `;`, `.word`, `%hi(sym)`, `:lo12:sym`, `1f`/`1b` local labels). In assembly, an unknown first word, such as a macro or a typo, is left uncolored on purpose.

## Hover cards

Hover over any highlighted word to see a short explanation. Some examples:

| Hover over | You'll see |
|---|---|
| `addi`, `ldp`, `stmdb` | What the instruction does, its syntax and pseudo-code |
| `addseq`, `bls`, `itete` | ARM suffixes decoded: `add` + S (sets flags) + EQ (if Z == 1) |
| `amoadd.w.aqrl`, `fcvt.w.s`, `vadd.vx` | RISC-V suffixes decoded: operand width, memory ordering, vector operand kinds |
| `a0`, `x29`, `r7`, `v8` | Calling-convention role: argument, caller-saved, callee-saved, syscall number, … |
| `mcause`, `mtvec`, `satp` | CSR address and fields, e.g. the trap cause codes |
| `PSP`, `BASEPRI`, `CONTROL`, `IPSR` | Cortex-M behaviour (thread vs. handler stacks, priority masking, exception numbers) |
| `ESR_EL1`, `VBAR_EL1`, `TCR_EL1` | AArch64 exception classes, vector table layout, translation control |
| `$@`, `$(patsubst`, `?=`, `.PHONY` | Make automatic variables, functions, operators and special targets |
| `KEEP`, `LOADADDR`, `AT`, `.` | Linker script commands, functions and the location counter |
| `interrupts`, `reg`, `reset-gpios` | Devicetree property meaning and format |

Options are under **Settings → Asmlight**:

- **Hover cards:** turn the cards on or off.
- **Require Ctrl/Cmd:** only show a card while Ctrl (Cmd on macOS) is held, like Obsidian's page preview.
- **Hover delay:** how long to wait before a card appears.

On mobile, tap a highlighted word in Reading view to show its card.

## Register diagrams

A `regmap` (or `bitfield`) code block describes one or more registers in plain text:

````markdown
```regmap
mstatus: 32 = 0x1888  Machine status (RV32 subset)
SD    31     State dirty
TSR   22
FS    14:13  FPU state {0: Off, 1: Initial, 2: Clean, 3: Dirty}
MPP   12:11  Previous privilege {0: U, 1: S, 3: M}
MPIE  7      Previous MIE
MIE   3      Machine interrupt enable
```
````

![regmap diagram of mstatus](docs/regmap.png)

Each line is one of:

| Line | Meaning |
|---|---|
| `name: WIDTH caption` | Starts a register, with an optional caption. Quote names that contain spaces: `"Sv39 PTE": 64`. |
| `name: WIDTH / N` | Draws N bits per row (default 32). Useful for 64-bit registers. |
| `name: WIDTH = VALUE` | Decodes VALUE: shows each bit, and each field's value in the legend. A line containing just `= VALUE` does the same. |
| `NAME HI:LO description` | A field. `HI-LO`, `[HI:LO]` or a single bit (`MIE 3`) also work. |
| `… {0: U, 1: S, 3: M}` | Named values at the end of a description. With a value set, the legend shows the match: `0b11 (3) → M`. |
| `-` `0` `1` `RES0` `RES1` `WPRI` `reserved` | Reserved field names. They are drawn hatched; `-` also has no label. |
| `# comment`, `// comment` | Ignored. |

Details:

- **Numbers:** values can be hex (`0x1888`), binary (`0b1010`), octal (`0o17`) or decimal, with `_` separators (`0x8000_0000`).
- **Gaps:** bits you don't list are drawn hatched.
- **Several registers:** one block can describe several; start each with its own `name: WIDTH` line.
- **No header:** the width becomes the smallest of 8, 16, 32, 64 or 128 that fits the highest bit.
- **Errors:** shown above the diagram. These cover overlapping fields, bits outside the register, values that don't fit, and lines that can't be read.

A good use: paste a value from GDB (`p/x $mcause`) or a datasheet next to the register description, and read off the decoded fields.

## Customizing colors

Token colors come from your theme's code colors. To change one, add a CSS snippet (**Settings → Appearance → CSS snippets**). Every highlighted token has an `asmlight-<kind>` class. The editor adds a `cm-` prefix, so target both forms:

```css
.asmlight-register, .cm-asmlight-register { color: var(--color-orange); }
```

- **Kinds:** `comment`, `label`, `mnemonic`, `directive`, `register`, `number`, `string`, `reloc`, `keyword`, `function`, `variable`, `operator`, `property`.
- **Per-language rules:** tokens also have an `asmlight-lang-<id>` class (`riscv`, `arm32`, `arm64`, `makefile`, `linker`, `dts`).
- **Hover cards:** use `.asmlight-hover`.
- **Diagrams:** use `.asmlight-regmap`. Set `--asmlight-bit-width` on it to make bit columns wider or narrower.

## Known limitations

- **Editor hover is untested.** Hover cards in Live Preview and Source mode rely on Obsidian keeping the plugin's classes on editor tokens. If cards show in Reading view but not in the editor, please open an issue.
- **Symbols named like registers get register colors.** For example, a label called `time` or `control` looks like a register, because those are also CSR or Cortex-M register names.
- **Indented Makefile lines.** Make requires a tab before recipe lines, but notes often use spaces. So any indented line after a rule is treated as a recipe.
- **Coverage is focused on what courses and bare-metal code use.** Newer or rare extensions, such as the RISC-V Zv* crypto extensions or Arm SVE, aren't covered.

## Development

```sh
npm install
npm run dev     # rebuild main.js on change
npm test        # vitest
npm run build   # typecheck + production build
```

Where things live:

- `src/lang/`: the Makefile, linker script and Devicetree tokenizers.
- `src/isa/`: assembly instruction and register tables.
- `src/docs/`: hover-card text.
- `src/regmap/`: the diagram parser and renderer.

To document a new instruction, add a row to the matching `src/docs/<isa>.ts` table. The test suite fails if any highlighted instruction or register has no hover card.

## License

MIT
