// Plain JSON has no notion of identity or links, but a few conventions layer a
// graph on top. Objects declare identity with `$id`, `@id`, or `id`; any other
// string value equal to a declared id is treated as a reference to that object.

import type { JsonNode, JsonScalar, NodeId } from "./model";

const IDENTITY_KEYS: ReadonlySet<string> = new Set(["$id", "@id", "id"]);
const MIN_ID_LENGTH = 2;

export function isIdentityKey(key: string): boolean {
  return IDENTITY_KEYS.has(key);
}

export type Entity = {
  readonly node: JsonNode;
  readonly ancestorIds: readonly NodeId[];
};

export type EntityIndex = ReadonlyMap<string, Entity>;

export function indexEntities(root: JsonNode): EntityIndex {
  const index = new Map<string, Entity>();
  const walk = (node: JsonNode, ancestorIds: readonly NodeId[]): void => {
    if (node.kind === "scalar") return;
    if (node.kind === "object") {
      const id = declaredId(node);
      if (id !== null && !index.has(id)) index.set(id, { node, ancestorIds });
    }
    const children =
      node.kind === "object" ? node.members.map((member) => member.node) : node.items;
    const within = [...ancestorIds, node.id];
    for (const child of children) walk(child, within);
  };
  walk(root, []);
  return index;
}

export function resolveReference(
  key: string | null,
  value: JsonScalar,
  entities: EntityIndex,
): Entity | null {
  if (typeof value !== "string") return null;
  if (key !== null && isIdentityKey(key)) return null;
  return entities.get(value) ?? null;
}

export function declaredId(node: JsonNode): string | null {
  if (node.kind !== "object") return null;
  for (const member of node.members) {
    if (
      isIdentityKey(member.key) &&
      member.node.kind === "scalar" &&
      typeof member.node.value === "string" &&
      member.node.value.length >= MIN_ID_LENGTH
    ) {
      return member.node.value;
    }
  }
  return null;
}
