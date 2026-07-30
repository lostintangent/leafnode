import type { JsonNode } from "../../../document";

const IDENTITY_KEYS = new Set(["$id", "@id", "id"]);
// Single-character scalar values are too common to serve as useful identities.
const MINIMUM_ID_LENGTH = 2;

export function isIdentityKey(key: string): boolean {
  return IDENTITY_KEYS.has(key);
}

export function declaredId(node: JsonNode): string | null {
  if (node.kind !== "object") return null;
  for (const member of node.members) {
    if (
      isIdentityKey(member.key) &&
      member.node.kind === "scalar" &&
      typeof member.node.value === "string" &&
      member.node.value.length >= MINIMUM_ID_LENGTH
    ) {
      return member.node.value;
    }
  }
  return null;
}
