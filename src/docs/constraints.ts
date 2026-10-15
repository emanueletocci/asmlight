import type { HoverDoc, TokenKind } from "../tokenizer/types";
import { docTable, type DocEntry } from "./table";

const COMMANDS = docTable(`
create_clock ¦ Define a clock on a port or pin: its period and waveform. Every timing check starts from a clock ¦ create_clock -period 10.000 -name sys_clk [get_ports clk]
create_generated_clock ¦ Define a clock derived from another one (divider, PLL output, forwarded clock) ¦ create_generated_clock -name clk_div2 -source [get_ports clk] -divide_by 2 [get_pins div_reg/Q]
set_clock_groups ¦ Declare clocks that don't need timing between them (asynchronous or never active together) ¦ set_clock_groups -asynchronous -group [get_clocks clk_a] -group [get_clocks clk_b]
set_clock_latency ¦ Clock delay from source to the clock definition point (-source) or to the registers ¦ set_clock_latency -source 1.2 [get_clocks clk]
set_clock_uncertainty ¦ Margin subtracted from setup/hold slack for jitter and skew ¦ set_clock_uncertainty 0.2 [get_clocks clk]
set_clock_sense ¦ Which clock edge propagates through a pin (positive/negative unate, or stop)
set_clock_transition ¦ Rise/fall time of an ideal clock
set_propagated_clock ¦ Use the actual clock-tree delays instead of ideal clocks
set_input_delay ¦ External delay from the clock edge to data arriving at an input port (the upstream chip's clock-to-out plus board delay) ¦ set_input_delay -clock sys_clk -max 3.0 [get_ports din]
set_output_delay ¦ External time needed after an output port before the capturing clock edge (the downstream chip's setup plus board delay) ¦ set_output_delay -clock sys_clk 2.0 [get_ports dout]
set_false_path ¦ Don't time these paths (e.g. through a synchronizer or from a static configuration register) ¦ set_false_path -from [get_ports rst_n]
set_multicycle_path ¦ Allow paths N clock cycles instead of one; usually paired with a -hold of N-1 ¦ set_multicycle_path 2 -setup -from [get_cells a_reg*] ; set_multicycle_path 1 -hold -from [get_cells a_reg*]
set_max_delay ¦ Maximum delay for these paths, overriding the clock-derived requirement ¦ set_max_delay -datapath_only 5.0 -from [get_clocks a] -to [get_clocks b]
set_min_delay ¦ Minimum delay for these paths (hold-like requirement)
set_max_time_borrow ¦ Limit how much time a path may borrow through a latch
set_case_analysis ¦ Treat a pin or port as a constant 0/1 for timing (e.g. a mode select) ¦ set_case_analysis 0 [get_ports test_mode]
set_disable_timing ¦ Break timing arcs through a cell or pin
set_input_transition ¦ Rise/fall time of signals at input ports
set_load ¦ Capacitive load on output ports or nets
set_driving_cell ¦ Library cell that drives an input port (models its transition)
set_drive ¦ Drive resistance of an input port
set_bus_skew ¦ Maximum skew between bits of a bus crossing clock domains (Vivado)
set_external_delay ¦ External feedback delay between an output and an input port (Vivado)
set_data_check ¦ Setup/hold-like check between two data pins
set_max_fanout ¦ Maximum fanout for nets in the design
set_max_transition ¦ Maximum transition time for nets in the design
set_max_capacitance ¦ Maximum capacitance for nets in the design
set_logic_one set_logic_zero set_logic_dc ¦ Tie an input to 1, 0 or don't-care for timing
set_clock_gating_check ¦ Setup/hold requirements on clock-gating cells
set_units ¦ Units for time, capacitance, etc. in this file ¦ set_units -time ns
set_operating_conditions ¦ Process/voltage/temperature corner for analysis
set_hierarchy_separator ¦ Character separating hierarchy levels in names (default /)
group_path ¦ Group paths for reporting and optimization priority
set_property ¦ Set a property on design objects: pins, I/O standards, placement, synthesis attributes ¦ set_property PACKAGE_PIN W5 [get_ports clk] / set_property -dict {PACKAGE_PIN W5 IOSTANDARD LVCMOS33} [get_ports clk]
reset_property ¦ Reset a property to its default value
create_pblock ¦ Create a physical block: a region to floorplan logic into (Vivado) ¦ create_pblock pblock_cpu
add_cells_to_pblock ¦ Assign cells to a pblock ¦ add_cells_to_pblock pblock_cpu [get_cells cpu]
resize_pblock ¦ Set the area a pblock covers ¦ resize_pblock pblock_cpu -add SLICE_X0Y0:SLICE_X31Y49
create_debug_core ¦ Insert an ILA (integrated logic analyzer) core (Vivado)
connect_debug_port ¦ Connect nets to a debug core's probes
set_switching_activity ¦ Toggle rates for power analysis
derive_pll_clocks ¦ Quartus SDC: create generated clocks for every PLL output automatically
derive_clock_uncertainty ¦ Quartus SDC: apply the device's clock uncertainty to all clocks
set_global_assignment ¦ Quartus .qsf: project-wide setting, named with -name ¦ set_global_assignment -name FAMILY "Cyclone V"
set_location_assignment ¦ Quartus .qsf: put a port on a pin ¦ set_location_assignment PIN_AF14 -to clk
set_instance_assignment ¦ Quartus .qsf: setting for one node (I/O standard, drive strength, ...) ¦ set_instance_assignment -name IO_STANDARD "3.3-V LVTTL" -to led[0]
set_io_assignment ¦ Quartus .qsf: setting for an I/O pin
set_parameter ¦ Quartus .qsf: override a Verilog/VHDL parameter or generic ¦ set_parameter -name WIDTH 16
set_user_option ¦ Quartus .qsf: tool option
set_io ¦ PCF (icestorm/nextpnr): put a port on a package pin ¦ set_io [-nowarn] [-pullup yes|no] [-pullup_resistor 3P3K|6P8K|10K|100K] clk 35
set_frequency ¦ PCF (nextpnr): target frequency of a clock net in MHz ¦ set_frequency clk 12
ldc_set_location ¦ Lattice Radiant .pdc: put a port on a pin ¦ ldc_set_location -site {A1} [get_ports clk]
ldc_set_port ¦ Lattice Radiant .pdc: I/O attributes of a port ¦ ldc_set_port -iobuf {IO_TYPE=LVCMOS33} [get_ports led]
ldc_set_vcc ¦ Lattice Radiant .pdc: bank voltage
`);

const TCL_COMMANDS = docTable(`
set ¦ Tcl: set a variable (read it back as $name) ¦ set period 10.0
unset ¦ Tcl: delete a variable
foreach ¦ Tcl: loop over a list ¦ foreach p {a b c} { ... }
for while ¦ Tcl: loop
if else elseif ¦ Tcl: conditional ¦ if {$x > 1} { ... } else { ... }
proc ¦ Tcl: define a procedure
return ¦ Tcl: return from a procedure
puts ¦ Tcl: print a line
expr ¦ Tcl: evaluate an arithmetic expression ¦ [expr {$period / 2}]
incr ¦ Tcl: add to an integer variable
append lappend ¦ Tcl: append to a string / list variable
list lindex llength ¦ Tcl: build a list / get an element / get its length
source ¦ Tcl: run another Tcl or constraint file
global upvar variable namespace ¦ Tcl: variable scoping
switch ¦ Tcl: multi-way branch
break continue ¦ Tcl: leave a loop / skip to its next iteration
catch error ¦ Tcl: trap / raise an error
eval format ¦ Tcl: evaluate a script / format a string
`);

const QUERIES = docTable(`
get_ports ¦ Top-level ports by name (wildcards * and ?) ¦ [get_ports {led[*]}]
get_pins ¦ Pins of cells (hierarchical names ending in /PIN) ¦ [get_pins clk_gen/inst/CLKOUT0]
get_cells ¦ Cell instances: registers, LUTs, RAMs, submodules ¦ [get_cells -hier *sync_reg*]
get_nets ¦ Nets by name
get_clocks ¦ Clocks created by create_clock / create_generated_clock (or auto-derived) ¦ [get_clocks sys_clk]
get_generated_clocks ¦ Generated clocks only
get_iobanks ¦ I/O banks of the device (Vivado)
get_sites ¦ Placement sites of the device (Vivado)
get_package_pins ¦ Package pins of the device (Vivado)
get_pblocks ¦ Pblocks by name (Vivado)
get_debug_cores ¦ Debug cores (ILA) (Vivado)
get_bels ¦ Basic elements inside sites (Vivado)
get_property ¦ Read a property of an object ¦ [get_property PERIOD [get_clocks clk]]
get_designs ¦ Designs in memory
get_lib_cells ¦ Cells from the technology library
get_timing_paths ¦ Timing paths, for scripting reports
all_inputs all_outputs ¦ Every input / output port
all_clocks ¦ Every clock
all_registers ¦ Every sequential cell
all_fanin all_fanout ¦ Everything driving / driven by the given pins
current_design ¦ The design the constraints apply to
current_instance ¦ Scope later object queries to this hierarchical instance
`);

const PROPERTIES = docTable(`
PACKAGE_PIN ¦ Package pin (ball) a port is placed on, from the board schematic ¦ set_property PACKAGE_PIN W5 [get_ports clk]
LOC ¦ Placement site of a cell (or pin of a port) ¦ set_property LOC SLICE_X0Y0 [get_cells r_reg]
BEL ¦ Basic element within the site (e.g. A6LUT, AFF)
IOSTANDARD ¦ I/O electrical standard; must match the bank voltage (LVCMOS33, LVCMOS18, LVDS_25, SSTL15, ...) ¦ set_property IOSTANDARD LVCMOS33 [get_ports led]
DRIVE ¦ Output drive strength in mA (LVCMOS outputs) ¦ set_property DRIVE 8 [get_ports led]
SLEW ¦ Output edge rate: SLOW (less noise, default) or FAST
PULLUP PULLDOWN ¦ Enable the weak pull-up / pull-down on the pin ¦ set_property PULLUP true [get_ports btn]
PULLTYPE ¦ Weak pull on the pin: PULLUP, PULLDOWN, KEEPER or NONE
KEEPER ¦ Weak keeper holds the last driven value
IN_TERM ¦ Internal input termination (e.g. UNTUNED_SPLIT_50)
DIFF_TERM DIFF_TERM_ADV ¦ Internal 100 Ω differential termination for LVDS inputs
IOB ¦ Pack this register into the I/O block for consistent pin timing ¦ set_property IOB TRUE [get_cells dout_reg]
ASYNC_REG ¦ Register is part of a clock-domain-crossing synchronizer: placed close together and excluded from some optimizations ¦ set_property ASYNC_REG TRUE [get_cells {sync_reg[*]}]
DONT_TOUCH ¦ Keep this cell or net through optimization
MARK_DEBUG ¦ Make the net available for an ILA debug probe
KEEP ¦ Don't optimize away or absorb this net
KEEP_HIERARCHY ¦ Don't flatten this module's hierarchy
MAX_FANOUT ¦ Replicate the driver if fanout exceeds this
CLOCK_DEDICATED_ROUTE ¦ FALSE allows a clock from a non-clock-capable pin (degrades timing; a DRC otherwise errors)
CFGBVS ¦ Configuration bank voltage select: VCCO or GND; must match the board (7-series)
CONFIG_VOLTAGE ¦ Configuration bank voltage (e.g. 3.3)
CONFIG_MODE ¦ Configuration interface, e.g. SPIx4
BITSTREAM.GENERAL.COMPRESS ¦ Compress the bitstream (faster load, smaller flash)
BITSTREAM.CONFIG.SPI_BUSWIDTH ¦ SPI flash data width: 1, 2 or 4
BITSTREAM.CONFIG.CONFIGRATE ¦ Configuration clock rate in MHz
BITSTREAM.CONFIG.UNUSEDPIN ¦ Unused pins after configuration: Pulldown, Pullup or Pullnone
RAM_STYLE ¦ Synthesis: block, distributed, register or ultra RAM for this memory
ROM_STYLE ¦ Synthesis: block or distributed ROM
SHREG_EXTRACT ¦ Synthesis: allow shift registers to map to SRL primitives
FSM_ENCODING ¦ Synthesis: state encoding (one_hot, sequential, gray, johnson, auto)
USE_DSP ¦ Synthesis: map arithmetic to DSP blocks
IODELAY_GROUP ¦ Group IDELAY/ODELAY cells with their IDELAYCTRL
FAMILY ¦ Quartus: device family ¦ set_global_assignment -name FAMILY "Cyclone V"
DEVICE ¦ Quartus: exact part number ¦ set_global_assignment -name DEVICE 5CSEMA5F31C6
TOP_LEVEL_ENTITY ¦ Quartus: name of the top-level module/entity
IO_STANDARD ¦ Quartus: I/O standard of a pin ¦ set_instance_assignment -name IO_STANDARD "3.3-V LVTTL" -to clk
CURRENT_STRENGTH_NEW ¦ Quartus: output drive strength
SLEW_RATE ¦ Quartus: output slew rate (0 = slowest)
WEAK_PULL_UP_RESISTOR ¦ Quartus: enable the pin's weak pull-up
VIRTUAL_PIN ¦ Quartus: keep this port internal (not a real pin), e.g. when compiling a submodule alone
VERILOG_FILE SYSTEMVERILOG_FILE VHDL_FILE ¦ Quartus: add a source file to the project
SDC_FILE ¦ Quartus: timing constraints file used by Timing Analyzer
QIP_FILE ¦ Quartus: IP core file list
PROJECT_OUTPUT_DIRECTORY ¦ Quartus: where compile outputs go
`);

const FLAGS = docTable(`
-period ¦ Clock period in ns (100 MHz → 10.000)
-waveform ¦ Rise and fall times within the period in ns; default {0 period/2} (50% duty) ¦ -waveform {0 5}
-name ¦ Name of the clock being created; in a Quartus .qsf, the name of the setting
-add ¦ Add this clock to a pin that already has one instead of replacing it
-source ¦ Master clock pin a generated clock derives from
-master_clock ¦ Which clock at -source to derive from when it has several
-divide_by -multiply_by ¦ Generated clock frequency relative to its source
-edges ¦ Generated clock waveform given as source edges
-clock ¦ Clock the external delay is relative to
-clock_fall ¦ Delay is relative to the falling edge of -clock
-add_delay ¦ Add another input/output delay rather than replacing the existing one (e.g. for a second clock)
-max -min ¦ Setup (max) or hold (min) analysis value
-from -to -through ¦ Path start points, end points and intermediate pins; in a .qsf, -to names the node a setting applies to
-rise_from -fall_from -rise_to -fall_to ¦ Like -from/-to, only for one edge
-setup -hold ¦ Apply to setup or hold checks only
-start -end ¦ Count multicycle cycles in the launch (start) or capture (end, default for setup) clock
-datapath_only ¦ Ignore clock skew: constrain only the data path delay (for CDC paths)
-asynchronous ¦ Clock groups are asynchronous to each other
-physically_exclusive -logically_exclusive ¦ Clock groups never exist / are never active at the same time
-group ¦ A group of clocks for set_clock_groups
-dict ¦ Set several properties at once as name/value pairs ¦ -dict {PACKAGE_PIN W5 IOSTANDARD LVCMOS33}
-of_objects ¦ Objects connected to the given ones (e.g. pins of a cell) ¦ [get_pins -of_objects [get_cells u0]]
-filter ¦ Keep objects whose properties match an expression ¦ [get_cells -hier -filter {REF_NAME == FDRE}]
-hierarchical -hier ¦ Search all levels of hierarchy
-regexp -nocase ¦ Match names as regular expressions / case-insensitively
-quiet ¦ Don't warn if nothing matches
-nowarn ¦ PCF: don't warn if the port doesn't exist in the design
-pullup ¦ PCF: enable the pin's pull-up (yes/no)
-pullup_resistor ¦ PCF (UltraPlus): pull-up strength
-section -entity -tag ¦ Quartus .qsf: scope of the assignment
`);

const lookup = (tag: string, title: string, e: DocEntry | undefined): HoverDoc | undefined => e && { title, tag, ...e };

export function describeConstraint(text: string, kind: TokenKind): HoverDoc | undefined {
  switch (kind) {
    case "keyword": return lookup("Constraint command", text, COMMANDS.get(text)) ?? lookup("Tcl command", text, TCL_COMMANDS.get(text));
    case "function": return lookup("Object query", text, QUERIES.get(text));
    case "property": return lookup("Constraint property", text, PROPERTIES.get(text.toUpperCase()));
    case "directive": return lookup("Option", text, FLAGS.get(text));
    default: return undefined;
  }
}
