import { build } from "esbuild";
import { mkdirSync } from "fs";

mkdirSync("dist", { recursive: true });

await build({
  entryPoints: ["src/manifest.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  outfile: "dist/manifest.js",
  sourcemap: true,
});
console.log("Built dist/manifest.js");

await build({
  entryPoints: ["src/worker.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  outfile: "dist/worker.js",
  external: [],
  sourcemap: true,
});
console.log("Built dist/worker.js");
