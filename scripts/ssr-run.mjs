/*
 * Builds scripts/ssr-entry.jsx with Vite (SSR target) and runs it in
 * Node to smoke-test that every page renders with empty data.
 * Run with: node scripts/ssr-run.mjs
 */

import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "vite";
import react from "@vitejs/plugin-react";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const outDir = path.join(root, "node_modules", ".ssr-smoke");

await build({
	configFile: false,
	root,
	logLevel: "error",
	plugins: [react()],
	build: {
		ssr: path.join(here, "ssr-entry.jsx"),
		outDir,
		emptyOutDir: true,
		minify: false,
		target: "node18",
		rollupOptions: {
			output: { entryFileNames: "entry.mjs" },
		},
	},
});

const mod = await import(
	pathToFileURL(path.join(outDir, "entry.mjs")).href
);

const { results, failed } = mod.runSmoke();

results.forEach((line) => console.log(line));
console.log(`\n${results.length - failed} passed, ${failed} failed`);

process.exit(failed ? 1 : 0);
