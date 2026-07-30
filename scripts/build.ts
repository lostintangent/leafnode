import { rmSync } from "node:fs";
import { join } from "node:path";
import type { BuildOutput } from "bun";
import tailwindPlugin from "bun-plugin-tailwind";
import { peerExternalsPlugin } from "./peer-externals";
import virtualModulesPlugin from "./virtual-modules";

type BuildMode = "dev" | "playground" | "prod";

const mode = resolveMode(process.argv);
const projectRoot = join(import.meta.dir, "..");
const distDirectory = join(projectRoot, "dist");
const define = {
  "process.env.NODE_ENV": JSON.stringify("production"),
};

process.env.NODE_ENV = "production";

const libraryBuild =
  mode === "playground"
    ? null
    : await Bun.build({
        entrypoints: [join(projectRoot, "src/index.ts")],
        outdir: distDirectory,
        target: "browser",
        format: "esm",
        splitting: false,
        sourcemap: mode === "dev" ? "external" : "none",
        plugins: [virtualModulesPlugin, peerExternalsPlugin],
        ...(mode === "prod" && { minify: true }),
        define,
      });

if (libraryBuild) {
  assertBuildSuccess(libraryBuild, "Library");
  assertPeerBoundary(libraryBuild);

  for (const output of libraryBuild.outputs) {
    console.log(`  ${output.path} (${(output.size / 1024).toFixed(1)} KB)`);
  }
}

if (mode === "prod") {
  rmSync(join(distDirectory, "index.d.ts"), { force: true });
  rmSync(join(distDirectory, "index.js.map"), { force: true });

  const declarations = Bun.spawnSync(
    [
      "dts-bundle-generator",
      "--project",
      "tsconfig.declarations.json",
      "--out-file",
      "dist/index.d.ts",
      "--no-banner",
      "--no-check",
      "--export-referenced-types",
      "false",
      "src/index.ts",
    ],
    {
      cwd: projectRoot,
      stdio: ["inherit", "inherit", "inherit"],
    },
  );

  if (declarations.exitCode !== 0) {
    throw new Error("Type declaration generation failed.");
  }
}

if (mode !== "prod") {
  const playgroundDirectory = join(distDirectory, "playground");
  rmSync(playgroundDirectory, { force: true, recursive: true });

  const playgroundBuild = await Bun.build({
    entrypoints: [join(projectRoot, "playground/index.html")],
    outdir: playgroundDirectory,
    plugins: [virtualModulesPlugin, tailwindPlugin],
    sourcemap: mode === "dev" ? "external" : "none",
    ...(mode === "playground" && { compile: true, minify: true }),
    define,
  });

  assertBuildSuccess(playgroundBuild, "Playground");
}

function resolveMode(argv: string[]): BuildMode {
  if (argv.includes("--prod")) return "prod";
  if (argv.includes("--playground")) return "playground";
  return "dev";
}

function assertBuildSuccess(build: BuildOutput, name: string): void {
  if (build.success) return;
  build.logs.forEach(console.error);
  throw new Error(`${name} build failed.`);
}

async function assertPeerBoundary(build: BuildOutput): Promise<void> {
  const javascript = build.outputs.find((output) => output.path.endsWith("/index.js"));
  if (!javascript) throw new Error("Library build did not emit JavaScript.");
  const source = await javascript.text();
  const retainedPeers = [
    "@tanstack/react-store",
    "@tanstack/store",
    "react",
    "react-dom",
    "react/jsx-runtime",
  ];
  for (const peer of retainedPeers) {
    if (!source.includes(`"${peer}"`)) {
      throw new Error(`Library build did not retain its ${peer} import.`);
    }
  }
  if (source.includes('"@base-ui/react') || source.includes('"lucide-react"')) {
    throw new Error("A private implementation dependency escaped the library bundle.");
  }
}
