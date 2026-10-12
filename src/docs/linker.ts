import type { HoverDoc, TokenKind } from "../tokenizer/types";
import { docTable } from "./table";

const KEYWORDS = docTable(`
ENTRY ¦ Set the program entry point (first instruction executed; e_entry in the ELF header) ¦ ENTRY(Reset_Handler)
INCLUDE ¦ Include another linker script ¦ INCLUDE memory.ld
INPUT ¦ Add input files, as if named on the command line ¦ INPUT(crt0.o)
GROUP ¦ Archives searched repeatedly until no new undefined symbols are resolved ¦ GROUP(-lc -lgcc)
AS_NEEDED ¦ Inside INPUT/GROUP: link shared libraries only if needed ¦ AS_NEEDED(-lm)
OUTPUT ¦ Name of the output file ¦ OUTPUT(firmware.elf)
SEARCH_DIR ¦ Add a library search directory (like -L) ¦ SEARCH_DIR(lib)
STARTUP ¦ Link this file first ¦ STARTUP(crt0.o)
OUTPUT_FORMAT ¦ BFD output format (default, big-endian, little-endian) ¦ OUTPUT_FORMAT("elf32-littlearm")
OUTPUT_ARCH ¦ Target architecture ¦ OUTPUT_ARCH(riscv)
TARGET ¦ BFD format for input files ¦ TARGET(binary)
REGION_ALIAS ¦ Give a memory region another name, so one script works for several memory layouts ¦ REGION_ALIAS("REGION_TEXT", FLASH)
ASSERT ¦ Fail the link with a message if the expression is zero ¦ ASSERT(_end <= ORIGIN(RAM) + LENGTH(RAM), "RAM overflow")
EXTERN ¦ Force symbols to be undefined so they get pulled from archives ¦ EXTERN(vector_table)
FORCE_COMMON_ALLOCATION ¦ Allocate common symbols even for relocatable output
INHIBIT_COMMON_ALLOCATION ¦ Don't allocate common symbols even for executables
FORCE_GROUP_ALLOCATION ¦ Place group members like normal sections
INSERT ¦ Insert these statements AFTER/BEFORE a section of the default script ¦ INSERT AFTER .text;
AFTER BEFORE ¦ Position for INSERT
NOCROSSREFS ¦ Error if any of these output sections reference each other ¦ NOCROSSREFS(.overlay1 .overlay2)
NOCROSSREFS_TO ¦ Error if other sections reference the first one ¦ NOCROSSREFS_TO(.text .data)
LD_FEATURE ¦ Enable a linker feature ¦ LD_FEATURE("SANE_EXPR")
SECTIONS ¦ Describes how input sections map to output sections and where they go in memory ¦ SECTIONS { .text : { *(.text*) } > FLASH }
MEMORY ¦ Declares memory regions with attributes, start and size ¦ MEMORY { FLASH (rx) : ORIGIN = 0x08000000, LENGTH = 512K }
PHDRS ¦ Define ELF program headers (segments) explicitly ¦ PHDRS { text PT_LOAD FILEHDR PHDRS; }
VERSION ¦ Symbol versioning script for shared libraries ¦ VERSION { V1 { global: f; local: *; }; }
OVERLAY ¦ Sections that share the same run address but load at different addresses ¦ OVERLAY : { .ov1 { ... } .ov2 { ... } } > RAM AT> FLASH
HIDDEN ¦ Define a symbol hidden from outside the output (not exported) ¦ HIDDEN(sym = .);
PROVIDE ¦ Define a symbol only if it is referenced but not defined elsewhere ¦ PROVIDE(end = .);
PROVIDE_HIDDEN ¦ PROVIDE with hidden visibility (e.g. __init_array_start) ¦ PROVIDE_HIDDEN(__init_array_start = .);
KEEP ¦ Keep these input sections even with --gc-sections (vector tables, init arrays) ¦ KEEP(*(.isr_vector))
EXCLUDE_FILE ¦ Exclude files from an input section pattern ¦ *(EXCLUDE_FILE(*crtend.o) .ctors)
INPUT_SECTION_FLAGS ¦ Match input sections by ELF flags ¦ INPUT_SECTION_FLAGS(SHF_ALLOC) *(.text)
SORT SORT_BY_NAME ¦ Sort matched input sections by name ¦ *(SORT(.text.*))
SORT_BY_ALIGNMENT ¦ Sort matched input sections by descending alignment
SORT_BY_INIT_PRIORITY ¦ Sort by init priority encoded in the name (.init_array.NNNNN) ¦ KEEP(*(SORT_BY_INIT_PRIORITY(.init_array.*)))
SORT_NONE ¦ Disable sorting, even with --sort-section
REVERSE ¦ Reverse the order of matched sections
FILL ¦ Fill pattern for gaps in the current section ¦ FILL(0xFF)
CREATE_OBJECT_SYMBOLS ¦ Create a symbol for each input file
CONSTRUCTORS ¦ Place C++ constructor tables (a.out / ECOFF formats)
COMMON ¦ Input section of uninitialized common symbols; usually placed in .bss ¦ *(COMMON)
BYTE SHORT LONG QUAD SQUAD ¦ Emit 1 / 2 / 4 / 8 / 8 (signed) bytes of data ¦ LONG(0xDEADBEEF)
ASCIZ ¦ Emit a NUL-terminated string ¦ ASCIZ "version 1"
AT ¦ Load address (LMA) differs from the run address (VMA): e.g. .data runs in RAM but is stored in flash and copied by startup code ¦ .data : AT(ADDR(.text) + SIZEOF(.text)) { ... }  /  > RAM AT> FLASH
ALIGN_WITH_INPUT ¦ Keep VMA − LMA constant within the section
SUBALIGN ¦ Force the alignment of input sections ¦ .text : SUBALIGN(4) { ... }
ONLY_IF_RO ONLY_IF_RW ¦ Create the output section only if all inputs are read-only / read-write
NOLOAD ¦ Section type: allocates address space but has no contents in the file (e.g. .bss, a stack, noinit RAM) ¦ .bss (NOLOAD) : { ... }
DSECT COPY INFO ¦ Legacy section types: not allocated in memory
READONLY ¦ Section type: read-only
TYPE ¦ Section type from a number or SHT_ name ¦ (TYPE = SHT_PROGBITS)
FILEHDR ¦ PHDRS: include the ELF file header in this segment
FLAGS ¦ PHDRS: segment flags (p_flags) ¦ FLAGS(5)
PT_NULL PT_LOAD PT_DYNAMIC PT_INTERP PT_NOTE PT_SHLIB PT_PHDR PT_TLS PT_GNU_EH_FRAME PT_GNU_STACK PT_GNU_RELRO PT_GNU_PROPERTY ¦ ELF program header (segment) type
/DISCARD/ ¦ Special output section: input sections placed here are dropped from the output ¦ /DISCARD/ : { *(.comment) *(.ARM.exidx*) }
`);

const FUNCTIONS = docTable(`
ABSOLUTE ¦ Absolute (non-section-relative) value of an expression ¦ ABSOLUTE(exp)
ADDR ¦ Run address (VMA) of an output section ¦ ADDR(.data)
ALIGN ¦ Round the location counter (or exp) up to a power-of-two alignment ¦ . = ALIGN(8); / ALIGN(exp, align)
ALIGNOF ¦ Alignment of an output section ¦ ALIGNOF(.data)
BLOCK ¦ Old synonym for ALIGN
DATA_SEGMENT_ALIGN DATA_SEGMENT_END DATA_SEGMENT_RELRO_END ¦ Page-align the data segment for shared objects and executables
DEFINED ¦ 1 if the symbol is defined, else 0 ¦ DEFINED(_stack_size) ? _stack_size : 0x400
LENGTH ¦ Size of a memory region (in MEMORY: LENGTH = size, also len / l) ¦ LENGTH(RAM)
LOADADDR ¦ Load address (LMA) of an output section: where startup code copies .data from ¦ _sidata = LOADADDR(.data);
LOG2CEIL ¦ Ceiling of log2 ¦ LOG2CEIL(exp)
MAX MIN ¦ Maximum / minimum of two expressions ¦ MAX(a, b)
NEXT ¦ Next unallocated address that is a multiple of exp
ORIGIN ¦ Start address of a memory region (in MEMORY: ORIGIN = address, also org / o) ¦ ORIGIN(RAM)
SEGMENT_START ¦ Segment base address, overridable with -T options ¦ SEGMENT_START("text-segment", 0x400000)
SIZEOF ¦ Size in bytes of an output section ¦ SIZEOF(.bss)
SIZEOF_HEADERS ¦ Size of the ELF file and program headers
CONSTANT ¦ Target constant: MAXPAGESIZE or COMMONPAGESIZE ¦ CONSTANT(MAXPAGESIZE)
MAXPAGESIZE COMMONPAGESIZE ¦ Target page sizes, used with CONSTANT()
`);

export function describeLinker(text: string, kind: TokenKind): HoverDoc | undefined {
  if (kind === "keyword") {
    const e = KEYWORDS.get(text);
    return e && { title: text, tag: "Linker script command", ...e };
  }
  if (kind === "function") {
    const e = FUNCTIONS.get(text);
    return e && { title: text, tag: "Linker script function", ...e };
  }
  if (kind === "variable" && text === ".") {
    return {
      title: ".", tag: "Linker script", summary: "Location counter: the current address. Assigning to it moves the output position forward",
      syntax: ". = ALIGN(4); _sbss = .; . += 0x400;",
    };
  }
  if (kind === "operator" && text === ">") {
    return { title: ">", tag: "Linker script", summary: "Place this output section in a memory region (its run address, VMA). AT> sets the load region (LMA)", syntax: ".data : { ... } > RAM AT> FLASH" };
  }
  return undefined;
}
