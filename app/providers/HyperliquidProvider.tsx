import React from "react";
import { HyperliquidService } from "~/lib/hyperliquid";

// Context for sharing HyperliquidService instance
const HyperliquidContext = React.createContext<HyperliquidService | null>(null);

export function useHyperliquidService() {
  const service = React.useContext(HyperliquidContext);
  if (!service) {
    throw new Error("useHyperliquidService must be used within HyperliquidProvider");
  }
  return service;
}

export function HyperliquidProvider({ children }: { children: React.ReactNode }) {
  // Create a single instance of HyperliquidService
  const service = React.useMemo(() => new HyperliquidService(), []);

  return (
    <HyperliquidContext.Provider value={service}>
      {children}
    </HyperliquidContext.Provider>
  );
}