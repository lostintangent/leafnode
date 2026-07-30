import type { BunPlugin } from "bun";

const PEER_PACKAGES = ["@tanstack/react-store", "@tanstack/store", "react-dom", "react"] as const;

export function isPeerImport(specifier: string): boolean {
  return PEER_PACKAGES.some(
    (peerPackage) => specifier === peerPackage || specifier.startsWith(`${peerPackage}/`),
  );
}

export const peerExternalsPlugin: BunPlugin = {
  name: "parsely-peer-externals",
  setup(build) {
    build.onResolve(
      {
        filter: /^(?:react(?:\/.*)?|react-dom(?:\/.*)?|@tanstack\/(?:store|react-store)(?:\/.*)?)$/,
      },
      ({ path }) => ({ external: true, path }),
    );
  },
};
