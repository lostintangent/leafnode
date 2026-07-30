import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import {
  Leafnode,
  darkTheme,
  lightTheme,
  type LeafnodeAgentRequest,
} from "@lostintangent/leafnode";

import { AgentPrompt } from "./AgentPrompt";
import { PlaygroundPanel } from "./PlaygroundPanel";

export function Playground() {
  const [content, setContent] = useState(INITIAL_JSON);
  const [readOnly, setReadOnly] = useState(false);

  const [isDark, setIsDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
  );
  const colorScheme = isDark ? "dark" : "light";
  const theme = isDark ? darkTheme : lightTheme;

  const [agentRequest, setAgentRequest] = useState<LeafnodeAgentRequest | null>(null);
  const [activePointers, setActivePointers] = useState<ReadonlySet<string>>(new Set());
  const agentTimeout = useRef<number | null>(null);

  useLayoutEffect(() => {
    document.documentElement.style.backgroundColor = theme.background;
    document.documentElement.style.colorScheme = colorScheme;
  }, [colorScheme, theme.background]);

  function simulateAgent(pointer: string): void {
    if (agentTimeout.current !== null) window.clearTimeout(agentTimeout.current);
    setAgentRequest(null);

    setActivePointers(new Set([pointer]));
    agentTimeout.current = window.setTimeout(() => {
      setActivePointers(new Set());
      agentTimeout.current = null;
    }, 1_200);
  }

  return (
    <main
      className="h-dvh overflow-hidden font-controls text-foreground"
      style={
        {
          "--accent": theme.accent,
          "--background": theme.background,
          "--muted": theme.muted,
          "--text": theme.text,
        } as CSSProperties
      }
    >
      <div className="container grid h-full grid-rows-[auto_minmax(0,1fr)] gap-4 p-4 md:p-5">
        <header className="flex items-center gap-4">
          <h1 className="text-2xl font-bold tracking-tight">Leafnode Playground</h1>

          <div className="ml-auto flex shrink-0 items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-semibold text-muted">
              <input
                type="checkbox"
                className="accent-accent"
                checked={readOnly}
                onChange={(event) => setReadOnly(event.target.checked)}
              />
              Read only
            </label>

            <select
              className="rounded-md border border-foreground/15 bg-background px-2.5 py-1.5 text-xs font-semibold"
              value={colorScheme}
              onChange={(event) => setIsDark(event.target.value === "dark")}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
        </header>

        <div className="grid min-h-0 grid-rows-2 gap-4 md:grid-cols-2 md:grid-rows-1">
          <PlaygroundPanel heading="Editor" status={readOnly ? "Read only" : "Editable"}>
            <Leafnode
              content={content}
              onContentChanged={readOnly ? undefined : setContent}
              theme={theme}
              agent={{
                activePointers,
                onRequest: setAgentRequest,
              }}
            />

            {agentRequest && (
              <AgentPrompt
                request={agentRequest}
                onDismiss={() => setAgentRequest(null)}
                onSubmit={() => simulateAgent(agentRequest.pointer)}
              />
            )}
          </PlaygroundPanel>

          <PlaygroundPanel heading="Raw JSON" status={validityOf(content)}>
            <textarea
              className="h-full w-full resize-none p-4 font-code text-sm leading-relaxed outline-none"
              spellCheck={false}
              value={content}
              onChange={(event) => setContent(event.target.value)}
            />
          </PlaygroundPanel>
        </div>
      </div>
    </main>
  );
}

const INITIAL_JSON = `{
  "project": {
    "id": "leafnode",
    "name": "Leafnode",
    "ready": true,
    "version": 1
  },
  "maintainer": "leafnode",
  "features": [
    "tree editing",
    "drag and drop",
    {
      "name": "agent presence",
      "enabled": true
    }
  ],
  "settings": {
    "compact": false,
    "theme": null
  }
}
`;

function validityOf(content: string): string {
  try {
    JSON.parse(content);
    return "Valid";
  } catch {
    return "Invalid";
  }
}
