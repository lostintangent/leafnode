import type { KeyboardEvent } from "react";
import { useSelector } from "@tanstack/react-store";
import { ROOT_POINTER } from "../../document";
import type { LeafnodeStore } from "../../state";
import { TreeNode } from "./nodes/TreeNode";

/** The scrollable projection of one JSON document, or a reason it can't be shown. */
export function Tree({ store }: { store: LeafnodeStore }) {
  const root = useSelector(store, (state) => state.root);
  const parseError = useSelector(store, (state) => state.parseError);

  // Undo/redo while the tree is focused; an open field keeps its own native undo.
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (!(event.metaKey || event.ctrlKey)) return;
    const tag = (event.target as HTMLElement).tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    const key = event.key.toLowerCase();
    if (key === "z") {
      event.preventDefault();
      if (event.shiftKey) store.actions.redo();
      else store.actions.undo();
    } else if (key === "y") {
      event.preventDefault();
      store.actions.redo();
    }
  }

  if (!root) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-1 p-6 text-center">
        <p className="text-sm text-muted">This file isn&apos;t valid JSON yet.</p>
        {parseError && <p className="font-mono text-xs text-muted/80">{parseError}</p>}
      </div>
    );
  }

  return (
    <div
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="h-full overflow-auto py-2 text-text outline-none"
    >
      <TreeNode
        store={store}
        node={root}
        edge={{ kind: "root" }}
        depth={0}
        pointer={ROOT_POINTER}
      />
    </div>
  );
}
