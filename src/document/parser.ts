// The boundary between JSON text and the identified document model. Parsing follows
// JSON.parse semantics and assigns identities in document pre-order. Serialization
// writes the tree directly instead of materializing a JavaScript object, preserving
// the model's exact member order—including numeric-looking keys—across edits.

import { arrayNode, objectNode, scalarNode, type JsonNode, type JsonScalar } from "./tree";

type JsonValue = JsonScalar | JsonValue[] | { [key: string]: JsonValue };

type ParseResult = { ok: true; root: JsonNode } | { ok: false; error: string };

/** Parse file text into a node tree, defaulting empty files to an empty object.
 *  The caller owns one `newId` source for the document's lifetime. */
export function parseDocument(source: string, newId: () => string): ParseResult {
  if (source.trim() === "") return { ok: true, root: objectNode(newId()) };

  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Invalid JSON." };
  }

  return { ok: true, root: fromJsonValue(value as JsonValue, newId) };
}

function fromJsonValue(value: JsonValue, newId: () => string): JsonNode {
  if (Array.isArray(value)) {
    return arrayNode(
      newId(),
      value.map((item) => fromJsonValue(item, newId)),
    );
  }
  if (value !== null && typeof value === "object") {
    return objectNode(
      newId(),
      Object.entries(value).map(([key, child]) => ({ key, node: fromJsonValue(child, newId) })),
    );
  }
  return scalarNode(newId(), value);
}

const INDENT = "  ";

/** Serialize the tree to pretty-printed JSON with a trailing newline. */
export function serializeDocument(root: JsonNode): string {
  return `${writeNode(root, 0)}\n`;
}

function writeNode(node: JsonNode, depth: number): string {
  switch (node.kind) {
    case "scalar":
      return JSON.stringify(node.value);
    case "array": {
      if (node.items.length === 0) return "[]";
      const pad = INDENT.repeat(depth + 1);
      const body = node.items.map((item) => pad + writeNode(item, depth + 1)).join(",\n");
      return `[\n${body}\n${INDENT.repeat(depth)}]`;
    }
    case "object": {
      if (node.members.length === 0) return "{}";
      const pad = INDENT.repeat(depth + 1);
      const body = node.members
        .map(
          (member) => `${pad}${JSON.stringify(member.key)}: ${writeNode(member.node, depth + 1)}`,
        )
        .join(",\n");
      return `{\n${body}\n${INDENT.repeat(depth)}}`;
    }
  }
}
