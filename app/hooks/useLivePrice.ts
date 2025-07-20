import * as React from "react";
import { usePrices } from "~/stores/priceStore";
import { formatPrice } from "~/lib/price-decimals";

export function useLivePrice(coin: string) {
  const { prices, subscribe, unsubscribe } = usePrices();
  
  React.useEffect(() => {
    if (!coin) return;
    
    subscribe([coin]);
    
    return () => {
      unsubscribe([coin]);
    };
  }, [coin, subscribe, unsubscribe]);
  
  // Format price if available
  const price = React.useMemo(() => {
    if (!coin || !prices[coin]) return "";
    const priceNum = parseFloat(prices[coin]);
    return formatPrice(priceNum);
  }, [coin, prices]);
  
  return { price, isConnected: true, error: null };
}