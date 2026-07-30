// oxlint-disable-next-line typescript/triple-slash-reference
/// <reference path="../style-imports.d.ts" />
import { createContext, useContext, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useParselyTheme } from "../theme";
import css from "./generated.css" with { type: "text" };

const OverlayContext = createContext<HTMLElement | null>(null);

export function OverlayRoot({ children }: { children: ReactNode }) {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const [attachHost] = useState(() => (host: HTMLDivElement | null) => {
    if (!host) return;
    const root = host.shadowRoot ?? host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = css;
    const scope = document.createElement("div");
    scope.className = "parsely-overlay-scope";
    root.replaceChildren(style, scope);
    setContainer(scope);
    return () => setContainer(null);
  });
  const { styles } = useParselyTheme();

  return (
    <OverlayContext.Provider value={container}>
      {children}
      {typeof document !== "undefined" &&
        createPortal(
          <div
            ref={attachHost}
            data-parsely-overlay-root=""
            style={{
              ...styles,
              height: 0,
              left: 0,
              overflow: "visible",
              position: "fixed",
              top: 0,
              width: 0,
              zIndex: 2_147_483_647,
            }}
          />,
          document.body,
        )}
    </OverlayContext.Provider>
  );
}

export function useOverlayRoot(): HTMLElement | null {
  return useContext(OverlayContext);
}
