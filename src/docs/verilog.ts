import type { HoverDoc, TokenKind } from "../tokenizer/types";
import { docTable, type DocEntry } from "./table";

const KEYWORDS = docTable(`
module macromodule ¦ Declare a module: a hardware block with ports, instantiated by name in other modules ¦ module counter #(parameter W = 8) (input logic clk, output logic [W-1:0] q); ... endmodule
endmodule ¦ Ends a module
input ¦ Input port
output ¦ Output port
inout ¦ Bidirectional port (tri-state pins)
wire ¦ Net: driven continuously by assign statements or module outputs; holds no value of its own ¦ wire [7:0] sum = a + b;
reg ¦ Variable assigned in always/initial blocks. Despite the name it is not necessarily a flip-flop: that depends on how it is assigned ¦ reg [3:0] count;
logic ¦ SystemVerilog 4-state type usable both as a variable and (with one driver) as a net; replaces most reg/wire ¦ logic [7:0] data;
bit ¦ SystemVerilog 2-state (0/1) type; X and Z become 0
byte shortint int longint ¦ SystemVerilog 2-state signed integers of 8 / 16 / 32 / 64 bits
integer ¦ 4-state signed 32-bit variable
real realtime shortreal ¦ Floating-point variable (simulation only)
time ¦ 64-bit unsigned simulation time variable
string ¦ SystemVerilog dynamic string (simulation)
tri wand wor triand trior tri0 tri1 trireg uwire supply0 supply1 ¦ Net types: tri-state, wired-AND/OR, pulled, single-driver (uwire) or constant supply
signed unsigned ¦ Arithmetic is signed / unsigned; mixing a signed and an unsigned operand makes the whole expression unsigned ¦ logic signed [15:0] s;
always ¦ Block that re-runs whenever its event control triggers. With @(posedge clk) it describes flip-flops, with @(*) combinational logic ¦ always @(posedge clk) q <= d;
always_ff ¦ SystemVerilog: sequential logic block; tools check it infers flip-flops. Use nonblocking <= inside ¦ always_ff @(posedge clk or negedge rst_n) if (!rst_n) q <= '0; else q <= d;
always_comb ¦ SystemVerilog: combinational logic block; sensitivity is inferred and tools warn about latches. Use blocking = inside ¦ always_comb y = sel ? a : b;
always_latch ¦ SystemVerilog: intentional latch ¦ always_latch if (en) q = d;
initial ¦ Runs once at time 0. Testbenches; in FPGA synthesis it can set register power-up values ¦ initial begin clk = 0; forever #5 clk = ~clk; end
final ¦ SystemVerilog: runs once when simulation ends
assign ¦ Continuous assignment: the net always equals the expression (combinational logic) ¦ assign y = a & b;
deassign force release ¦ Procedural override of a variable or net (testbenches)
posedge ¦ Rising edge (0→1, also from/to X/Z) ¦ @(posedge clk)
negedge ¦ Falling edge ¦ @(negedge rst_n)
edge ¦ Either edge
or ¦ In an event list: either event (same as ,). Elsewhere: OR gate primitive ¦ @(posedge clk or negedge rst_n)
and nand nor xor xnor not buf ¦ Gate primitive ¦ and g1 (y, a, b);
begin ¦ Starts a sequential block; may be named: begin : name ¦ begin ... end
end ¦ Ends a begin block
if else ¦ Conditional. In combinational logic, a missing else (or unassigned signal in a branch) infers a latch ¦ if (en) q <= d; else q <= q;
case ¦ Multi-way branch on exact value matches (X and Z must match exactly) ¦ case (state) IDLE: ...; default: ...; endcase
casez ¦ case where Z or ? bits in items are don't-care ¦ casez (req) 4'b1???: grant = 0; ...
casex ¦ case where X and Z are don't-care on both sides; avoid in synthesis code (hides X bugs)
endcase ¦ Ends a case
default ¦ Case item for any other value; also a default for clocking/disable iff
unique ¦ SystemVerilog: exactly one case item/if branch matches; warns otherwise and lets synthesis build parallel logic ¦ unique case (sel) ...
unique0 ¦ SystemVerilog: at most one case item matches
priority ¦ SystemVerilog: at least one item matches; first match wins
for ¦ Loop; in synthesizable code it unrolls into parallel hardware ¦ for (int i = 0; i < 8; i++) ...
while do repeat forever ¦ Loops (mostly testbench code) ¦ forever #5 clk = ~clk;
foreach ¦ SystemVerilog: loop over array indices ¦ foreach (mem[i]) mem[i] = '0;
break continue return ¦ SystemVerilog: leave a loop / next iteration / return from a function
parameter ¦ Module constant that can be overridden per instance ¦ module fifo #(parameter DEPTH = 16) ... / fifo #(.DEPTH(32)) u_fifo (...);
localparam ¦ Module constant that cannot be overridden ¦ localparam AW = $clog2(DEPTH);
defparam ¦ Override a parameter by hierarchical name (deprecated; use #(...) instead)
generate ¦ Region for generate-for / generate-if: replicate or conditionally include hardware at elaboration ¦ generate for (genvar i = 0; i < N; i++) begin : g ... end endgenerate
endgenerate ¦ Ends a generate region
genvar ¦ Loop variable of a generate-for
function ¦ Function: computes a value in zero time; no delays or event controls ¦ function automatic logic [7:0] f(input logic [7:0] x); ...
endfunction ¦ Ends a function
task ¦ Task: may consume simulation time (delays, @); used in testbenches ¦ task automatic send(input byte b); ...
endtask ¦ Ends a task
automatic ¦ Locals are allocated per call (needed for recursion and re-entrant tasks)
static ¦ Locals are shared between calls (the Verilog default)
fork ¦ Run the statements in parallel ¦ fork ... join
join ¦ Wait for all forked processes
join_any ¦ Wait for the first forked process
join_none ¦ Don't wait for forked processes
wait ¦ Wait until a condition is true ¦ wait (ready);
disable ¦ Stop a named block or task
event ¦ Named event: trigger with ->, wait with @
typedef ¦ SystemVerilog: name a type ¦ typedef logic [7:0] byte_t;
enum ¦ SystemVerilog: enumerated type, e.g. FSM states ¦ typedef enum logic [1:0] {IDLE, RUN, DONE} state_t;
struct ¦ SystemVerilog: structure ¦ typedef struct packed { logic [3:0] op; logic [11:0] imm; } instr_t;
union ¦ SystemVerilog: union of types
packed ¦ Fields/elements stored contiguously as one vector that can be sliced and assigned as bits
interface ¦ SystemVerilog: bundle of signals (a bus) with optional modports, passed as one port ¦ interface axi_if (input logic clk); ... endinterface
endinterface ¦ Ends an interface
modport ¦ SystemVerilog: direction view of an interface for one side ¦ modport master (output valid, input ready);
package ¦ SystemVerilog: shared types, parameters and functions ¦ package cpu_pkg; ... endpackage
endpackage ¦ Ends a package
import ¦ Make package items visible ¦ import cpu_pkg::*;
export ¦ Re-export imported package items, or DPI export
class endclass extends virtual new this super ¦ SystemVerilog classes (verification, UVM)
rand randc constraint solve dist inside ¦ SystemVerilog constrained randomization
assert ¦ SystemVerilog assertion: immediate (assert (x);) or concurrent (assert property (...)) ¦ assert property (@(posedge clk) req |-> ##[1:3] ack);
assume cover expect restrict ¦ SystemVerilog assertion statements (formal assumptions, coverage)
property endproperty sequence endsequence ¦ SystemVerilog Assertions: named property / sequence
iff ¦ Only if: @(posedge clk iff en) or disable iff (rst)
throughout within intersect first_match ¦ SystemVerilog sequence operators
covergroup endgroup coverpoint cross bins ¦ SystemVerilog functional coverage
clocking endclocking ¦ SystemVerilog clocking block: testbench sampling/driving relative to a clock
program endprogram ¦ SystemVerilog program block (testbench)
const ¦ Constant variable
var ¦ Declares a variable explicitly
void ¦ No return value
ref ¦ Argument passed by reference
specify endspecify specparam ¦ Pin-to-pin timing (standard cell libraries)
primitive endprimitive table endtable ¦ User-defined primitive (UDP)
`);

const SYSTEM_TASKS = docTable(`
$display ¦ Print formatted text plus newline ¦ $display("t=%0t q=%h", $time, q);
$write ¦ Print formatted text without newline
$strobe ¦ Print at the end of the time step (after nonblocking updates)
$monitor ¦ Print whenever any argument changes ¦ $monitor("%t a=%b", $time, a);
$finish ¦ End the simulation ¦ $finish;
$stop ¦ Pause the simulation (interactive)
$time ¦ Current simulation time (64-bit, scaled to the module's time unit)
$realtime ¦ Current simulation time as real
$stime ¦ Current simulation time, 32 bits
$clog2 ¦ Ceiling of log2: number of address bits for N entries ¦ localparam AW = $clog2(DEPTH);
$bits ¦ Number of bits in a type or expression
$size $high $low $left $right $increment $dimensions ¦ Array dimension queries
$signed $unsigned ¦ Reinterpret as signed / unsigned ¦ $signed(a) >>> 1
$readmemh $readmemb ¦ Load a memory from a hex/binary text file (ROM contents, also synthesizable on FPGAs) ¦ $readmemh("rom.hex", mem);
$writememh $writememb ¦ Write a memory to a hex/binary text file
$dumpfile ¦ VCD waveform output file ¦ $dumpfile("wave.vcd");
$dumpvars ¦ Dump signals to the VCD file (0 = all levels below) ¦ $dumpvars(0, tb);
$random ¦ 32-bit signed random number
$urandom ¦ SystemVerilog: 32-bit unsigned random number
$urandom_range ¦ SystemVerilog: random number in a range ¦ $urandom_range(0, 15)
$fopen $fclose ¦ Open / close a file
$fdisplay $fwrite $fscanf $fgets $feof ¦ File I/O
$sformatf ¦ SystemVerilog: format into a string ¦ $sformatf("%0d", n)
$sformat $swrite ¦ Format into a string variable
$error $warning $info ¦ SystemVerilog: report with severity (also inside assertions' else branch)
$fatal ¦ SystemVerilog: report and end the simulation ¦ $fatal(1, "bad state");
$countones ¦ Number of 1 bits
$onehot ¦ True if exactly one bit is 1
$onehot0 ¦ True if at most one bit is 1
$isunknown ¦ True if any bit is X or Z
$past ¦ SVA: value in the previous clock cycle ¦ $past(q)
$rose $fell ¦ SVA: bit went 0→1 / 1→0 since the previous clock
$stable $changed ¦ SVA: value same as / different from the previous clock
$value$plusargs $test$plusargs ¦ Read +name=value simulator command-line arguments
$cast ¦ SystemVerilog: checked type conversion
`);

const DIRECTIVES = docTable(`
\`define ¦ Define a text macro (global, visible in files compiled later) ¦ \`define WIDTH 8 / \`define MAX(a,b) ((a) > (b) ? (a) : (b))
\`undef \`undefineall ¦ Remove one / all macro definitions
\`ifdef \`ifndef \`elsif \`else \`endif ¦ Conditional compilation ¦ \`ifdef SIMULATION ... \`endif
\`include ¦ Insert another file ¦ \`include "defs.vh"
\`timescale ¦ Time unit / precision for # delays in following modules ¦ \`timescale 1ns / 1ps
\`default_nettype ¦ Type of implicitly declared nets; "none" makes typos in names an error ¦ \`default_nettype none
\`resetall ¦ Reset all directives to their defaults
\`celldefine \`endcelldefine ¦ Mark modules as library cells
\`line ¦ Set the reported file and line
\`unconnected_drive \`nounconnected_drive ¦ Pull unconnected input ports up or down
\`pragma ¦ Tool-specific pragma
\`begin_keywords \`end_keywords ¦ Use the keyword set of a given standard version
\`__FILE__ \`__LINE__ ¦ Current file name / line number
`);

const OPERATORS = docTable(`
<= ¦ Nonblocking assignment: the new value takes effect at the end of the time step, so all flip-flops update together. Use in clocked blocks ¦ always_ff @(posedge clk) begin a <= b; b <= a; end  // swaps
@ ¦ Event control: wait for an edge or a change ¦ @(posedge clk) / @(*)
# ¦ Delay (#10, in time units of \`timescale) or parameter override (#(.W(8)))
|-> ¦ SVA overlapping implication: if the antecedent matches, check the consequent starting in the same cycle ¦ req |-> ack
|=> ¦ SVA non-overlapping implication: check the consequent starting one cycle later ¦ req |=> ack
## ¦ SVA cycle delay: ##1 next cycle, ##[1:3] one to three cycles later ¦ req ##1 gnt
`);

const lookup = (tag: string, title: string, e: DocEntry | undefined): HoverDoc | undefined => e && { title, tag, ...e };

export function describeVerilog(text: string, kind: TokenKind): HoverDoc | undefined {
  switch (kind) {
    case "keyword": return lookup("Verilog keyword", text, KEYWORDS.get(text));
    case "function": return lookup("System task", text, SYSTEM_TASKS.get(text));
    case "directive": return lookup("Compiler directive", text, DIRECTIVES.get(text)) ?? (text.startsWith("(*")
      ? { title: "(* *)", tag: "Attribute", summary: "Tool attribute on the next item, e.g. keep, mark_debug, ram_style or async_reg", syntax: '(* ASYNC_REG = "TRUE" *) logic [1:0] sync;' }
      : undefined);
    case "operator": return lookup("Verilog operator", text, OPERATORS.get(/^##/.test(text) ? "##" : text));
    default: return undefined;
  }
}
