import { useState } from "react";
import { ArrowDown, ArrowUp, MoreHorizontal, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuSub,
  MenuSubContent,
  MenuSubTrigger,
  MenuTrigger,
} from "../../ui/Menu";
import { serializeDocument, type JsonNode } from "../../../document";
import type { JsonEditorStore } from "../../../store";
import { useAgent } from "../../agent";
import type { Edge } from "../edge";
import { AddTypeItems } from "./AddTypeItems";

// Every row's actions in one tap-reachable place — the path that works without a
// hover or a pointer drag (touch, keyboard). "Ask agent" leads every menu; editing
// and reordering are direct. The desktop grip drag and this menu share the same
// store operations, so neither is the privileged way to reorder. The trigger hides
// until hover on pointer devices, and always shows where hover does not exist.

export function NodeMenu({
  editor,
  node,
  pointer,
  edge,
}: {
  editor: JsonEditorStore;
  node: JsonNode;
  pointer: string;
  edge: Edge;
}) {
  const { actions } = editor;
  const agent = useAgent();
  const [asking, setAsking] = useState<"add" | "edit" | null>(null);
  const hasKey = edge.kind === "member";

  return (
    <>
      <Menu>
        <MenuTrigger
          ariaLabel="Row actions"
          className="ml-1 flex size-5 shrink-0 items-center justify-center rounded text-muted opacity-0 transition-opacity hover:bg-hover hover:text-text focus-visible:opacity-100 group-hover/row:opacity-100 [@media(hover:none)]:opacity-100"
        >
          <MoreHorizontal className="size-3.5" />
        </MenuTrigger>
        <MenuContent align="end">
          {agent && (
            <>
              <MenuItem onSelect={() => setAsking("edit")}>
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
                <AddTypeItems
                  onAdd={(type) => actions.addChild(node.id, type)}
                  onAskAgent={agent ? () => setAsking("add") : undefined}
                />
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

      {asking &&
        agent?.renderPrompt({
          dismiss: () => setAsking(null),
          intent: asking,
          pointer,
          valueJson: serializeDocument(node),
        })}
    </>
  );
}
