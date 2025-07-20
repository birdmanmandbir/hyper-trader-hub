import * as React from "react";
import { useHyperliquidService } from "~/stores/hyperliquidStore";
import { PositionOrderChart } from "~/components/PositionOrderChart";
import { formatPrice } from "~/lib/price-decimals";
import { useLivePrice } from "~/hooks/useLivePrice";
import type { Order } from "~/lib/hyperliquid";

interface PositionCardProps {
  position: {
    coin: string;
    szi: string;
    entryPx: string;
    positionValue: string;
    unrealizedPnl: string;
    returnOnEquity: string;
    marginUsed: string;
    leverage: number;
    leverageType: string;
    liquidationPx?: string;
  };
  orders?: Order[];
  takerFee: number;
  makerFee: number;
  accountValue: string;
}

export function PositionCard({ position, orders, takerFee, makerFee, accountValue }: PositionCardProps) {
  const hlService = useHyperliquidService();
  const { price: livePrice } = useLivePrice(position.coin);
  
  const sizeNum = Math.abs(parseFloat(position.szi));
  const entryPrice = parseFloat(position.entryPx);
  const isLong = parseFloat(position.szi) > 0;
  const currentPrice = livePrice ? parseFloat(livePrice) : entryPrice;
  const liquidationPrice = parseFloat(position.liquidationPx || "0");
  
  // Calculate position value with live price
  const positionValueUSD = sizeNum * currentPrice;
  
  // Calculate liquidation distance
  const liquidationDistance = liquidationPrice > 0 && currentPrice > 0
    ? isLong 
      ? ((currentPrice - liquidationPrice) / currentPrice * 100)
      : ((liquidationPrice - currentPrice) / currentPrice * 100)
    : 0;
    
  // Calculate real-time PnL if we have live price
  const realTimePnL = livePrice 
    ? sizeNum * (isLong ? (currentPrice - entryPrice) : (entryPrice - currentPrice))
    : parseFloat(position.unrealizedPnl);
  
  const realTimeROE = livePrice && parseFloat(position.marginUsed) > 0
    ? (realTimePnL / parseFloat(position.marginUsed)) * 100
    : parseFloat(position.returnOnEquity) * 100;
  
  return (
    <div className="p-3 bg-muted rounded-lg">
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="font-semibold flex items-center gap-2">
            {position.coin}
            <span className={`text-xs px-1.5 py-0.5 rounded ${isLong ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
              {isLong ? 'LONG' : 'SHORT'}
            </span>
          </p>
          <p className="text-sm text-muted-foreground">
            Size: {formatPrice(sizeNum)} {position.coin} ({hlService.formatUsdValue(positionValueUSD)})
          </p>
          <p className="text-sm text-muted-foreground">
            Entry: {formatPrice(entryPrice)}
            {livePrice && (
              <span className="ml-2">
                Current: {formatPrice(currentPrice)}
              </span>
            )}
          </p>
        </div>
        <div className="text-right">
          <p className={`font-semibold ${realTimePnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {hlService.formatUsdValue(realTimePnL, 2)}
          </p>
          <p className="text-xs text-muted-foreground">
            ROE: {realTimeROE >= 0 ? '+' : ''}{realTimeROE.toFixed(2)}%
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm mb-2">
        <div>
          <span className="text-muted-foreground">Margin: </span>
          <span className="font-medium">{hlService.formatUsdValue(position.marginUsed || "0")}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Leverage: </span>
          <span className="font-medium">{(position.leverage || 0).toFixed(2)}x ({position.leverageType || "cross"})</span>
        </div>
        {liquidationPrice > 0 && (
          <>
            <div>
              <span className="text-muted-foreground">Liq Price: </span>
              <span className={`font-medium ${liquidationDistance < 10 ? 'text-red-600' : liquidationDistance < 20 ? 'text-amber-600' : ''}`}>
                {formatPrice(liquidationPrice)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Liq Distance: </span>
              <span className={`font-medium ${liquidationDistance < 10 ? 'text-red-600' : liquidationDistance < 20 ? 'text-amber-600' : ''}`}>
                {liquidationDistance.toFixed(2)}%
              </span>
            </div>
          </>
        )}
      </div>
      {liquidationDistance > 0 && liquidationDistance < 20 && (
        <div className={`p-2 rounded-lg text-xs ${liquidationDistance < 10 ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'}`}>
          {liquidationDistance < 10 ? '⚠️ Warning: ' : '⚡ Caution: '}
          Liquidation price is {liquidationDistance.toFixed(1)}% away
        </div>
      )}
      
      {/* Position Order Chart */}
      {orders && (
        <div className="mt-3 pt-3 border-t">
          <PositionOrderChart
            coin={position.coin}
            entryPrice={position.entryPx}
            side={position.szi}
            orders={orders}
            positionSize={position.marginUsed}
            takerFee={takerFee}
            makerFee={makerFee}
          />
        </div>
      )}
    </div>
  );
}