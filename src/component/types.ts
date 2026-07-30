import type { ReactNode } from "react";

export type ParselyTheme = {
  accent: string;
  background: string;
  muted: string;
  text: string;
};

export type ParselyThemeInput =
  | ParselyTheme
  | {
      dark: ParselyTheme;
      light: ParselyTheme;
    };

export type ParselyAgentRequest = {
  dismiss: () => void;
  intent: "add" | "edit";
  /** An opaque RFC 6901 address. */
  pointer: string;
  valueJson: string;
};

export type ParselyAgent = {
  activePointers?: ReadonlySet<string>;
  renderPrompt: (request: ParselyAgentRequest) => ReactNode;
};

export type ParselyToolbarActions = {
  canRedo: boolean;
  canUndo: boolean;
  copied: boolean;
  collapseAll: () => void;
  copyJson: () => Promise<void>;
  expandAll: () => void;
  redo: () => void;
  undo: () => void;
};

export type ParselyProps = {
  agent?: ParselyAgent;
  className?: string;
  content: string;
  onContentChanged?: (content: string) => void;
  renderToolbar?: ((actions: ParselyToolbarActions) => ReactNode) | null;
  theme?: ParselyThemeInput;
};
