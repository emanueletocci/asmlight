import esbuild from "esbuild";
import { builtinModules } from "node:module";

const prod = process.argv[2] === "production";
const ctx = await esbuild.context({
  entryPoints: ["src/main.ts"],
  bundle: true,
  format: "cjs",
  target: "es2018",
  outfile: "main.js",
  external: ["obsidian", "electron", "@codemirror/*", "@lezer/*", ...builtinModules],
  sourcemap: prod ? false : "inline",
  treeShaking: true,
  logLevel: "info",
});
if (prod) { await ctx.rebuild(); process.exit(0); } else { await ctx.watch(); }
