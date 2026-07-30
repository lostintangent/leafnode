// Plain JSON has no links, but string values matching a declared object identity
// form a useful graph projection for navigation.

import type { JsonNode, JsonScalar } from "../../../../document";
import { declaredId, isIdentityKey } from "../../keys/identity";

type ObjectNode = Extract<JsonNode, { kind: "object" }>;

export type ReferenceTarget = {
  readonly node: ObjectNode;
  readonly ancestorIds: readonly string[];
};

type ReferenceIndex = ReadonlyMap<string, ReferenceTarget>;

// Roots are immutable, so every reference row can share one weakly held projection.
const referenceIndexes = new WeakMap<JsonNode, ReferenceIndex>();

export function resolveReference(
  root: JsonNode,
  memberKey: string | null,
  value: JsonScalar,
): ReferenceTarget | null {
  if (typeof value !== "string") return null;
  if (memberKey !== null && isIdentityKey(memberKey)) return null;
  return getReferenceIndex(root).get(value) ?? null;
}

function getReferenceIndex(root: JsonNode): ReferenceIndex {
  const cached = referenceIndexes.get(root);
  if (cached) return cached;

  const index = new Map<string, ReferenceTarget>();
  const walk = (node: JsonNode, ancestorIds: readonly string[]): void => {
    if (node.kind === "scalar") return;

    if (node.kind === "object") {
      const id = declaredId(node);
      if (id !== null && !index.has(id)) index.set(id, { node, ancestorIds });
    }

    const childAncestorIds = [...ancestorIds, node.id];
    if (node.kind === "object") {
      for (const member of node.members) walk(member.node, childAncestorIds);
    } else {
      for (const item of node.items) walk(item, childAncestorIds);
    }
  };

  walk(root, []);
  referenceIndexes.set(root, index);
  return index;
}
