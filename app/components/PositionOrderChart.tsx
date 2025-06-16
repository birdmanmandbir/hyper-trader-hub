import * as React from "react";
import { useLivePrice } from "~/hooks/useLivePrice";
import type { Order } from "~/lib/hyperliquid";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";

interface PositionOrderChartProps {
  coin: string;
  entryPrice: string;
  side: string; // Size value, positive for long, negative for short
  orders: Order[];
  positionSize?: string; // Added to calculate dollar PnL
  takerFee?: number; // Fee for market/stop orders (in percentage, e.g., 0.04)
  makerFee?: number; // Fee for limit orders (in percentage, e.g., 0.012)
}

export function PositionOrderChart({ coin, entryPrice, side, orders, positionSize, takerFee = 0.04, makerFee = 0.012 }: PositionOrderChartProps) {
  const { price: currentPrice } = useLivePrice(coin);
  const [isAnalysisOpen, setIsAnalysisOpen] = React.useState(false);
  const isLong = parseFloat(side) > 0;
  
  const entry = parseFloat(entryPrice);
  const current = parseFloat(currentPrice) || entry;
  const sizeNum = Math.abs(parseFloat(side));
  
  // Calculate real-time PnL and ROE
  const priceChange = current - entry;
  const pnlPerCoin = isLong ? priceChange : -priceChange;
  const pnlDollar = pnlPerCoin * sizeNum;
  const pnlPercent = ((current - entry) / entry) * 100 * (isLong ? 1 : -1);
  
  // Calculate ROE if we have position size
  const posValue = parseFloat(positionSize || "0");
  const roe = posValue > 0 ? (pnlDollar / posValue) * 100 : 0;
  
  // Filter orders for this coin
  const positionOrders = orders.filter(order => order.coin === coin);
  
  // Separate TP and SL orders based on orderType
  const tpOrders = positionOrders.filter(order => {
    // TP orders are Limit orders with reduce-only
    return order.orderType === "Limit" && order.reduceOnly === true;
  });
  
  const slOrders = positionOrders.filter(order => {
    // SL orders are Stop Market orders (including those with sz=0)
    return order.orderType === "Stop Market";
  });
  
  
  // Calculate price range for visualization
  const allPrices = [entry, current];
  tpOrders.forEach(order => allPrices.push(parseFloat(order.limitPx)));
  slOrders.forEach(order => {
    // Use triggerPx for stop orders if available, otherwise limitPx
    const price = order.triggerPx ? parseFloat(order.triggerPx) : parseFloat(order.limitPx);
    allPrices.push(price);
  });
  
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
  
  // Format dollar value
  const formatUsd = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };
  
  return (
    <div className="space-y-2">
      {/* Real-time PnL Display */}
      {currentPrice && (
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Live:</span>
            <span className="font-mono font-semibold">{formatPrice(current)}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className={`font-semibold ${pnlDollar >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {pnlDollar >= 0 ? '+' : ''}{formatUsd(pnlDollar)}
            </span>
            <span className={`text-xs ${pnlDollar >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ({pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%)
            </span>
            {posValue > 0 && (
              <span className="text-xs text-muted-foreground" title="Return on Equity: profit as % of margin used">
                ROE: {roe >= 0 ? '+' : ''}{roe.toFixed(2)}%
              </span>
            )}
          </div>
        </div>
      )}
      
      <div className="relative h-12 bg-muted rounded-lg overflow-hidden"
           title={`Price range: ${formatPrice(minPrice)} - ${formatPrice(maxPrice)}`}>
        {/* Price axis background */}
        <div className="absolute inset-0 flex items-center">
          <div className="w-full h-px bg-border" />
        </div>
        
        {/* SL Orders */}
        {slOrders.map((order, idx) => {
          const price = order.triggerPx ? parseFloat(order.triggerPx) : parseFloat(order.limitPx);
          const position = priceToPercent(price);
          const slDistance = Math.abs(((price - entry) / entry) * 100);
          const slLoss = Math.abs(price - entry) * sizeNum;
          
          return (
            <div
              key={`sl-${idx}`}
              className="absolute top-0 bottom-0 w-1 bg-red-500 hover:w-2 transition-all cursor-pointer"
              style={{ left: `${position}%` }}
              title={`Stop Loss: ${formatPrice(price)} (-${slDistance.toFixed(2)}% / -${formatUsd(slLoss)})`}
            >
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-red-600 whitespace-nowrap">
                SL {formatPrice(price)}
              </div>
            </div>
          );
        })}
        
        {/* Entry Price */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-blue-500 hover:w-1 transition-all cursor-pointer"
          style={{ left: `${priceToPercent(entry)}%` }}
          title={`Entry Price: ${formatPrice(entry)}`}
        >
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-blue-600 whitespace-nowrap">
            Entry {formatPrice(entry)}
          </div>
        </div>
        
        {/* TP Orders */}
        {tpOrders.map((order, idx) => {
          const price = parseFloat(order.limitPx);
          const position = priceToPercent(price);
          const tpDistance = Math.abs(((price - entry) / entry) * 100);
          const tpProfit = Math.abs(price - entry) * parseFloat(order.sz);
          
          return (
            <div
              key={`tp-${idx}`}
              className="absolute top-0 bottom-0 w-1 bg-green-500 hover:w-2 transition-all cursor-pointer"
              style={{ left: `${position}%` }}
              title={`Take Profit: ${formatPrice(price)} (+${tpDistance.toFixed(2)}% / +${formatUsd(tpProfit)}) - Size: ${order.sz} ${coin}`}
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
            className="absolute top-0 bottom-0 flex items-center cursor-pointer"
            style={{ left: `${priceToPercent(current)}%` }}
            title={`Current Price: ${formatPrice(current)} | PnL: ${pnlDollar >= 0 ? '+' : ''}${formatUsd(pnlDollar)} (${pnlPercent >= 0 ? '+' : ''}${pnlPercent.toFixed(2)}%)`}
          >
            <div className="text-2xl -translate-x-1/2 animate-pulse">🚩</div>
            <div className={`absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs whitespace-nowrap font-semibold ${pnlDollar >= 0 ? 'text-green-600' : 'text-red-600'}`}>
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
      
      {/* Collapsible Setup Analysis */}
      <Card className="mt-3">
        <CardHeader className="py-3 px-4">
          <Button
            variant="ghost"
            className="w-full flex items-center justify-between p-0 h-auto hover:bg-transparent"
            onClick={() => setIsAnalysisOpen(!isAnalysisOpen)}
          >
            <CardTitle className="text-sm">Setup Analysis</CardTitle>
            {isAnalysisOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CardHeader>
        
        {isAnalysisOpen && (
          <CardContent className="pt-0 px-4 pb-4">
            {(() => {
              // Calculate risk and reward with fees
              const positionValue = entry * sizeNum;
              
              // Entry fees (taker fee for market entry)
              const entryFee = positionValue * (takerFee / 100);
              
              // Find first SL and TP orders
              const firstSL = slOrders[0];
              const firstTP = tpOrders[0];
              
              if (!firstSL || !firstTP) {
                return (
                  <p className="text-sm text-muted-foreground">
                    Complete setup analysis requires both SL and TP orders
                  </p>
                );
              }
              
              const slPrice = firstSL.triggerPx ? parseFloat(firstSL.triggerPx) : parseFloat(firstSL.limitPx);
              const tpPrice = parseFloat(firstTP.limitPx);
              const tpSize = parseFloat(firstTP.sz);
              
              // Calculate SL risk
              const slPriceMove = Math.abs(slPrice - entry);
              const slLossPerCoin = isLong ? (entry - slPrice) : (slPrice - entry);
              const slLossBeforeFees = slLossPerCoin * sizeNum;
              const slExitFee = (slPrice * sizeNum) * (takerFee / 100); // Stop market uses taker fee
              const totalSlLoss = slLossBeforeFees + entryFee + slExitFee;
              const slPercentMove = (slPriceMove / entry) * 100;
              
              // Calculate TP reward (for the TP order size, not full position)
              const tpPriceMove = Math.abs(tpPrice - entry);
              const tpProfitPerCoin = isLong ? (tpPrice - entry) : (entry - tpPrice);
              const tpProfitBeforeFees = tpProfitPerCoin * tpSize;
              const tpExitFee = (tpPrice * tpSize) * (makerFee / 100); // Limit order uses maker fee
              const tpEntryFeeProportional = entryFee * (tpSize / sizeNum); // Proportional entry fee
              const totalTpProfit = tpProfitBeforeFees - tpEntryFeeProportional - tpExitFee;
              const tpPercentMove = (tpPriceMove / entry) * 100;
              
              // R:R calculation
              const rrRatio = totalSlLoss > 0 ? totalTpProfit / totalSlLoss : 0;
              
              return (
                <div className="space-y-3">
                  {/* Risk Analysis */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase">Risk (Stop Loss)</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">Price Move:</p>
                        <p className="font-semibold text-red-600">-{slPercentMove.toFixed(2)}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Total Loss:</p>
                        <p className="font-semibold text-red-600">-{formatUsd(totalSlLoss)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Entry Fee:</p>
                        <p className="text-xs">{formatUsd(entryFee)} ({takerFee}%)</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Exit Fee:</p>
                        <p className="text-xs">{formatUsd(slExitFee)} ({takerFee}%)</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Reward Analysis */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase">Reward (Take Profit)</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">Price Move:</p>
                        <p className="font-semibold text-green-600">+{tpPercentMove.toFixed(2)}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Net Profit:</p>
                        <p className="font-semibold text-green-600">+{formatUsd(totalTpProfit)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">TP Size:</p>
                        <p className="text-xs">{tpSize} {coin} ({((tpSize / sizeNum) * 100).toFixed(0)}%)</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Exit Fee:</p>
                        <p className="text-xs">{formatUsd(tpExitFee)} ({makerFee}%)</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Summary */}
                  <div className="pt-2 border-t">
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="text-center">
                        <p className="text-muted-foreground">Risk:Reward</p>
                        <p className="font-bold text-lg">1:{rrRatio.toFixed(2)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-muted-foreground">Total Fees</p>
                        <p className="font-semibold">{formatUsd(entryFee + slExitFee + tpExitFee)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-muted-foreground">Breakeven</p>
                        <p className="font-semibold">{((entryFee / positionValue) * 100).toFixed(3)}%</p>
                      </div>
                    </div>
                  </div>
                  
                  {tpSize < sizeNum && (
                    <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
                      ⚠️ TP order is only {((tpSize / sizeNum) * 100).toFixed(0)}% of position. R:R calculated for partial exit.
                    </div>
                  )}
                </div>
              );
            })()}
          </CardContent>
        )}
      </Card>
    </div>
  );
}