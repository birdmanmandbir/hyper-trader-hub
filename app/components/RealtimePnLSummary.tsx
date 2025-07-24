import * as React from "react";
import { useRealtimePnL } from "~/hooks/useRealtimePnL";
import { formatUsdValue } from "~/lib/formatting";

interface Position {
  coin: string;
  szi: string;
  entryPx: string;
  unrealizedPnl: string;
}

interface RealtimePnLSummaryProps {
  positions: Position[];
}

export function RealtimePnLSummary({ positions }: RealtimePnLSummaryProps) {
  const { totalPnL } = useRealtimePnL(positions);
  
  // Calculate total notional
  const totalNotional = React.useMemo(() => {
    return positions.reduce((sum, pos) => 
      sum + Math.abs(parseFloat(pos.szi) * parseFloat(pos.entryPx)), 0
    );
  }, [positions]);
  
  return (
    <div className="text-right">
      <p className="text-sm text-muted-foreground">Total P&L (Live)</p>
      <p className={`text-xl font-bold ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
        {formatUsdValue(totalPnL, 2)}
      </p>
      <p className="text-xs text-muted-foreground">
        on {formatUsdValue(totalNotional)} notional
      </p>
    </div>
  );
}