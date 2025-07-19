import React from "react";
import { useHyperliquidWebSocket } from "~/hooks/useHyperliquidWebSocket";

// Context for sharing WebSocket prices across routes
export const PriceContext = React.createContext<{
  prices: Record<string, string>;
  subscribe: (coins: string[]) => void;
  unsubscribe: (coins: string[]) => void;
}>({
  prices: {},
  subscribe: () => {},
  unsubscribe: () => {},
});

export function usePrices() {
  const context = React.useContext(PriceContext);
  if (!context) {
    throw new Error("usePrices must be used within PriceContext");
  }
  return context;
}

export function PriceProvider({ children }: { children: React.ReactNode }) {
  const [prices, setPrices] = React.useState<Record<string, string>>({});
  const subscribedCoinsRef = React.useRef<Set<string>>(new Set());

  const { subscribe: wsSubscribe, unsubscribe: wsUnsubscribe } = useHyperliquidWebSocket({
    enabled: true,
    onPriceUpdate: (coin, price) => {
      setPrices(prev => ({ ...prev, [coin]: price }));
    },
  });

  const subscribe = React.useCallback((coins: string[]) => {
    const newCoins = coins.filter(coin => !subscribedCoinsRef.current.has(coin));
    if (newCoins.length > 0) {
      newCoins.forEach(coin => subscribedCoinsRef.current.add(coin));
      wsSubscribe(newCoins);
    }
  }, [wsSubscribe]);

  const unsubscribe = React.useCallback((coins: string[]) => {
    coins.forEach(coin => subscribedCoinsRef.current.delete(coin));
    wsUnsubscribe(coins);
  }, [wsUnsubscribe]);

  const contextValue = React.useMemo(
    () => ({ prices, subscribe, unsubscribe }),
    [prices, subscribe, unsubscribe]
  );

  return (
    <PriceContext.Provider value={contextValue}>
      {children}
    </PriceContext.Provider>
  );
}