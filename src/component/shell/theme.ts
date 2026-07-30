import type { CSSProperties } from "react";

export type LeafnodeTheme = {
  accent: string;
  background: string;
  muted: string;
  text: string;
};

export const lightTheme: LeafnodeTheme = {
  accent: "#d4711e",
  background: "oklch(1 0 0)",
  muted: "oklch(0.556 0 0)",
  text: "oklch(0.145 0 0)",
};

export const darkTheme: LeafnodeTheme = {
  accent: "#d4711e",
  background: "oklch(0.145 0 0)",
  muted: "oklch(0.708 0 0)",
  text: "oklch(0.985 0 0)",
};

/** Map the host-owned theme to the editor and overlay CSS boundary. */
export function resolveThemeStyles(theme?: LeafnodeTheme): CSSProperties {
  if (!theme) return {};
  return {
    "--leafnode-accent": theme.accent,
    "--leafnode-background": theme.background,
    "--leafnode-muted": theme.muted,
    "--leafnode-text": theme.text,
  } as CSSProperties;
}
