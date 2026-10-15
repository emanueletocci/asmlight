import type { HoverDoc, TokenKind } from "../tokenizer/types";
import { docTable, type DocEntry } from "./table";

const KEYWORDS = docTable(`
library ¦ Make a library visible ¦ library ieee;
use ¦ Make declarations from a package visible ¦ use ieee.numeric_std.all;
entity ¦ Interface of a design unit: its generics and ports. Also direct instantiation: u1 : entity work.counter ¦ entity counter is port (clk : in std_logic; q : out unsigned(7 downto 0)); end entity;
architecture ¦ Implementation of an entity ¦ architecture rtl of counter is ... begin ... end architecture;
of ¦ architecture NAME of ENTITY; array ... of TYPE
is ¦ Starts the body of a declaration
begin ¦ Starts the statement part of an architecture, process, function or block
end ¦ Ends a construct, optionally repeating its kind and name ¦ end process; / end architecture rtl;
port ¦ Port list of an entity or component ¦ port (clk : in std_logic; led : out std_logic_vector(3 downto 0));
generic ¦ Compile-time parameters of an entity ¦ generic (WIDTH : natural := 8);
map ¦ port map / generic map: connect an instance ¦ u1 : entity work.counter generic map (WIDTH => 8) port map (clk => clk, q => q);
in ¦ Input port; also part of for ... in
out ¦ Output port. Before VHDL-2008 it cannot be read inside the architecture
inout ¦ Bidirectional port (tri-state pins)
buffer ¦ Output port that can also be read inside
component ¦ Declare another entity's interface so it can be instantiated by name
signal ¦ Signal: a wire or register. Assigned with <=; the new value is visible after the current delta cycle ¦ signal cnt : unsigned(7 downto 0) := (others => '0');
variable ¦ Variable inside a process or subprogram. Assigned with :=; the new value is visible immediately ¦ variable tmp : integer;
shared ¦ shared variable: visible to several processes (protected types)
constant ¦ Constant ¦ constant DEPTH : natural := 16;
type ¦ Declare a type: enumeration (FSM states), array, record, range ¦ type state_t is (IDLE, RUN, DONE);
subtype ¦ Constrained version of a type ¦ subtype byte_t is std_logic_vector(7 downto 0);
array ¦ Array type ¦ type mem_t is array (0 to 255) of std_logic_vector(7 downto 0);
record ¦ Record (struct) type
range ¦ Range constraint, or the 'range attribute ¦ integer range 0 to 15
to downto ¦ Ascending / descending range; std_logic_vector(7 downto 0) is the usual bit order
others ¦ All remaining elements or choices ¦ (others => '0') / when others =>
process ¦ Sequential block run when a signal in its sensitivity list changes. process (clk) with rising_edge(clk) describes flip-flops; process (all) describes combinational logic (VHDL-2008) ¦ process (clk) begin if rising_edge(clk) then q <= d; end if; end process;
all ¦ process (all): sensitive to every signal read (VHDL-2008); use x.all: everything in a package
if then elsif else ¦ Conditional. In a combinational process, a signal not assigned in every branch infers a latch ¦ if rst = '1' then ... elsif rising_edge(clk) then ... end if;
case ¦ Multi-way branch; choices must cover every value (use when others) ¦ case state is when IDLE => ...; when others => ...; end case;
when ¦ Case choice, or conditional assignment: y <= a when sel = '1' else b;
select with ¦ Selected assignment ¦ with sel select y <= a when "00", b when others;
for ¦ Loop, or generate-for. In synthesis a loop unrolls into parallel hardware ¦ for i in 0 to 7 loop ... end loop;
while loop ¦ Loop
exit next ¦ Leave a loop / skip to its next iteration
generate ¦ for ... generate / if ... generate: replicate or conditionally include hardware ¦ gen : for i in 0 to N-1 generate ... end generate;
block ¦ Group concurrent statements
function ¦ Function: returns a value, no wait statements ¦ function parity(v : std_logic_vector) return std_logic is ...
procedure ¦ Procedure: may have out parameters and wait (testbenches)
pure impure ¦ pure function has no side effects (the default) / impure may read signals or files
return ¦ Return from a subprogram; in a declaration, the return type
package body ¦ Shared types, constants and subprograms; package body holds the implementations ¦ package cpu_pkg is ... end package;
wait ¦ Suspend a process (testbenches): wait for 10 ns; wait until rising_edge(clk); wait; ¦ wait until rising_edge(clk);
after ¦ Delayed signal assignment (simulation only) ¦ clk <= not clk after 5 ns;
report severity ¦ Print a message with severity note/warning/error/failure ¦ report "done" severity note;
assert ¦ Check a condition; report if false ¦ assert cnt < 10 report "overflow" severity error;
null ¦ Do nothing (a case branch with no action)
open ¦ Leave an output port unconnected in a port map
alias ¦ Another name for an object or part of it ¦ alias opcode : std_logic_vector(6 downto 0) is instr(6 downto 0);
attribute ¦ Declare or set a user attribute (synthesis attributes) ¦ attribute ASYNC_REG of sync : signal is "TRUE";
configuration ¦ Pick architectures for entity instances
transport inertial reject ¦ Delay models for after (simulation)
force release ¦ VHDL-2008: override a signal (testbenches)
and or nand nor xor xnor not ¦ Logical operators (bitwise on vectors); and/or have no precedence over each other, so use parentheses
sll srl sla sra rol ror ¦ Shift and rotate operators (prefer shift_left/shift_right from numeric_std)
mod rem abs ¦ Modulo / remainder / absolute value
new access file ¦ Pointers and files (simulation)
std_logic ¦ IEEE 1164 single bit with 9 values: '0' '1' 'Z' (high-impedance) 'X' (conflict) 'U' (uninitialized) '-' (don't care) 'L' 'H' 'W'
std_ulogic ¦ Unresolved std_logic: multiple drivers are an error (catches bugs)
std_logic_vector std_ulogic_vector ¦ Bit vector with no numeric meaning; convert via unsigned/signed for arithmetic ¦ std_logic_vector(7 downto 0)
unsigned signed ¦ numeric_std vector types with arithmetic ¦ unsigned(7 downto 0)
integer ¦ 32-bit (at least) signed integer; constrain its range for synthesis ¦ integer range 0 to 255
natural positive ¦ Integer subtypes ≥ 0 / ≥ 1
boolean ¦ true / false; conditions in if must be boolean, so write if x = '1' then
bit bit_vector ¦ Two-valued '0'/'1' type
real ¦ Floating point (simulation, or constants)
time ¦ Physical type with units fs ps ns us ms sec
string character ¦ Text
boolean_vector integer_vector real_vector time_vector ¦ VHDL-2008 arrays of boolean / integer / real / time
severity_level ¦ Type of note / warning / error / failure
sfixed ufixed float ¦ VHDL-2008 fixed/floating-point packages
true false ¦ Boolean values
note warning error failure ¦ Severity levels; failure usually stops the simulation
`);

const FUNCTIONS = docTable(`
rising_edge ¦ True on a 0→1 transition of a signal: the standard flip-flop clock test ¦ if rising_edge(clk) then
falling_edge ¦ True on a 1→0 transition ¦ if falling_edge(clk) then
to_unsigned ¦ numeric_std: integer → unsigned of a given width ¦ to_unsigned(5, 8)
to_signed ¦ numeric_std: integer → signed of a given width ¦ to_signed(-1, 16)
to_integer ¦ numeric_std: unsigned/signed → integer (e.g. to index an array) ¦ mem(to_integer(addr))
resize ¦ numeric_std: change width (zero-extends unsigned, sign-extends signed) ¦ resize(a, 16)
shift_left shift_right ¦ numeric_std: shift by n bits (shift_right of signed is arithmetic) ¦ shift_left(x, 2)
rotate_left rotate_right ¦ numeric_std: rotate by n bits
std_match ¦ Compare treating '-' as don't care
to_stdlogicvector to_stdulogicvector to_bitvector to_bit ¦ std_logic_1164 conversions between bit and std_logic types
to_x01 is_x ¦ Map to 'X'/'0'/'1' / check for any X-like value
to_string to_hstring to_ostring to_bstring ¦ VHDL-2008: value → string (decimal/hex/octal/binary) for report ¦ report "q = " & to_hstring(q);
minimum maximum ¦ VHDL-2008: smaller / larger of two values
now ¦ Current simulation time
readline read writeline write hread hwrite endfile file_open file_close ¦ textio file and console I/O
conv_integer conv_std_logic_vector conv_unsigned conv_signed ¦ Synopsys std_logic_arith conversions (non-standard; prefer numeric_std)
uniform ¦ ieee.math_real: uniform random number in (0, 1)
finish stop ¦ VHDL-2008 std.env: end / pause the simulation
`);

const ATTRIBUTES = docTable(`
event ¦ True if the signal changed in this delta cycle. clk'event and clk = '1' is the old form of rising_edge(clk)
range reverse_range ¦ Index range of an array ¦ for i in v'range loop
length ¦ Number of elements
high low left right ¦ Bounds of an array or type
ascending ¦ True for a "to" range
image value ¦ Value → string / string → value ¦ integer'image(n)
pos val succ pred leftof rightof ¦ Position of an enumeration value and its neighbours
stable quiet delayed transaction ¦ Implicit signals derived from a signal
active last_event last_active last_value driving driving_value ¦ Signal history queries (simulation)
element subtype base ¦ Types of an object or its elements
simple_name path_name instance_name ¦ Names as strings (debugging)
`);

const OPERATORS = docTable(`
<= ¦ Signal assignment: the new value is scheduled and becomes visible after the current delta cycle, so all flip-flops update together (like Verilog's nonblocking <=) ¦ q <= d;
:= ¦ Variable assignment or initial value: takes effect immediately ¦ v := v + 1;
=> ¦ Association: port map (formal => actual), aggregate (others => '0') or case choice (when IDLE =>)
`);

const lookup = (tag: string, title: string, e: DocEntry | undefined): HoverDoc | undefined => e && { title, tag, ...e };

export function describeVhdl(text: string, kind: TokenKind): HoverDoc | undefined {
  const key = text.toLowerCase();
  switch (kind) {
    case "keyword": return lookup("VHDL", text, KEYWORDS.get(key));
    case "function": return lookup("VHDL function", text, FUNCTIONS.get(key));
    case "property": return lookup("VHDL attribute", text, ATTRIBUTES.get(key.replace(/^'/, "")));
    case "operator": return lookup("VHDL operator", text, OPERATORS.get(text));
    default: return undefined;
  }
}
