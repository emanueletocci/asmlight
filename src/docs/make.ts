import type { HoverDoc, TokenKind } from "../tokenizer/types";
import { docTable } from "./table";

const DIRECTIVES = docTable(`
include ¦ Read other makefiles; fails if one is missing (and cannot be remade) ¦ include file.mk $(DEPS)
-include sinclude ¦ Like include, but missing files are ignored (typical for generated .d dependency files) ¦ -include $(OBJS:.o=.d)
define ¦ Define a multi-line variable (canned recipe or template for $(call) / $(eval)) ¦ define NAME = ... endef
endef ¦ Ends a define block ¦ endef
undefine ¦ Make a variable undefined ¦ undefine NAME
ifdef ¦ Conditional: true if the variable has a non-empty value ¦ ifdef DEBUG ... else ... endif
ifndef ¦ Conditional: true if the variable is undefined or empty ¦ ifndef CROSS_COMPILE
ifeq ¦ Conditional: true if both expanded arguments are equal ¦ ifeq ($(ARCH),arm) / ifeq "a" "b"
ifneq ¦ Conditional: true if the expanded arguments differ ¦ ifneq ($(V),1)
else ¦ Alternative branch of a conditional; can chain: else ifeq (...) ¦ else
endif ¦ Ends a conditional ¦ endif
export ¦ Pass a variable to sub-makes and recipe shells through the environment ¦ export VAR / export VAR = value
unexport ¦ Stop exporting a variable ¦ unexport VAR
override ¦ Set a variable even if it was given on the command line ¦ override CFLAGS += -g
private ¦ Variable is not inherited by prerequisites (target-specific variables) ¦ prog: private CFLAGS = -O0
vpath ¦ Directories to search for prerequisites matching a pattern ¦ vpath %.c src
`);

const FUNCTIONS = docTable(`
subst ¦ Replace every occurrence of a string ¦ $(subst from,to,text)
patsubst ¦ Replace words matching a % pattern ¦ $(patsubst %.c,%.o,$(SRCS)) ¦ shorthand: $(SRCS:%.c=%.o)
strip ¦ Remove leading/trailing whitespace and collapse internal spaces ¦ $(strip text)
findstring ¦ Returns find if it occurs in text, else empty ¦ $(findstring find,text)
filter ¦ Keep words matching any pattern ¦ $(filter %.c %.s,$(FILES))
filter-out ¦ Remove words matching any pattern ¦ $(filter-out main.o,$(OBJS))
sort ¦ Sort words lexically and remove duplicates ¦ $(sort list)
word ¦ The n-th word (1-based) ¦ $(word n,text)
wordlist ¦ Words s through e ¦ $(wordlist s,e,text)
words ¦ Number of words ¦ $(words text)
firstword lastword ¦ First / last word ¦ $(firstword text)
dir ¦ Directory part of each file name (up to the last /) ¦ $(dir src/a.c) → src/
notdir ¦ Strip the directory part ¦ $(notdir src/a.c) → a.c
suffix ¦ Suffix of each file name ¦ $(suffix a.c b.o) → .c .o
basename ¦ File names without suffix ¦ $(basename src/a.c) → src/a
addsuffix ¦ Append a suffix to each word ¦ $(addsuffix .o,a b) → a.o b.o
addprefix ¦ Prepend a prefix to each word ¦ $(addprefix build/,a.o b.o)
join ¦ Pairwise concatenate two lists ¦ $(join a b,.c .o) → a.c b.o
wildcard ¦ File names matching a shell glob that exist now ¦ $(wildcard src/*.c)
realpath ¦ Canonical absolute path (resolves symlinks; empty if missing) ¦ $(realpath file)
abspath ¦ Absolute path without resolving symlinks ¦ $(abspath file)
error ¦ Stop make with a fatal error message ¦ $(error CROSS_COMPILE not set)
warning ¦ Print a warning with file and line ¦ $(warning text)
info ¦ Print a message (handy for debugging variables) ¦ $(info OBJS=$(OBJS))
shell ¦ Run a shell command and capture its output (newlines → spaces) ¦ $(shell git rev-parse --short HEAD)
origin ¦ Where a variable came from: undefined, default, environment, file, command line, override, automatic ¦ $(origin CC)
flavor ¦ Variable flavor: undefined, recursive or simple ¦ $(flavor VAR)
foreach ¦ Expand text once per word ¦ $(foreach d,$(DIRS),$(wildcard $(d)/*.c))
if ¦ Conditional expansion: non-empty condition selects then-part ¦ $(if cond,then,else)
or and ¦ Short-circuit OR / AND over expanded arguments ¦ $(or $(A),$(B))
intcmp ¦ Compare integers (GNU make 4.4) ¦ $(intcmp a,b,lt,eq,gt)
call ¦ Call a user-defined function; parameters are $(1), $(2), ... ¦ $(call fn,arg1,arg2)
eval ¦ Parse text as makefile syntax (generate rules from templates) ¦ $(eval $(call RULE,name))
file ¦ Write or read a file ¦ $(file >out.txt,text)
value ¦ Value of a variable without expanding it ¦ $(value VAR)
let ¦ Bind local variables (GNU make 4.4) ¦ $(let a b,list,text)
guile ¦ Evaluate GNU Guile code (if built with Guile) ¦ $(guile expr)
`);

const SPECIAL_TARGETS = docTable(`
.PHONY ¦ Prerequisites are not files: always run their recipes (all, clean, flash ...)
.SUFFIXES ¦ Suffix list for old-style suffix rules; an empty .SUFFIXES: disables them
.DEFAULT ¦ Recipe used for targets with no rule
.PRECIOUS ¦ Don't delete these targets if make is interrupted, or if they are intermediate
.INTERMEDIATE ¦ Treat as intermediate: deleted after use
.NOTINTERMEDIATE ¦ Never treat as intermediate
.SECONDARY ¦ Intermediate but never deleted automatically
.SECONDEXPANSION ¦ Expand prerequisite lists a second time, so $$@ etc. work there
.DELETE_ON_ERROR ¦ Delete a target whose recipe fails (recommended in every makefile)
.IGNORE ¦ Ignore errors in recipes of these targets
.LOW_RESOLUTION_TIME ¦ Targets whose timestamps have 1-second resolution
.SILENT ¦ Don't echo recipes of these targets (like @)
.EXPORT_ALL_VARIABLES ¦ Export every variable to child processes
.NOTPARALLEL ¦ Run this makefile serially even with -j
.ONESHELL ¦ Run each recipe in a single shell instead of one per line
.POSIX ¦ POSIX-conforming mode
.WAIT ¦ In a prerequisite list, wait for the earlier ones before starting the later ones (with -j)
`);

const VARIABLES = docTable(`
@ ¦ Automatic: the target of the rule ¦ $@
< ¦ Automatic: the first prerequisite ¦ $<
^ ¦ Automatic: all prerequisites, duplicates removed ¦ $^
+ ¦ Automatic: all prerequisites, keeping duplicates (link order) ¦ $+
? ¦ Automatic: prerequisites newer than the target ¦ $?
* ¦ Automatic: the stem matched by % in a pattern rule ¦ $*
| ¦ Automatic: the order-only prerequisites ¦ $|
% ¦ Automatic: archive member name for lib.a(member) targets ¦ $%
@D @F ¦ Automatic: directory / file part of $@ ¦ $(@D)
<D <F ¦ Automatic: directory / file part of $< ¦ $(<D)
$ ¦ A literal $ (passed to the shell, e.g. $$i in a for loop) ¦ $$
CC ¦ C compiler (default cc); for cross builds e.g. arm-none-eabi-gcc ¦ $(CC)
CXX ¦ C++ compiler (default g++) ¦ $(CXX)
AS ¦ Assembler (default as) ¦ $(AS)
LD ¦ Linker ¦ $(LD)
AR ¦ Archiver for static libraries (default ar) ¦ $(AR) rcs lib.a $^
OBJCOPY ¦ Convention: objcopy, e.g. to make a raw .bin or .hex for flashing ¦ $(OBJCOPY) -O binary $< $@
OBJDUMP ¦ Convention: objdump, e.g. -d for a disassembly listing ¦ $(OBJDUMP) -d $<
SIZE ¦ Convention: size tool, shows text/data/bss usage ¦ $(SIZE) $<
CROSS_COMPILE ¦ Convention (Linux, U-Boot): toolchain prefix such as riscv64-linux-gnu- ¦ $(CROSS_COMPILE)gcc
CFLAGS ¦ Extra flags for the C compiler ¦ CFLAGS += -O2 -Wall
CXXFLAGS ¦ Extra flags for the C++ compiler
CPPFLAGS ¦ Extra flags for the C preprocessor (-I, -D)
ASFLAGS ¦ Extra flags for the assembler
LDFLAGS ¦ Extra flags for the linker, such as -L and -T script.ld
LDLIBS ¦ Libraries to link (-lm ...), placed after the objects
ARFLAGS ¦ Flags for ar (default rv)
MAKE ¦ The make program itself; use $(MAKE) for recursive make so -j and flags propagate ¦ $(MAKE) -C subdir
MAKEFLAGS ¦ Flags passed to sub-makes
MAKECMDGOALS ¦ Targets given on the command line
CURDIR ¦ Current working directory of make
SHELL ¦ Shell used for recipes (default /bin/sh)
RM ¦ Command to remove files (default rm -f)
VPATH ¦ Directories to search for prerequisites
.DEFAULT_GOAL ¦ Target built when none is given (default: first target)
.RECIPEPREFIX ¦ Character that starts recipe lines (default tab)
`);

const OPERATORS = docTable(`
= ¦ Recursively expanded: the value is expanded every time the variable is used
:= ::= ¦ Simply expanded: the value is expanded once, right here
:::= ¦ Immediately expanded, but stored as a recursive variable (POSIX)
+= ¦ Append to the variable (keeps its flavor)
?= ¦ Set only if the variable is not already defined
!= ¦ Run the value as a shell command and assign its output
: ¦ Rule: targets : prerequisites, followed by tab-indented recipe lines
:: ¦ Double-colon rule: each rule for the target has its own independent recipe
&: ¦ Grouped targets: one recipe run produces all the targets
| ¦ Order-only prerequisites follow: they must exist but don't trigger a rebuild when newer
; ¦ Inline recipe on the rule line
@ ¦ Recipe prefix: don't echo this command
- ¦ Recipe prefix: ignore errors from this command
+ ¦ Recipe prefix: run even with make -n (dry run)
`);

function lookup(tag: string, title: string, map: Map<string, { summary: string; syntax?: string; operation?: string }>, key: string): HoverDoc | undefined {
  const e = map.get(key);
  return e && { title, tag, ...e };
}

export function describeMake(text: string, kind: TokenKind): HoverDoc | undefined {
  switch (kind) {
    case "keyword": return lookup("Make directive", text, DIRECTIVES, text);
    case "function": return lookup("Make function", text, FUNCTIONS, text.replace(/^\$[({]/, ""));
    case "directive": return lookup("Make special target", text, SPECIAL_TARGETS, text);
    case "variable": {
      const key = text.startsWith("$$") ? "$" : text.replace(/^\$[({]?/, "").replace(/[)}]$/, "");
      return lookup("Make variable", text, VARIABLES, key);
    }
    case "operator": {
      const prefixes = /^[@+-]{2,}$/.test(text) ? [...text].map((c) => OPERATORS.get(c)!.summary) : undefined;
      if (prefixes) return { title: text, tag: "Make operator", summary: prefixes.join("; ") };
      return lookup("Make operator", text, OPERATORS, text);
    }
    default: return undefined;
  }
}
