import {
  createContext,
  useContext,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";
import type { ParselyTheme, ParselyThemeInput } from "./types";

export const lightTheme: ParselyTheme = {
  accent: "#d4711e",
  background: "oklch(1 0 0)",
  muted: "oklch(0.556 0 0)",
  text: "oklch(0.145 0 0)",
};

export const darkTheme: ParselyTheme = {
  accent: "#d4711e",
  background: "oklch(0.145 0 0)",
  muted: "oklch(0.708 0 0)",
  text: "oklch(0.985 0 0)",
};

type Scheme = "dark" | "light";

type ThemeContextValue = {
  readonly scheme: Scheme;
  readonly styles: CSSProperties;
  readonly theme: ParselyTheme;
  readonly values: Record<"boolean" | "null" | "number" | "string", string>;
  readonly diff: { readonly added: string; readonly changed: string };
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const DARK_QUERY = "(prefers-color-scheme: dark)";

const values: Record<Scheme, ThemeContextValue["values"]> = {
  light: { string: "#15803d", number: "#1d4ed8", boolean: "#7c3aed", null: "#6b7280" },
  dark: { string: "#4ade80", number: "#60a5fa", boolean: "#c084fc", null: "#9ca3af" },
};

const diff: Record<Scheme, ThemeContextValue["diff"]> = {
  light: { added: "rgba(34, 197, 94, 0.18)", changed: "rgba(59, 130, 246, 0.18)" },
  dark: { added: "rgba(34, 197, 94, 0.24)", changed: "rgba(96, 165, 250, 0.24)" },
};

export function ThemeProvider({
  children,
  input = { dark: darkTheme, light: lightTheme },
}: {
  children: ReactNode;
  input?: ParselyThemeInput;
}) {
  const preferredScheme = usePreferredScheme();
  const scheme = input === darkTheme ? "dark" : input === lightTheme ? "light" : preferredScheme;
  const theme = "dark" in input ? input[scheme] : input;
  const styles = {
    "--accent": theme.accent,
    "--background": theme.background,
    "--border": `color-mix(in srgb, ${theme.text} 16%, transparent)`,
    "--danger": "#ef4444",
    "--hover": `color-mix(in srgb, ${theme.text} 7%, transparent)`,
    "--muted": theme.muted,
    "--surface": `color-mix(in srgb, ${theme.background} 96%, ${theme.text})`,
    "--text": theme.text,
    colorScheme: scheme,
  } as CSSProperties;

  return (
    <ThemeContext.Provider
      value={{ scheme, styles, theme, values: values[scheme], diff: diff[scheme] }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useParselyTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useParselyTheme must be used within ThemeProvider.");
  return context;
}

function usePreferredScheme(): Scheme {
  const dark = useSyncExternalStore(subscribe, getSnapshot, () => false);
  return dark ? "dark" : "light";
}

function subscribe(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const media = window.matchMedia(DARK_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function getSnapshot(): boolean {
  return typeof window !== "undefined" && window.matchMedia(DARK_QUERY).matches;
}
