// Reconciles an incoming tree against the current one in a single paired pass. Two
// things fall out of that walk: a structural diff keyed by JSON Pointer, and a
// rebuilt tree that reuses the current node's id and reference wherever a node is
// structurally the same. Unchanged locations and removals are absent from the diff.

import { arrayNode, objectNode, scalarNode, type JsonNode } from "./model";
import { childPointer, ROOT_POINTER } from "./path";

export type ChangeKind = "added" | "changed";
export type DocumentDiff = ReadonlyMap<string, ChangeKind>;

export function reconcile(
  before: JsonNode,
  after: JsonNode,
): { root: JsonNode; diff: DocumentDiff } {
  const diff = new Map<string, ChangeKind>();
  const root = reconcileNode(before, after, ROOT_POINTER, diff);
  return { root, diff };
}

function reconcileNode(
  before: JsonNode | undefined,
  after: JsonNode,
  pointer: string,
  diff: Map<string, ChangeKind>,
): JsonNode {
  if (before === undefined) {
    markAdded(after, pointer, diff);
    return after;
  }
  if (before.kind !== after.kind) {
    diff.set(pointer, "changed");
    forEachChild(after, (child, step) => markAdded(child, childPointer(pointer, step), diff));
    return after;
  }

  switch (after.kind) {
    case "scalar": {
      if (before.kind === "scalar" && Object.is(before.value, after.value)) return before;
      diff.set(pointer, "changed");
      return scalarNode(before.id, after.value);
    }
    case "object": {
      const priorMembers = before.kind === "object" ? before.members : [];
      const priorByKey = new Map(priorMembers.map((member) => [member.key, member.node]));
      let unchanged = after.members.length === priorMembers.length;
      const members = after.members.map((member, index) => {
        const node = reconcileNode(
          priorByKey.get(member.key),
          member.node,
          childPointer(pointer, member.key),
          diff,
        );
        if (node !== priorMembers[index]?.node || member.key !== priorMembers[index]?.key) {
          unchanged = false;
        }
        return node === member.node ? member : { key: member.key, node };
      });
      return unchanged ? before : objectNode(before.id, members);
    }
    case "array": {
      const priorItems = before.kind === "array" ? before.items : [];
      let unchanged = after.items.length === priorItems.length;
      const items = after.items.map((item, index) => {
        const node = reconcileNode(priorItems[index], item, childPointer(pointer, index), diff);
        if (node !== priorItems[index]) unchanged = false;
        return node;
      });
      return unchanged ? before : arrayNode(before.id, items);
    }
  }
}

function markAdded(node: JsonNode, pointer: string, diff: Map<string, ChangeKind>): void {
  diff.set(pointer, "added");
  forEachChild(node, (child, step) => markAdded(child, childPointer(pointer, step), diff));
}

function forEachChild(
  node: JsonNode,
  visit: (child: JsonNode, step: string | number) => void,
): void {
  switch (node.kind) {
    case "object":
      node.members.forEach((member) => visit(member.node, member.key));
      return;
    case "array":
      node.items.forEach((item, index) => visit(item, index));
      return;
    case "scalar":
      return;
  }
}
