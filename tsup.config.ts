import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/scripts/summarize-commits.ts", "src/scripts/notify-slack.ts"],
  format: ["esm"],
  target: "node24",
  platform: "node",
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  dts: false,
  outDir: "dist",
});
