import esbuild from "esbuild";
import { builtinModules } from "node:module";
import { copyFile, mkdir } from "node:fs/promises";

const prod = process.argv[2] === "production";
const outdir = "build";

// Obsidian loads main.js, manifest.json and styles.css from the plugin folder:
// put all three in build/, again after every rebuild in watch mode.
const copyAssets = {
	name: "copy-assets",
	setup(build) {
		build.onEnd(async (result) => {
			if (result.errors.length) return;
			await mkdir(outdir, { recursive: true });
			await Promise.all(
				["manifest.json", "styles.css"].map((f) =>
					copyFile(f, `${outdir}/${f}`),
				),
			);
		});
	},
};

const ctx = await esbuild.context({
	entryPoints: ["src/main.ts"],
	bundle: true,
	format: "cjs",
	target: "es2018",
	outfile: `${outdir}/main.js`,
	external: [
		"obsidian",
		"electron",
		"@codemirror/*",
		"@lezer/*",
		...builtinModules,
	],
	sourcemap: prod ? false : "inline",
	treeShaking: true,
	logLevel: "info",
	plugins: [copyAssets],
});
if (prod) {
	await ctx.rebuild();
	process.exit(0);
} else {
	await ctx.watch();
}
