import { ArrowDown, ArrowUp, MoreHorizontal, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { useSelector } from "@tanstack/react-store";
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuSub,
  MenuSubContent,
  MenuSubTrigger,
  MenuTrigger,
} from "../../shell/overlay/Menu";
import type { JsonNode } from "../../../document";
import type { NewNodeType, LeafnodeStore } from "../../../state";
import type { Edge } from "./edge";

const SCALAR_TYPES = [
  "string",
  "number",
  "boolean",
  "null",
] as const satisfies readonly NewNodeType[];
const CONTAINER_TYPES = ["object", "array"] as const satisfies readonly NewNodeType[];

// Touch and keyboard users reach the same row operations exposed by direct editing
// and pointer dragging.

export function NodeMenu({
  store,
  node,
  pointer,
  edge,
}: {
  store: LeafnodeStore;
  node: JsonNode;
  pointer: string;
  edge: Edge;
}) {
  const { actions } = store;
  const agentAvailable = useSelector(store, (state) => state.activePointers !== null);
  const hasKey = edge.kind === "member";

  return (
    <Menu>
      <MenuTrigger
        ariaLabel="Row actions"
        className="ml-1 flex size-5 shrink-0 items-center justify-center rounded text-muted opacity-0 transition-opacity hover:bg-accent/15 hover:text-text focus-visible:opacity-100 group-hover/row:opacity-100 [@media(hover:none)]:opacity-100"
      >
        <MoreHorizontal className="size-3.5" />
      </MenuTrigger>
      <MenuContent>
        {agentAvailable && (
          <>
            <MenuItem onSelect={() => actions.requestAgent(pointer, node.id)}>
              <Sparkles />
              Ask agent…
            </MenuItem>
            <MenuSeparator />
          </>
        )}

        {(node.kind === "scalar" || hasKey) && (
          <>
            {node.kind === "scalar" && (
              <MenuItem onSelect={() => actions.beginEdit("value", node.id)}>
                <Pencil />
                Edit value
              </MenuItem>
            )}
            {hasKey && (
              <MenuItem onSelect={() => actions.beginEdit("key", node.id)}>
                <Pencil />
                Edit key
              </MenuItem>
            )}
            <MenuSeparator />
          </>
        )}

        {edge.kind !== "root" && (
          <>
            <MenuItem
              disabled={edge.index === 0}
              onSelect={() => actions.move(edge.parentId, edge.index, edge.index - 1)}
            >
              <ArrowUp />
              Move up
            </MenuItem>
            <MenuItem
              disabled={edge.index >= edge.count - 1}
              onSelect={() => actions.move(edge.parentId, edge.index, edge.index + 1)}
            >
              <ArrowDown />
              Move down
            </MenuItem>
          </>
        )}
        {node.kind !== "scalar" && (
          <MenuSub>
            <MenuSubTrigger>
              <Plus />
              {node.kind === "object" ? "Add property" : "Add item"}
            </MenuSubTrigger>
            <MenuSubContent>
              <AddTypeItems onAdd={(type) => actions.addChild(node.id, type)} />
            </MenuSubContent>
          </MenuSub>
        )}

        {edge.kind !== "root" && (
          <>
            <MenuSeparator />
            <MenuItem danger onSelect={() => actions.remove(node.id)}>
              <Trash2 />
              Delete
            </MenuItem>
          </>
        )}
      </MenuContent>
    </Menu>
  );
}

function AddTypeItems({ onAdd }: { onAdd: (type: NewNodeType) => void }) {
  return (
    <>
      {SCALAR_TYPES.map((type) => (
        <MenuItem key={type} onSelect={() => onAdd(type)}>
          {capitalize(type)}
        </MenuItem>
      ))}
      <MenuSeparator />
      {CONTAINER_TYPES.map((type) => (
        <MenuItem key={type} onSelect={() => onAdd(type)}>
          {capitalize(type)}
        </MenuItem>
      ))}
    </>
  );
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
