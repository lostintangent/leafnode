import { useEffectEvent, useLayoutEffect, useState } from "react";
import { createJsonEditorStore } from "../store";
import { AgentProvider } from "./agent";
import { JsonTree } from "./editor/JsonTree";
import { ParselyToolbar } from "./ParselyToolbar";
import { EditorRoot } from "./shadow/EditorRoot";
import { OverlayRoot } from "./shadow/OverlayRoot";
import { ThemeProvider } from "./theme";
import type { ParselyProps } from "./types";

const NO_ACTIVE_POINTERS: ReadonlySet<string> = new Set();

/** One controlled JSON document with editor state scoped to this mounted instance. */
export function Parsely({
  agent,
  className,
  content,
  onContentChanged,
  renderToolbar,
  theme,
}: ParselyProps) {
  const readOnly = onContentChanged === undefined;
  const [editor] = useState(() => createJsonEditorStore(readOnly));
  const publishContent = useEffectEvent((nextContent: string) => {
    onContentChanged?.(nextContent);
  });

  useLayoutEffect(() => editor.subscribeToSource(publishContent), [editor]);
  useLayoutEffect(() => editor.actions.loadSource(content), [content, editor]);
  useLayoutEffect(() => editor.actions.setReadOnly(readOnly), [readOnly, editor]);
  useLayoutEffect(
    () => editor.actions.setActivePointers(agent?.activePointers ?? NO_ACTIVE_POINTERS),
    [agent?.activePointers, editor],
  );

  return (
    <ThemeProvider input={theme}>
      <OverlayRoot>
        <EditorRoot className={className}>
          <AgentProvider agent={agent}>
            <ParselyToolbar editor={editor} render={renderToolbar} />
            <JsonTree editor={editor} />
          </AgentProvider>
        </EditorRoot>
      </OverlayRoot>
    </ThemeProvider>
  );
}
