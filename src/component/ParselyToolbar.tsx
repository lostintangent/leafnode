import { useEffect, useState } from "react";
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
import { serializeDocument } from "../document";
import type { JsonEditorStore } from "../store";
import type { ParselyProps, ParselyToolbarActions } from "./types";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "./ui/Menu";

const COPY_SUCCESS_DURATION_MS = 2_000;

export function ParselyToolbar({
  editor,
  render,
}: {
  editor: JsonEditorStore;
  render: ParselyProps["renderToolbar"];
}) {
  const [copyVersion, setCopyVersion] = useState<number | null>(null);
  const copied = copyVersion !== null;
  const { canUndo, canRedo } = useSelector(
    editor,
    (state) => ({ canUndo: state.past.length > 0, canRedo: state.future.length > 0 }),
    { compare: shallow },
  );

  useEffect(() => {
    if (copyVersion === null) return;
    const timeout = setTimeout(() => setCopyVersion(null), COPY_SUCCESS_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [copyVersion]);

  async function copyJson(): Promise<void> {
    const root = editor.state.root;
    if (!root) return;
    try {
      await navigator.clipboard.writeText(serializeDocument(root));
      setCopyVersion((version) => (version ?? 0) + 1);
    } catch (error) {
      console.error("Unable to copy JSON to the clipboard:", error);
    }
  }

  const actions: ParselyToolbarActions = {
    canRedo,
    canUndo,
    copied,
    collapseAll: () => editor.actions.setCollapsedAll(true),
    copyJson,
    expandAll: () => editor.actions.setCollapsedAll(false),
    redo: editor.actions.redo,
    undo: editor.actions.undo,
  };

  if (render === null) return null;
  if (render) return render(actions);

  return (
    <div className="pointer-events-none absolute top-2 right-2 z-10">
      <Menu>
        <MenuTrigger
          ariaLabel="JSON view options"
          title="View options"
          className="pointer-events-auto flex h-7 items-center gap-1 rounded-md border border-border bg-surface px-2 text-xs shadow-sm transition-colors hover:bg-hover"
        >
          <Braces className="size-3.5" />
          {copied ? (
            <Check className="size-3 text-green-500" />
          ) : (
            <ChevronDown className="size-3 opacity-60" />
          )}
        </MenuTrigger>
        <MenuContent align="end">
          <MenuItem disabled={!canUndo} onSelect={editor.actions.undo}>
            <Undo2 />
            Undo
          </MenuItem>
          <MenuItem disabled={!canRedo} onSelect={editor.actions.redo}>
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
          <MenuItem onSelect={() => void copyJson()}>
            <Copy />
            Copy JSON
          </MenuItem>
        </MenuContent>
      </Menu>
    </div>
  );
}
