import { createContext, useContext, type ReactNode } from "react";
import type { ParselyAgent } from "./types";

const AgentContext = createContext<ParselyAgent | undefined>(undefined);

export function AgentProvider({ agent, children }: { agent?: ParselyAgent; children: ReactNode }) {
  return <AgentContext.Provider value={agent}>{children}</AgentContext.Provider>;
}

export function useAgent(): ParselyAgent | undefined {
  return useContext(AgentContext);
}
