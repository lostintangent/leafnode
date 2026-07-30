import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { BunPlugin } from "bun";
import tailwindPlugin from "bun-plugin-tailwind";

const virtualModulesPlugin: BunPlugin = {
  name: "parsely-virtual-modules",
  setup(build) {
    let compiled: string | undefined;
    const shouldCache = process.env.NODE_ENV === "production";
    build.onLoad({ filter: /src\/component\/shadow\/generated\.css$/ }, () => ({
      contents: shouldCache ? (compiled ??= compileStyles()) : compileStyles(),
      loader: "text",
    }));
  },
};

function compileStyles(): string {
  const child = Bun.spawnSync(["bun", "run", import.meta.path, "--compile"]);
  if (child.exitCode !== 0) {
    process.stderr.write(child.stderr);
    throw new Error("Parsely styles failed to compile.");
  }
  return new TextDecoder().decode(child.stdout);
}

async function compileStylesToStdout(): Promise<void> {
  const outputDirectory = mkdtempSync(join(tmpdir(), "parsely-styles-"));
  try {
    const build = await Bun.build({
      entrypoints: [join(import.meta.dir, "../src/component/styles.css")],
      outdir: outputDirectory,
      plugins: [tailwindPlugin],
      minify: true,
    });
    if (!build.success) {
      build.logs.forEach(console.error);
      process.exit(1);
    }
    const output = build.outputs.find((candidate) => candidate.path.endsWith(".css"));
    if (!output) throw new Error("Parsely styles did not emit CSS.");
    process.stdout.write(readFileSync(output.path));
  } finally {
    rmSync(outputDirectory, { force: true, recursive: true });
  }
}

if (process.argv.includes("--compile")) await compileStylesToStdout();

export default virtualModulesPlugin;
