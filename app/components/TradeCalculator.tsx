import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Switch } from "~/components/ui/switch";
import { Input } from "~/components/ui/input";
import { CryptoCombobox } from "~/components/CryptoCombobox";
import { HyperliquidService } from "~/lib/hyperliquid";
import { useBalanceUpdater } from "~/hooks/useBalanceUpdater";
import { useLivePrice } from "~/hooks/useLivePrice";
import { Copy, Calculator } from "lucide-react";
import { formatPrice, getPriceDecimals } from "~/lib/price-decimals";
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
  const [selectedCoin, setSelectedCoin] = React.useState<string>("");
  const [isAutoMode, setIsAutoMode] = React.useState(true);
  
  // Manual mode states
  const [manualEntry, setManualEntry] = React.useState("");
  const [manualPositionSize, setManualPositionSize] = React.useState("");
  const [manualTP, setManualTP] = React.useState("");
  const [manualSL, setManualSL] = React.useState("");
  
  const currentPerpsValue = balance?.perpsValue || 0;
  
  // Initialize selected coin based on direction
  React.useEffect(() => {
    const defaultCoin = isLong ? advancedSettings.defaultLongCrypto : advancedSettings.defaultShortCrypto;
    setSelectedCoin(defaultCoin);
  }, [isLong, advancedSettings.defaultLongCrypto, advancedSettings.defaultShortCrypto]);
  
  // Use selected coin or default
  const coin = selectedCoin || (isLong ? advancedSettings.defaultLongCrypto : advancedSettings.defaultShortCrypto);
  
  // Get live price for the selected coin
  const { price: livePrice, isConnected, error: priceError } = useLivePrice(coin);
  
  // Parse entry price based on mode
  const entryPrice = isAutoMode ? (parseFloat(livePrice) || 0) : (parseFloat(manualEntry) || 0);
  
  // Dynamic precision based on entry price
  const pricePrecision = entryPrice >= 1 ? 1 : 5;
  
  // Get leverage for the specific crypto or use default
  const maxLeverage = advancedSettings.leverageMap[coin] || advancedSettings.defaultLeverage || 10;
  
  // Calculate effective leverage using fixed leverage ratio (default 10%)
  const effectiveLeverage = dailyTarget.fixedLeverageRatio 
    ? (maxLeverage * dailyTarget.fixedLeverageRatio / 100)
    : maxLeverage * 0.1; // Default to 10% if not set
  
  // Calculate position size based on mode
  let positionSize = 0;
  let positionSizeInCoins = 0;
  let positionSizeInUSD = 0;
  
  if (isAutoMode) {
    // Auto mode: Calculate based on leverage
    if (startOfDayPerpsValue > 0) {
      // Fixed position size in USD = account value * effective leverage
      positionSizeInUSD = startOfDayPerpsValue * effectiveLeverage;
      
      if (entryPrice > 0) {
        positionSize = positionSizeInUSD;
        positionSizeInCoins = positionSize / entryPrice;
      }
    }
  } else {
    // Manual mode: Use user input
    positionSizeInCoins = parseFloat(manualPositionSize) || 0;
    if (entryPrice > 0 && positionSizeInCoins > 0) {
      positionSizeInUSD = positionSizeInCoins * entryPrice;
      positionSize = positionSizeInUSD;
    }
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
  
  if (isAutoMode) {
    // Auto mode: Calculate based on fixed SL percentage
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
  } else {
    // Manual mode: Use user input
    slPrice = parseFloat(manualSL) || 0;
    if (entryPrice > 0 && slPrice > 0) {
      slPercentageFromEntry = isLong 
        ? ((entryPrice - slPrice) / entryPrice) * 100
        : ((slPrice - entryPrice) / entryPrice) * 100;
    }
  }
  
  // Calculate TP
  let tpPrice = 0;
  let tpPercentageFromEntry = 0;
  
  if (isAutoMode) {
    // Auto mode: Calculate to achieve target profit per trade
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
  } else {
    // Manual mode: Use user input
    tpPrice = parseFloat(manualTP) || 0;
    if (entryPrice > 0 && tpPrice > 0) {
      tpPercentageFromEntry = isLong
        ? ((tpPrice - entryPrice) / entryPrice) * 100
        : ((entryPrice - tpPrice) / entryPrice) * 100;
    }
  }
  
  // Calculate actual risk and reward
  const riskPercentage = Math.abs(slPercentageFromEntry);
  const rewardPercentage = Math.abs(tpPercentageFromEntry);
  
  let riskDollar = 0;
  let rewardDollar = 0;
  
  if (isAutoMode) {
    // Auto mode: Use calculated values
    riskDollar = maxLossAmount;
    rewardDollar = targetProfitPerTrade;
  } else {
    // Manual mode: Calculate based on manual inputs
    if (positionSize > 0) {
      riskDollar = (positionSize * riskPercentage / 100) + feeCost;
      rewardDollar = (positionSize * rewardPercentage / 100) - feeCost;
    }
  }
  
  // Calculate R:R ratio (dynamic based on fixed SL and target)
  const rrRatio = riskDollar > 0 ? rewardDollar / riskDollar : 0;
  
  // Calculate margin required and actual leverage used
  const marginRequired = positionSize / maxLeverage;
  
  // In manual mode, calculate the actual leverage based on position size
  const actualLeverage = isAutoMode 
    ? effectiveLeverage 
    : (currentPerpsValue > 0 ? positionSizeInUSD / currentPerpsValue : 0);
  
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
    
    const priceText = formatPrice(price);
    navigator.clipboard.writeText(priceText);
    toast.success(`${label} copied: ${priceText}`);
  };
  
  const handleCopyPositionSize = () => {
    if (positionSizeInCoins <= 0) {
      toast.error("Position size not calculated yet");
      return;
    }
    
    // Use 4 decimal places for position size to maintain precision
    const positionText = positionSizeInCoins.toFixed(4);
    navigator.clipboard.writeText(positionText);
    toast.success(`Position size copied: ${positionText} ${coin}`);
  };
  
  const handleCopyTrade = () => {
    if (!entryPrice || slPrice <= 0 || tpPrice <= 0) {
      toast.error("Please enter a valid entry price");
      return;
    }
    
    const emoji = isLong ? "🟢" : "🔴";
    const direction = isLong ? "Long" : "Short";
    const entryText = formatPrice(entryPrice);
    const tradeText = `${emoji} ${direction} ${coin} entry ${entryText}, SL ${formatPrice(slPrice)}, TP ${formatPrice(tpPrice)}`;
    
    navigator.clipboard.writeText(tradeText);
    toast.success("Trade copied to clipboard!", {
      description: tradeText
    });
  };
  
  const isValid = isAutoMode 
    ? (entryPrice > 0 && startOfDayPerpsValue > 0)
    : (entryPrice > 0 && positionSizeInCoins > 0 && slPrice > 0 && tpPrice > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="w-5 h-5" />
          Trade Calculator - {isAutoMode ? "Automatic" : "Manual"} Mode
        </CardTitle>
        <CardDescription>
          {isAutoMode 
            ? `Auto-calculates TP for daily target and SL for ${fixedSLPercentage}% account risk`
            : "Manually set position size, TP, SL for swing trades"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mode Switch */}
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div>
            <p className="text-sm font-medium">Mode</p>
            <p className="text-xs text-muted-foreground">
              {isAutoMode ? "Automatic for daily scalping" : "Manual for swing trades"}
            </p>
          </div>
          <Switch
            checked={isAutoMode}
            onCheckedChange={setIsAutoMode}
          />
        </div>
        
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={isLong ? "default" : "outline"}
              onClick={() => setIsLong(true)}
              className="font-semibold"
            >
              🟢 Long
            </Button>
            <Button
              variant={!isLong ? "default" : "outline"}
              onClick={() => setIsLong(false)}
              className="font-semibold"
            >
              🔴 Short
            </Button>
          </div>
          
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Select Crypto</label>
            <CryptoCombobox
              value={coin}
              onValueChange={setSelectedCoin}
              className="w-full"
            />
          </div>
        </div>
        
        <div className="p-3 bg-muted rounded-lg">
          <label className="text-xs text-muted-foreground flex items-center justify-between mb-1">
            <span>Entry Price</span>
            {isAutoMode && isConnected && (
              <span className="text-green-600 flex items-center gap-1">
                <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
                Live
              </span>
            )}
            {isAutoMode && priceError && (
              <span className="text-red-600 text-xs">Price feed error</span>
            )}
          </label>
          {isAutoMode ? (
            livePrice ? (
              <div className="flex items-center justify-between">
                <p className="font-mono font-semibold text-lg">{livePrice}</p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-xs"
                  onClick={() => handleCopyPrice(entryPrice, "Entry price")}
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copy
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Waiting for price feed...</p>
            )
          ) : (
            <Input
              type="number"
              value={manualEntry}
              onChange={(e) => setManualEntry(e.target.value)}
              placeholder={`Enter ${coin} price`}
              className="font-mono"
              step="any"
            />
          )}
        </div>
        
        {/* Manual Mode Input Fields */}
        {!isAutoMode && (
          <div className="space-y-3">
            <div className="p-3 bg-muted rounded-lg">
              <label className="text-xs text-muted-foreground mb-1 block">Position Size ({coin})</label>
              <Input
                type="number"
                value={manualPositionSize}
                onChange={(e) => setManualPositionSize(e.target.value)}
                placeholder={`Enter ${coin} amount`}
                className="font-mono"
                step="any"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 bg-muted rounded-lg">
                <label className="text-xs text-muted-foreground mb-1 block">Stop Loss Price</label>
                <Input
                  type="number"
                  value={manualSL}
                  onChange={(e) => setManualSL(e.target.value)}
                  placeholder="SL price"
                  className="font-mono text-red-600"
                  step="any"
                />
              </div>
              
              <div className="p-3 bg-muted rounded-lg">
                <label className="text-xs text-muted-foreground mb-1 block">Take Profit Price</label>
                <Input
                  type="number"
                  value={manualTP}
                  onChange={(e) => setManualTP(e.target.value)}
                  placeholder="TP price"
                  className="font-mono text-green-600"
                  step="any"
                />
              </div>
            </div>
          </div>
        )}
        
        {/* Show position size even without entry price */}
        {isAutoMode && startOfDayPerpsValue > 0 && !entryPrice && (
          <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
            <p className="text-xs font-medium mb-2">Fixed Position Size</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-muted-foreground">Position size (USD):</p>
                <p className="font-semibold text-primary">{hlService.formatUsdValue(positionSizeInUSD)}</p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-xs mt-1"
                  onClick={() => {
                    const usdText = positionSizeInUSD.toFixed(2);
                    navigator.clipboard.writeText(usdText);
                    toast.success(`Position size (USD) copied: $${usdText}`);
                  }}
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copy USD
                </Button>
              </div>
              <div>
                <p className="text-muted-foreground">Leverage:</p>
                <p className="font-semibold">{effectiveLeverage.toFixed(1)}x</p>
                <p className="text-xs text-muted-foreground">({dailyTarget.fixedLeverageRatio || 10}% of {maxLeverage}x)</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Enter price to calculate {coin} amount</p>
          </div>
        )}
        
        {isValid && (
          <>
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Stop Loss</p>
                <p className="font-mono font-semibold text-red-600">{formatPrice(slPrice)}</p>
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
                <p className="font-mono font-semibold">{formatPrice(entryPrice)}</p>
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
                <p className="font-mono font-semibold text-green-600">{formatPrice(tpPrice)}</p>
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
              <p className="text-xs font-medium mb-2">{isAutoMode ? "Fixed Position Sizing" : "Position Summary"}</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Position size:</p>
                  <p className="font-semibold text-primary">{positionSizeInCoins.toFixed(4)} {coin}</p>
                  <p className="text-xs text-muted-foreground">{hlService.formatUsdValue(positionSize)}</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-xs mt-1"
                    onClick={handleCopyPositionSize}
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copy
                  </Button>
                </div>
                <div>
                  <p className="text-muted-foreground">Leverage:</p>
                  <p className="font-semibold">{actualLeverage.toFixed(1)}x</p>
                  {isAutoMode && (
                    <p className="text-xs text-muted-foreground">({dailyTarget.fixedLeverageRatio || 10}% of {maxLeverage}x)</p>
                  )}
                </div>
                <div>
                  <p className="text-muted-foreground">Margin required:</p>
                  <p className="font-semibold">{hlService.formatUsdValue(marginRequired)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">R:R Ratio:</p>
                  <p className="font-semibold">1:{rrRatio.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">After fees</p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  {isAutoMode ? `Fixed Risk (${fixedSLPercentage}% of Account)` : "Risk"}
                </p>
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
                <p className="text-xs text-muted-foreground">
                  {isAutoMode ? "Target Profit (Per Trade)" : "Profit"}
                </p>
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
                  <p className="font-semibold">{formatPrice(slBePrice)}</p>
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
                <li>• {coin} {isLong ? "Long" : "Short"} @ {formatPrice(entryPrice)}</li>
                <li>• Position: <span className="font-semibold text-foreground">{positionSizeInCoins.toFixed(4)} {coin}</span> ({hlService.formatUsdValue(positionSize)}, {actualLeverage.toFixed(1)}x leverage)</li>
                <li>• Target: <span className="font-semibold text-green-600">{formatPrice(tpPrice)}</span> (+{rewardPercentage.toFixed(2)}%, {hlService.formatUsdValue(rewardDollar)} net)</li>
                <li>• Stop: <span className="font-semibold text-red-600">{formatPrice(slPrice)}</span> (-{riskPercentage.toFixed(2)}%, {hlService.formatUsdValue(riskDollar)} total loss)</li>
                <li>• SL BE: <span className="font-semibold">{formatPrice(slBePrice)}</span> ({beMovementPercentage.toFixed(3)}% move to breakeven)</li>
                <li>• Fees: <span className="font-semibold">{(advancedSettings.takerFee * 2).toFixed(2)}%</span> ({hlService.formatUsdValue(feeCost)})</li>
                <li>• R:R Ratio: <span className="font-semibold">1:{rrRatio.toFixed(2)}</span> {isAutoMode && `(fixed ${fixedSLPercentage}% risk, ${(dailyTarget.targetPercentage / dailyTarget.minimumTrades).toFixed(1)}% target)`}</li>
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