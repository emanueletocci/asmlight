# Asmligh

Obsidian plugin for systems and embedded notes. It does three things:

- **Syntax highlighting** for assembly (RISC-V, ARM AArch32/Thumb, AArch64), Makefiles, GNU ld linker scripts and Devicetree source.
- **Hover cards** that explain instructions, registers, CSRs and keywords.
- **Register diagrams** (`regmap` blocks) that draw a register's bitfields and can decode a value.

![Hover card on a RISC-V CSR](docs/hover.png)

It works in Reading view, Live Preview and Source mode, and uses your theme's code colors. The screenshots show a light theme.

## Languages

| Fence tag | Language |
|---|---|
| `riscv`, `risc-v`, `rv`, `rv32`, `rv64` | RISC-V (I, M, A, F, D, C, Zicsr, Zba/Zbb, common V) with all standard CSR names |
| `arm32`, `arm`, `thumb` | ARM AArch32 / Thumb-2, VFP/NEON, Cortex-M special registers |
| `arm64`, `aarch64`, `a64` | ARMv8 AArch64, FP/SIMD, EL1–EL3 system registers, GICv3 CPU interface |
| `makefile`, `make`, `mk`, `mak` | GNU Make |
| `linker`, `ld`, `lds`, `linkerscript`, `linker-script` | GNU ld linker script |
| `dts`, `dtsi`, `devicetree`, `device-tree` | Devicetree source |

Fence tags are case-insensitive. In assembly, an unknown first word (a macro or a typo) is left uncolored on purpose.

### Devicetree

![Devicetree highlighting](docs/devicetree.png)

Highlighted:

- Node names, with unit addresses (`serial@10000000`).
- Labels (`uart0:`) and references (`&uart0`, `&{/soc/clk}`).
- Property names, including `#address-cells` and vendor names such as `riscv,isa`.
- Cell lists `< >` and bytestrings `[ ]`.
- `dt-bindings` constants (`GIC_SPI`, `IRQ_TYPE_LEVEL_HIGH`).
- `/dts-v1/`, `/delete-node/` and the other `/…/` directives.
- C-preprocessor lines (`#include`, `#define`).

## Hover cards

Hover over a highlighted word in a code block to see what it does:

| In | Covered |
|---|---|
| RISC-V | Every highlighted instruction, with syntax and pseudo-code. Suffixes are explained (`.aq`/`.rl`, `.w`/`.d`, `.s`/`.d`, vector `.vv`/`.vx`/`.vi`); `c.*` forms map to their full instruction. Registers show their ABI name and calling-convention role (`a0` = `x10`, caller/callee-saved). CSRs show their address and key fields (`mstatus`, `mtvec`, `mcause`, `mepc`, `satp`, `pmpcfg0`, …). |
| ARM AArch32 | Every highlighted instruction. Suffixes are decoded: `S` (sets flags), condition codes (`addseq` → add + S + EQ), `.w`/`.n`, data types, and `IT` block patterns. Registers show AAPCS roles. Cortex-M special registers are covered: `MSP`, `PSP`, `PRIMASK`, `BASEPRI`, `FAULTMASK`, `CONTROL`, `IPSR` (with the exception numbers). |
| ARM AArch64 | Every highlighted instruction, including `b.<cond>`. Registers show AAPCS64 roles; `w`/`q`/`d` views and `v0.4s` arrangements are explained. System registers: `VBAR_EL1`, `ESR_EL1` (exception classes), `SCTLR_EL1`, `TCR`/`TTBR`/`MAIR`, generic timer, GICv3 `ICC_*`, and more. |
| Makefile | Directives, built-in functions, special targets (`.PHONY`), automatic variables (`$@`, `$<`, `$^`, `$(@D)`, …), common variables (`CC`, `CFLAGS`, `LDFLAGS`, `MAKE`, `CROSS_COMPILE`, …), assignment operators and recipe prefixes. |
| Linker script | Commands (`SECTIONS`, `KEEP`, `PROVIDE`, `AT`, `NOLOAD`, `/DISCARD/`, …), built-in functions (`ALIGN`, `LOADADDR`, `ORIGIN`, `SIZEOF`, …), the location counter `.` and region `>`. |
| Devicetree | Standard properties (`compatible`, `reg`, `ranges`, `interrupts`, `clocks`, `status`, …), generic patterns (`*-gpios`, `*-supply`, `pinctrl-N`, `#*-cells`), `/chosen` properties, RISC-V CPU properties, special nodes and `dt-bindings` constants. |

Settings > Asmligh has three options:

- **Hover cards:** turn the cards on or off.
- **Require Ctrl/Cmd:** only show a card while Ctrl (Cmd on macOS) is held, like Obsidian's page preview.
- **Hover delay:** how long to wait before a card appears.

On mobile, tap a highlighted word in Reading view to show its card.

## Register diagrams (`regmap`)

A `regmap` (or `bitfield`) code block turns a plain-text register description into a diagram with a legend:

````
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

Syntax, one item per line:

| Line | Meaning |
|---|---|
| `name: WIDTH` | Starts a register. Quote names with spaces: `"Sv39 PTE": 64`. Text after the width is a caption. |
| `name: WIDTH / N` | Draws N bits per row (default: 32). Use this to split wide registers. |
| `name: WIDTH = VALUE` or `= VALUE` | Decodes a value: shows each bit, and each field's value in the legend. Accepts hex `0x…`, binary `0b…`, octal `0o…`, decimal, and `_` separators. |
| `NAME HI:LO description` | A field. Also accepted: `HI-LO`, `[HI:LO]`, or a single bit number. |
| `… {0: U, 1: S, 3: M}` | Named values at the end of a description. With a value set, the legend shows the match (`0b11 (3) → M`). |
| `-`, `0`, `1`, `RES0`, `RES1`, `WPRI`, `reserved` | Reserved field names. They are drawn hatched; `-` also has no label. |
| `# comment` or `// comment` | Ignored. |

Bits you don't list are drawn hatched. One block can hold several registers. If something is wrong, an error is shown above the diagram: overlapping fields, a bit outside the register, a value that doesn't fit, or a line that can't be parsed.

If you leave out the header, the width is the next of 8/16/32/64/128 that fits the highest bit.

## Styling

Every highlighted token gets an `asmligh-<kind>` class. The kinds are:

- `comment`, `label`, `mnemonic`, `directive`, `register`, `number`, `string`, `reloc`
- `keyword`, `function`, `variable`, `operator`, `property`

Each token also gets an `asmligh-lang-<id>` class. The editor prefixes classes with `cm-`, so target both forms in a CSS snippet:

    .asmligh-register, .cm-asmligh-register { color: var(--color-orange); }

Hover cards use `.asmligh-hover`. Diagrams use `.asmligh-regmap` and set its width per bit with `--asmligh-bit-width`.

## Install

Build with `npm install && npm run build` (`main.js` is a build artifact). Copy `main.js`, `manifest.json` and `styles.css` into `<vault>/.obsidian/plugins/asmligh/`, then enable the plugin in Settings > Community plugins.

## Development

`npm test` runs the test suite:

- tokenizer tests per language;
- a check that every highlighted instruction and register has a hover card;
- `regmap` parsing and rendering;
- hover behaviour under happy-dom.
