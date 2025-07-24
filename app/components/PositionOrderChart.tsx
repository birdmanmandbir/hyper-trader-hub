import * as React from "react";
import { useLivePrice } from "~/hooks/useLivePrice";
import type { Order } from "~/lib/hyperliquid";
import type { PositionAnalysis } from "~/services/position-analysis.server";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { formatPrice as formatPriceWithDecimals } from "~/lib/price-decimals";

interface PositionOrderChartProps {
  coin: string;
  entryPrice: string;
  side: string; // Size value, positive for long, negative for short
  orders: Order[];
  positionSize?: string; // Added to calculate dollar PnL
  takerFee?: number; // Fee for market/stop orders (in percentage, e.g., 0.04)
  makerFee?: number; // Fee for limit orders (in percentage, e.g., 0.012)
  analysis?: PositionAnalysis;
}

export function PositionOrderChart({ coin, entryPrice, side, orders, positionSize, takerFee = 0.04, makerFee = 0.012, analysis }: PositionOrderChartProps) {
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
  
  // Use server-calculated visualization data if available
  const minPrice = analysis?.visualization.minPrice || entry * 0.995;
  const maxPrice = analysis?.visualization.maxPrice || entry * 1.005;
  const priceRange = analysis?.visualization.priceRange || (maxPrice - minPrice);
  
  // Helper to convert price to percentage position
  const priceToPercent = (price: number) => {
    return ((price - minPrice) / priceRange) * 100;
  };
  
  // Format price based on value
  const formatPrice = (price: number) => {
    return formatPriceWithDecimals(price);
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
        
        {/* SL Order */}
        {analysis?.slOrder && (
          <div
            className={`absolute top-0 bottom-0 w-1 ${analysis.slOrder.isInProfit ? 'bg-green-500' : 'bg-red-500'} hover:w-2 transition-all cursor-pointer`}
            style={{ left: `${analysis.visualization.slPosition}%` }}
            title={`Stop Loss: ${formatPrice(analysis.slOrder.price)} (${analysis.slOrder.isInProfit ? '+' : '-'}${analysis.slOrder.percentMove.toFixed(2)}% / ${analysis.slOrder.isInProfit ? '+' : ''}${formatUsd(Math.abs(analysis.slOrder.loss))})${analysis.slOrder.isInProfit ? ' - Profit Protected!' : ''}`}
          >
            <div className={`absolute -top-6 left-1/2 -translate-x-1/2 text-xs ${analysis.slOrder.isInProfit ? 'text-green-600' : 'text-red-600'} whitespace-nowrap`}>
              SL {formatPrice(analysis.slOrder.price)}
            </div>
          </div>
        )}
        
        {/* Entry Price */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-blue-500 hover:w-1 transition-all cursor-pointer"
          style={{ left: `${analysis?.visualization.entryPosition || priceToPercent(entry)}%` }}
          title={`Entry Price: ${formatPrice(entry)}`}
        >
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-blue-600 whitespace-nowrap">
            Entry {formatPrice(entry)}
          </div>
        </div>
        
        {/* TP Orders */}
        {analysis?.tpOrders.map((tp, idx) => (
          <div
            key={`tp-${idx}`}
            className="absolute top-0 bottom-0 w-1 bg-green-500 hover:w-2 transition-all cursor-pointer"
            style={{ left: `${analysis.visualization.tpPositions[idx]}%` }}
            title={`Take Profit: ${formatPrice(tp.price)} (+${tp.percentMove.toFixed(2)}% / +${formatUsd(tp.profit)}) - Size: ${tp.size} ${coin}`}
          >
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-green-600 whitespace-nowrap">
              TP{idx + 1} {formatPrice(tp.price)}
            </div>
          </div>
        ))}
        
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
        {(analysis?.tpOrders.length || 0) > 0 && (
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded" />
            <span>Take Profit</span>
          </div>
        )}
        {analysis?.slOrder && (
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-500 rounded" />
            <span>Stop Loss</span>
            {analysis.slOrder.isInProfit && (
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
              // Use server-calculated analysis if available
              if (analysis) {
                const { entryFee, slOrder, tpOrders: tpAnalysis, summary } = analysis;
                
                // Check if we have TP orders
                if (tpAnalysis.length === 0) {
                  return (
                    <p className="text-sm text-muted-foreground">
                      No take profit orders set
                    </p>
                  );
                }
                
                return (
                  <div className="space-y-3">
                    {/* Risk Analysis - Only show if SL exists */}
                    {slOrder && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase">
                          {slOrder.isInProfit ? "Profit Protection (Stop Loss)" : "Risk (Stop Loss)"}
                        </h4>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <p className="text-muted-foreground">Price Move:</p>
                            <p className={`font-semibold ${slOrder.isInProfit ? 'text-green-600' : 'text-red-600'}`}>
                              {slOrder.isInProfit ? '+' : '-'}{(Math.abs(slOrder.price - entry) / entry * 100).toFixed(2)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">{slOrder.isInProfit ? "Min Profit:" : "Total Loss:"}</p>
                            <p className={`font-semibold ${slOrder.isInProfit ? 'text-green-600' : 'text-red-600'}`}>
                              {slOrder.isInProfit ? '+' : '-'}{formatUsd(Math.abs(slOrder.totalLoss))}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Entry Fee:</p>
                            <p className="text-xs">{formatUsd(entryFee)} ({takerFee}%)</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Exit Fee:</p>
                            <p className="text-xs">{formatUsd(slOrder.exitFee)} ({takerFee}%)</p>
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
                          <p className="font-semibold text-green-600">+{((Math.abs(summary.avgTpPrice - entry) / entry) * 100).toFixed(2)}%</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Net Profit:</p>
                          <p className="font-semibold text-green-600">+{formatUsd(analysis.expectedProfit)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Total TP Size:</p>
                          <p className="text-xs">{summary.totalTpSize.toFixed(4)} {coin} ({((summary.totalTpSize / sizeNum) * 100).toFixed(0)}%)</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Exit Fees:</p>
                          <p className="text-xs">{formatUsd(summary.totalTpExitFees)} ({makerFee}%)</p>
                        </div>
                      </div>
                      {tpAnalysis.length > 1 && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {tpAnalysis.length} TP orders: {tpAnalysis.map((tp, idx) => 
                            `TP${idx + 1} ${formatPrice(tp.price)} (${tp.size} ${coin})`
                          ).join(', ')}
                        </div>
                      )}
                    </div>
                    
                    {/* Summary */}
                    <div className="pt-2 border-t">
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="text-center">
                          <p className="text-muted-foreground">
                            {!slOrder ? "Expected Profit" : slOrder.isInProfit ? "Profit Multiple" : "Risk:Reward"}
                          </p>
                          <p className="font-bold text-lg">
                            {!slOrder 
                              ? formatUsd(analysis.expectedProfit)
                              : slOrder.isInProfit 
                                ? analysis.expectedProfit > Math.abs(slOrder.totalLoss) 
                                  ? `${(analysis.expectedProfit / Math.abs(slOrder.totalLoss)).toFixed(2)}x`
                                  : "Protected"
                                : `1:${summary.rrRatio.toFixed(2)}`
                            }
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-muted-foreground">Max Fees</p>
                          <p className="font-semibold">{formatUsd(summary.maxFees)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-muted-foreground">Breakeven</p>
                          <p className="font-semibold">{summary.breakevenPercent.toFixed(3)}%</p>
                        </div>
                      </div>
                    </div>
                    
                    {summary.totalTpSize < sizeNum * 0.99 && ( // Allow 1% tolerance for rounding
                      <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
                        ⚠️ TP orders total {((summary.totalTpSize / sizeNum) * 100).toFixed(0)}% of position. R:R calculated for partial exit.
                      </div>
                    )}
                    
                    {slOrder?.isInProfit && (
                      <div className="text-xs text-green-600 bg-green-50 dark:bg-green-900/20 p-2 rounded">
                        ✅ Stop loss is in profit! You have locked in a minimum profit of {formatUsd(Math.abs(slOrder.totalLoss))} after fees.
                      </div>
                    )}
                    
                    {!slOrder && (
                      <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
                        ⚠️ No stop loss set. Position is exposed to unlimited downside risk.
                      </div>
                    )}
                  </div>
                );
              }
              
              // No analysis available
              return (
                <p className="text-sm text-muted-foreground">
                  Position analysis not available
                </p>
              );
            })()}
          </CardContent>
        )}
      </Card>
    </div>
  );
}