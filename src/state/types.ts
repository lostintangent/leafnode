import type { DocumentChanges, JsonNode } from "../document";

export type LeafnodeState = {
  // Document state and policy
  root: JsonNode | null;
  readOnly: boolean;
  parseError: string | null;

  // Editor state (ephemeral gestures)
  editing: EditTarget | null;
  dragging: DragState | null;
  flashing: string | null;

  // Editor state (durable)
  collapsed: ReadonlySet<string>;
  changes: DocumentChanges;
  activePointers: ReadonlySet<string> | null;

  // Undo/redo history
  past: JsonNode[];
  future: JsonNode[];
};

type EditTarget = { id: string; field: "key" | "value"; };

type DragState = {
  id: string;
  parentId: string;
  fromIndex: number;
  over: {
    id: string;
    index: number;
    position: DropPosition;
  } | null;
};

export type DropPosition = "before" | "after";

export type LeafnodeInput = {
  /** The latest external baseline; local edits are published without replacing it. */
  content: string;
  readOnly: boolean;
  agent?: {
    activePointers?: ReadonlySet<string>;
  };
};

export type LeafnodeEvent =
  | { type: "contentChanged"; content: string }
  | { type: "agentRequested"; request: LeafnodeAgentRequest };

export type LeafnodeAgentRequest = {
  /** An opaque RFC 6901 address. */
  pointer: string;
  value: string;
};