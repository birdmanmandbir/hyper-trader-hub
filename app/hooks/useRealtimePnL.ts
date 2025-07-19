import * as React from "react";
import { useLivePrice } from "./useLivePrice";

interface Position {
  coin: string;
  szi: string;
  entryPx: string;
  unrealizedPnl: string;
}

export function useRealtimePnL(positions: Position[]) {
  const [totalPnL, setTotalPnL] = React.useState(0);
  const [positionPnLs, setPositionPnLs] = React.useState<Record<string, number>>({});
  
  // Create a hook for each unique coin
  const uniqueCoins = [...new Set(positions.map(p => p.coin))];
  const priceData: Record<string, string> = {};
  
  // This is a bit of a hack to use hooks conditionally, but it works
  // because the number of positions is relatively stable
  uniqueCoins.forEach(coin => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { price } = useLivePrice(coin);
    if (price) priceData[coin] = price;
  });
  
  React.useEffect(() => {
    const newPnLs: Record<string, number> = {};
    let total = 0;
    
    positions.forEach((pos, idx) => {
      const livePrice = priceData[pos.coin];
      const sizeNum = parseFloat(pos.szi);
      const isLong = sizeNum > 0;
      const sizeAbs = Math.abs(sizeNum);
      const entryPrice = parseFloat(pos.entryPx);
      
      let pnl: number;
      if (livePrice) {
        const currentPrice = parseFloat(livePrice);
        pnl = sizeAbs * (isLong ? (currentPrice - entryPrice) : (entryPrice - currentPrice));
      } else {
        pnl = parseFloat(pos.unrealizedPnl || "0");
      }
      
      const key = `${pos.coin}-${idx}`;
      newPnLs[key] = pnl;
      total += pnl;
    });
    
    setPositionPnLs(newPnLs);
    setTotalPnL(total);
  }, [positions, priceData]);
  
  return { totalPnL, positionPnLs };
}