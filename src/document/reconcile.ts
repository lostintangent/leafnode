// One reconciliation walk produces both structural changes keyed by JSON Pointer and
// a rebuilt tree. Structurally equal nodes retain the current id and reference;
// unchanged locations and removals are absent from the changes. Both versions use the
// same document-lifetime identity source.

import {
  arrayNode,
  childPointer,
  objectNode,
  ROOT_POINTER,
  scalarNode,
  type JsonMember,
  type JsonNode,
} from "./tree";

type ChangeKind = "added" | "changed";
export type DocumentChanges = ReadonlyMap<string, ChangeKind>;

export function reconcile(
  current: JsonNode,
  incoming: JsonNode,
): { root: JsonNode; changes: DocumentChanges } {
  const changes = new Map<string, ChangeKind>();
  const root = reconcileNode(current, incoming, ROOT_POINTER, changes);
  return { root, changes };
}

function reconcileNode(
  current: JsonNode | undefined,
  incoming: JsonNode,
  pointer: string,
  changes: Map<string, ChangeKind>,
): JsonNode {
  if (current === undefined) {
    markAdded(incoming, pointer, changes);
    return incoming;
  }
  if (current.kind !== incoming.kind) {
    changes.set(pointer, "changed");
    forEachChild(incoming, (child, step) => markAdded(child, childPointer(pointer, step), changes));
    return incoming;
  }

  switch (incoming.kind) {
    case "scalar": {
      if (current.kind === "scalar" && Object.is(current.value, incoming.value)) return current;
      changes.set(pointer, "changed");
      return scalarNode(current.id, incoming.value);
    }
    case "object": {
      const currentMembers = current.kind === "object" ? current.members : [];
      let currentByKey: Map<string, JsonMember> | null = null;
      let members: JsonMember[] | null =
        incoming.members.length === currentMembers.length ? null : [];

      for (let index = 0; index < incoming.members.length; index += 1) {
        const member = incoming.members[index];
        const currentAtIndex = currentMembers[index];
        let currentMember = currentAtIndex?.key === member.key ? currentAtIndex : undefined;
        if (!currentMember) {
          currentByKey ??= new Map(currentMembers.map((candidate) => [candidate.key, candidate]));
          currentMember = currentByKey.get(member.key);
        }

        const node = reconcileNode(
          currentMember?.node,
          member.node,
          childPointer(pointer, member.key),
          changes,
        );
        const stayedInPlace = currentAtIndex?.key === member.key && node === currentAtIndex.node;
        if (members === null && !stayedInPlace) {
          members = currentMembers.slice(0, index);
        }
        if (members !== null) {
          if (currentMember && node === currentMember.node) members.push(currentMember);
          else if (node === member.node) members.push(member);
          else members.push({ key: member.key, node });
        }
      }
      return members === null ? current : objectNode(current.id, members);
    }
    case "array": {
      const currentItems = current.kind === "array" ? current.items : [];
      let items: JsonNode[] | null = incoming.items.length === currentItems.length ? null : [];

      for (let index = 0; index < incoming.items.length; index += 1) {
        const item = incoming.items[index];
        const node = reconcileNode(
          currentItems[index],
          item,
          childPointer(pointer, index),
          changes,
        );
        if (items === null && node !== currentItems[index]) items = currentItems.slice(0, index);
        if (items !== null) items.push(node);
      }
      return items === null ? current : arrayNode(current.id, items);
    }
  }
}

function markAdded(node: JsonNode, pointer: string, changes: Map<string, ChangeKind>): void {
  changes.set(pointer, "added");
  forEachChild(node, (child, step) => markAdded(child, childPointer(pointer, step), changes));
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
