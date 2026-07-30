import { useEffect, useState, type ReactNode } from "react";
import { useSelector } from "@tanstack/react-store";
import { shallow } from "@tanstack/store";
import {
  Braces,
  Check,
  ChevronDown,
  ChevronsDownUp,
  ChevronsUpDown,
  Copy,
  Redo2,
  Undo2,
} from "lucide-react";
import { serializeDocument } from "../../document";
import type { LeafnodeStore } from "../../state";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "./overlay/Menu";

const COPY_SUCCESS_DURATION_MS = 2_000;

export type LeafnodeToolbarActions = {
  canRedo: boolean;
  canUndo: boolean;
  copied: boolean;
  collapseAll: () => void;
  copyJson: () => Promise<void>;
  expandAll: () => void;
  redo: () => void;
  undo: () => void;
};

export function Toolbar({
  store,
  render,
}: {
  store: LeafnodeStore;
  render?: (actions: LeafnodeToolbarActions) => ReactNode;
}) {
  const [copyVersion, setCopyVersion] = useState<number | null>(null);
  const copied = copyVersion !== null;
  const { canUndo, canRedo } = useSelector(
    store,
    (state) => ({ canUndo: state.past.length > 0, canRedo: state.future.length > 0 }),
    { compare: shallow },
  );

  useEffect(() => {
    if (copyVersion === null) return;
    const timeout = setTimeout(() => setCopyVersion(null), COPY_SUCCESS_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [copyVersion]);

  async function copyJson(): Promise<void> {
    const root = store.state.root;
    if (!root) return;
    try {
      await navigator.clipboard.writeText(serializeDocument(root));
      setCopyVersion((version) => (version ?? 0) + 1);
    } catch (error) {
      console.error("Unable to copy JSON to the clipboard:", error);
    }
  }

  const actions: LeafnodeToolbarActions = {
    canRedo,
    canUndo,
    copied,
    collapseAll: () => store.actions.setCollapsedAll(true),
    copyJson,
    expandAll: () => store.actions.setCollapsedAll(false),
    redo: store.actions.redo,
    undo: store.actions.undo,
  };

  if (render) return render(actions);

  return (
    <div className="pointer-events-none absolute top-2 right-2 z-10">
      <Menu>
        <MenuTrigger
          ariaLabel="JSON view options"
          title="View options"
          className="pointer-events-auto flex h-7 items-center gap-1 rounded-md border border-border bg-surface px-2 text-xs shadow-sm transition-colors hover:bg-accent/15"
        >
          <Braces className="size-3.5" />
          {actions.copied ? (
            <Check className="size-3 text-green-500" />
          ) : (
            <ChevronDown className="size-3 opacity-60" />
          )}
        </MenuTrigger>
        <MenuContent>
          <MenuItem disabled={!actions.canUndo} onSelect={actions.undo}>
            <Undo2 />
            Undo
          </MenuItem>
          <MenuItem disabled={!actions.canRedo} onSelect={actions.redo}>
            <Redo2 />
            Redo
          </MenuItem>
          <MenuSeparator />
          <MenuItem onSelect={actions.expandAll}>
            <ChevronsUpDown />
            Expand all
          </MenuItem>
          <MenuItem onSelect={actions.collapseAll}>
            <ChevronsDownUp />
            Collapse all
          </MenuItem>
          <MenuSeparator />
          <MenuItem onSelect={() => void actions.copyJson()}>
            <Copy />
            Copy JSON
          </MenuItem>
        </MenuContent>
      </Menu>
    </div>
  );
}
