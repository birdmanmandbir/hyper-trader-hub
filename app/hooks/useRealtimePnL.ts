import * as React from "react";
import { useHyperliquidWebSocket } from "./useHyperliquidWebSocket";

interface Position {
  coin: string;
  szi: string;
  entryPx: string;
  unrealizedPnl: string;
}

export function useRealtimePnL(positions: Position[]) {
  const [prices, setPrices] = React.useState<Record<string, string>>({});
  
  // Get unique coins from positions
  const coins = React.useMemo(
    () => [...new Set(positions.map(p => p.coin))],
    [positions]
  );
  
  const handlePriceUpdate = React.useCallback((mids: Record<string, string>) => {
    // Update prices for our coins
    const updatedPrices: Record<string, string> = {};
    coins.forEach(coin => {
      if (mids[coin]) {
        updatedPrices[coin] = mids[coin];
      }
    });
    
    setPrices(prev => ({ ...prev, ...updatedPrices }));
  }, [coins]);
  
  const { isConnected } = useHyperliquidWebSocket({
    enabled: coins.length > 0,
    onPriceUpdate: handlePriceUpdate
  });

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
  
  return { totalPnL, positionPnLs, isConnected };
}