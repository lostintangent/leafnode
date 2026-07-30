import {
  createContext,
  useCallback,
  useContext,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import styles from "../../styles";

const OverlayContainerContext = createContext<HTMLElement | null>(null);

/** A DOM-level, style-isolated portal host shared by floating UI. */
export function OverlayHost({
  children,
  themeStyles,
}: {
  children: ReactNode;
  themeStyles: CSSProperties;
}) {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const attachHost = useCallback((host: HTMLDivElement | null) => {
    if (!host) return;
    const root = host.shadowRoot ?? host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = styles;
    const scope = document.createElement("div");
    scope.className = "leafnode-overlay-scope";
    root.replaceChildren(style, scope);
    setContainer(scope);
    return () => setContainer(null);
  }, []);

  return (
    <OverlayContainerContext.Provider value={container}>
      {children}
      {typeof document !== "undefined" &&
        createPortal(
          <div
            ref={attachHost}
            data-leafnode-overlay-host=""
            style={{
              ...themeStyles,
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
    </OverlayContainerContext.Provider>
  );
}

export function useOverlayContainer(): HTMLElement | null {
  return useContext(OverlayContainerContext);
}
