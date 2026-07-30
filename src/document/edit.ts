// The editing algebra: pure transformations from one document tree to the next.
// Node identities are unique, so an addressed operation changes at most one branch.
// Rewrites stop at that branch and allocate only its ancestors; a no-op returns the
// original root.

import type { JsonMember, JsonNode, JsonScalar } from "./tree";

export function setValue(root: JsonNode, id: string, value: JsonScalar): JsonNode {
  return replaceNode(root, id, (node) =>
    node.kind === "scalar" && !Object.is(node.value, value) ? { ...node, value } : node,
  );
}

export function renameMemberKey(root: JsonNode, childId: string, nextKey: string): JsonNode | null {
  const site = findMember(root, childId);
  if (!site) return root;

  const member = site.members[site.index];
  if (member.key === nextKey) return root;
  if (site.members.some((candidate) => candidate !== member && candidate.key === nextKey)) {
    return null;
  }

  const members = [...site.members];
  members[site.index] = { ...member, key: nextKey };
  return replaceNode(root, site.objectId, (node) =>
    node.kind === "object" ? { ...node, members } : node,
  );
}

export function appendMember(root: JsonNode, objectId: string, member: JsonMember): JsonNode {
  return replaceNode(root, objectId, (node) =>
    node.kind === "object" ? { ...node, members: [...node.members, member] } : node,
  );
}

export function appendItem(root: JsonNode, arrayId: string, item: JsonNode): JsonNode {
  return replaceNode(root, arrayId, (node) =>
    node.kind === "array" ? { ...node, items: [...node.items, item] } : node,
  );
}

export function removeNode(root: JsonNode, id: string): JsonNode {
  if (root.id === id) return root;
  const without = (node: JsonNode): JsonNode =>
    rewriteChild(node, (child) => (child.id === id ? null : without(child)));
  return without(root);
}

export function reorderChildren(
  root: JsonNode,
  parentId: string,
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

function rewriteChild(node: JsonNode, revise: (child: JsonNode) => JsonNode | null): JsonNode {
  switch (node.kind) {
    case "object": {
      for (let index = 0; index < node.members.length; index += 1) {
        const member = node.members[index];
        const revised = revise(member.node);
        if (revised === member.node) continue;

        const members = [...node.members];
        if (revised === null) members.splice(index, 1);
        else members[index] = { ...member, node: revised };
        return { ...node, members };
      }
      return node;
    }
    case "array": {
      for (let index = 0; index < node.items.length; index += 1) {
        const item = node.items[index];
        const revised = revise(item);
        if (revised === item) continue;

        const items = [...node.items];
        if (revised === null) items.splice(index, 1);
        else items[index] = revised;
        return { ...node, items };
      }
      return node;
    }
    case "scalar":
      return node;
  }
}

function replaceNode(root: JsonNode, id: string, replace: (node: JsonNode) => JsonNode): JsonNode {
  if (root.id === id) return replace(root);
  return rewriteChild(root, (child) => replaceNode(child, id, replace));
}

type MemberSite = { objectId: string; index: number; members: JsonMember[] };

function findMember(root: JsonNode, childId: string): MemberSite | null {
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

function moveWithin<T>(list: T[], from: number, to: number): T[] {
  if (from === to) return list;
  if (from < 0 || from >= list.length || to < 0 || to >= list.length) return list;
  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}
