import * as React from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { useLocalStorage } from "~/hooks/useLocalStorage";
import { useBalanceUpdater } from "~/hooks/useBalanceUpdater";
import { useStreakTracking } from "~/hooks/useStreakTracking";
import { HyperliquidService } from "~/lib/hyperliquid";
import { TradingTimeBar } from "~/components/TradingTimeBar";
import { TradeCalculator } from "~/components/TradeCalculator";
import type { DailyTarget, AdvancedSettings } from "~/lib/types";
import { DEFAULT_DAILY_TARGET, DEFAULT_ADVANCED_SETTINGS, STORAGE_KEYS } from "~/lib/constants";

export default function DailyTarget() {
  const [target, setTarget] = useLocalStorage<DailyTarget>(
    STORAGE_KEYS.DAILY_TARGET,
    DEFAULT_DAILY_TARGET
  );
  const [walletAddress] = useLocalStorage<string | null>(STORAGE_KEYS.WALLET_ADDRESS, null);
  const [advancedSettings] = useLocalStorage<AdvancedSettings>(
    STORAGE_KEYS.ADVANCED_SETTINGS,
    DEFAULT_ADVANCED_SETTINGS
  );
  const [tempTarget, setTempTarget] = React.useState(target);
  const hlService = new HyperliquidService();
  const { balance, dailyStartBalance } = useBalanceUpdater(walletAddress);
  const { currentStreak, unconfirmedStreak, longestStreak, updateDailyProgress, getStreakEmoji, streakThreshold, todayStatus } = useStreakTracking();

  const handleSave = () => {
    setTarget(tempTarget);
    toast.success("Daily target saved successfully!", {
      description: `Target: ${tempTarget.targetPercentage}% with ${tempTarget.minimumTrades} trades`
    });
  };

  const currentPerpsValue = balance?.perpsValue || 0;
  const startOfDayPerpsValue = dailyStartBalance?.perpsValue || dailyStartBalance?.accountValue || currentPerpsValue; // Fallback to accountValue for backward compatibility
  
  const calculateProfitPerTrade = () => {
    if (startOfDayPerpsValue === 0 || tempTarget.minimumTrades === 0) return 0;
    const dailyTargetAmount = startOfDayPerpsValue * (tempTarget.targetPercentage / 100);
    return dailyTargetAmount / tempTarget.minimumTrades;
  };

  const profitPerTrade = calculateProfitPerTrade();
  
  // Calculate progress
  const dailyProfit = currentPerpsValue - startOfDayPerpsValue;
  const dailyTargetAmount = startOfDayPerpsValue * (target.targetPercentage / 100);
  const progressPercentage = dailyTargetAmount > 0 ? (dailyProfit / dailyTargetAmount) * 100 : 0;
  const isTargetAchieved = progressPercentage >= 100;
  
  // Check if loss threshold is hit
  const lossThresholdHit = progressPercentage < -(advancedSettings.lossThreshold);
  const actualLossPercentage = (dailyProfit / startOfDayPerpsValue) * 100;

  // Update streak tracking
  React.useEffect(() => {
    if (balance && dailyStartBalance) {
      updateDailyProgress(progressPercentage);
    }
  }, [progressPercentage, balance, dailyStartBalance]);

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-3xl font-bold">Daily Target</h2>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left Column - Daily Progress and Target Settings */}
        <div className="space-y-6">
          {/* Trade Calculator with Position Sizing - at the top for frequent use */}
          <TradeCalculator 
            walletAddress={walletAddress} 
            dailyTarget={target}
            advancedSettings={advancedSettings}
            startOfDayPerpsValue={startOfDayPerpsValue}
          />

          {/* Loss Threshold Warning */}
          {balance && dailyStartBalance && lossThresholdHit && (
            <Card className="border-red-500 bg-red-50/50 dark:bg-red-900/20">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-red-700 dark:text-red-400">
                  <span className="text-lg">⚠️ Significant Loss Detected</span>
                  <span className="text-2xl">🛑</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 bg-red-100 dark:bg-red-900/40 rounded-lg">
                    <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                      Current Loss: {actualLossPercentage.toFixed(2)}% ({hlService.formatUsdValue(dailyProfit)})
                    </p>
                    <p className="text-xs text-red-700 dark:text-red-400 mt-1">
                      You've exceeded your loss threshold of {advancedSettings.lossThreshold}% of daily target
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                      🧘 Time to Take a Break
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Significant losses can affect your judgment and emotional state. We strongly recommend:
                    </p>
                    <ul className="text-sm space-y-1 ml-4 text-gray-700 dark:text-gray-300">
                      <li>• Step away from trading for today</li>
                      <li>• Take time to relax and clear your mind</li>
                      <li>• Review your trades when you're calm</li>
                      <li>• Return tomorrow with a fresh perspective</li>
                    </ul>
                  </div>
                  
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                    <p className="text-xs text-amber-800 dark:text-amber-200">
                      <strong>Remember:</strong> Forcing trades to recover losses often leads to even bigger losses. 
                      The market will be here tomorrow. Protect your capital and mental well-being.
                    </p>
                  </div>
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
                    Percentage of perps account value to earn daily
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

                <div className="pt-4 border-t">
                  <h4 className="text-sm font-semibold mb-3">Fixed Trading Parameters (Optional)</h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Fixed Leverage Ratio (%)</label>
                      <Input
                        type="number"
                        value={tempTarget.fixedLeverageRatio || ''}
                        onChange={(e) => setTempTarget({ ...tempTarget, fixedLeverageRatio: e.target.value ? parseFloat(e.target.value) : undefined })}
                        placeholder="25"
                        min="1"
                        max="100"
                        step="1"
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        Use a fixed percentage of max leverage (e.g., 25% of 20x = 5x)
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Fixed Stop Loss (%)</label>
                      <Input
                        type="number"
                        value={tempTarget.fixedSLPercentage || ''}
                        onChange={(e) => setTempTarget({ ...tempTarget, fixedSLPercentage: e.target.value ? parseFloat(e.target.value) : undefined })}
                        placeholder="2"
                        min="0.1"
                        max="10"
                        step="0.1"
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        Maximum loss per trade as % of account (e.g., 2% of total account)
                      </p>
                    </div>
                  </div>
                </div>

                <Button onClick={handleSave} className="w-full">
                  Save Target
                </Button>
              </div>

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
        </div>

        {/* Right Column - Today's Progress, Target Breakdown and Trading Calculations */}
        <div className="space-y-6">
          {/* Daily Progress Card - moved from left column */}
          {balance && dailyStartBalance && (
            <Card>
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
                        progressPercentage > 100 ? (
                          <div 
                            className="h-3 rounded-full transition-all duration-500"
                            style={{ 
                              width: '100%',
                              background: `linear-gradient(90deg, 
                                #10b981 0%, 
                                #3b82f6 25%, 
                                #8b5cf6 50%, 
                                #ec4899 75%, 
                                #f59e0b 100%)`
                            }}
                          />
                        ) : (
                          <div 
                            className={`h-3 rounded-full transition-all duration-500 ${
                              isTargetAchieved ? 'bg-green-600' : 'bg-blue-600'
                            }`}
                            style={{ width: `${progressPercentage}%` }}
                          />
                        )
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
                      <p className="text-muted-foreground">Start of Day (Perps)</p>
                      <p className="font-semibold">{hlService.formatUsdValue(startOfDayPerpsValue)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Current Value (Perps)</p>
                      <p className="font-semibold">{hlService.formatUsdValue(currentPerpsValue)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Daily P&L</p>
                      <p className={`font-semibold ${dailyProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {dailyProfit >= 0 ? '+' : ''}{hlService.formatUsdValue(dailyProfit)}
                        <span className="text-sm ml-1">
                          ({dailyProfit >= 0 ? '+' : ''}{((dailyProfit / startOfDayPerpsValue) * 100).toFixed(2)}%)
                        </span>
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

          {/* Achievement Streak Card - moved to right column */}
          {balance && dailyStartBalance && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <span className="text-lg">Achievement Streak</span>
                  <span className="text-2xl">{getStreakEmoji(unconfirmedStreak)}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-3xl font-bold">{unconfirmedStreak} days</p>
                    <p className="text-sm text-muted-foreground">
                      {unconfirmedStreak > currentStreak ? 'Potential streak (confirm tomorrow)' : `Confirmed: ${currentStreak} days`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-muted-foreground">{longestStreak} days</p>
                    <p className="text-sm text-muted-foreground">Best streak</p>
                  </div>
                </div>
                {!todayStatus.currentlyAboveThreshold && (
                  <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-900/20 rounded text-xs text-amber-800 dark:text-amber-200">
                    ⚠️ Reach {streakThreshold}% of your target to qualify for today's streak!
                  </div>
                )}
                {todayStatus.currentlyAboveThreshold && todayStatus.droppedBelowThreshold && (
                  <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs text-blue-800 dark:text-blue-200">
                    ℹ️ You dropped below {streakThreshold}% earlier but recovered - finish above {streakThreshold}% to maintain streak!
                  </div>
                )}
                {todayStatus.currentlyAboveThreshold && !todayStatus.droppedBelowThreshold && (
                  <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/20 rounded text-xs text-green-800 dark:text-green-200">
                    ✅ Great job! Stay above {streakThreshold}% to extend your streak!
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {startOfDayPerpsValue > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Target Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span className="text-sm text-muted-foreground">Start of Day Perps Value</span>
                    <span className="font-semibold">{hlService.formatUsdValue(startOfDayPerpsValue)}</span>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span className="text-sm text-muted-foreground">Daily Target Amount</span>
                    <span className="font-semibold">
                      {hlService.formatUsdValue(startOfDayPerpsValue * (target.targetPercentage / 100))}
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
                  <p className="text-sm text-muted-foreground text-center mt-4">
                    To achieve your {target.targetPercentage}% daily target, you need to make {hlService.formatUsdValue(profitPerTrade)} profit on each of your {target.minimumTrades} trades.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
          
          {/* Trading Time Indicator */}
          {(advancedSettings.preferredTradingTimes.length > 0 || advancedSettings.avoidedTradingTimes.length > 0) && (
            <TradingTimeBar
              preferredTimes={advancedSettings.preferredTradingTimes}
              avoidedTimes={advancedSettings.avoidedTradingTimes}
            />
          )}
        </div>
      </div>
    </div>
  );
}