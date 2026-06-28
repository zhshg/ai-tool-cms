import * as esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["src/main.ts"],
  bundle: true,
  platform: "node",
  format: "cjs",
  outfile: "dist/main.cjs",
  external: ["@prisma/client", "prisma"],
  sourcemap: true,
  target: "node20",
});

console.info("[mcp-server] bundled dist/main.cjs");
