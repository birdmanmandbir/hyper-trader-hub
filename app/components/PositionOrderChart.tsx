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
    return price >= 1 ? price.toFixed(1) : price.toFixed(5);
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
          const slPnL = (isLong ? (price - entry) : (entry - price)) * sizeNum;
          const isProfit = slPnL > 0;
          
          return (
            <div
              key={`sl-${idx}`}
              className={`absolute top-0 bottom-0 w-1 ${isProfit ? 'bg-green-500' : 'bg-red-500'} hover:w-2 transition-all cursor-pointer`}
              style={{ left: `${position}%` }}
              title={`Stop Loss: ${formatPrice(price)} (${isProfit ? '+' : '-'}${slDistance.toFixed(2)}% / ${isProfit ? '+' : ''}${formatUsd(slPnL)})${isProfit ? ' - Profit Protected!' : ''}`}
            >
              <div className={`absolute -top-6 left-1/2 -translate-x-1/2 text-xs ${isProfit ? 'text-green-600' : 'text-red-600'} whitespace-nowrap`}>
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
            {slOrders.some(order => {
              const price = order.triggerPx ? parseFloat(order.triggerPx) : parseFloat(order.limitPx);
              const slPnL = (isLong ? (price - entry) : (entry - price)) * sizeNum;
              return slPnL > 0;
            }) && (
              <span className="text-green-600">(in profit)</span>
            )}
          </div>
        )}
      </div>
      
      {/* Collapsible Position Analysis */}
      <Card className="mt-3">
        <CardHeader className="py-2 px-3">
          <Button
            variant="ghost"
            className="w-full flex items-center justify-between p-0 h-auto hover:bg-transparent"
            onClick={() => setIsAnalysisOpen(!isAnalysisOpen)}
          >
            <span className="text-sm font-medium flex items-center gap-1">
              📊 Position Analysis
            </span>
            {isAnalysisOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
        </CardHeader>
        
        {isAnalysisOpen && (
          <CardContent className="pt-0 px-4 pb-4">
            {(() => {
              // Calculate risk and reward with fees
              const positionValue = entry * sizeNum;
              
              // Entry fees (taker fee for market entry)
              const entryFee = positionValue * (takerFee / 100);
              
              // Find first SL order
              const firstSL = slOrders[0];
              
              // Check if we have TP orders
              if (tpOrders.length === 0) {
                return (
                  <p className="text-sm text-muted-foreground">
                    No take profit orders set
                  </p>
                );
              }
              
              // Handle cases with and without SL
              let slPrice = 0;
              let slPriceMove = 0;
              let slLossPerCoin = 0;
              let slLossBeforeFees = 0;
              let slExitFee = 0;
              let totalSlLoss = 0;
              let slPercentMove = 0;
              
              if (firstSL) {
                slPrice = firstSL.triggerPx ? parseFloat(firstSL.triggerPx) : parseFloat(firstSL.limitPx);
                
                // Calculate SL risk (can be negative if SL is in profit)
                slPriceMove = Math.abs(slPrice - entry);
                slLossPerCoin = isLong ? (entry - slPrice) : (slPrice - entry);
                slLossBeforeFees = slLossPerCoin * sizeNum;
                slExitFee = (slPrice * sizeNum) * (takerFee / 100); // Stop market uses taker fee
                
                // If slLossBeforeFees is negative, it means we're in profit (SL above entry for long, below for short)
                // In this case, we should subtract fees from the profit, not add them to a loss
                totalSlLoss = slLossBeforeFees < 0 
                  ? slLossBeforeFees - entryFee - slExitFee  // Profit scenario: subtract fees from profit
                  : slLossBeforeFees + entryFee + slExitFee; // Loss scenario: add fees to loss
                
                slPercentMove = (slPriceMove / entry) * 100;
              }
              
              // Calculate total TP reward (sum of all TP orders)
              let totalTpProfitBeforeFees = 0;
              let totalTpExitFees = 0;
              let totalTpSize = 0;
              let weightedTpPrice = 0;
              
              tpOrders.forEach(tpOrder => {
                const tpPrice = parseFloat(tpOrder.limitPx);
                const tpSize = parseFloat(tpOrder.sz);
                totalTpSize += tpSize;
                weightedTpPrice += tpPrice * tpSize;
                
                const tpProfitPerCoin = isLong ? (tpPrice - entry) : (entry - tpPrice);
                totalTpProfitBeforeFees += tpProfitPerCoin * tpSize;
                totalTpExitFees += (tpPrice * tpSize) * (makerFee / 100);
              });
              
              // Calculate weighted average TP price for display
              const avgTpPrice = totalTpSize > 0 ? weightedTpPrice / totalTpSize : 0;
              const tpPriceMove = Math.abs(avgTpPrice - entry);
              const tpPercentMove = (tpPriceMove / entry) * 100;
              
              // Calculate proportional entry fee for TP orders
              const tpEntryFeeProportional = entryFee * (totalTpSize / sizeNum);
              const totalTpProfit = totalTpProfitBeforeFees - tpEntryFeeProportional - totalTpExitFees;
              
              // R:R calculation
              // When SL is in profit (totalSlLoss < 0), we need a different calculation
              const rrRatio = totalSlLoss > 0 
                ? totalTpProfit / totalSlLoss  // Normal R:R when risking capital
                : totalSlLoss < 0 && totalTpProfit > Math.abs(totalSlLoss)
                  ? (totalTpProfit - Math.abs(totalSlLoss)) / Math.abs(totalSlLoss)  // Additional profit beyond guaranteed profit
                  : 0; // Invalid scenario or no additional reward beyond guaranteed profit
              
              return (
                <div className="space-y-3">
                  {/* Risk Analysis - Only show if SL exists */}
                  {firstSL && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase">
                        {totalSlLoss < 0 ? "Profit Protection (Stop Loss)" : "Risk (Stop Loss)"}
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-muted-foreground">Price Move:</p>
                          <p className={`font-semibold ${totalSlLoss < 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {totalSlLoss < 0 ? '+' : '-'}{slPercentMove.toFixed(2)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">{totalSlLoss < 0 ? "Min Profit:" : "Total Loss:"}</p>
                          <p className={`font-semibold ${totalSlLoss < 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {totalSlLoss < 0 ? '+' : '-'}{formatUsd(Math.abs(totalSlLoss))}
                          </p>
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
                  )}
                  
                  {/* Reward Analysis */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase">Reward (Take Profit)</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">Avg Price Move:</p>
                        <p className="font-semibold text-green-600">+{tpPercentMove.toFixed(2)}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Net Profit:</p>
                        <p className="font-semibold text-green-600">+{formatUsd(totalTpProfit)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Total TP Size:</p>
                        <p className="text-xs">{totalTpSize.toFixed(4)} {coin} ({((totalTpSize / sizeNum) * 100).toFixed(0)}%)</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Exit Fees:</p>
                        <p className="text-xs">{formatUsd(totalTpExitFees)} ({makerFee}%)</p>
                      </div>
                    </div>
                    {tpOrders.length > 1 && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {tpOrders.length} TP orders: {tpOrders.map((tp, idx) => 
                          `TP${idx + 1} ${formatPrice(parseFloat(tp.limitPx))} (${tp.sz} ${coin})`
                        ).join(', ')}
                      </div>
                    )}
                  </div>
                  
                  {/* Summary */}
                  <div className="pt-2 border-t">
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="text-center">
                        <p className="text-muted-foreground">
                          {!firstSL ? "Expected Profit" : totalSlLoss < 0 ? "Profit Multiple" : "Risk:Reward"}
                        </p>
                        <p className="font-bold text-lg">
                          {!firstSL 
                            ? formatUsd(totalTpProfit)
                            : totalSlLoss < 0 
                              ? totalTpProfit > Math.abs(totalSlLoss) 
                                ? `${(totalTpProfit / Math.abs(totalSlLoss)).toFixed(2)}x`
                                : "Protected"
                              : `1:${rrRatio.toFixed(2)}`
                          }
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-muted-foreground">Max Fees</p>
                        <p className="font-semibold">{formatUsd(entryFee + (firstSL ? slExitFee : totalTpExitFees))}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-muted-foreground">Breakeven</p>
                        <p className="font-semibold">{((entryFee / positionValue) * 100).toFixed(3)}%</p>
                      </div>
                    </div>
                  </div>
                  
                  {totalTpSize < sizeNum * 0.99 && ( // Allow 1% tolerance for rounding
                    <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
                      ⚠️ TP orders total {((totalTpSize / sizeNum) * 100).toFixed(0)}% of position. R:R calculated for partial exit.
                    </div>
                  )}
                  
                  {totalSlLoss < 0 && (
                    <div className="text-xs text-green-600 bg-green-50 dark:bg-green-900/20 p-2 rounded">
                      ✅ Stop loss is in profit! You have locked in a minimum profit of {formatUsd(Math.abs(totalSlLoss))} after fees.
                    </div>
                  )}
                  
                  {!firstSL && (
                    <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
                      ⚠️ No stop loss set. Position is exposed to unlimited downside risk.
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