import { describe, expect, test } from "bun:test";
import {
  appendItem,
  appendMember,
  createIdFactory,
  parseDocument,
  removeNode,
  renameMemberKey,
  reorderChildren,
  scalarNode,
  serializeDocument,
  setValue,
  type JsonNode,
} from "../../src/document";

// A shared fixture: an object with a leaf and an array, so edits can be
// exercised against both container shapes and structural sharing verified.
function fixture(): JsonNode {
  const result = parseDocument('{"a":1,"b":[10,20]}', createIdFactory());
  if (!result.ok) throw new Error("fixture must parse");
  return result.root;
}

/** The plain JSON value a tree serializes to, for order-preserving assertions. */
function plain(node: JsonNode): unknown {
  return JSON.parse(serializeDocument(node));
}

function object(node: JsonNode) {
  if (node.kind !== "object") throw new Error("expected an object node");
  return node;
}

function array(node: JsonNode) {
  if (node.kind !== "array") throw new Error("expected an array node");
  return node;
}

describe("JSON document edits", () => {
  test("setValue replaces one leaf and shares untouched subtrees", () => {
    const root = fixture();
    const leafId = object(root).members[0].node.id;

    const next = setValue(root, leafId, "changed");

    expect(plain(next)).toEqual({ a: "changed", b: [10, 20] });
    expect(object(next).members[1]).toBe(object(root).members[1]);
  });

  test("setValue is a no-op when the value is unchanged", () => {
    const root = fixture();
    const leafId = object(root).members[0].node.id;

    expect(setValue(root, leafId, 1)).toBe(root);
  });

  test("appendMember appends to the addressed object", () => {
    const root = fixture();

    const next = appendMember(root, root.id, { key: "c", node: scalarNode("x", true) });

    expect(plain(next)).toEqual({ a: 1, b: [10, 20], c: true });
  });

  test("appendItem appends to the addressed array", () => {
    const root = fixture();
    const arrayId = object(root).members[1].node.id;

    const next = appendItem(root, arrayId, scalarNode("x", 30));

    expect(plain(next)).toEqual({ a: 1, b: [10, 20, 30] });
  });

  test("reorderChildren moves siblings in either container shape", () => {
    const root = fixture();
    const arrayId = object(root).members[1].node.id;

    expect(
      object(reorderChildren(root, root.id, 0, 1)).members.map((member) => member.key),
    ).toEqual(["b", "a"]);
    expect(plain(reorderChildren(root, arrayId, 0, 1))).toEqual({ a: 1, b: [20, 10] });
  });

  test("reorderChildren is a no-op for equal or out-of-range indices", () => {
    const root = fixture();
    const arrayId = object(root).members[1].node.id;

    expect(reorderChildren(root, arrayId, 1, 1)).toBe(root);
    expect(reorderChildren(root, arrayId, 0, 5)).toBe(root);
  });

  test("removeNode drops a member and shares the rest", () => {
    const root = fixture();
    const leafId = object(root).members[0].node.id;
    const untouched = object(root).members[1];
    const next = removeNode(root, leafId);

    expect(plain(next)).toEqual({ b: [10, 20] });
    expect(object(next).members[0]).toBe(untouched);
  });

  test("removeNode drops an array item by identity", () => {
    const root = fixture();
    const firstItemId = array(object(root).members[1].node).items[0].id;

    expect(plain(removeNode(root, firstItemId))).toEqual({ a: 1, b: [20] });
  });

  test("removeNode cannot remove the document root or an unknown id", () => {
    const root = fixture();

    expect(removeNode(root, root.id)).toBe(root);
    expect(removeNode(root, "missing")).toBe(root);
  });

  test("renameMemberKey renames the owning member", () => {
    const root = fixture();
    const leafId = object(root).members[0].node.id;

    const next = renameMemberKey(root, leafId, "renamed");

    if (!next) throw new Error("a unique key must be accepted");
    expect(plain(next)).toEqual({ renamed: 1, b: [10, 20] });
  });

  test("renameMemberKey rejects a duplicate sibling key with null", () => {
    const root = fixture();
    const leafId = object(root).members[0].node.id;

    expect(renameMemberKey(root, leafId, "b")).toBeNull();
  });

  test("renameMemberKey keeps the same tree when the key is unchanged", () => {
    const root = fixture();
    const leafId = object(root).members[0].node.id;

    expect(renameMemberKey(root, leafId, "a")).toBe(root);
  });

  test("addressed edits preserve the root for absent or incompatible targets", () => {
    const root = fixture();
    const arrayId = object(root).members[1].node.id;
    const child = scalarNode("new", 2);

    expect(setValue(root, root.id, 2)).toBe(root);
    expect(appendMember(root, arrayId, { key: "c", node: child })).toBe(root);
    expect(appendItem(root, root.id, child)).toBe(root);
    expect(reorderChildren(root, "missing", 0, 1)).toBe(root);
    expect(renameMemberKey(root, "missing", "renamed")).toBe(root);
  });
});
