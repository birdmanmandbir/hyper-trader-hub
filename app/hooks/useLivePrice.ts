import * as React from "react";
import { useHyperliquidWebSocket } from "./useHyperliquidWebSocket";
import { formatPrice } from "~/lib/price-decimals";

export function useLivePrice(coin: string) {
  const [price, setPrice] = React.useState<string>("");
  
  const handlePriceUpdate = React.useCallback((mids: Record<string, string>) => {
    if (coin && mids[coin]) {
      const midPrice = mids[coin];
      // Format price based on value
      const priceNum = parseFloat(midPrice);
      const formattedPrice = formatPrice(priceNum);
      setPrice(formattedPrice);
    }
  }, [coin]);
  
  const { isConnected, error } = useHyperliquidWebSocket({
    enabled: !!coin,
    onPriceUpdate: handlePriceUpdate
  });
  
  return { price, isConnected, error };
}