import { useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import { createLeafnodeStore, type LeafnodeAgentRequest } from "../state";
import { Shell } from "./shell/Shell";
import { Toolbar, type LeafnodeToolbarActions } from "./shell/Toolbar";
import type { LeafnodeTheme } from "./shell/theme";
import { Tree } from "./tree/Tree";

export type LeafnodeAgent = {
  activePointers?: ReadonlySet<string>;
  onRequest: (request: LeafnodeAgentRequest) => void;
};

export type LeafnodeProps = {
  agent?: LeafnodeAgent;
  className?: string;
  content: string;
  onContentChanged?: (content: string) => void;
  renderToolbar?: ((actions: LeafnodeToolbarActions) => ReactNode) | null;
  theme?: LeafnodeTheme;
};

/** One JSON editing buffer that reconciles external content changes in place. */
export function Leafnode({
  agent,
  className,
  content,
  onContentChanged,
  renderToolbar,
  theme,
}: LeafnodeProps) {
  const readOnly = onContentChanged === undefined;
  const agentAvailable = agent !== undefined;
  const activePointers = agent?.activePointers;
  const onAgentRequest = agent?.onRequest;
  const [store] = useState(() =>
    createLeafnodeStore({
      content,
      readOnly,
      agent: agentAvailable ? { activePointers } : undefined,
    }),
  );

  useEffect(
    () =>
      store.subscribeToEvents((event) => {
        if (event.type === "contentChanged") onContentChanged?.(event.content);
        else onAgentRequest?.(event.request);
      }),
    [onAgentRequest, onContentChanged, store],
  );

  useLayoutEffect(
    () =>
      store.syncInput({
        content,
        readOnly,
        agent: agentAvailable ? { activePointers } : undefined,
      }),
    [activePointers, agentAvailable, content, readOnly, store],
  );

  return (
    <Shell className={className} theme={theme}>
      {renderToolbar !== null && <Toolbar store={store} render={renderToolbar} />}
      <Tree store={store} />
    </Shell>
  );
}
