// oxlint-disable-next-line typescript/triple-slash-reference
/// <reference path="../style-imports.d.ts" />
import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useParselyTheme } from "../theme";
import css from "./generated.css" with { type: "text" };

export function EditorRoot({ children, className }: { children: ReactNode; className?: string }) {
  const [shadowRoot, setShadowRoot] = useState<ShadowRoot | null>(null);
  const [attachHost] = useState(() => (host: HTMLDivElement | null) => {
    if (!host) return;
    const root = host.shadowRoot ?? host.attachShadow({ mode: "open" });
    setShadowRoot(root);
    return () => setShadowRoot(null);
  });
  const { styles } = useParselyTheme();

  return (
    <div ref={attachHost} className={className} data-parsely="" suppressHydrationWarning>
      {shadowRoot &&
        createPortal(
          <>
            <style>{css}</style>
            <div className="parsely-root" style={styles}>
              {children}
            </div>
          </>,
          shadowRoot,
        )}
    </div>
  );
}
