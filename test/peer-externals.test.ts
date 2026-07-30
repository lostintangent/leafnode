import { describe, expect, test } from "bun:test";
import { isPeerImport } from "../scripts/peer-externals";

describe("peer dependency boundary", () => {
  test("externalizes every peer package and subpath", () => {
    expect(isPeerImport("react")).toBe(true);
    expect(isPeerImport("react/jsx-runtime")).toBe(true);
    expect(isPeerImport("react-dom/client")).toBe(true);
    expect(isPeerImport("@tanstack/store")).toBe(true);
    expect(isPeerImport("@tanstack/store/derived")).toBe(true);
    expect(isPeerImport("@tanstack/react-store")).toBe(true);
  });

  test("keeps implementation dependencies bundled", () => {
    expect(isPeerImport("@base-ui/react/menu")).toBe(false);
    expect(isPeerImport("lucide-react")).toBe(false);
  });
});
