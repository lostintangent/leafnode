// The document model's tree: identified nodes over the three shapes
// JSON allows. A container is either an object of keyed members or an array of
// ordered items; every other JSON value is a scalar leaf whose JavaScript value
// carries its own type. Identity is stable across edits so the editor can address
// a node for editing or reordering without tracking its path.

export type JsonNode = (
  | { kind: "object"; members: JsonMember[] }
  | { kind: "array"; items: JsonNode[] }
  | { kind: "scalar"; value: JsonScalar }
) & { id: string };

export type JsonMember = { key: string; node: JsonNode };

export type JsonScalar = string | number | boolean | null;

/** The document root, addressed by the empty JSON Pointer. */
export const ROOT_POINTER = "";

/** Extend a JSON Pointer by one object key or array index. */
export function childPointer(parent: string, step: string | number): string {
  const token = String(step).replace(/~/g, "~0").replace(/\//g, "~1");
  return `${parent}/${token}`;
}

/** Create one identity source for a document's lifetime. */
export function createIdFactory(): () => string {
  let next = 0;
  return () => `n${next++}`;
}

export function objectNode(id: string, members: JsonMember[] = []): JsonNode {
  return { id, kind: "object", members };
}

export function arrayNode(id: string, items: JsonNode[] = []): JsonNode {
  return { id, kind: "array", items };
}

export function scalarNode(id: string, value: JsonScalar): JsonNode {
  return { id, kind: "scalar", value };
}

/** How many direct children a node holds; leaves hold none. */
export function childCount(node: JsonNode): number {
  switch (node.kind) {
    case "object":
      return node.members.length;

    case "array":
      return node.items.length;

    case "scalar":
      return 0;
  }
}

/** Collect every container below a root, excluding the root itself. */
export function descendantContainerIds(root: JsonNode): ReadonlySet<string> {
  const ids = new Set<string>();
  const visit = (node: JsonNode, include: boolean): void => {
    if (node.kind === "scalar") return;
    if (include) ids.add(node.id);

    if (node.kind === "object") {
      for (const member of node.members) visit(member.node, true);
    } else {
      for (const item of node.items) visit(item, true);
    }
  };

  visit(root, false);
  return ids;
}

/** Locate a node anywhere in the tree by identity; null when absent. */
export function findNode(root: JsonNode, id: string): JsonNode | null {
  if (root.id === id) return root;

  switch (root.kind) {
    case "object":
      for (const member of root.members) {
        const found = findNode(member.node, id);
        if (found) return found;
      }
      return null;

    case "array":
      for (const item of root.items) {
        const found = findNode(item, id);
        if (found) return found;
      }
      return null;

    case "scalar":
      return null;
  }
}
