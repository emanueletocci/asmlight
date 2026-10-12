import type { HoverDoc, TokenKind } from "../tokenizer/types";
import { docTable } from "./table";

const PROPERTIES = docTable(`
compatible ¦ Strings naming the device, most specific first ("vendor,device", then fallbacks); the OS binds a driver by matching them ¦ compatible = "sifive,uart0";
model ¦ Human-readable board or device model ¦ model = "StarFive VisionFive 2";
phandle ¦ Unique numeric ID other nodes use to reference this node (dtc generates it from labels) ¦ phandle = <1>;
status ¦ "okay" enables the device; "disabled" means not used (often enabled per board with &label { status = "okay"; }) ¦ status = "okay";
#address-cells ¦ Number of 32-bit cells in each child's reg address ¦ #address-cells = <2>;
#size-cells ¦ Number of 32-bit cells in each child's reg size (0 for cpus, where reg is just the hart/core ID) ¦ #size-cells = <1>;
reg ¦ Register blocks as <address size> pairs, in the parent's address space (cell counts from the parent's #address-cells / #size-cells) ¦ reg = <0x0 0x10000000 0x0 0x1000>;
virtual-reg ¦ Virtual address the firmware maps the device at
ranges ¦ Maps child bus addresses to parent addresses as <child-addr parent-addr size>; empty means 1:1 ¦ ranges = <0x0 0x0 0x40000000 0x10000000>;
dma-ranges ¦ Like ranges, but for DMA from devices on this bus to memory
dma-coherent ¦ The device's DMA is cache-coherent (no cache maintenance needed)
device_type ¦ Deprecated except for "cpu" and "memory" nodes ¦ device_type = "memory";
interrupts ¦ Interrupt specifiers, format set by the parent controller's #interrupt-cells. GIC: <type number flags>, e.g. <GIC_SPI 33 IRQ_TYPE_LEVEL_HIGH>; PLIC: <source> ¦ interrupts = <GIC_SPI 33 IRQ_TYPE_LEVEL_HIGH>;
interrupt-parent ¦ phandle of the interrupt controller (inherited from ancestors when absent) ¦ interrupt-parent = <&plic>;
interrupts-extended ¦ Interrupts wired to several controllers: <&ctrl specifier ...> ¦ interrupts-extended = <&cpu0_intc 11>, <&cpu0_intc 9>;
interrupt-controller ¦ Marks this node as an interrupt controller
#interrupt-cells ¦ Number of cells in an interrupt specifier for this controller ¦ #interrupt-cells = <3>;
interrupt-names ¦ Names for the entries in interrupts, for platform_get_irq_byname()
interrupt-map interrupt-map-mask ¦ Translate child interrupt specifiers (e.g. PCI INTx) to parent controllers
clocks ¦ Clock specifiers: <&provider clock-id> ¦ clocks = <&rcc 12>;
clock-names ¦ Names for the entries in clocks, used by clk_get(dev, "name")
#clock-cells ¦ Number of cells in a clock specifier for this provider (0 for a single fixed clock)
clock-frequency ¦ Clock rate in Hz (fixed clocks, a UART's input clock, CPU timebase) ¦ clock-frequency = <24000000>;
clock-output-names ¦ Names of the clocks this provider outputs
assigned-clocks assigned-clock-rates assigned-clock-parents ¦ Configure clock rates / parents at boot
resets ¦ Reset line specifiers: <&reset-controller id>
reset-names ¦ Names for the entries in resets
#reset-cells ¦ Number of cells in a reset specifier
gpios ¦ GPIO specifiers: <&gpio-controller pin flags> ¦ gpios = <&gpio0 5 GPIO_ACTIVE_LOW>;
gpio-controller ¦ Marks this node as a GPIO controller
#gpio-cells ¦ Number of cells in a GPIO specifier (usually 2: pin, flags)
pinctrl-names ¦ Names of the pin states ("default", "sleep"); pinctrl-N is state N ¦ pinctrl-names = "default";
dmas ¦ DMA channel specifiers: <&dma-controller channel ...>
dma-names ¦ Names for the entries in dmas ("rx", "tx")
#dma-cells ¦ Number of cells in a DMA specifier
iommus ¦ IOMMU specifiers for this device
#iommu-cells ¦ Number of cells in an IOMMU specifier
power-domains ¦ Power domain specifiers
#power-domain-cells ¦ Number of cells in a power domain specifier
msi-parent ¦ phandle of the MSI controller
pwms ¦ PWM specifiers: <&pwm channel period-ns flags>
#pwm-cells ¦ Number of cells in a PWM specifier
bootargs ¦ (/chosen) Kernel command line ¦ bootargs = "console=ttyS0,115200 root=/dev/mmcblk0p2";
stdout-path ¦ (/chosen) Console device: a path or alias, optionally with ":115200n8" ¦ stdout-path = "serial0:115200n8";
linux,initrd-start linux,initrd-end ¦ (/chosen) Physical address range of the initramfs, set by the bootloader
kaslr-seed rng-seed ¦ (/chosen) Entropy passed by the bootloader
timebase-frequency ¦ Frequency in Hz of the RISC-V time CSR / PowerPC timebase (in /cpus) ¦ timebase-frequency = <10000000>;
riscv,isa ¦ RISC-V hart ISA string ¦ riscv,isa = "rv64imafdc_zicsr_zifencei";
riscv,isa-base ¦ RISC-V base ISA ("rv32i" or "rv64i")
riscv,isa-extensions ¦ RISC-V extensions as a string list ¦ riscv,isa-extensions = "i", "m", "a", "c";
riscv,ndev ¦ Number of interrupt sources a RISC-V PLIC supports
mmu-type ¦ RISC-V MMU mode of a hart ¦ mmu-type = "riscv,sv39";
enable-method ¦ How the OS starts secondary CPUs: "psci" or "spin-table" ¦ enable-method = "psci";
cpu-release-addr ¦ spin-table: address the secondary CPU polls for its entry point
next-level-cache ¦ phandle of the next cache level
cache-level cache-size cache-line-size cache-sets cache-unified ¦ Cache geometry
memory-region ¦ phandle(s) of reserved-memory nodes this device uses
no-map ¦ reserved-memory: exclude from the kernel's linear mapping entirely
reusable ¦ reserved-memory: the OS may use it while the owner doesn't (CMA)
size alignment alloc-ranges ¦ reserved-memory: dynamically placed region
label ¦ Human-readable name for the device
current-speed ¦ UART baud rate ¦ current-speed = <115200>;
reg-shift ¦ Register stride as a power of two (ns16550: registers 4 bytes apart → 2)
reg-io-width ¦ Register access width in bytes
wakeup-source ¦ The device can wake the system from suspend
local-mac-address mac-address ¦ Ethernet MAC address bytes ¦ local-mac-address = [00 11 22 33 44 55];
phy-mode phy-connection-type ¦ Ethernet PHY interface ("rgmii", "rmii", ...)
phy-handle ¦ phandle of the Ethernet PHY node
spi-max-frequency ¦ SPI device: maximum clock in Hz
interrupt-affinity ¦ CPUs that receive these interrupts (PMU)
method ¦ PSCI conduit: "smc" or "hvc" ¦ method = "smc";
`);

const KEYWORDS = docTable(`
/dts-v1/ ¦ Marks the file as DTS version 1; required at the top of a .dts ¦ /dts-v1/;
/plugin/ ¦ This source is a device tree overlay (applied on top of a base tree) ¦ /plugin/;
/include/ ¦ Include another .dtsi (dtc's own include, without the C preprocessor) ¦ /include/ "board.dtsi"
/delete-node/ ¦ Remove a node inherited from an included file ¦ /delete-node/ &uart1;
/delete-property/ ¦ Remove a property inherited from an included file ¦ /delete-property/ clocks;
/memreserve/ ¦ Reserve a physical memory range in the FDT header (OS must not use it) ¦ /memreserve/ 0x80000000 0x200000;
/bits/ ¦ Cell size for the following array: 8, 16, 32 or 64 ¦ prop = /bits/ 8 <0x12 0x34>;
/omit-if-no-ref/ ¦ Drop this node if nothing references it ¦ /omit-if-no-ref/ uart_pins: uart-pins { ... };
`);

const NODES = docTable(`
/ ¦ Root node: board-level compatible/model, #address-cells/#size-cells for top-level nodes
cpus ¦ Container for cpu nodes; usually #address-cells = <1>, #size-cells = <0>, and the timebase frequency on RISC-V
cpu ¦ One CPU core / hart; reg is its ID (MPIDR affinity on Arm, hart ID on RISC-V)
memory ¦ Physical RAM: device_type = "memory" and reg = <base size>
chosen ¦ Not a device: parameters from the bootloader (bootargs, stdout-path, initrd)
aliases ¦ Short names for nodes (serial0 = &uart0), used for console naming and stdout-path
reserved-memory ¦ Memory carved out for firmware, DMA pools or co-processors
soc ¦ Container for on-chip peripherals, usually "simple-bus" with ranges
interrupt-controller ¦ GIC, PLIC, NVIC-like controller (interrupt-controller property)
timer ¦ Timer device (Arm generic timer, CLINT/ACLINT on RISC-V)
psci ¦ Power State Coordination Interface: CPU on/off and suspend through firmware
plic ¦ RISC-V platform-level interrupt controller (external interrupts)
clint ¦ RISC-V core-local interruptor: machine software and timer interrupts (mtime / mtimecmp)
__symbols__ ¦ Generated label table used to resolve overlay references
`);

const MACROS = docTable(`
GIC_SPI ¦ 0: shared peripheral interrupt; the number is INTID − 32
GIC_PPI ¦ 1: private (per-core) peripheral interrupt; the number is INTID − 16
IRQ_TYPE_NONE ¦ 0: no trigger type
IRQ_TYPE_EDGE_RISING ¦ 1: rising-edge triggered
IRQ_TYPE_EDGE_FALLING ¦ 2: falling-edge triggered
IRQ_TYPE_EDGE_BOTH ¦ 3: triggered on both edges
IRQ_TYPE_LEVEL_HIGH ¦ 4: active-high level triggered
IRQ_TYPE_LEVEL_LOW ¦ 8: active-low level triggered
GPIO_ACTIVE_HIGH ¦ 0: line is active when high
GPIO_ACTIVE_LOW ¦ 1: line is active when low (the kernel inverts values)
GPIO_OPEN_DRAIN ¦ Open-drain output
`);

function property(name: string): HoverDoc | undefined {
  const e = PROPERTIES.get(name);
  if (e) return { title: name, tag: "Devicetree property", ...e };
  let m = /^pinctrl-(\d+)$/.exec(name);
  if (m) return { title: name, tag: "Devicetree property", summary: `Pin configuration for pin state ${m[1]} (named by pinctrl-names)`, syntax: `${name} = <&uart0_pins>;` };
  m = /^#([\w-]+)-cells$/.exec(name);
  if (m) return { title: name, tag: "Devicetree property", summary: `Number of cells in a ${m[1]} specifier for this provider` };
  m = /^(.+)-gpios?$/.exec(name);
  if (m) return { title: name, tag: "Devicetree property", summary: `GPIO(s) used as "${m[1]}": <&gpio-controller pin flags>`, syntax: `${name} = <&gpio0 5 GPIO_ACTIVE_LOW>;` };
  m = /^(.+)-supply$/.exec(name);
  if (m) return { title: name, tag: "Devicetree property", summary: `phandle of the regulator powering the "${m[1]}" supply` };
  m = /^(.+)-names$/.exec(name);
  if (m) return { title: name, tag: "Devicetree property", summary: `Names for the entries of the ${m[1]} property` };
  return undefined;
}

export function describeDevicetree(text: string, kind: TokenKind): HoverDoc | undefined {
  if (kind === "property") return property(text);
  if (kind === "keyword") {
    const e = KEYWORDS.get(text);
    return e && { title: text, tag: "Devicetree directive", ...e };
  }
  if (kind === "function") {
    const e = NODES.get(text);
    return e && { title: text, tag: "Devicetree node", ...e };
  }
  if (kind === "variable") {
    const e = MACROS.get(text);
    return e && { title: text, tag: "dt-bindings constant", ...e };
  }
  return undefined;
}
