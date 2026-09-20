import path from "node:path";
import { build } from "esbuild";

const repoRoot = path.resolve(import.meta.dirname, "../..");

await build({
  entryPoints: [path.join(import.meta.dirname, "src/index.ts")],
  outfile: path.join(repoRoot, ".output/dist/server/index.js"),
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node24",
  sourcemap: true,
});
