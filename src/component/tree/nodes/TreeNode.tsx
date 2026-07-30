import { memo, useEffect, useRef, type DragEvent } from "react";
import { useSelector } from "@tanstack/react-store";
import { shallow } from "@tanstack/store";
import { ChevronDown, ChevronRight, GripVertical, Loader2 } from "lucide-react";
import { childPointer, type JsonNode } from "../../../document";
import type { LeafnodeStore } from "../../../state";
import { KeyLabel } from "../keys/KeyLabel";
import { ContainerSummary } from "../values/ContainerSummary";
import { ScalarValue } from "../values/ScalarValue";
import { inferScalar, valueColor, valueText } from "../values/scalars/text";
import type { Edge } from "./edge";
import { InlineEdit } from "./InlineEdit";
import { NodeMenu } from "./NodeMenu";

const INDENT_STEP = 14;
const INDENT_BASE = 16;

type TreeNodeProps = {
  store: LeafnodeStore;
  node: JsonNode;
  edge: Edge;
  depth: number;
  pointer: string;
};

// Document operations retain every untouched node reference. This measured memo
// boundary lets React stop at those subtrees while row-owned store selectors still
// deliver transient interaction changes independently.
export const TreeNode = memo(TreeNodeView, sameTreeNodeProps);

function TreeNodeView({ store, node, edge, depth, pointer }: TreeNodeProps) {
  const view = useSelector(
    store,
    (state) => {
      const drag = state.dragging;
      // A row only participates in a drag that belongs to its own parent, which is
      // what confines reordering to siblings.
      const related =
        drag !== null && edge.kind !== "root" && drag.parentId === edge.parentId ? drag : null;
      const over = related?.over ?? null;
      return {
        readOnly: state.readOnly,
        collapsed: state.collapsed.has(node.id),
        editingValue: state.editing?.field === "value" && state.editing.id === node.id,
        editingKey: state.editing?.field === "key" && state.editing.id === node.id,
        dragging: drag?.id === node.id,
        droppable: related !== null && related.id !== node.id,
        dropBefore: over !== null && over.id === node.id && over.position === "before",
        dropAfter: over !== null && over.id === node.id && over.position === "after",
        change: state.changes.get(pointer),
        busy: state.activePointers?.has(pointer) ?? false,
        flashing: state.flashing === node.id,
      };
    },
    { compare: shallow },
  );
  const { actions } = store;
  const rowRef = useRef<HTMLDivElement>(null);

  const indent = depth * INDENT_STEP + INDENT_BASE;
  // A node a worker is editing is locked: no drag, edit, or menu, because moving or
  // renaming it would change the pointer the worker is about to write back to.
  const draggable = !view.readOnly && edge.kind !== "root" && !view.busy;
  // A jump flash wins over a landed-edit tint; an in-progress worker shows only the
  // spinner, so "working" never reads as "changed".
  const background = view.flashing
    ? "color-mix(in srgb, var(--leafnode-accent) 22%, transparent)"
    : view.change === "added"
      ? "var(--leafnode-change-added)"
      : view.change === "changed"
        ? "var(--leafnode-change-changed)"
        : undefined;

  // Scroll a freshly revealed node into view, then let its flash fade out.
  useEffect(() => {
    if (!view.flashing) return;
    rowRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    const timer = setTimeout(() => actions.clearFlash(), 1_200);
    return () => clearTimeout(timer);
  }, [view.flashing, actions]);

  function handleDragStart(event: DragEvent<HTMLElement>): void {
    if (edge.kind === "root") return;
    event.stopPropagation();
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", node.id);
    if (rowRef.current) event.dataTransfer.setDragImage(rowRef.current, 12, 12);
    actions.beginDrag(node.id, edge.parentId, edge.index);
  }

  function handleDragOver(event: DragEvent<HTMLElement>): void {
    if (!view.droppable || edge.kind === "root") return;
    event.preventDefault();
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    const position = event.clientY < rect.top + rect.height / 2 ? "before" : "after";
    actions.updateDropTarget(node.id, edge.parentId, edge.index, position);
  }

  function handleDrop(event: DragEvent<HTMLElement>): void {
    if (!view.droppable) return;
    event.preventDefault();
    event.stopPropagation();
    actions.commitDrag();
  }

  return (
    <div>
      <div
        ref={rowRef}
        className={`group/row relative flex min-w-0 items-center gap-1 py-0.5 pr-2 font-mono text-[13px] leading-6 transition-colors hover:bg-accent/15 ${
          view.dragging ? "opacity-40" : ""
        }`}
        style={{ paddingLeft: indent, backgroundColor: background }}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {(view.dropBefore || view.dropAfter) && (
          <span
            aria-hidden
            className={`pointer-events-none absolute right-2 h-0.5 rounded-full bg-accent ${
              view.dropBefore ? "top-0" : "bottom-0"
            }`}
            style={{ left: indent }}
          />
        )}

        {/* Keep every desktop drag target in the root chevron column. */}
        {draggable && (
          <span
            draggable
            onDragStart={handleDragStart}
            onDragEnd={() => actions.cancelDrag()}
            className="absolute inset-y-0 flex w-4 cursor-grab items-center justify-center text-muted opacity-0 transition-opacity group-hover/row:opacity-100 active:cursor-grabbing [@media(hover:none)]:hidden"
            style={{ left: INDENT_BASE }}
            aria-label="Drag to reorder"
          >
            <GripVertical className="size-3.5" />
          </span>
        )}

        {node.kind !== "scalar" ? (
          <button
            type="button"
            onClick={() => actions.toggleCollapsed(node.id)}
            className="flex size-4 shrink-0 items-center justify-center text-muted hover:text-text"
            aria-label={view.collapsed ? "Expand" : "Collapse"}
          >
            {view.collapsed ? (
              <ChevronRight className="size-3.5" />
            ) : (
              <ChevronDown className="size-3.5" />
            )}
          </button>
        ) : (
          <span className="size-4 shrink-0" />
        )}

        {edge.kind === "member" &&
          (view.editingKey ? (
            <InlineEdit
              initial={edge.key}
              ariaLabel="Edit property name"
              onCommit={(text) => actions.renameKey(node.id, text)}
              onCancel={actions.cancelEdit}
            />
          ) : (
            <span
              className={`shrink-0 text-text ${!view.readOnly && !view.busy ? "cursor-text" : ""}`}
              onDoubleClick={() => !view.busy && actions.beginEdit("key", node.id)}
              title={view.readOnly || view.busy ? undefined : "Double-click to rename"}
            >
              <KeyLabel name={edge.key} />
              <span className="text-muted">: </span>
            </span>
          ))}

        {node.kind !== "scalar" ? (
          <ContainerSummary node={node} collapsed={view.collapsed} />
        ) : view.editingValue ? (
          <InlineEdit
            initial={valueText(node.value)}
            ariaLabel="Edit value"
            color={valueColor(node.value)}
            onCommit={(text) => {
              actions.replaceValue(node.id, inferScalar(text));
              return true;
            }}
            onCancel={actions.cancelEdit}
          />
        ) : (
          <ScalarValue
            store={store}
            memberKey={edge.kind === "member" ? edge.key : null}
            node={node}
            readOnly={view.readOnly || view.busy}
          />
        )}

        {view.busy ? (
          <span
            className="ml-1 flex size-5 shrink-0 items-center justify-center"
            aria-label="Agent editing this node"
          >
            <Loader2 className="size-3.5 animate-spin text-accent" />
          </span>
        ) : (
          !view.readOnly && <NodeMenu store={store} node={node} pointer={pointer} edge={edge} />
        )}
      </div>

      {node.kind !== "scalar" && !view.collapsed && (
        <div>
          {node.kind === "object"
            ? node.members.map((member, index) => (
                <TreeNode
                  key={member.node.id}
                  store={store}
                  node={member.node}
                  edge={{
                    kind: "member",
                    parentId: node.id,
                    index,
                    count: node.members.length,
                    key: member.key,
                  }}
                  depth={depth + 1}
                  pointer={childPointer(pointer, member.key)}
                />
              ))
            : node.items.map((item, index) => (
                <TreeNode
                  key={item.id}
                  store={store}
                  node={item}
                  edge={{ kind: "item", parentId: node.id, index, count: node.items.length }}
                  depth={depth + 1}
                  pointer={childPointer(pointer, index)}
                />
              ))}
        </div>
      )}
    </div>
  );
}

function sameTreeNodeProps(previous: TreeNodeProps, next: TreeNodeProps): boolean {
  return (
    previous.store === next.store &&
    previous.node === next.node &&
    previous.depth === next.depth &&
    previous.pointer === next.pointer &&
    shallow(previous.edge, next.edge)
  );
}
