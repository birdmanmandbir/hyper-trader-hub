import * as React from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { useLocalStorage } from "~/hooks/useLocalStorage";
import { useBalanceUpdater } from "~/hooks/useBalanceUpdater";
import { HyperliquidService } from "~/lib/hyperliquid";

interface DailyTarget {
  targetPercentage: number;
  minimumTrades: number;
  riskRewardRatio: number;
}

interface AdvancedSettings {
  takerFee: number;
  makerFee: number;
}

export default function DailyTarget() {
  const [target, setTarget] = useLocalStorage<DailyTarget>("dailyTarget", {
    targetPercentage: 10,
    minimumTrades: 2,
    riskRewardRatio: 2,
  });
  const [walletAddress] = useLocalStorage<string | null>("hyperliquid-wallet", null);
  const [advancedSettings] = useLocalStorage<AdvancedSettings>("advancedSettings", {
    takerFee: 0.04,
    makerFee: 0.012,
  });
  const [tempTarget, setTempTarget] = React.useState(target);
  const hlService = new HyperliquidService();
  const { balance, dailyStartBalance } = useBalanceUpdater(walletAddress);

  const handleSave = () => {
    setTarget(tempTarget);
    toast.success("Daily target saved successfully!", {
      description: `Target: ${tempTarget.targetPercentage}% with ${tempTarget.minimumTrades} trades, RR: 1:${tempTarget.riskRewardRatio}`
    });
  };

  const currentAccountValue = balance?.accountValue || 0;
  const startOfDayValue = dailyStartBalance?.accountValue || currentAccountValue;
  
  const calculateProfitPerTrade = () => {
    if (startOfDayValue === 0 || tempTarget.minimumTrades === 0) return 0;
    const dailyTargetAmount = startOfDayValue * (tempTarget.targetPercentage / 100);
    return dailyTargetAmount / tempTarget.minimumTrades;
  };

  const profitPerTrade = calculateProfitPerTrade();
  
  // Calculate progress
  const dailyProfit = currentAccountValue - startOfDayValue;
  const dailyTargetAmount = startOfDayValue * (target.targetPercentage / 100);
  const progressPercentage = dailyTargetAmount > 0 ? (dailyProfit / dailyTargetAmount) * 100 : 0;
  const isTargetAchieved = progressPercentage >= 100;

  return (
    <div className="container max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-3xl font-bold">Daily Target</h2>
      </div>

      {/* Daily Progress Card */}
      {balance && dailyStartBalance && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Today's Progress</span>
              <span className="text-2xl">{isTargetAchieved ? "🎯" : "📈"}</span>
            </CardTitle>
            <CardDescription>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span className={dailyProfit >= 0 ? (isTargetAchieved ? "text-green-600 font-semibold" : "") : "text-red-600 font-semibold"}>
                    {progressPercentage.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 dark:bg-gray-700 relative overflow-hidden">
                  {progressPercentage >= 0 ? (
                    <div 
                      className={`h-3 rounded-full transition-all duration-500 ${
                        isTargetAchieved ? 'bg-green-600' : 'bg-blue-600'
                      }`}
                      style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                    />
                  ) : (
                    <div 
                      className="h-3 bg-red-600 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(Math.abs(progressPercentage), 100)}%` }}
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="text-muted-foreground">Start of Day</p>
                  <p className="font-semibold">{hlService.formatUsdValue(startOfDayValue)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Current Value</p>
                  <p className="font-semibold">{hlService.formatUsdValue(currentAccountValue)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Daily P&L</p>
                  <p className={`font-semibold ${dailyProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {dailyProfit >= 0 ? '+' : ''}{hlService.formatUsdValue(dailyProfit)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Target</p>
                  <p className="font-semibold">{hlService.formatUsdValue(dailyTargetAmount)}</p>
                </div>
              </div>

              {isTargetAchieved && (
                <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-green-600 dark:text-green-400 font-semibold">
                    🎉 Congratulations! Daily target achieved!
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Set Your Daily Trading Goals</CardTitle>
          <CardDescription>
            Configure your daily profit target and minimum trades to calculate required profit per trade
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Daily Target (%)</label>
              <Input
                type="number"
                value={tempTarget.targetPercentage}
                onChange={(e) => setTempTarget({ ...tempTarget, targetPercentage: parseFloat(e.target.value) || 0 })}
                placeholder="10"
                min="0"
                step="0.1"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Percentage of account value to earn daily
              </p>
            </div>

            <div>
              <label className="text-sm font-medium">Minimum Trades</label>
              <Input
                type="number"
                value={tempTarget.minimumTrades}
                onChange={(e) => setTempTarget({ ...tempTarget, minimumTrades: parseInt(e.target.value) || 0 })}
                placeholder="2"
                min="1"
                step="1"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Number of trades to achieve the target
              </p>
            </div>

            <div>
              <label className="text-sm font-medium">Risk/Reward Ratio (1:X)</label>
              <Input
                type="number"
                value={tempTarget.riskRewardRatio}
                onChange={(e) => setTempTarget({ ...tempTarget, riskRewardRatio: parseFloat(e.target.value) || 2 })}
                placeholder="2"
                min="1"
                step="0.1"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Your reward target for every 1 unit of risk
              </p>
            </div>

            <Button onClick={handleSave} className="w-full">
              Save Target
            </Button>
          </div>

          {startOfDayValue > 0 && (
            <div className="pt-6 border-t space-y-4">
              <h3 className="font-semibold">Target Breakdown</h3>
              
              <div className="grid gap-4">
                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <span className="text-sm text-muted-foreground">Start of Day Value</span>
                  <span className="font-semibold">{hlService.formatUsdValue(startOfDayValue)}</span>
                </div>

                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <span className="text-sm text-muted-foreground">Daily Target Amount</span>
                  <span className="font-semibold">
                    {hlService.formatUsdValue(startOfDayValue * (target.targetPercentage / 100))}
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg border border-primary/20">
                  <span className="text-sm font-medium">Profit Per Trade Required</span>
                  <span className="text-lg font-bold text-primary">
                    {hlService.formatUsdValue(profitPerTrade)}
                  </span>
                </div>
              </div>

              {target.minimumTrades > 0 && (
                <p className="text-sm text-muted-foreground text-center">
                  To achieve your {target.targetPercentage}% daily target, you need to make {hlService.formatUsdValue(profitPerTrade)} profit on each of your {target.minimumTrades} trades.
                </p>
              )}
            </div>
          )}

          {!walletAddress && (
            <div className="text-center py-4 text-muted-foreground">
              <p>Please connect your wallet first to see target calculations</p>
              <Link to="/">
                <Button variant="outline" className="mt-2">Go to Overview</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trading Calculations Card */}
      {startOfDayValue > 0 && profitPerTrade > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Trading Calculations</CardTitle>
            <CardDescription className="flex items-center justify-between">
              <span>Leverage and position sizing to catch 1% moves</span>
              <Link to="/advanced-settings" className="text-xs text-primary hover:underline">
                Configure fees →
              </Link>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Calculations */}
              {(() => {
                // Fee calculations (round trip with taker fees)
                const totalFeePercentage = advancedSettings.takerFee * 2 / 100; // Convert to decimal
                
                // Adjust profit target to account for fees
                const profitAfterFees = profitPerTrade + (profitPerTrade / 0.01) * totalFeePercentage;
                
                // Calculate required leverage for 1% move (adjusted for fees)
                const requiredLeverage = (profitAfterFees / startOfDayValue) / 0.01;
                const positionSize = profitAfterFees / 0.01; // Position size needed
                
                // Risk calculations including fees
                const riskPerTrade = profitPerTrade / target.riskRewardRatio;
                const feeCost = positionSize * totalFeePercentage;
                const riskWithFees = riskPerTrade + feeCost;
                const stopLossPercentage = 1 / target.riskRewardRatio; // If targeting 1% profit, SL at 0.5% for RR 1:2
                const accountRiskPercentage = (riskWithFees / startOfDayValue) * 100; // % of account at risk
                
                // Calculate required win rate
                const accountProfitPercentage = (profitPerTrade / startOfDayValue) * 100;
                const requiredWinRate = accountRiskPercentage / (accountRiskPercentage + accountProfitPercentage) * 100;
                
                // Calculate effective RR ratio after fees
                const effectiveRR = profitPerTrade / riskWithFees;

                return (
                  <>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Required Leverage (for 1% move)</p>
                          <p className="text-2xl font-bold">{requiredLeverage.toFixed(1)}x</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            To make {hlService.formatUsdValue(profitPerTrade)} from 1% move
                          </p>
                        </div>

                        <div>
                          <p className="text-sm text-muted-foreground">Position Size</p>
                          <p className="text-2xl font-bold">{hlService.formatUsdValue(positionSize)}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Total position value per trade
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Risk per Trade (incl. fees)</p>
                          <p className="text-2xl font-bold text-red-600">
                            {hlService.formatUsdValue(riskWithFees)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {accountRiskPercentage.toFixed(2)}% of account ({hlService.formatUsdValue(feeCost)} fees)
                          </p>
                        </div>

                        <div>
                          <p className="text-sm text-muted-foreground">Stop Loss</p>
                          <p className="text-2xl font-bold text-red-600">
                            {stopLossPercentage.toFixed(2)}%
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Price movement for stop loss
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <p className="text-sm font-medium mb-2">Trade Setup Summary</p>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li>• Use <span className="font-semibold text-foreground">{requiredLeverage.toFixed(1)}x leverage</span></li>
                        <li>• Position size: <span className="font-semibold text-foreground">{hlService.formatUsdValue(positionSize)}</span></li>
                        <li>• Target: <span className="font-semibold text-green-600">+1%</span> ({hlService.formatUsdValue(profitPerTrade)} net)</li>
                        <li>• Stop loss: <span className="font-semibold text-red-600">-{stopLossPercentage.toFixed(2)}%</span> ({hlService.formatUsdValue(riskWithFees)} incl. fees)</li>
                        <li>• Trading fees: <span className="font-semibold">{(advancedSettings.takerFee * 2).toFixed(2)}%</span> round trip</li>
                        <li>• Effective RR: <span className="font-semibold text-foreground">1:{effectiveRR.toFixed(2)}</span> (vs target 1:{target.riskRewardRatio})</li>
                      </ul>
                    </div>

                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                      <p className="text-sm text-amber-800 dark:text-amber-200">
                        <strong>⚠️ Risk Warning:</strong> High leverage amplifies both gains and losses. 
                        With {requiredLeverage.toFixed(1)}x leverage, a {(100 / requiredLeverage).toFixed(2)}% 
                        move against you will liquidate your position.
                      </p>
                    </div>

                    <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <p className="text-sm text-purple-800 dark:text-purple-200">
                        <strong>📊 Win Rate Analysis:</strong> For a {accountProfitPercentage.toFixed(2)}% profit 
                        vs {accountRiskPercentage.toFixed(2)}% risk per trade, you need a minimum win rate 
                        of <span className="font-bold">{requiredWinRate.toFixed(1)}%</span> to break even (including fees).
                        {requiredWinRate > 50 && (
                          <span className="block mt-1 text-xs">
                            Note: This high required win rate is due to the impact of fees on your risk/reward ratio.
                          </span>
                        )}
                      </p>
                    </div>
                  </>
                );
              })()}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}