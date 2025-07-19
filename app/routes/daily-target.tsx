import * as React from "react";
import { redirect, type LoaderFunctionArgs, type ActionFunctionArgs } from "react-router";
import { useLoaderData, Link, Form, useActionData } from "react-router";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { requireAuth } from "~/lib/auth.server";
import { getBalanceData } from "~/services/balance.server";
import { getUserSettings, upsertUserSettings, getDailyBalance } from "~/db/client.server";
import { getDb } from "~/db/client.server";
import { useHyperliquidService } from "~/providers/HyperliquidProvider";
import { useAutoRefresh } from "~/hooks/useAutoRefresh";
import { TradingTimeBar } from "~/components/TradingTimeBar";
import { TradeCalculator } from "~/components/TradeCalculator";
import { getUserDateString } from "~/lib/time-utils.server";
import type { DailyTarget, AdvancedSettings } from "~/lib/types";
import { DEFAULT_DAILY_TARGET, DEFAULT_ADVANCED_SETTINGS } from "~/lib/constants";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const userAddress = await requireAuth(request, context.cloudflare.env);
  const db = getDb(context.cloudflare.env);
  
  // Get settings for timezone offset
  const settings = await getUserSettings(db, userAddress);
  const timezoneOffset = settings?.timezoneOffset || 0;
  
  // Parse settings or use defaults
  const dailyTarget = settings?.dailyTarget 
    ? JSON.parse(settings.dailyTarget) as DailyTarget
    : DEFAULT_DAILY_TARGET;
    
  const advancedSettings = settings?.advancedSettings
    ? JSON.parse(settings.advancedSettings) as AdvancedSettings
    : DEFAULT_ADVANCED_SETTINGS;
  
  // Get today's date for balance record
  const todayDate = getUserDateString(new Date(), timezoneOffset);
  
  // Fetch balance data and today's balance in parallel
  const [balanceData, todayBalance] = await Promise.all([
    getBalanceData(context.cloudflare.env, userAddress, timezoneOffset),
    getDailyBalance(db, userAddress, todayDate)
  ]);
  
  const { balance, dailyStartBalance } = balanceData;
  
  return {
    userAddress,
    dailyTarget,
    advancedSettings,
    balance,
    dailyStartBalance,
    todayBalance,
    timezoneOffset,
  };
}

export async function action({ request, context }: ActionFunctionArgs) {
  const userAddress = await requireAuth(request, context.cloudflare.env);
  const db = getDb(context.cloudflare.env);
  const formData = await request.formData();
  
  const targetPercentage = parseFloat(formData.get("targetPercentage") as string);
  const minimumTrades = parseInt(formData.get("minimumTrades") as string);
  const fixedSLPercentage = parseFloat(formData.get("fixedSLPercentage") as string);
  const fixedLeverageRatio = parseFloat(formData.get("fixedLeverageRatio") as string);
  
  const dailyTarget: DailyTarget = {
    targetPercentage,
    minimumTrades,
    fixedSLPercentage,
    fixedLeverageRatio,
  };
  
  // Get existing settings to preserve advanced settings
  const existingSettings = await getUserSettings(db, userAddress);
  const advancedSettings = existingSettings?.advancedSettings || JSON.stringify(DEFAULT_ADVANCED_SETTINGS);
  
  // Save to D1
  await upsertUserSettings(db, {
    userAddress,
    dailyTarget: JSON.stringify(dailyTarget),
    advancedSettings,
    timezoneOffset: existingSettings?.timezoneOffset || 0,
  });
  
  return { 
    success: true,
    message: "Daily target saved successfully!"
  };
}

export default function DailyTarget() {
  const { 
    userAddress,
    dailyTarget,
    advancedSettings,
    balance,
    dailyStartBalance,
    todayBalance,
  } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  
  const [tempTarget, setTempTarget] = React.useState(dailyTarget);
  const hlService = useHyperliquidService();
  
  // Auto-refresh balance data every 30 seconds
  const { secondsUntilRefresh, isRefreshing } = useAutoRefresh(30000);
  
  // Show toast on successful save
  React.useEffect(() => {
    if (actionData?.success && actionData?.message) {
      toast.success(actionData.message);
    }
  }, [actionData]);
  
  const currentPerpsValue = balance?.perpsValue || 0;
  const startOfDayPerpsValue = dailyStartBalance || currentPerpsValue;
  
  const calculateProfitPerTrade = () => {
    if (startOfDayPerpsValue === 0 || tempTarget.minimumTrades === 0) return 0;
    const dailyTargetAmount = startOfDayPerpsValue * (tempTarget.targetPercentage / 100);
    return dailyTargetAmount / tempTarget.minimumTrades;
  };

  const profitPerTrade = calculateProfitPerTrade();
  
  // Calculate progress
  const dailyProfit = currentPerpsValue - startOfDayPerpsValue;
  const dailyTargetAmount = startOfDayPerpsValue * (dailyTarget.targetPercentage / 100);
  const progressPercentage = dailyTargetAmount > 0 ? (dailyProfit / dailyTargetAmount) * 100 : 0;
  const isTargetAchieved = progressPercentage >= 100;
  
  // Check if loss threshold is hit
  const lossThresholdHit = progressPercentage < -(advancedSettings.lossThreshold);
  const actualLossPercentage = (dailyProfit / startOfDayPerpsValue) * 100;

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
            walletAddress={userAddress} 
            dailyTarget={dailyTarget}
            advancedSettings={advancedSettings}
            startOfDayPerpsValue={startOfDayPerpsValue}
            balance={balance}
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
                    <p className="font-semibold text-red-800 dark:text-red-300">
                      Current Loss: {hlService.formatUsdValue(dailyProfit)} ({actualLossPercentage.toFixed(2)}%)
                    </p>
                    <p className="text-sm mt-1 text-red-700 dark:text-red-400">
                      You've exceeded your {advancedSettings.lossThreshold}% loss threshold
                    </p>
                  </div>
                  <div className="text-sm space-y-2 text-red-700 dark:text-red-400">
                    <p className="font-medium">⚡ Recommended Actions:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>Stop trading for the day to prevent further losses</li>
                      <li>Review your trades and identify what went wrong</li>
                      <li>Consider reducing position sizes tomorrow</li>
                      <li>Take a break and come back with a clear mind</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Progress and Settings */}
        <div className="space-y-6">
          {/* Target Settings Form */}
          <Card>
            <CardHeader>
              <CardTitle>Trading Parameters</CardTitle>
              <CardDescription>
                Set your daily profit target and risk management rules
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form method="post" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="targetPercentage" className="text-sm font-medium">
                      Daily Target %
                    </label>
                    <Input
                      id="targetPercentage"
                      name="targetPercentage"
                      type="number"
                      value={tempTarget.targetPercentage}
                      onChange={(e) => setTempTarget({ ...tempTarget, targetPercentage: parseFloat(e.target.value) })}
                      step="0.1"
                      min="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="minimumTrades" className="text-sm font-medium">
                      Minimum Trades
                    </label>
                    <Input
                      id="minimumTrades"
                      name="minimumTrades"
                      type="number"
                      value={tempTarget.minimumTrades}
                      onChange={(e) => setTempTarget({ ...tempTarget, minimumTrades: parseInt(e.target.value) })}
                      min="1"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="fixedSLPercentage" className="text-sm font-medium">
                      Fixed SL % (of Account)
                    </label>
                    <Input
                      id="fixedSLPercentage"
                      name="fixedSLPercentage"
                      type="number"
                      value={tempTarget.fixedSLPercentage || 2}
                      onChange={(e) => setTempTarget({ ...tempTarget, fixedSLPercentage: parseFloat(e.target.value) })}
                      step="0.1"
                      min="0.1"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="fixedLeverageRatio" className="text-sm font-medium">
                      Leverage Usage %
                    </label>
                    <Input
                      id="fixedLeverageRatio"
                      name="fixedLeverageRatio"
                      type="number"
                      value={tempTarget.fixedLeverageRatio || 10}
                      onChange={(e) => setTempTarget({ ...tempTarget, fixedLeverageRatio: parseFloat(e.target.value) })}
                      step="1"
                      min="1"
                      max="100"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 p-3 bg-muted rounded-lg text-sm">
                  <div>
                    <p className="text-muted-foreground">Target per trade</p>
                    <p className="font-semibold">{hlService.formatUsdValue(profitPerTrade)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Daily target amount</p>
                    <p className="font-semibold">{hlService.formatUsdValue(dailyTargetAmount)}</p>
                  </div>
                </div>
                
                <Button type="submit" className="w-full">
                  Save Target
                </Button>
              </Form>
            </CardContent>
          </Card>

          {/* Today's Progress */}
          {balance && dailyStartBalance && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Today's Progress</span>
                  <span className="text-2xl">{isTargetAchieved ? "🎯" : "📈"}</span>
                </CardTitle>
                <CardDescription>
                  Daily Trading Progress
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Progress</span>
                      <span className={`text-sm font-semibold ${progressPercentage >= 100 ? 'text-green-600' : progressPercentage > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                        {progressPercentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 dark:bg-gray-700">
                      <div 
                        className={`h-3 rounded-full transition-all duration-500 ${
                          progressPercentage >= 100 ? 'bg-green-600' : progressPercentage > 0 ? 'bg-blue-600' : 'bg-red-600'
                        }`}
                        style={{ width: `${Math.min(Math.max(progressPercentage, 0), 100)}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="p-2 bg-muted rounded">
                      <p className="text-muted-foreground">Start Balance</p>
                      <p className="font-semibold">{hlService.formatUsdValue(startOfDayPerpsValue)}</p>
                    </div>
                    <div className="p-2 bg-muted rounded">
                      <p className="text-muted-foreground">Current Balance</p>
                      <p className="font-semibold">{hlService.formatUsdValue(currentPerpsValue)}</p>
                    </div>
                    <div className="p-2 bg-muted rounded">
                      <p className="text-muted-foreground">Daily P&L</p>
                      <p className={`font-semibold ${dailyProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {dailyProfit >= 0 ? '+' : ''}{hlService.formatUsdValue(dailyProfit)}
                      </p>
                    </div>
                    <div className="p-2 bg-muted rounded">
                      <p className="text-muted-foreground">Target</p>
                      <p className="font-semibold">{hlService.formatUsdValue(dailyTargetAmount)}</p>
                    </div>
                  </div>
                  
                  {isTargetAchieved && (
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <p className="text-sm text-green-800 dark:text-green-200 font-medium">
                        🎉 Congratulations! You've hit your daily target!
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Trading Time Indicator */}
          {advancedSettings.preferredTimes.length > 0 || advancedSettings.avoidedTimes.length > 0 ? (
            <TradingTimeBar 
              preferredTimes={advancedSettings.preferredTimes}
              avoidedTimes={advancedSettings.avoidedTimes}
            />
          ) : null}
        </div>
      </div>

      {/* Navigation */}
      <div className="mt-8 flex justify-between">
        <Link to="/">
          <Button variant="outline">← Back to Home</Button>
        </Link>
        <Link to="/advanced-settings">
          <Button variant="outline">Advanced Settings →</Button>
        </Link>
      </div>
    </div>
  );
}