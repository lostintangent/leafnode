import type { JsonScalar } from "../../../../document";

export function valueText(value: JsonScalar): string {
  return value === null ? "null" : String(value);
}

export function valueColor(value: JsonScalar): string {
  return `var(--leafnode-value-${value === null ? "null" : typeof value})`;
}

// Inline edits infer JSON literals and finite numbers; all other text stays a string.
export function inferScalar(text: string): JsonScalar {
  const trimmed = text.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "null") return null;
  if (trimmed !== "" && Number.isFinite(Number(trimmed))) return Number(trimmed);
  return text;
}
