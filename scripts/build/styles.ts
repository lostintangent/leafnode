import { join } from "node:path";
import tailwindPlugin from "bun-plugin-tailwind";

export function compileStyles(): string {
  // Bun forbids nested builds inside macros, so Tailwind compiles in a child.
  const child = Bun.spawnSync(["bun", "run", import.meta.path, "--compile"]);
  if (child.exitCode !== 0) {
    process.stderr.write(child.stderr);
    throw new Error("Leafnode styles failed to compile.");
  }
  return new TextDecoder().decode(child.stdout);
}

async function compileStylesToStdout(): Promise<void> {
  const build = await Bun.build({
    entrypoints: [join(import.meta.dir, "../../src/component/styles.css")],
    plugins: [tailwindPlugin],
    minify: true,
  });
  if (!build.success) {
    build.logs.forEach(console.error);
    process.exit(1);
  }
  const output = build.outputs.find((candidate) => candidate.path.endsWith(".css"));
  if (!output) throw new Error("Leafnode styles did not emit CSS.");
  process.stdout.write(await output.text());
}

if (process.argv.includes("--compile")) await compileStylesToStdout();
