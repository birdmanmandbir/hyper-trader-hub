import * as React from "react";
import { useHyperliquidService } from "~/stores/hyperliquidStore";
import { useRealtimePnL } from "~/hooks/useRealtimePnL";

interface Position {
  coin: string;
  szi: string;
  entryPx: string;
  unrealizedPnl: string;
}

interface RealtimeTotalValueProps {
  baseAccountValue: string;
  positions: Position[];
}

export function RealtimeTotalValue({ baseAccountValue, positions }: RealtimeTotalValueProps) {
  const hlService = useHyperliquidService();
  const { totalPnL } = useRealtimePnL(positions);
  
  // Calculate the old unrealized P&L from positions
  const oldUnrealizedPnL = React.useMemo(() => {
    return positions.reduce((sum, pos) => 
      sum + parseFloat(pos.unrealizedPnl || "0"), 0
    );
  }, [positions]);
  
  // Calculate realtime total value
  // Formula: baseAccountValue - oldUnrealizedPnL + currentRealtimePnL
  const realtimeTotalValue = React.useMemo(() => {
    const base = parseFloat(baseAccountValue);
    return base - oldUnrealizedPnL + totalPnL;
  }, [baseAccountValue, oldUnrealizedPnL, totalPnL]);
  
  // Calculate the difference from the base value
  const difference = realtimeTotalValue - parseFloat(baseAccountValue);
  const isPositive = difference >= 0;
  
  return (
    <div>
      <p className="text-sm text-muted-foreground">Perps Value (Live)</p>
      <p className="text-2xl font-bold">
        {hlService.formatUsdValue(realtimeTotalValue)}
      </p>
      {Math.abs(difference) > 0.01 && (
        <p className={`text-xs ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {isPositive ? '+' : ''}{hlService.formatUsdValue(difference, 2)} from last update
        </p>
      )}
    </div>
  );
}