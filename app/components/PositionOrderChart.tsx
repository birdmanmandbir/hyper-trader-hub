import * as React from "react";
import { useLivePrice } from "~/hooks/useLivePrice";
import type { Order } from "~/lib/hyperliquid";

interface PositionOrderChartProps {
  coin: string;
  entryPrice: string;
  side: string; // "Buy" for long, "Sell" for short
  orders: Order[];
}

export function PositionOrderChart({ coin, entryPrice, side, orders }: PositionOrderChartProps) {
  const { price: currentPrice } = useLivePrice(coin);
  const isLong = parseFloat(side) > 0;
  
  const entry = parseFloat(entryPrice);
  const current = parseFloat(currentPrice) || entry;
  
  // Filter orders for this coin
  const positionOrders = orders.filter(order => order.coin === coin);
  
  // Separate TP and SL orders
  const tpOrders = positionOrders.filter(order => {
    const orderPrice = parseFloat(order.limitPx);
    if (isLong) {
      return order.side === "Sell" && orderPrice > entry && order.reduceOnly;
    } else {
      return order.side === "Buy" && orderPrice < entry && order.reduceOnly;
    }
  });
  
  const slOrders = positionOrders.filter(order => {
    // Stop orders are typically identified by orderType
    return order.orderType === "Stop" || order.orderType === "StopMarket";
  });
  
  // Calculate price range for visualization
  const allPrices = [entry, current];
  tpOrders.forEach(order => allPrices.push(parseFloat(order.limitPx)));
  slOrders.forEach(order => allPrices.push(parseFloat(order.limitPx)));
  
  const minPrice = Math.min(...allPrices) * 0.995; // Add 0.5% padding
  const maxPrice = Math.max(...allPrices) * 1.005; // Add 0.5% padding
  const priceRange = maxPrice - minPrice;
  
  // Helper to convert price to percentage position
  const priceToPercent = (price: number) => {
    return ((price - minPrice) / priceRange) * 100;
  };
  
  // Format price based on value
  const formatPrice = (price: number) => {
    return price >= 1 ? price.toFixed(1) : price.toFixed(3);
  };
  
  // Calculate PnL percentage
  const pnlPercent = ((current - entry) / entry) * 100 * (isLong ? 1 : -1);
  
  return (
    <div className="space-y-2">
      <div className="relative h-12 bg-muted rounded-lg overflow-hidden">
        {/* Price axis background */}
        <div className="absolute inset-0 flex items-center">
          <div className="w-full h-px bg-border" />
        </div>
        
        {/* SL Orders */}
        {slOrders.map((order, idx) => {
          const price = parseFloat(order.limitPx);
          const position = priceToPercent(price);
          return (
            <div
              key={`sl-${idx}`}
              className="absolute top-0 bottom-0 w-1 bg-red-500"
              style={{ left: `${position}%` }}
              title={`SL: ${formatPrice(price)}`}
            >
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-red-600 whitespace-nowrap">
                SL {formatPrice(price)}
              </div>
            </div>
          );
        })}
        
        {/* Entry Price */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-blue-500"
          style={{ left: `${priceToPercent(entry)}%` }}
        >
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-blue-600 whitespace-nowrap">
            Entry {formatPrice(entry)}
          </div>
        </div>
        
        {/* TP Orders */}
        {tpOrders.map((order, idx) => {
          const price = parseFloat(order.limitPx);
          const position = priceToPercent(price);
          return (
            <div
              key={`tp-${idx}`}
              className="absolute top-0 bottom-0 w-1 bg-green-500"
              style={{ left: `${position}%` }}
              title={`TP: ${formatPrice(price)} (${order.sz} ${coin})`}
            >
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-green-600 whitespace-nowrap">
                TP{idx + 1} {formatPrice(price)}
              </div>
            </div>
          );
        })}
        
        {/* Current Price */}
        {currentPrice && (
          <div
            className="absolute top-0 bottom-0 flex items-center"
            style={{ left: `${priceToPercent(current)}%` }}
          >
            <div className="text-2xl -translate-x-1/2">🚩</div>
            <div className={`absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs whitespace-nowrap font-semibold ${pnlPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatPrice(current)} ({pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%)
            </div>
          </div>
        )}
      </div>
      
      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-blue-500 rounded" />
          <span>Entry</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-base">🚩</span>
          <span>Current</span>
        </div>
        {tpOrders.length > 0 && (
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded" />
            <span>Take Profit</span>
          </div>
        )}
        {slOrders.length > 0 && (
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-500 rounded" />
            <span>Stop Loss</span>
          </div>
        )}
      </div>
    </div>
  );
}