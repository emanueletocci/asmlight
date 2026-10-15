import { describeConstraint } from "../docs/constraints";
import { words } from "../isa/common";
import type { Language, Parser, TokenKind } from "../tokenizer/types";

/**
 * FPGA constraint files. XDC, SDC and QSF are Tcl; Lattice/icestorm PCF uses the
 * same `command -flag args` shape, so one tokenizer covers all four.
 */
export const COMMANDS: ReadonlySet<string> = new Set(words(`
  create_clock create_generated_clock set_clock_groups set_clock_latency set_clock_uncertainty
  set_clock_sense set_clock_transition set_propagated_clock set_input_delay set_output_delay
  set_false_path set_multicycle_path set_max_delay set_min_delay set_max_time_borrow set_case_analysis
  set_disable_timing set_input_transition set_load set_driving_cell set_drive set_bus_skew
  set_external_delay set_data_check set_max_fanout set_max_transition set_max_capacitance
  set_logic_one set_logic_zero set_logic_dc set_clock_gating_check set_units set_operating_conditions
  set_hierarchy_separator group_path set_property reset_property create_pblock add_cells_to_pblock
  resize_pblock create_debug_core connect_debug_port set_switching_activity
  derive_pll_clocks derive_clock_uncertainty
  set_global_assignment set_location_assignment set_instance_assignment set_io_assignment set_parameter
  set_user_option
  set_io set_frequency ldc_set_location ldc_set_port ldc_set_vcc
`));

export const QUERIES: ReadonlySet<string> = new Set(words(`
  get_ports get_pins get_cells get_nets get_clocks get_generated_clocks get_iobanks get_sites
  get_package_pins get_pblocks get_debug_cores get_bels get_property get_designs get_lib_cells
  get_timing_paths all_inputs all_outputs all_clocks all_registers all_fanin all_fanout
  current_design current_instance
`));

const TCL = new Set(words(`
  set unset foreach for if else elseif while proc return puts expr incr append lappend list lindex
  llength source global upvar variable namespace switch break continue catch error eval format
`));

/** Commands whose first argument is a property name (`set_property IOSTANDARD ...`). */
const PROPERTY_FIRST = new Set(words("set_property reset_property get_property"));

interface ConstraintState {
  cmdStart: boolean;       // next word is a command
  continues: boolean;      // line ended with a backslash
  propertyNext: boolean;   // after set_property or a QSF assignment's -name
  command: string;         // current command
  brackets: number;        // open [ ... ]
}

export function makeConstraintParser(): Parser<ConstraintState> {
  return {
    startState: () => ({ cmdStart: true, continues: false, propertyNext: false, brackets: 0, command: "" }),
    copyState: (s) => ({ ...s }),
    token(stream, s): TokenKind | null {
      if (stream.sol()) {
        if (!s.continues && s.brackets === 0) { s.cmdStart = true; s.propertyNext = false; }
        s.continues = /\\$/.test(stream.string);
      }
      if (stream.eatSpace()) return null;

      if (stream.match("#")) { stream.skipToEnd(); return "comment"; }
      if (stream.match(/^"(?:[^"\\]|\\.)*"?/)) { s.cmdStart = false; return "string"; }
      if (stream.match(/^\$(?:\{[^}]*\}?|[\w:]+)/)) { s.cmdStart = false; return "variable"; }

      if (!s.cmdStart && stream.match(/^-[a-z_]\w*/i)) {
        if (stream.current() === "-name" && /^set_\w*assignment$/.test(s.command)) s.propertyNext = true;
        return "directive";
      }
      if (stream.match(/^-?\d+(?:\.\d+)?(?:e[+-]?\d+)?(?![\w.])/i)) { s.cmdStart = false; return "number"; }

      if (stream.match(/^[^\s[\]{}";$\\#]+/)) {
        const word = stream.current();
        const cmdStart = s.cmdStart;
        s.cmdStart = false;
        if (cmdStart) {
          s.command = word;
          if (PROPERTY_FIRST.has(word)) s.propertyNext = true;
          if (COMMANDS.has(word) || TCL.has(word)) return "keyword";
          if (QUERIES.has(word)) return "function";
          return null;
        }
        if (QUERIES.has(word)) return "function";
        if (s.propertyNext) { s.propertyNext = false; return "property"; }
        if (word === word.toUpperCase() && describeConstraint(word, "property")) return "property";
        return null;
      }

      const ch = stream.next();
      if (ch === "[") { s.brackets++; s.cmdStart = true; }
      else if (ch === "]") s.brackets = Math.max(0, s.brackets - 1);
      else if (ch === ";") { s.cmdStart = true; s.propertyNext = false; }
      return null;
    },
  };
}

function constraintLanguage(id: string, name: string, aliases: string[]): Language {
  return { id, name, aliases, makeParser: makeConstraintParser, lineComment: "#", describe: describeConstraint };
}

export const CONSTRAINT_LANGUAGES: readonly Language[] = [
  constraintLanguage("xdc", "Xilinx XDC", []),
  constraintLanguage("sdc", "SDC", []),
  constraintLanguage("pcf", "PCF", []),
  constraintLanguage("qsf", "Quartus QSF", []),
];
