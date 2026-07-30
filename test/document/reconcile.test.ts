import { describe, expect, test } from "bun:test";
import { createIdFactory, parseDocument, reconcile, type JsonNode } from "../../src/document";

function tree(source: string, newId: () => string = createIdFactory()) {
  const result = parseDocument(source, newId);
  if (!result.ok) throw new Error("fixture must parse");
  return result.root;
}

function versions(before: string, after: string) {
  const newId = createIdFactory();
  return { before: tree(before, newId), after: tree(after, newId) };
}

function changesBetween(before: string, after: string) {
  const trees = versions(before, after);
  return reconcile(trees.before, trees.after).changes;
}

function collectIds(root: JsonNode): string[] {
  const ids: string[] = [];
  const visit = (node: JsonNode): void => {
    ids.push(node.id);
    if (node.kind === "object") {
      for (const member of node.members) visit(member.node);
    } else if (node.kind === "array") {
      for (const item of node.items) visit(item);
    }
  };
  visit(root);
  return ids;
}

describe("document reconciliation", () => {
  test("marks an added member and leaves siblings untouched", () => {
    const changes = changesBetween('{"a":1}', '{"a":1,"b":2}');

    expect(changes.get("/b")).toBe("added");
    expect(changes.has("/a")).toBe(false);
  });

  test("marks a changed scalar at its own location", () => {
    expect(changesBetween('{"a":1}', '{"a":2}').get("/a")).toBe("changed");
  });

  test("marks every location inside a newly added subtree", () => {
    const changes = changesBetween("{}", '{"user":{"name":"x"}}');

    expect(changes.get("/user")).toBe("added");
    expect(changes.get("/user/name")).toBe("added");
  });

  test("treats a scalar replaced by a container as a change plus added contents", () => {
    const changes = changesBetween('{"a":1}', '{"a":{"b":2}}');

    expect(changes.get("/a")).toBe("changed");
    expect(changes.get("/a/b")).toBe("added");
  });

  test("returns the current tree for an identical document", () => {
    const { before, after } = versions('{"a":[1,2],"b":true}', '{"a":[1,2],"b":true}');
    const result = reconcile(before, after);

    expect(result.root).toBe(before);
    expect(result.changes.size).toBe(0);
  });

  test("does not mark a same-kind container whose members are unchanged", () => {
    const changes = changesBetween('{"a":{"b":1}}', '{"a":{"b":1},"c":9}');

    expect(changes.has("/a")).toBe(false);
    expect(changes.get("/c")).toBe("added");
  });

  test("preserves object order changes without marking stable locations", () => {
    const { before, after } = versions('{"a":1,"b":2}', '{"b":2,"a":1}');
    const result = reconcile(before, after);
    if (before.kind !== "object" || result.root.kind !== "object") {
      throw new Error("fixtures must be objects");
    }

    expect(result.root.members.map((member) => member.key)).toEqual(["b", "a"]);
    expect(result.root.members[0].node).toBe(before.members[1].node);
    expect(result.root.members[1].node).toBe(before.members[0].node);
    expect(result.changes.size).toBe(0);
  });

  test("rebuilds removals while preserving the surviving subtree", () => {
    const { before, after } = versions('{"a":1,"b":{"c":2}}', '{"b":{"c":2}}');
    const result = reconcile(before, after);
    if (before.kind !== "object" || result.root.kind !== "object") {
      throw new Error("fixtures must be objects");
    }

    expect(result.root.members.map((member) => member.key)).toEqual(["b"]);
    expect(result.root.members[0].node).toBe(before.members[1].node);
    expect(result.changes.size).toBe(0);
  });

  test("keeps identities unique when reused and added branches meet", () => {
    const { before, after } = versions('{"stable":{"x":1}}', '{"stable":{"x":1},"added":{"x":2}}');
    const ids = collectIds(reconcile(before, after).root);

    expect(new Set(ids).size).toBe(ids.length);
  });

  test("reconcile reuses the id and reference of an unchanged subtree in one pass", () => {
    const { before, after } = versions('{"a":{"b":1},"c":2}', '{"a":{"b":1},"c":3}');

    const { root, changes } = reconcile(before, after);
    if (before.kind !== "object" || root.kind !== "object") {
      throw new Error("fixtures must be objects");
    }

    // /a was untouched → the whole subtree (its id included) is carried over by reference.
    expect(root.members[0].node).toBe(before.members[0].node);
    // /c changed value → a fresh node that keeps its id but takes the new value.
    expect(changes.get("/c")).toBe("changed");
    expect(root.members[1].node.id).toBe(before.members[1].node.id);
    expect(root.members[1].node).toEqual({
      id: before.members[1].node.id,
      kind: "scalar",
      value: 3,
    });
  });
});
