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
  const [defaultCoin, setDefaultCoin] = useLocalStorage<string>(STORAGE_KEYS.DEFAULT_COIN, "ETH");
  
  const [entry, setEntry] = React.useState<string>("");
  const [stopLoss, setStopLoss] = React.useState<string>("");
  const [takeProfit, setTakeProfit] = React.useState<string>("");
  const [tempCoin, setTempCoin] = React.useState(defaultCoin);
  
  const currentPerpsValue = balance?.perpsValue || 0;
  
  // Parse input values
  const entryPrice = parseFloat(entry) || 0;
  const slPrice = parseFloat(stopLoss) || 0;
  const tpPrice = parseFloat(takeProfit) || 0;
  
  // Determine if it's a long or short trade
  const isLong = slPrice < entryPrice;
  
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
  
  // Calculate position size based on target profit and reward percentage
  const positionSize = rewardPercentage > 0 ? targetProfitPerTrade / (rewardPercentage / 100) : 0;
  
  // Calculate fees
  const totalFeePercentage = advancedSettings.takerFee * 2 / 100; // Round trip fees
  const feeCost = positionSize * totalFeePercentage;
  
  // Calculate actual risk and reward in dollars
  const riskDollar = positionSize * (riskPercentage / 100);
  const rewardDollar = positionSize * (rewardPercentage / 100);
  const netReward = rewardDollar - feeCost;
  
  // Calculate effective R:R after fees
  const effectiveRR = riskDollar > 0 ? netReward / riskDollar : 0;
  
  // Get leverage for the specific crypto or use default
  const leverage = advancedSettings.leverageMap[tempCoin] || advancedSettings.defaultLeverage || 10;
  const marginRequired = positionSize / leverage;
  
  // Calculate account risk percentage
  const accountRiskPercentage = startOfDayPerpsValue > 0 ? (riskDollar / startOfDayPerpsValue) * 100 : 0;
  
  const handleCopyTrade = () => {
    if (!entryPrice || !slPrice || !tpPrice) {
      toast.error("Please fill in all fields");
      return;
    }
    
    const emoji = isLong ? "🟢" : "🔴";
    const direction = isLong ? "Long" : "Short";
    const tradeText = `${emoji} ${direction} ${tempCoin} entry ${entry}, SL ${stopLoss}, TP ${takeProfit}`;
    
    navigator.clipboard.writeText(tradeText);
    toast.success("Trade copied to clipboard!", {
      description: tradeText
    });
  };
  
  const handleSaveCoin = () => {
    setDefaultCoin(tempCoin);
    toast.success(`Default coin set to ${tempCoin}`);
  };
  
  const isValid = entryPrice > 0 && slPrice > 0 && tpPrice > 0 && 
    ((isLong && slPrice < entryPrice && tpPrice > entryPrice) || 
     (!isLong && slPrice > entryPrice && tpPrice < entryPrice));

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
          <Input
            placeholder="Coin (e.g., ETH)"
            value={tempCoin}
            onChange={(e) => setTempCoin(e.target.value.toUpperCase())}
            className="font-mono"
          />
          <Button 
            onClick={handleSaveCoin} 
            variant="outline"
            size="sm"
          >
            Set Default
          </Button>
        </div>
        
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-xs text-muted-foreground">Entry Price</label>
            <Input
              type="number"
              placeholder="2511"
              value={entry}
              onChange={(e) => setEntry(e.target.value)}
              step="0.01"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Stop Loss</label>
            <Input
              type="number"
              placeholder="2500"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              step="0.01"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Take Profit</label>
            <Input
              type="number"
              placeholder="2540"
              value={takeProfit}
              onChange={(e) => setTakeProfit(e.target.value)}
              step="0.01"
            />
          </div>
        </div>
        
        {isValid && startOfDayPerpsValue > 0 && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">Direction</p>
                <p className="text-lg font-bold flex items-center gap-1">
                  {isLong ? (
                    <>🟢 Long</>
                  ) : (
                    <>🔴 Short</>
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
              <p className="text-xs font-medium mb-2">Position Sizing (Based on Daily Target)</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Target per trade:</p>
                  <p className="font-semibold">{hlService.formatUsdValue(targetProfitPerTrade)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Position size:</p>
                  <p className="font-semibold text-primary">{hlService.formatUsdValue(positionSize)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Leverage:</p>
                  <p className="font-semibold">{leverage}x</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Margin required:</p>
                  <p className="font-semibold">{hlService.formatUsdValue(marginRequired)}</p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p className="text-xs text-muted-foreground">Risk</p>
                <p className="text-sm font-bold text-red-600">
                  -{riskPercentage.toFixed(2)}%
                </p>
                <p className="text-xs text-red-600">
                  -{hlService.formatUsdValue(riskDollar)}
                </p>
                <p className="text-xs text-red-600/80">
                  {accountRiskPercentage.toFixed(2)}% of account
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
                  Fees: {hlService.formatUsdValue(feeCost)}
                </p>
              </div>
            </div>
            
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-xs font-medium mb-1">Trade Setup Summary</p>
              <ul className="text-xs space-y-0.5 text-muted-foreground">
                <li>• {tempCoin} {isLong ? "Long" : "Short"} @ {entry}</li>
                <li>• Position: <span className="font-semibold text-foreground">{hlService.formatUsdValue(positionSize)}</span> ({leverage}x leverage)</li>
                <li>• Target: <span className="font-semibold text-green-600">{takeProfit}</span> (+{rewardPercentage.toFixed(2)}%, {hlService.formatUsdValue(netReward)} net)</li>
                <li>• Stop: <span className="font-semibold text-red-600">{stopLoss}</span> (-{riskPercentage.toFixed(2)}%, {hlService.formatUsdValue(riskDollar)})</li>
                <li>• Fees: <span className="font-semibold">{(advancedSettings.takerFee * 2).toFixed(2)}%</span> ({hlService.formatUsdValue(feeCost)})</li>
                <li>• Account risk: <span className="font-semibold">{accountRiskPercentage.toFixed(2)}%</span></li>
              </ul>
            </div>
            
            {accountRiskPercentage > 2 && (
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
              Invalid setup: Check that SL and TP are on correct sides of entry
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}