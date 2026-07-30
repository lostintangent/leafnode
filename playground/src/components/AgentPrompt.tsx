import { useState } from "react";
import type { LeafnodeAgentRequest } from "@lostintangent/leafnode";

export function AgentPrompt({
  onDismiss,
  onSubmit,
  request,
}: {
  onDismiss: () => void;
  onSubmit: () => void;
  request: LeafnodeAgentRequest;
}) {
  const [instruction, setInstruction] = useState("");

  return (
    <div className="absolute inset-0 z-10 grid place-items-center bg-background/75 p-4 backdrop-blur-sm">
      <form
        aria-label="Ask the agent"
        className="grid max-h-full w-full max-w-lg gap-4 overflow-auto rounded-xl bg-background p-5 shadow-2xl shadow-foreground/15"
        role="dialog"
        onSubmit={(event) => {
          event.preventDefault();
          if (instruction.trim()) onSubmit();
        }}
      >
        <h2 className="text-lg font-semibold">Ask the agent</h2>
        <p className="text-muted">
          Target: <code>{request.pointer || "the document"}</code>
        </p>
        <textarea
          autoFocus
          aria-label="Agent instruction"
          className="w-full resize-y rounded-lg border border-foreground/15 p-3 font-code outline-accent"
          rows={3}
          placeholder="e.g. add a feature or replace this with realistic data"
          value={instruction}
          onChange={(event) => setInstruction(event.target.value)}
        />
        <details className="min-w-0 text-xs text-muted">
          <summary>Current value</summary>
          <pre className="max-h-40 overflow-auto whitespace-pre-wrap font-code">
            {request.value}
          </pre>
        </details>
        <footer className="flex justify-end gap-2">
          <button
            type="button"
            className="rounded-md bg-foreground/10 px-3 py-2"
            onClick={onDismiss}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-md bg-accent px-3 py-2 text-background disabled:opacity-50"
            disabled={!instruction.trim()}
          >
            Simulate agent
          </button>
        </footer>
      </form>
    </div>
  );
}
