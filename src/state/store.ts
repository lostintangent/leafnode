import { createStore, shallow } from "@tanstack/store";
import {
  appendItem,
  appendMember,
  arrayNode,
  createIdFactory,
  descendantContainerIds,
  findNode,
  objectNode,
  parseDocument,
  reconcile,
  removeNode,
  renameMemberKey,
  reorderChildren,
  serializeDocument,
  setValue,
  scalarNode,
  type JsonNode,
  type JsonScalar,
} from "../document";
import type { DropPosition, LeafnodeEvent, LeafnodeInput, LeafnodeState } from "./types";

// One immutable JSON document plus its transient editor interactions. Host input
// re-baselines silently; editor actions publish typed events.

export function createLeafnodeStore(initialInput: LeafnodeInput) {
  const newId = createIdFactory();
  const initialDocument = parseDocument(initialInput.content, newId);

  const eventListeners = new Set<(event: LeafnodeEvent) => void>();
  let lastInputContent = initialInput.content;
  let lastPublished: { content: string; root: JsonNode } | null = null;

  function emit(event: LeafnodeEvent): void {
    for (const listener of eventListeners) listener(event);
  }

  function rebaseline(state: LeafnodeState, content: string): LeafnodeState {
    const result = parseDocument(content, newId);
    const parsed = result.ok ? result.root : null;

    const reconciliation = state.root && parsed ? reconcile(state.root, parsed) : null;
    if (reconciliation?.root === state.root) return state;

    const root = reconciliation ? reconciliation.root : parsed;
    return {
      ...state,

      // Update the parsed root and parse error
      root,
      parseError: result.ok ? null : result.error,

      // Retain an active edit, but cancel
      // an in-flight drag or flash
      editing:
        reconciliation && state.editing && findNode(reconciliation.root, state.editing.id)
          ? state.editing
          : null,
      dragging: null,
      flashing: null,

      collapsed: reconciliation ? state.collapsed : new Set(),
      changes: reconciliation ? reconciliation.changes : new Map(),
  
      // Clear undo history on external changes
      past: [],
      future: [],
    };
  }

  const initialState: LeafnodeState = {
    readOnly: initialInput.readOnly,
    root: initialDocument.ok ? initialDocument.root : null,
    parseError: initialDocument.ok ? null : initialDocument.error,
    collapsed: new Set(),
    editing: null,
    dragging: null,
    changes: new Map(),
    activePointers: initialInput.agent ? new Set(initialInput.agent.activePointers) : null,
    flashing: null,
    past: [],
    future: [],
  };

  const store = createStore(initialState, ({ setState, get }) => {
    function publish(root: JsonNode): void {
      const content = serializeDocument(root);
      lastPublished = { content, root };

      emit({ type: "contentChanged", content });
    }

    function commit(nextRoot: JsonNode, patch: Partial<LeafnodeState>): void {
      const current = get().root;
      if (nextRoot === current) {
        setState((state) => ({ ...state, ...patch }));
        return;
      }

      setState((state) => ({
        ...state,
        ...patch,

        root: nextRoot,
        changes: new Map(),
        
        past: current ? [...state.past, current] : state.past,
        future: [],
      }));

      publish(nextRoot);
    }

    return {
      // Field editing

      beginEdit(field: "key" | "value", id: string) {
        if (get().readOnly) return;
        setState((state) => ({ ...state, editing: { field, id } }));
      },

      cancelEdit: () =>
        setState((state) => (state.editing ? { ...state, editing: null } : state)),

      // Structured editing

      replaceValue(id: string, value: JsonScalar) {
        const root = get().root;
        if (!root || get().readOnly) return;
        
        commit(setValue(root, id, value), { editing: null });
      },

      renameKey(childId: string, key: string) {
        const root = get().root;
        if (!root || get().readOnly) return false;
        const next = renameMemberKey(root, childId, key);
        if (next === null) return false;
        commit(next, { editing: null });
        return true;
      },

      addChild(containerId: string, type: NewNodeType) {
        const root = get().root;
        if (!root || get().readOnly) return;
        const container = findNode(root, containerId);
        if (!container) return;
        const node = NEW_NODE_FACTORIES[type](newId());
        const collapsed = withCollapsed(get().collapsed, containerId, false);
        if (container.kind === "object") {
          commit(appendMember(root, containerId, { key: uniqueKey(container), node }), {
            editing: { field: "key", id: node.id },
            collapsed,
          });
        } else if (container.kind === "array") {
          commit(appendItem(root, containerId, node), {
            editing: node.kind === "scalar" ? { field: "value", id: node.id } : null,
            collapsed,
          });
        }
      },
      
      remove(id: string) {
        const root = get().root;
        if (!root || get().readOnly) return;
        commit(removeNode(root, id), {
          editing: null,
          dragging: null,
          collapsed: withCollapsed(get().collapsed, id, false),
        });
      },

      move(parentId: string, fromIndex: number, toIndex: number) {
        const root = get().root;
        if (!root || get().readOnly) return;
        commit(reorderChildren(root, parentId, fromIndex, toIndex), {});
      },

      // Undo history

      undo() {
        const { past, root } = get();
        const previous = past.at(-1);
        if (!previous || !root) return;

        setState((state) => ({
          ...state,
          root: previous,
          past: state.past.slice(0, -1),
          future: [...state.future, root],
          editing: null,
          dragging: null,
          changes: new Map(),
        }));

        publish(previous);
      },

      redo() {
        const { future, root } = get();
        const next = future.at(-1);
        if (!next || !root) return;

        setState((state) => ({
          ...state,
          root: next,
          future: state.future.slice(0, -1),
          past: [...state.past, root],
          editing: null,
          dragging: null,
          changes: new Map(),
        }));

        publish(next);
      },

      // Drag and drop

      beginDrag(id: string, parentId: string, fromIndex: number) {
        if (get().readOnly) return;

        setState((state) => ({
          ...state,
          editing: null,
          dragging: { id, parentId, fromIndex, over: null },
        }));
      },

      updateDropTarget(
        overId: string,
        overParentId: string,
        overIndex: number,
        position: DropPosition,
      ) {
        const { dragging } = get();
        if (!dragging || overParentId !== dragging.parentId) return;
        setState((state) =>
          state.dragging
            ? {
                ...state,
                dragging: {
                  ...state.dragging,
                  over: { id: overId, index: overIndex, position },
                },
              }
            : state,
        );
      },

      cancelDrag: () =>
        setState((state) => (state.dragging ? { ...state, dragging: null } : state)),

      commitDrag() {
        const { dragging, root } = get();
        if (!dragging || !root) return;
        if (!dragging.over) {
          setState((state) => ({ ...state, dragging: null }));
          return;
        }
        const dropIndex =
          dragging.over.position === "before" ? dragging.over.index : dragging.over.index + 1;
        const toIndex = dropIndex > dragging.fromIndex ? dropIndex - 1 : dropIndex;
        commit(reorderChildren(root, dragging.parentId, dragging.fromIndex, toIndex), {
          dragging: null,
        });
      },

      // Node collapsing

      toggleCollapsed(id: string) {
        setState((state) => ({
          ...state,
          collapsed: withCollapsed(state.collapsed, id, !state.collapsed.has(id)),
        }));
      },

      setCollapsedAll(collapsed: boolean) {
        const root = get().root;
        setState((state) => ({
          ...state,
          collapsed: collapsed && root ? descendantContainerIds(root) : new Set(),
        }));
      },

      // Reference navigation

      reveal(targetId: string, ancestorIds: readonly string[]) {
        setState((state) => {
          let collapsed = state.collapsed;
          if (ancestorIds.some((id) => collapsed.has(id))) {
            const expanded = new Set(collapsed);
            for (const id of ancestorIds) expanded.delete(id);
            collapsed = expanded;
          }
          return { ...state, collapsed, flashing: targetId };
        });
      },

      clearFlash: () =>
        setState((state) => (state.flashing === null ? state : { ...state, flashing: null })),

      // Agent requests
    
      requestAgent(pointer: string, nodeId: string) {
        const { activePointers, readOnly, root } = get();
        if (activePointers === null || readOnly || !root) return;

        const node = findNode(root, nodeId);
        if (!node) return;

        emit({
          type: "agentRequested",
          request: { pointer, value: serializeDocument(node) },
        });
      },
    };
  });

  return Object.assign(store, {
    syncInput(input: LeafnodeInput): void {
      const contentChanged = input.content !== lastInputContent;
      lastInputContent = input.content;

      const published = lastPublished;
      if (contentChanged) lastPublished = null;

      store.setState((state) => {
        const selfEcho =
          contentChanged &&
          published !== null &&
          published.content === input.content &&
          published.root === state.root;

        const next = contentChanged && !selfEcho ? rebaseline(state, input.content) : state;
        const incomingPointers = input.agent?.activePointers;

        const pointersChanged =
          input.agent === undefined
            ? next.activePointers !== null
            : next.activePointers === null ||
              (incomingPointers === undefined
                ? next.activePointers.size > 0
                : !shallow(next.activePointers, incomingPointers));

        const readOnlyChanged = next.readOnly !== input.readOnly;
        if (!readOnlyChanged && !pointersChanged) return next;

        return {
          ...next,
          readOnly: input.readOnly,

          editing: input.readOnly ? null : next.editing,
          dragging: input.readOnly ? null : next.dragging,

          activePointers: pointersChanged
            ? input.agent
              ? new Set(input.agent.activePointers)
              : null
            : next.activePointers,
        };
      });
    },

    subscribeToEvents(listener: (event: LeafnodeEvent) => void): () => void {
      eventListeners.add(listener);

      return () => {
        eventListeners.delete(listener);
      };
    },
  });
}

export type LeafnodeStore = ReturnType<typeof createLeafnodeStore>;

const NEW_NODE_FACTORIES = {
  string: (id) => scalarNode(id, ""),
  number: (id) => scalarNode(id, 0),
  boolean: (id) => scalarNode(id, false),
  null: (id) => scalarNode(id, null),
  object: (id) => objectNode(id),
  array: (id) => arrayNode(id),
} satisfies Record<string, (id: string) => JsonNode>;

export type NewNodeType = keyof typeof NEW_NODE_FACTORIES;

function withCollapsed(
  collapsed: ReadonlySet<string>,
  id: string,
  next: boolean,
): ReadonlySet<string> {
  if (next === collapsed.has(id)) return collapsed;

  const result = new Set(collapsed);
  if (next) result.add(id);
  else result.delete(id);

  return result;
}

function uniqueKey(object: JsonNode & { kind: "object" }, base = "key"): string {
  const keys = new Set(object.members.map((member) => member.key));
  if (!keys.has(base)) return base;
  let suffix = 2;
  while (keys.has(`${base}${suffix}`)) suffix += 1;
  return `${base}${suffix}`;
}
