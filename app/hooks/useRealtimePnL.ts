import * as React from "react";
import { usePrices } from "~/providers/PriceProvider";

interface Position {
  coin: string;
  szi: string;
  entryPx: string;
  unrealizedPnl: string;
}

export function useRealtimePnL(positions: Position[]) {
  const { prices, subscribe, unsubscribe } = usePrices();
  
  // Get unique coins from positions
  const coins = React.useMemo(
    () => [...new Set(positions.map(p => p.coin))],
    [positions]
  );
  
  React.useEffect(() => {
    if (coins.length === 0) return;
    
    subscribe(coins);
    
    return () => {
      unsubscribe(coins);
    };
  }, [coins, subscribe, unsubscribe]);

  // Calculate P&L
  const { totalPnL, positionPnLs } = React.useMemo(() => {
    const newPnLs: Record<string, number> = {};
    let total = 0;
    
    positions.forEach((pos, idx) => {
      const livePrice = prices[pos.coin];
      const sizeNum = parseFloat(pos.szi);
      const isLong = sizeNum > 0;
      const sizeAbs = Math.abs(sizeNum);
      const entryPrice = parseFloat(pos.entryPx);
      
      let pnl: number;
      if (livePrice) {
        const currentPrice = parseFloat(livePrice);
        pnl = sizeAbs * (isLong ? (currentPrice - entryPrice) : (entryPrice - currentPrice));
      } else {
        // Fallback to unrealized P&L from API
        pnl = parseFloat(pos.unrealizedPnl || "0");
      }
      
      const key = `${pos.coin}-${idx}`;
      newPnLs[key] = pnl;
      total += pnl;
    });
    
    return { totalPnL: total, positionPnLs: newPnLs };
  }, [positions, prices]);
  
  return { totalPnL, positionPnLs, isConnected: true };
}