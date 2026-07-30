import type { DocumentDiff, JsonNode, JsonScalar, NodeId, ScalarType } from "../document";

// The transient state and semantic operations owned by one editor instance. The
// document tree is durable; every other field describes an in-progress interaction.

export const SCALAR_TYPES = [
  "string",
  "number",
  "boolean",
  "null",
] as const satisfies readonly ScalarType[];

export const CONTAINER_TYPES = ["object", "array"] as const;

export type NewNodeType = ScalarType | (typeof CONTAINER_TYPES)[number];
export type DropPosition = "before" | "after";

type Editing = { readonly target: "key" | "value"; readonly id: NodeId };

type DragReorder = {
  readonly id: NodeId;
  readonly parentId: NodeId;
  readonly fromIndex: number;
  readonly over: {
    readonly id: NodeId;
    readonly index: number;
    readonly position: DropPosition;
  } | null;
};

export type JsonEditorState = {
  readonly readOnly: boolean;
  readonly root: JsonNode | null;
  readonly parseError: string | null;
  readonly collapsed: ReadonlySet<NodeId>;
  readonly editing: Editing | null;
  readonly drag: DragReorder | null;
  readonly diff: DocumentDiff;
  readonly activePointers: ReadonlySet<string>;
  readonly flash: NodeId | null;
  readonly past: readonly JsonNode[];
  readonly future: readonly JsonNode[];
};

export type JsonEditorActions = {
  loadSource: (source: string) => void;
  setReadOnly: (readOnly: boolean) => void;
  setActivePointers: (pointers: ReadonlySet<string>) => void;

  replaceValue: (id: NodeId, value: JsonScalar) => void;
  renameKey: (childId: NodeId, key: string) => boolean;
  addChild: (containerId: NodeId, type: NewNodeType) => void;
  remove: (id: NodeId) => void;
  move: (parentId: NodeId, fromIndex: number, toIndex: number) => void;
  undo: () => void;
  redo: () => void;

  toggleCollapsed: (id: NodeId) => void;
  setCollapsedAll: (collapsed: boolean) => void;
  reveal: (targetId: NodeId, ancestorIds: readonly NodeId[]) => void;
  clearFlash: () => void;

  beginEdit: (target: "key" | "value", id: NodeId) => void;
  cancelEdit: () => void;

  beginDrag: (id: NodeId, parentId: NodeId, fromIndex: number) => void;
  updateDropTarget: (
    overId: NodeId,
    overParentId: NodeId,
    overIndex: number,
    position: DropPosition,
  ) => void;
  cancelDrag: () => void;
  commitDrag: () => void;
};
