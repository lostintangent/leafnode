import { useCallback, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import styles from "../styles";
import { OverlayHost } from "./overlay/OverlayHost";
import { resolveThemeStyles, type LeafnodeTheme } from "./theme";

/** The isolated DOM and visual environment that makes Leafnode safely embeddable. */
export function Shell({
  children,
  className,
  theme,
}: {
  children: ReactNode;
  className?: string;
  theme?: LeafnodeTheme;
}) {
  const themeStyles = resolveThemeStyles(theme);
  const [shadowRoot, setShadowRoot] = useState<ShadowRoot | null>(null);
  const attachHost = useCallback((host: HTMLDivElement | null) => {
    if (!host) return;
    const root = host.shadowRoot ?? host.attachShadow({ mode: "open" });
    setShadowRoot(root);
    return () => setShadowRoot(null);
  }, []);

  return (
    <OverlayHost themeStyles={themeStyles}>
      <div ref={attachHost} className={className} data-leafnode="">
        {shadowRoot &&
          createPortal(
            <>
              <style>{styles}</style>
              <div className="leafnode-root" style={themeStyles}>
                {children}
              </div>
            </>,
            shadowRoot,
          )}
      </div>
    </OverlayHost>
  );
}
