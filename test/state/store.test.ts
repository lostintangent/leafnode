import { describe, expect, test } from "bun:test";
import type { JsonNode } from "../../src/document";
import {
  createLeafnodeStore,
  type LeafnodeAgentRequest,
  type LeafnodeStore,
  type NewNodeType,
} from "../../src/state";

function createTestStore(source: string, readOnly = false) {
  const store = createLeafnodeStore({ content: source, readOnly });
  const published: string[] = [];
  const requests: LeafnodeAgentRequest[] = [];
  store.subscribeToEvents((event) => {
    if (event.type === "contentChanged") published.push(event.content);
    else requests.push(event.request);
  });
  return { store, published, requests };
}

function syncContent(store: LeafnodeStore, content: string): void {
  store.syncInput({
    content,
    readOnly: store.state.readOnly,
    agent:
      store.state.activePointers === null
        ? undefined
        : { activePointers: store.state.activePointers },
  });
}

function root(node: JsonNode | null): JsonNode {
  if (!node) throw new Error("expected a parsed root");
  return node;
}

function object(node: JsonNode | null) {
  const value = root(node);
  if (value.kind !== "object") throw new Error("expected an object root");
  return value;
}

function array(node: JsonNode) {
  if (node.kind !== "array") throw new Error("expected an array node");
  return node;
}

function lastValue(published: string[]): unknown {
  return JSON.parse(published[published.length - 1]);
}

describe("Leafnode store", () => {
  test("loads source into a tree without publishing a save", () => {
    const { store, published } = createTestStore('{"a":1}');

    expect(object(store.state.root).members[0].key).toBe("a");
    expect(store.state.parseError).toBeNull();
    expect(published).toHaveLength(0);
  });

  test("surfaces invalid JSON as a parse error with no tree", () => {
    const { store } = createTestStore("{ broken");

    expect(store.state.root).toBeNull();
    expect(store.state.parseError).not.toBeNull();
  });

  test("edits a leaf value and publishes serialized source once", () => {
    const { store, published } = createTestStore('{"a":1}');
    const leafId = object(store.state.root).members[0].node.id;

    store.actions.replaceValue(leafId, "hi");

    expect(published).toHaveLength(1);
    expect(lastValue(published)).toEqual({ a: "hi" });
  });

  test("publishes an agent request for the current node", () => {
    const { store, requests } = createTestStore('{"a":1}');
    const leaf = object(store.state.root).members[0].node;

    store.actions.requestAgent("/a", leaf.id);
    expect(requests).toHaveLength(0);

    store.syncInput({ content: '{"a":1}', readOnly: false, agent: {} });
    store.actions.requestAgent("/a", leaf.id);

    expect(requests).toEqual([{ pointer: "/a", value: "1\n" }]);
  });

  test("synchronizes read-only input and cancels mutable interactions", () => {
    const { store, published } = createTestStore('{"a":1}');
    const leafId = object(store.state.root).members[0].node.id;
    store.actions.beginEdit("value", leafId);

    store.syncInput({ content: '{"a":1}', readOnly: true });
    store.actions.replaceValue(leafId, 2);

    expect(store.state.readOnly).toBe(true);
    expect(store.state.editing).toBeNull();
    expect(published).toHaveLength(0);
  });

  test("owns and clears synchronized agent pointers", () => {
    const { store } = createTestStore('{"a":1}');
    const activePointers = new Set(["/a"]);

    store.syncInput({
      content: '{"a":1}',
      readOnly: false,
      agent: { activePointers },
    });

    expect(store.state.activePointers).toEqual(activePointers);
    expect(store.state.activePointers).not.toBe(activePointers);

    store.syncInput({ content: '{"a":1}', readOnly: false });

    expect(store.state.activePointers).toBeNull();
  });

  test("keeps local edits when unrelated host input is synchronized", () => {
    const { store, published } = createTestStore('{"a":1}');
    const leafId = object(store.state.root).members[0].node.id;
    store.actions.replaceValue(leafId, 2);

    store.syncInput({
      content: '{"a":1}',
      readOnly: false,
      agent: { activePointers: new Set(["/a"]) },
    });

    expect(lastValue(published)).toEqual({ a: 2 });
    expect(object(store.state.root).members[0].node).toMatchObject({
      kind: "scalar",
      value: 2,
    });
  });

  test("renames a key and rejects a duplicate without publishing", () => {
    const { store, published } = createTestStore('{"a":1,"b":2}');
    const aId = object(store.state.root).members[0].node.id;

    expect(store.actions.renameKey(aId, "b")).toBe(false);
    expect(published).toHaveLength(0);

    expect(store.actions.renameKey(aId, "c")).toBe(true);
    expect(lastValue(published)).toEqual({ c: 1, b: 2 });
  });

  test("adds a member, opening its key for editing and expanding the object", () => {
    const { store, published } = createTestStore('{"a":1}');

    store.actions.addChild(store.state.root!.id, "string");
    const object_ = object(store.state.root);

    expect(object_.members).toHaveLength(2);
    expect(store.state.editing).toEqual({ field: "key", id: object_.members[1].node.id });
    expect(lastValue(published)).toEqual({ a: 1, key: "" });
  });

  test("adds an array item, opening a value editor for scalars only", () => {
    const { store } = createTestStore('{"list":[]}');
    const listId = object(store.state.root).members[0].node.id;

    store.actions.addChild(listId, "number");
    expect(store.state.editing?.field).toBe("value");

    store.actions.addChild(listId, "object");
    expect(store.state.editing).toBeNull();
  });

  test("creates every addable node type from its canonical default", () => {
    const { store, published } = createTestStore("[]");
    const types = [
      "string",
      "number",
      "boolean",
      "null",
      "object",
      "array",
    ] as const satisfies readonly NewNodeType[];

    for (const type of types) store.actions.addChild(store.state.root!.id, type);

    expect(lastValue(published)).toEqual(["", 0, false, null, {}, []]);
  });

  test("undo restores the previous tree and redo re-applies it", () => {
    const { store, published } = createTestStore('{"a":1}');
    store.actions.replaceValue(object(store.state.root).members[0].node.id, 2);

    store.actions.undo();
    expect(lastValue(published)).toEqual({ a: 1 });

    store.actions.redo();
    expect(lastValue(published)).toEqual({ a: 2 });
  });

  test("clears undo history on an external reload", () => {
    const { store } = createTestStore('{"a":1}');
    store.actions.replaceValue(object(store.state.root).members[0].node.id, 2);
    expect(store.state.past).toHaveLength(1);

    syncContent(store, '{"a":3}');

    expect(store.state.past).toHaveLength(0);
  });

  test("keeps collapse across an external change by reusing unchanged node ids", () => {
    const { store } = createTestStore('{"a":{"b":1},"c":2}');
    const aId = object(store.state.root).members[0].node.id;
    store.actions.toggleCollapsed(aId);

    syncContent(store, '{"a":{"b":1},"c":3}');

    // /a was untouched, so it keeps its id — collapse carries with no remapping.
    expect(object(store.state.root).members[0].node.id).toBe(aId);
    expect(store.state.collapsed.has(aId)).toBe(true);
  });

  test("ignores an external reload that changes nothing, keeping the current tree", () => {
    const { store } = createTestStore('{"a":{"b":1}}');
    const aId = object(store.state.root).members[0].node.id;
    store.actions.toggleCollapsed(aId);

    syncContent(store, '{"a":{"b":1}}'); // identical content, e.g. our own save

    // Nothing changed, so the current tree is kept as-is — the same ids, still collapsed.
    expect(object(store.state.root).members[0].node.id).toBe(aId);
    expect(store.state.collapsed.has(aId)).toBe(true);
    expect(store.state.changes.size).toBe(0);
  });

  test("absorbs its own published content without reparsing the document", () => {
    const { store, published } = createTestStore('{"a":1}');
    const documentId = root(store.state.root).id;
    const leafId = object(store.state.root).members[0].node.id;
    store.actions.replaceValue(leafId, 2);

    syncContent(store, published[0]);
    store.actions.addChild(documentId, "string");

    expect(object(store.state.root).members[1].node.id).toBe("n2");
  });

  test("reconciles a delayed echo after the document has moved past its published root", () => {
    const { store, published } = createTestStore('{"a":0}');
    const leafId = object(store.state.root).members[0].node.id;
    store.actions.replaceValue(leafId, 1);
    store.actions.replaceValue(leafId, 2);

    syncContent(store, published[0]);
    expect(object(store.state.root).members[0].node).toMatchObject({ value: 1 });

    syncContent(store, published[1]);
    expect(object(store.state.root).members[0].node).toMatchObject({ value: 2 });
  });

  test("keeps an open edit across an external change to another node", () => {
    const { store } = createTestStore('{"a":1,"b":2}');
    const aId = object(store.state.root).members[0].node.id;
    store.actions.beginEdit("value", aId);

    syncContent(store, '{"a":1,"b":3}'); // the agent changes b, not a

    // /a keeps its id across the reconcile, so the edit stays open on it.
    expect(store.state.editing).toEqual({ field: "value", id: aId });
  });

  test("closes an open edit when the external change removes its node", () => {
    const { store } = createTestStore('{"a":1,"b":2}');
    const aId = object(store.state.root).members[0].node.id;
    store.actions.beginEdit("value", aId);

    syncContent(store, '{"b":2}'); // the agent deletes a, so the edit has no target

    expect(store.state.editing).toBeNull();
  });

  test("removes a node and publishes the smaller document", () => {
    const { store, published } = createTestStore('{"a":1,"b":2}');
    const aId = object(store.state.root).members[0].node.id;

    store.actions.remove(aId);

    expect(lastValue(published)).toEqual({ b: 2 });
  });

  test("collapses every container except the root, then expands all", () => {
    const { store } = createTestStore('{"a":{"b":1},"c":[1]}');
    const rootId = store.state.root!.id;

    store.actions.setCollapsedAll(true);
    expect(store.state.collapsed.has(rootId)).toBe(false);
    expect(store.state.collapsed.size).toBe(2);

    store.actions.setCollapsedAll(false);
    expect(store.state.collapsed.size).toBe(0);
  });

  test("reorders a child within its parent and ignores cross-parent drops", () => {
    const { store, published } = createTestStore('{"list":[10,20,30]}');
    const list = array(object(store.state.root).members[0].node);

    store.actions.beginDrag(list.items[0].id, list.id, 0);
    store.actions.updateDropTarget(list.items[0].id, "someOtherParent", 0, "before");
    expect(store.state.dragging?.over).toBeNull();

    store.actions.updateDropTarget(list.items[2].id, list.id, 2, "after");
    store.actions.commitDrag();

    expect(store.state.dragging).toBeNull();
    expect(lastValue(published)).toEqual({ list: [20, 30, 10] });
  });

  test("moves a child within its parent by index, the pointer-free reorder path", () => {
    const { store, published } = createTestStore('{"list":[10,20,30]}');
    const list = array(object(store.state.root).members[0].node);

    store.actions.move(list.id, 0, 2);

    expect(lastValue(published)).toEqual({ list: [20, 30, 10] });
  });

  test("records an external change", () => {
    const { store } = createTestStore('{"a":1}');

    syncContent(store, '{"a":1,"b":2}');

    expect(store.state.changes.get("/b")).toBe("added");
  });

  test("does not mark the initial load, only later external changes", () => {
    const { store } = createTestStore('{"a":1}');

    expect(store.state.changes.size).toBe(0);
  });

  test("clears external changes as soon as the user edits", () => {
    const { store } = createTestStore('{"a":1}');
    syncContent(store, '{"a":1,"b":2}');
    expect(store.state.changes.size).toBe(1);

    store.actions.replaceValue(object(store.state.root).members[0].node.id, 5);

    expect(store.state.changes.size).toBe(0);
  });

  test("enforces read-only at the action boundary", () => {
    const { store, published } = createTestStore('{"a":1}', true);
    const leafId = object(store.state.root).members[0].node.id;

    store.actions.replaceValue(leafId, 2);
    store.actions.addChild(store.state.root!.id, "string");
    store.actions.beginEdit("value", leafId);

    expect(store.state.editing).toBeNull();
    expect(published).toHaveLength(0);
  });

  test("reveal expands the given ancestors and flashes the target", () => {
    const { store } = createTestStore('{"a":{"b":1}}');
    const aId = object(store.state.root).members[0].node.id;
    store.actions.toggleCollapsed(aId);
    expect(store.state.collapsed.has(aId)).toBe(true);

    store.actions.reveal("n-target", [aId]);
    expect(store.state.collapsed.has(aId)).toBe(false);
    expect(store.state.flashing).toBe("n-target");

    store.actions.clearFlash();
    expect(store.state.flashing).toBeNull();
  });
});
