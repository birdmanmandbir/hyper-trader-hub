import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { HyperliquidService } from "~/lib/hyperliquid";
import { useBalanceUpdater } from "~/hooks/useBalanceUpdater";
import { Copy, Calculator } from "lucide-react";
import { toast } from "sonner";
import type { DailyTarget, AdvancedSettings } from "~/lib/types";

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
  
  const currentPerpsValue = balance?.perpsValue || 0;
  
  // Get the coin based on direction
  const coin = isLong ? advancedSettings.defaultLongCrypto : advancedSettings.defaultShortCrypto;
  
  // Parse input values
  const entryPrice = parseFloat(entry) || 0;
  
  // Dynamic precision based on entry price
  const pricePrecision = entryPrice >= 1 ? 1 : 3;
  
  // Get leverage for the specific crypto or use default
  const maxLeverage = advancedSettings.leverageMap[coin] || advancedSettings.defaultLeverage || 10;
  
  // Calculate effective leverage using fixed leverage ratio (default 10%)
  const effectiveLeverage = dailyTarget.fixedLeverageRatio 
    ? (maxLeverage * dailyTarget.fixedLeverageRatio / 100)
    : maxLeverage * 0.1; // Default to 10% if not set
  
  // Calculate fixed position size based on leverage
  let positionSize = 0;
  let positionSizeInCoins = 0;
  
  if (startOfDayPerpsValue > 0 && entryPrice > 0) {
    // Fixed position size = account value * effective leverage
    positionSize = startOfDayPerpsValue * effectiveLeverage;
    positionSizeInCoins = positionSize / entryPrice;
  }
  
  // Calculate target profit per trade
  const dailyTargetAmount = startOfDayPerpsValue * (dailyTarget.targetPercentage / 100);
  const targetProfitPerTrade = dailyTarget.minimumTrades > 0 ? dailyTargetAmount / dailyTarget.minimumTrades : 0;
  
  // Calculate fees
  const totalFeePercentage = advancedSettings.takerFee * 2 / 100; // Round trip fees
  const feeCost = positionSize * totalFeePercentage;
  
  // Calculate SL based on fixed SL percentage (default 2%)
  const fixedSLPercentage = dailyTarget.fixedSLPercentage || 2;
  const maxLossAmount = startOfDayPerpsValue * (fixedSLPercentage / 100);
  
  // Calculate SL price
  let slPrice = 0;
  let slPercentageFromEntry = 0;
  
  if (entryPrice > 0 && positionSize > 0) {
    // Max loss includes fees
    const maxLossWithoutFees = maxLossAmount - feeCost;
    slPercentageFromEntry = (maxLossWithoutFees / positionSize) * 100;
    
    if (isLong) {
      slPrice = entryPrice * (1 - slPercentageFromEntry / 100);
    } else {
      slPrice = entryPrice * (1 + slPercentageFromEntry / 100);
    }
  }
  
  // Calculate TP to achieve target profit per trade
  let tpPrice = 0;
  let tpPercentageFromEntry = 0;
  
  if (entryPrice > 0 && positionSize > 0) {
    // Target profit includes fees
    const requiredGrossProfit = targetProfitPerTrade + feeCost;
    tpPercentageFromEntry = (requiredGrossProfit / positionSize) * 100;
    
    if (isLong) {
      tpPrice = entryPrice * (1 + tpPercentageFromEntry / 100);
    } else {
      tpPrice = entryPrice * (1 - tpPercentageFromEntry / 100);
    }
  }
  
  // Calculate actual risk and reward
  const riskPercentage = Math.abs(slPercentageFromEntry);
  const rewardPercentage = Math.abs(tpPercentageFromEntry);
  const riskDollar = maxLossAmount;
  const rewardDollar = targetProfitPerTrade;
  
  // Calculate R:R ratio (dynamic based on fixed SL and target)
  const rrRatio = riskDollar > 0 ? rewardDollar / riskDollar : 0;
  
  // Calculate margin required
  const marginRequired = positionSize / effectiveLeverage;
  
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
  
  const handleCopyPrice = (price: number, label: string) => {
    if (price <= 0) {
      toast.error(`${label} not calculated yet`);
      return;
    }
    
    const priceText = price.toFixed(pricePrecision);
    navigator.clipboard.writeText(priceText);
    toast.success(`${label} copied: ${priceText}`);
  };
  
  const handleCopyTrade = () => {
    if (!entryPrice || slPrice <= 0 || tpPrice <= 0) {
      toast.error("Please enter a valid entry price");
      return;
    }
    
    const emoji = isLong ? "🟢" : "🔴";
    const direction = isLong ? "Long" : "Short";
    const tradeText = `${emoji} ${direction} ${coin} entry ${entry}, SL ${slPrice.toFixed(pricePrecision)}, TP ${tpPrice.toFixed(pricePrecision)}`;
    
    navigator.clipboard.writeText(tradeText);
    toast.success("Trade copied to clipboard!", {
      description: tradeText
    });
  };
  
  const isValid = entryPrice > 0 && startOfDayPerpsValue > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="w-5 h-5" />
          Trade Calculator - Fixed Position & Dynamic R:R
        </CardTitle>
        <CardDescription>
          Auto-calculates TP for daily target and SL for {fixedSLPercentage}% account risk
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
            autoFocus
          />
        </div>
        
        {isValid && (
          <>
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Stop Loss</p>
                <p className="font-mono font-semibold text-red-600">{slPrice.toFixed(pricePrecision)}</p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full mt-1 h-6 text-xs"
                  onClick={() => handleCopyPrice(slPrice, "Stop Loss")}
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copy
                </Button>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Entry</p>
                <p className="font-mono font-semibold">{entryPrice.toFixed(pricePrecision)}</p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full mt-1 h-6 text-xs"
                  onClick={() => handleCopyPrice(entryPrice, "Entry")}
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copy
                </Button>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Take Profit</p>
                <p className="font-mono font-semibold text-green-600">{tpPrice.toFixed(pricePrecision)}</p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full mt-1 h-6 text-xs"
                  onClick={() => handleCopyPrice(tpPrice, "Take Profit")}
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copy
                </Button>
              </div>
            </div>
            
            <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
              <p className="text-xs font-medium mb-2">Fixed Position Sizing</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Position size:</p>
                  <p className="font-semibold text-primary">{positionSizeInCoins.toFixed(4)} {coin}</p>
                  <p className="text-xs text-muted-foreground">{hlService.formatUsdValue(positionSize)}</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-xs mt-1"
                    onClick={() => handleCopyPrice(positionSizeInCoins, "Position size")}
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copy
                  </Button>
                </div>
                <div>
                  <p className="text-muted-foreground">Leverage:</p>
                  <p className="font-semibold">{effectiveLeverage.toFixed(1)}x</p>
                  <p className="text-xs text-muted-foreground">({dailyTarget.fixedLeverageRatio || 10}% of {maxLeverage}x)</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Margin required:</p>
                  <p className="font-semibold">{hlService.formatUsdValue(marginRequired)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Dynamic R:R:</p>
                  <p className="font-semibold">1:{rrRatio.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">After fees</p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p className="text-xs text-muted-foreground">Fixed Risk ({fixedSLPercentage}% of Account)</p>
                <p className="text-sm font-bold text-red-600">
                  -{riskPercentage.toFixed(2)}% move
                </p>
                <p className="text-xs text-red-600">
                  -{hlService.formatUsdValue(riskDollar)}
                </p>
                <p className="text-xs text-red-600/80">
                  Includes {hlService.formatUsdValue(feeCost)} fees
                </p>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-xs text-muted-foreground">Target Profit (Per Trade)</p>
                <p className="text-sm font-bold text-green-600">
                  +{rewardPercentage.toFixed(2)}% move
                </p>
                <p className="text-xs text-green-600">
                  +{hlService.formatUsdValue(rewardDollar)}
                </p>
                <p className="text-xs text-green-600/80">
                  After {hlService.formatUsdValue(feeCost)} fees
                </p>
              </div>
            </div>
            
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-xs font-medium mb-1">Breakeven Analysis</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">SL BE Price:</p>
                  <p className="font-semibold">{slBePrice.toFixed(pricePrecision)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Movement to BE:</p>
                  <p className="font-semibold">{beMovementPercentage.toFixed(3)}%</p>
                  <p className="text-xs text-muted-foreground">({(advancedSettings.takerFee * 2).toFixed(2)}% fees)</p>
                </div>
              </div>
            </div>
            
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-xs font-medium mb-1">Trade Setup Summary</p>
              <ul className="text-xs space-y-0.5 text-muted-foreground">
                <li>• {coin} {isLong ? "Long" : "Short"} @ {entry}</li>
                <li>• Position: <span className="font-semibold text-foreground">{positionSizeInCoins.toFixed(4)} {coin}</span> ({hlService.formatUsdValue(positionSize)}, {effectiveLeverage.toFixed(1)}x leverage)</li>
                <li>• Target: <span className="font-semibold text-green-600">{tpPrice.toFixed(pricePrecision)}</span> (+{rewardPercentage.toFixed(2)}%, {hlService.formatUsdValue(targetProfitPerTrade)} net)</li>
                <li>• Stop: <span className="font-semibold text-red-600">{slPrice.toFixed(pricePrecision)}</span> (-{riskPercentage.toFixed(2)}%, {hlService.formatUsdValue(riskDollar)} total loss)</li>
                <li>• SL BE: <span className="font-semibold">{slBePrice.toFixed(pricePrecision)}</span> ({beMovementPercentage.toFixed(3)}% move to breakeven)</li>
                <li>• Fees: <span className="font-semibold">{(advancedSettings.takerFee * 2).toFixed(2)}%</span> ({hlService.formatUsdValue(feeCost)})</li>
                <li>• Dynamic R:R: <span className="font-semibold">1:{rrRatio.toFixed(2)}</span> (fixed {fixedSLPercentage}% risk, {(dailyTarget.targetPercentage / dailyTarget.minimumTrades).toFixed(1)}% target)</li>
              </ul>
            </div>
            
            <Button 
              onClick={handleCopyTrade} 
              className="w-full gap-2"
              variant="secondary"
            >
              <Copy className="w-4 h-4" />
              Copy Complete Trade Setup
            </Button>
          </>
        )}
        
        {entryPrice > 0 && startOfDayPerpsValue === 0 && (
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <p className="text-xs text-amber-800 dark:text-amber-200">
              Waiting for start of day balance to calculate position size...
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}