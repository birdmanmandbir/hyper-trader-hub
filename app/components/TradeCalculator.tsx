import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { useLocalStorage } from "~/hooks/useLocalStorage";
import { HyperliquidService } from "~/lib/hyperliquid";
import { useBalanceUpdater } from "~/hooks/useBalanceUpdater";
import { Copy, Calculator } from "lucide-react";
import { toast } from "sonner";
import type { DailyTarget, AdvancedSettings } from "~/lib/types";
import { STORAGE_KEYS } from "~/lib/constants";

interface TradeCalculatorProps {
  walletAddress: string | null;
  dailyTarget: DailyTarget;
  advancedSettings: AdvancedSettings;
  startOfDayPerpsValue: number;
}

export function TradeCalculator({ walletAddress, dailyTarget, advancedSettings, startOfDayPerpsValue }: TradeCalculatorProps) {
  const hlService = new HyperliquidService();
  const { balance } = useBalanceUpdater(walletAddress);
  
  const [isLong, setIsLong] = React.useState(true);
  const [entry, setEntry] = React.useState<string>("");
  const [stopLoss, setStopLoss] = React.useState<string>("");
  const [takeProfit, setTakeProfit] = React.useState<string>("");
  const [manualPositionSize, setManualPositionSize] = React.useState<string>("");
  
  const currentPerpsValue = balance?.perpsValue || 0;
  
  // Get the coin based on direction
  const coin = isLong ? advancedSettings.defaultLongCrypto : advancedSettings.defaultShortCrypto;
  
  // Parse input values
  const entryPrice = parseFloat(entry) || 0;
  let slPrice = parseFloat(stopLoss) || 0;
  let tpPrice = parseFloat(takeProfit) || 0;
  
  // Auto-calculate TP & SL if fixed R:R is set and entry is provided
  React.useEffect(() => {
    if (dailyTarget.fixedRR && entryPrice > 0 && !stopLoss && !takeProfit) {
      // Calculate a 1% risk as default
      const riskAmount = entryPrice * 0.01;
      const rewardAmount = riskAmount * dailyTarget.fixedRR;
      
      if (isLong) {
        setStopLoss((entryPrice - riskAmount).toFixed(4));
        setTakeProfit((entryPrice + rewardAmount).toFixed(4));
      } else {
        setStopLoss((entryPrice + riskAmount).toFixed(4));
        setTakeProfit((entryPrice - rewardAmount).toFixed(4));
      }
    }
  }, [entryPrice, isLong, dailyTarget.fixedRR, stopLoss, takeProfit]);
  
  // Re-parse after potential auto-calculation
  slPrice = parseFloat(stopLoss) || 0;
  tpPrice = parseFloat(takeProfit) || 0;
  
  // Calculate risk and reward percentages
  const riskPercentage = isLong 
    ? ((entryPrice - slPrice) / entryPrice) * 100
    : ((slPrice - entryPrice) / entryPrice) * 100;
    
  const rewardPercentage = isLong
    ? ((tpPrice - entryPrice) / entryPrice) * 100
    : ((entryPrice - tpPrice) / entryPrice) * 100;
  
  // Calculate R:R ratio
  const rrRatio = riskPercentage > 0 ? rewardPercentage / riskPercentage : 0;
  
  // Calculate target profit per trade
  const dailyTargetAmount = startOfDayPerpsValue * (dailyTarget.targetPercentage / 100);
  const targetProfitPerTrade = dailyTarget.minimumTrades > 0 ? dailyTargetAmount / dailyTarget.minimumTrades : 0;
  
  // Calculate fees percentage
  const totalFeePercentage = advancedSettings.takerFee * 2 / 100; // Round trip fees
  
  // Parse manual position size (in coins)
  const manualSizeInCoins = parseFloat(manualPositionSize) || 0;
  
  // Get leverage for the specific crypto or use default
  const maxLeverage = advancedSettings.leverageMap[coin] || advancedSettings.defaultLeverage || 10;
  
  // Calculate effective leverage if fixed leverage ratio is set
  const effectiveLeverage = dailyTarget.fixedLeverageRatio 
    ? (maxLeverage * dailyTarget.fixedLeverageRatio / 100)
    : maxLeverage;
  
  // If manual position size is provided, calculate USD value
  // Otherwise, calculate position size based on target
  let positionSize: number;
  let positionSizeInCoins: number;
  
  if (manualSizeInCoins > 0 && entryPrice > 0) {
    // Use manual position size
    positionSizeInCoins = manualSizeInCoins;
    positionSize = manualSizeInCoins * entryPrice;
  } else if (dailyTarget.fixedLeverageRatio && startOfDayPerpsValue > 0 && entryPrice > 0) {
    // Use fixed leverage ratio to calculate position size
    const marginAvailable = startOfDayPerpsValue;
    positionSize = marginAvailable * effectiveLeverage;
    positionSizeInCoins = positionSize / entryPrice;
  } else {
    // Calculate position size so that net reward (after fees) equals target
    const netRewardPercentage = (rewardPercentage / 100) - totalFeePercentage;
    positionSize = netRewardPercentage > 0 ? targetProfitPerTrade / netRewardPercentage : 0;
    positionSizeInCoins = entryPrice > 0 ? positionSize / entryPrice : 0;
  }
  
  // Calculate actual values
  const feeCost = positionSize * totalFeePercentage;
  const riskDollar = positionSize * (riskPercentage / 100);
  const rewardDollar = positionSize * (rewardPercentage / 100);
  const netReward = rewardDollar - feeCost;
  const netLoss = riskDollar + feeCost;
  
  // Calculate effective R:R after fees
  const effectiveRR = netLoss > 0 ? netReward / netLoss : 0;
  
  const marginRequired = positionSize / effectiveLeverage;
  
  // Calculate account risk percentage (using net loss including fees)
  const accountRiskPercentage = startOfDayPerpsValue > 0 ? (netLoss / startOfDayPerpsValue) * 100 : 0;
  
  // Calculate SL BE (Breakeven) price including fees
  const feePercentagePerSide = advancedSettings.takerFee / 100;
  const totalFeeForBreakeven = feePercentagePerSide * 2; // Entry + Exit fees
  
  let slBePrice = 0;
  if (entryPrice > 0) {
    if (isLong) {
      // For long: BE price = entry * (1 + total fees)
      slBePrice = entryPrice * (1 + totalFeeForBreakeven);
    } else {
      // For short: BE price = entry * (1 - total fees)
      slBePrice = entryPrice * (1 - totalFeeForBreakeven);
    }
  }
  
  const beMovementPercentage = Math.abs((slBePrice - entryPrice) / entryPrice * 100);
  
  const handleCopyTrade = () => {
    if (!entryPrice || !slPrice || !tpPrice) {
      toast.error("Please fill in all fields");
      return;
    }
    
    const emoji = isLong ? "🟢" : "🔴";
    const direction = isLong ? "Long" : "Short";
    const tradeText = `${emoji} ${direction} ${coin} entry ${entry}, SL ${stopLoss}, TP ${takeProfit}`;
    
    navigator.clipboard.writeText(tradeText);
    toast.success("Trade copied to clipboard!", {
      description: tradeText
    });
  };
  
  const isValid = entryPrice > 0 && slPrice > 0 && tpPrice > 0 && 
    ((isLong && tpPrice > slPrice) ||
     (!isLong && tpPrice < slPrice));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="w-5 h-5" />
          Trade Calculator & Position Sizing
        </CardTitle>
        <CardDescription>
          Calculate position size based on your daily target and risk management
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={isLong ? "default" : "outline"}
            onClick={() => setIsLong(true)}
            className="font-semibold"
          >
            🟢 Long ({advancedSettings.defaultLongCrypto})
          </Button>
          <Button
            variant={!isLong ? "default" : "outline"}
            onClick={() => setIsLong(false)}
            className="font-semibold"
          >
            🔴 Short ({advancedSettings.defaultShortCrypto})
          </Button>
        </div>
        
        <div>
          <label className="text-xs text-muted-foreground">Entry Price</label>
          <Input
            type="number"
            placeholder={isLong ? "2511" : "32100"}
            value={entry}
            onChange={(e) => setEntry(e.target.value)}
            step="0.01"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-muted-foreground">Stop Loss</label>
            <Input
              type="number"
              placeholder={isLong ? "2500" : "32500"}
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              step="0.01"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Take Profit</label>
            <Input
              type="number"
              placeholder={isLong ? "2540" : "31500"}
              value={takeProfit}
              onChange={(e) => setTakeProfit(e.target.value)}
              step="0.01"
            />
          </div>
        </div>
        
        {dailyTarget.fixedRR && (
          <p className="text-xs text-muted-foreground">
            Using fixed R:R ratio of 1:{dailyTarget.fixedRR}
          </p>
        )}
        
        <div>
          <label className="text-xs text-muted-foreground">Position Size (Optional)</label>
          <Input
            type="number"
            placeholder={`e.g., 1 ${coin}`}
            value={manualPositionSize}
            onChange={(e) => setManualPositionSize(e.target.value)}
            step="0.01"
            className="font-mono"
          />
          <p className="text-xs text-muted-foreground mt-1">
            {manualSizeInCoins > 0 
              ? `Using manual size: ${manualSizeInCoins} ${coin} = ${hlService.formatUsdValue(positionSize)}`
              : dailyTarget.fixedLeverageRatio
                ? `Using fixed leverage: ${effectiveLeverage.toFixed(1)}x (${dailyTarget.fixedLeverageRatio}% of ${maxLeverage}x)`
                : "Leave empty to auto-calculate based on daily target"}
          </p>
        </div>
        
        {isValid && startOfDayPerpsValue > 0 && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">Direction</p>
                <p className="text-lg font-bold flex items-center gap-1">
                  {isLong ? (
                    <>🟢 Long {coin}</>
                  ) : (
                    <>🔴 Short {coin}</>
                  )}
                </p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">Raw R:R</p>
                <p className="text-lg font-bold">1:{rrRatio.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">After fees: 1:{effectiveRR.toFixed(2)}</p>
              </div>
            </div>
            
            <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
              <p className="text-xs font-medium mb-2">
                Position Sizing {manualSizeInCoins > 0 
                  ? "(Manual Entry)" 
                  : dailyTarget.fixedLeverageRatio 
                    ? "(Fixed Leverage)" 
                    : "(Based on Daily Target)"}
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {!manualSizeInCoins && !dailyTarget.fixedLeverageRatio && (
                  <div>
                    <p className="text-muted-foreground">Target per trade:</p>
                    <p className="font-semibold">{hlService.formatUsdValue(targetProfitPerTrade)}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground">Position size:</p>
                  <p className="font-semibold text-primary">{positionSizeInCoins.toFixed(4)} {coin}</p>
                  <p className="text-xs text-muted-foreground">{hlService.formatUsdValue(positionSize)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Leverage:</p>
                  <p className="font-semibold">{effectiveLeverage.toFixed(1)}x</p>
                  {dailyTarget.fixedLeverageRatio && (
                    <p className="text-xs text-muted-foreground">({dailyTarget.fixedLeverageRatio}% of {maxLeverage}x)</p>
                  )}
                </div>
                <div>
                  <p className="text-muted-foreground">Margin required:</p>
                  <p className="font-semibold">{hlService.formatUsdValue(marginRequired)}</p>
                </div>
              </div>
            </div>
            
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-xs font-medium mb-1">Breakeven Analysis</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">SL BE Price:</p>
                  <p className="font-semibold">{slBePrice.toFixed(4)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Movement to BE:</p>
                  <p className="font-semibold">{beMovementPercentage.toFixed(3)}%</p>
                  <p className="text-xs text-muted-foreground">({(advancedSettings.takerFee * 2).toFixed(2)}% fees)</p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className={`p-3 rounded-lg ${riskPercentage < 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                <p className="text-xs text-muted-foreground">{riskPercentage < 0 ? 'Guaranteed Profit (SL in profit)' : 'Risk (Net with Fees)'}</p>
                <p className={`text-sm font-bold ${riskPercentage < 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {riskPercentage < 0 ? '+' : '-'}{Math.abs(riskPercentage).toFixed(2)}%
                </p>
                <p className={`text-xs ${riskPercentage < 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {riskPercentage < 0 ? '+' : '-'}{hlService.formatUsdValue(Math.abs(netLoss))}
                </p>
                <p className={`text-xs ${riskPercentage < 0 ? 'text-green-600/80' : 'text-red-600/80'}`}>
                  {riskPercentage < 0 
                    ? `Min profit: ${hlService.formatUsdValue(Math.abs(riskDollar))} - Fees: ${hlService.formatUsdValue(feeCost)}`
                    : `Loss: ${hlService.formatUsdValue(riskDollar)} + Fees: ${hlService.formatUsdValue(feeCost)}`}
                </p>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-xs text-muted-foreground">Reward (Net)</p>
                <p className="text-sm font-bold text-green-600">
                  +{rewardPercentage.toFixed(2)}%
                </p>
                <p className="text-xs text-green-600">
                  +{hlService.formatUsdValue(netReward)}
                </p>
                <p className="text-xs text-green-600/80">
                  {!manualSizeInCoins && !dailyTarget.fixedLeverageRatio ? "Target achieved!" : `Profit: ${hlService.formatUsdValue(netReward)}`}
                </p>
              </div>
            </div>
            
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-xs font-medium mb-1">Trade Setup Summary</p>
              <ul className="text-xs space-y-0.5 text-muted-foreground">
                <li>• {coin} {isLong ? "Long" : "Short"} @ {entry}</li>
                <li>• Position: <span className="font-semibold text-foreground">{positionSizeInCoins.toFixed(4)} {coin}</span> ({hlService.formatUsdValue(positionSize)}, {effectiveLeverage.toFixed(1)}x leverage)</li>
                <li>• Target: <span className="font-semibold text-green-600">{takeProfit}</span> (+{rewardPercentage.toFixed(2)}%, {hlService.formatUsdValue(netReward)} net)</li>
                <li>• Stop: <span className={`font-semibold ${riskPercentage < 0 ? 'text-green-600' : 'text-red-600'}`}>{stopLoss}</span> ({riskPercentage < 0 ? '+' : '-'}{Math.abs(riskPercentage).toFixed(2)}%, {riskPercentage < 0 ? `${hlService.formatUsdValue(Math.abs(netLoss))} min profit` : `${hlService.formatUsdValue(netLoss)} total loss`})</li>
                <li>• SL BE: <span className="font-semibold">{slBePrice.toFixed(4)}</span> ({beMovementPercentage.toFixed(3)}% move to breakeven)</li>
                <li>• Fees: <span className="font-semibold">{(advancedSettings.takerFee * 2).toFixed(2)}%</span> ({hlService.formatUsdValue(feeCost)})</li>
                <li>• Effective R:R: <span className="font-semibold">1:{effectiveRR.toFixed(2)}</span> (after fees)</li>
              </ul>
            </div>
            
            {accountRiskPercentage > 2 && riskPercentage > 0 && (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  <strong>⚠️ Warning:</strong> You're risking {accountRiskPercentage.toFixed(2)}% of your account. 
                  Consider reducing position size or tightening stop loss.
                </p>
              </div>
            )}
            
            <Button 
              onClick={handleCopyTrade} 
              className="w-full gap-2"
              variant="secondary"
            >
              <Copy className="w-4 h-4" />
              Copy Trade Setup
            </Button>
          </>
        )}
        
        {isValid && startOfDayPerpsValue === 0 && (
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <p className="text-xs text-amber-800 dark:text-amber-200">
              Waiting for start of day balance to calculate position size...
            </p>
          </div>
        )}
        
        {entryPrice > 0 && slPrice > 0 && tpPrice > 0 && !isValid && (
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <p className="text-xs text-amber-800 dark:text-amber-200">
              Invalid setup: For long trades, TP must be higher than SL. For short trades, TP must be lower than SL.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}