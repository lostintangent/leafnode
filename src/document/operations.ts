// The document algebra: pure transformations from one node tree to the next.
// Every rewrite rests on `mapChildren`, which preserves untouched subtree
// identity and returns the same root when an operation changes nothing.

import type { JsonNode, JsonScalar, Member, NodeId } from "./model";

export function setValue(root: JsonNode, id: NodeId, value: JsonScalar): JsonNode {
  return replaceNode(root, id, (node) =>
    node.kind === "scalar" && !Object.is(node.value, value) ? { ...node, value } : node,
  );
}

export function insertMember(root: JsonNode, objectId: NodeId, member: Member): JsonNode {
  return replaceNode(root, objectId, (node) =>
    node.kind === "object" ? { ...node, members: [...node.members, member] } : node,
  );
}

export function appendItem(root: JsonNode, arrayId: NodeId, item: JsonNode): JsonNode {
  return replaceNode(root, arrayId, (node) =>
    node.kind === "array" ? { ...node, items: [...node.items, item] } : node,
  );
}

export function reorderChildren(
  root: JsonNode,
  parentId: NodeId,
  from: number,
  to: number,
): JsonNode {
  return replaceNode(root, parentId, (node) => {
    switch (node.kind) {
      case "object": {
        const members = moveWithin(node.members, from, to);
        return members === node.members ? node : { ...node, members };
      }
      case "array": {
        const items = moveWithin(node.items, from, to);
        return items === node.items ? node : { ...node, items };
      }
      case "scalar":
        return node;
    }
  });
}

export function removeNode(root: JsonNode, id: NodeId): JsonNode {
  if (root.id === id) return root;
  const without = (node: JsonNode): JsonNode =>
    mapChildren(node, (child) => (child.id === id ? null : without(child)));
  return without(root);
}

export function renameMemberKey(root: JsonNode, childId: NodeId, nextKey: string): JsonNode | null {
  const site = findMember(root, childId);
  if (!site) return root;
  if (site.members[site.index].key === nextKey) return root;
  if (site.members.some((member, index) => index !== site.index && member.key === nextKey)) {
    return null;
  }
  const members = site.members.map((member, index) =>
    index === site.index ? { ...member, key: nextKey } : member,
  );
  return replaceNode(root, site.objectId, (node) =>
    node.kind === "object" ? { ...node, members } : node,
  );
}

function mapChildren(node: JsonNode, revise: (child: JsonNode) => JsonNode | null): JsonNode {
  switch (node.kind) {
    case "object": {
      let changed = false;
      const members: Member[] = [];
      for (const member of node.members) {
        const revised = revise(member.node);
        if (revised === null) changed = true;
        else if (revised === member.node) members.push(member);
        else {
          changed = true;
          members.push({ ...member, node: revised });
        }
      }
      return changed ? { ...node, members } : node;
    }
    case "array": {
      let changed = false;
      const items: JsonNode[] = [];
      for (const item of node.items) {
        const revised = revise(item);
        if (revised === null) changed = true;
        else {
          if (revised !== item) changed = true;
          items.push(revised);
        }
      }
      return changed ? { ...node, items } : node;
    }
    case "scalar":
      return node;
  }
}

function replaceNode(root: JsonNode, id: NodeId, replace: (node: JsonNode) => JsonNode): JsonNode {
  if (root.id === id) return replace(root);
  return mapChildren(root, (child) => replaceNode(child, id, replace));
}

type MemberSite = { objectId: NodeId; index: number; members: readonly Member[] };

function findMember(root: JsonNode, childId: NodeId): MemberSite | null {
  switch (root.kind) {
    case "object": {
      const index = root.members.findIndex((member) => member.node.id === childId);
      if (index >= 0) return { objectId: root.id, index, members: root.members };
      for (const member of root.members) {
        const site = findMember(member.node, childId);
        if (site) return site;
      }
      return null;
    }
    case "array":
      for (const item of root.items) {
        const site = findMember(item, childId);
        if (site) return site;
      }
      return null;
    case "scalar":
      return null;
  }
}

function moveWithin<T>(list: readonly T[], from: number, to: number): readonly T[] {
  if (from === to) return list;
  if (from < 0 || from >= list.length || to < 0 || to >= list.length) return list;
  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}
