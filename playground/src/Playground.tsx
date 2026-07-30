import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import {
  Parsely,
  darkTheme,
  lightTheme,
  type ParselyAgentRequest,
  type ParselyTheme,
} from "parsely";

const INITIAL_JSON = `{
  "project": {
    "id": "parsely",
    "name": "Parsely",
    "ready": true,
    "version": 1
  },
  "maintainer": "parsely",
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

export function Playground() {
  const [content, setContent] = useState(INITIAL_JSON);
  const [editable, setEditable] = useState(true);
  const [themeName, setThemeName] = useState<"dark" | "light" | "system">("system");
  const [activePointers, setActivePointers] = useState<ReadonlySet<string>>(new Set());
  const agentTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const theme = resolveTheme(themeName);
  const pageTheme = theme ?? lightTheme;

  useEffect(
    () => () => {
      if (agentTimeout.current) clearTimeout(agentTimeout.current);
    },
    [],
  );

  function simulateAgent(pointer: string, dismiss: () => void): void {
    if (agentTimeout.current) clearTimeout(agentTimeout.current);
    dismiss();
    setActivePointers(new Set([pointer]));
    agentTimeout.current = setTimeout(() => setActivePointers(new Set()), 1_200);
  }

  return (
    <main
      data-playground-theme={themeName}
      style={
        {
          "--page-accent": pageTheme.accent,
          "--page-background": pageTheme.background,
          "--page-muted": pageTheme.muted,
          "--page-text": pageTheme.text,
        } as CSSProperties
      }
    >
      <header>
        <div>
          <h1>Parsely</h1>
          <p>Embeddable JSON editor playground</p>
        </div>
        <div className="controls">
          <label className="control">
            Theme
            <select
              value={themeName}
              onChange={(event) => setThemeName(event.target.value as "dark" | "light" | "system")}
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
          <label className="toggle">
            <input
              type="checkbox"
              checked={editable}
              onChange={(event) => setEditable(event.target.checked)}
            />
            Editable
          </label>
        </div>
      </header>
      <div className="playground">
        <section className="panel" aria-label="Editor">
          <div className="panel-heading">
            <span>Editor</span>
            <span>{editable ? "Editable" : "Read only"}</span>
          </div>
          <Parsely
            className="editor"
            content={content}
            onContentChanged={editable ? setContent : undefined}
            theme={theme}
            agent={{
              activePointers,
              renderPrompt: (request) => (
                <AgentPrompt
                  request={request}
                  onSubmit={() => simulateAgent(request.pointer, request.dismiss)}
                />
              ),
            }}
          />
        </section>
        <label className="panel raw-json">
          <span className="panel-heading">
            <span>Raw JSON</span>
            <span>{validityOf(content)}</span>
          </span>
          <textarea
            aria-label="Raw JSON"
            spellCheck={false}
            value={content}
            onChange={(event) => setContent(event.target.value)}
          />
        </label>
      </div>
    </main>
  );
}

function AgentPrompt({
  onSubmit,
  request,
}: {
  onSubmit: () => void;
  request: ParselyAgentRequest;
}) {
  const [instruction, setInstruction] = useState("");

  return createPortal(
    <div className="agent-backdrop" role="presentation">
      <form
        className="agent-dialog"
        onSubmit={(event) => {
          event.preventDefault();
          if (instruction.trim()) onSubmit();
        }}
      >
        <h2>{request.intent === "add" ? "Ask the agent to add" : "Ask the agent"}</h2>
        <p>
          Target: <code>{request.pointer || "the document"}</code>
        </p>
        <textarea
          autoFocus
          aria-label="Agent instruction"
          rows={3}
          placeholder={
            request.intent === "add"
              ? "e.g. add another feature"
              : "e.g. replace this with realistic data"
          }
          value={instruction}
          onChange={(event) => setInstruction(event.target.value)}
        />
        <details>
          <summary>Current value</summary>
          <pre>{request.valueJson}</pre>
        </details>
        <footer>
          <button type="button" className="secondary" onClick={request.dismiss}>
            Cancel
          </button>
          <button type="submit" disabled={!instruction.trim()}>
            Simulate agent
          </button>
        </footer>
      </form>
    </div>,
    document.body,
  );
}

function resolveTheme(name: "dark" | "light" | "system"): ParselyTheme | undefined {
  if (name === "dark") return darkTheme;
  if (name === "light") return lightTheme;
  return undefined;
}

function validityOf(content: string): string {
  try {
    JSON.parse(content);
    return "Valid";
  } catch {
    return "Invalid";
  }
}
