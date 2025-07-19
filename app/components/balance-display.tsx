import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { Button } from "~/components/ui/button";
import { HyperliquidService, type BalanceInfo } from "~/lib/hyperliquid";
import { PositionCard } from "~/components/PositionCard";
import { RealtimePnLSummary } from "~/components/RealtimePnLSummary";
import { useLocalStorage } from "~/hooks/useLocalStorage";
import { DEFAULT_ADVANCED_SETTINGS, STORAGE_KEYS } from "~/lib/constants";
import type { AdvancedSettings } from "~/lib/types";

interface StoredBalance {
  accountValue: number;
  spotValue: number;
  stakingValue: number;
  perpsValue: number;
  lastUpdated: number;
  rawData: BalanceInfo;
}

interface BalanceDisplayProps {
  walletAddress: string;
  balances: BalanceInfo | null;
  storedBalance?: StoredBalance | null;
  isLoading: boolean;
  onDisconnect: () => void;
}

export function BalanceDisplay({ walletAddress, balances, storedBalance, isLoading, onDisconnect }: BalanceDisplayProps) {
  const hlService = new HyperliquidService();
  const [advancedSettings] = useLocalStorage<AdvancedSettings>(
    STORAGE_KEYS.ADVANCED_SETTINGS,
    DEFAULT_ADVANCED_SETTINGS
  );

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-4 w-full max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!balances) {
    return null;
  }

  return (
    <div className="space-y-4 w-full max-w-4xl mx-auto">
      {/* Account Overview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Account Overview</CardTitle>
            <CardDescription>
              Wallet: {formatAddress(walletAddress)}
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={onDisconnect}
          >
            Disconnect
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Total Value</p>
              <p className="text-2xl font-bold">
                {storedBalance 
                  ? hlService.formatUsdValue(storedBalance.accountValue)
                  : hlService.formatUsdValue(balances.accountValue)
                }
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Perps Value</p>
              <p className="text-2xl font-bold">
                {storedBalance
                  ? hlService.formatUsdValue(storedBalance.perpsValue)
                  : hlService.formatUsdValue(balances.accountValue)
                }
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Withdrawable</p>
              <p className="text-lg">
                {hlService.formatUsdValue(balances.withdrawable)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Margin Used</p>
              <p className="text-lg">
                {hlService.formatUsdValue(balances.totalMarginUsed)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Perps Leverage & Margin */}
      {balances && (
        <Card>
          <CardHeader>
            <CardTitle>Perps Leverage & Margin</CardTitle>
            <CardDescription>
              Current leverage and margin usage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Current Leverage</p>
                  <p className="text-2xl font-bold">
                    {parseFloat(balances.totalNotionalPosition) > 0 
                      ? `${(parseFloat(balances.totalNotionalPosition) / parseFloat(balances.accountValue)).toFixed(2)}x`
                      : "0.00x"
                    }
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Notional Position</p>
                  <p className="text-2xl font-bold">
                    {hlService.formatUsdValue(balances.totalNotionalPosition)}
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Margin Usage</span>
                  <span className={parseFloat(balances.accountValue) > 0 && parseFloat(balances.totalMarginUsed) / parseFloat(balances.accountValue) > 0.8 ? "text-amber-600 font-semibold" : ""}>
                    {parseFloat(balances.accountValue) > 0 
                      ? `${((parseFloat(balances.totalMarginUsed) / parseFloat(balances.accountValue)) * 100).toFixed(1)}%`
                      : "0.0%"
                    }
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 dark:bg-gray-700">
                  <div 
                    className={`h-3 rounded-full transition-all duration-500 ${
                      parseFloat(balances.accountValue) > 0 && parseFloat(balances.totalMarginUsed) / parseFloat(balances.accountValue) > 0.8 
                        ? 'bg-amber-600' 
                        : parseFloat(balances.accountValue) > 0 && parseFloat(balances.totalMarginUsed) / parseFloat(balances.accountValue) > 0.6 
                        ? 'bg-yellow-600' 
                        : 'bg-green-600'
                    }`}
                    style={{ width: parseFloat(balances.accountValue) > 0 ? `${Math.min((parseFloat(balances.totalMarginUsed) / parseFloat(balances.accountValue)) * 100, 100)}%` : '0%' }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Margin Used: {hlService.formatUsdValue(balances.totalMarginUsed)}</span>
                  <span>Available: {hlService.formatUsdValue(parseFloat(balances.accountValue) - parseFloat(balances.totalMarginUsed))}</span>
                </div>
              </div>

              {parseFloat(balances.accountValue) > 0 && parseFloat(balances.totalMarginUsed) / parseFloat(balances.accountValue) > 0.8 && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    <strong>⚠️ Warning:</strong> High margin usage. Consider reducing position size to avoid liquidation risk.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Perpetual Positions */}
      {balances.perpetualPositions.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>Perpetual Positions</CardTitle>
                <CardDescription>
                  Your open perpetual positions
                </CardDescription>
              </div>
              {/* Real-time Total P&L Summary */}
              <RealtimePnLSummary positions={balances.perpetualPositions} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Calculate total expected profit/loss */}
              {(() => {
                let totalExpectedProfit = 0;
                let totalExpectedLoss = 0;
                let hasTPOrders = false;
                let hasSLOrders = false;

                balances.perpetualPositions.forEach(position => {
                  const isLong = parseFloat(position.szi) > 0;
                  const entry = parseFloat(position.entryPx);
                  const sizeNum = Math.abs(parseFloat(position.szi));
                  const positionValue = entry * sizeNum;
                  
                  if (balances.orders) {
                    const positionOrders = balances.orders.filter(order => order.coin === position.coin);
                    
                    // Calculate TP profit
                    const tpOrders = positionOrders.filter(order => 
                      order.orderType === "Limit" && order.reduceOnly === true
                    );
                    
                    if (tpOrders.length > 0) {
                      hasTPOrders = true;
                      tpOrders.forEach(tpOrder => {
                        const tpPrice = parseFloat(tpOrder.limitPx);
                        const tpSize = parseFloat(tpOrder.sz);
                        const tpProfitPerCoin = isLong ? (tpPrice - entry) : (entry - tpPrice);
                        const tpProfit = tpProfitPerCoin * tpSize;
                        
                        // Calculate fees
                        const entryFeeProportional = (positionValue * (advancedSettings.takerFee / 100)) * (tpSize / sizeNum);
                        const tpExitFee = (tpPrice * tpSize) * (advancedSettings.makerFee / 100);
                        
                        totalExpectedProfit += tpProfit - entryFeeProportional - tpExitFee;
                      });
                    }
                    
                    // Calculate SL loss (if any)
                    const slOrders = positionOrders.filter(order => 
                      order.orderType === "Stop Market"
                    );
                    
                    if (slOrders.length > 0) {
                      hasSLOrders = true;
                      const firstSL = slOrders[0];
                      const slPrice = firstSL.triggerPx ? parseFloat(firstSL.triggerPx) : parseFloat(firstSL.limitPx);
                      const slLossPerCoin = isLong ? (entry - slPrice) : (slPrice - entry);
                      const slLossBeforeFees = slLossPerCoin * sizeNum;
                      
                      // Calculate fees
                      const entryFee = positionValue * (advancedSettings.takerFee / 100);
                      const slExitFee = (slPrice * sizeNum) * (advancedSettings.takerFee / 100);
                      
                      const totalSlLoss = slLossBeforeFees < 0 
                        ? slLossBeforeFees - entryFee - slExitFee  // Profit scenario
                        : slLossBeforeFees + entryFee + slExitFee; // Loss scenario
                      
                      if (totalSlLoss > 0) {
                        totalExpectedLoss += totalSlLoss;
                      } else {
                        // SL is in profit, add to expected profit
                        totalExpectedProfit += Math.abs(totalSlLoss);
                      }
                    }
                  }
                });

                if (hasTPOrders || hasSLOrders) {
                  return (
                    <div className="mb-4 p-3 bg-muted rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Total Expected P&L</span>
                        <div className="flex items-center gap-4">
                          {totalExpectedProfit > 0 && (
                            <div className="text-sm">
                              <span className="text-muted-foreground">Profit: </span>
                              <span className="font-semibold text-green-600">
                                +{hlService.formatUsdValue(totalExpectedProfit)}
                              </span>
                            </div>
                          )}
                          {totalExpectedLoss > 0 && (
                            <div className="text-sm">
                              <span className="text-muted-foreground">Risk: </span>
                              <span className="font-semibold text-red-600">
                                -{hlService.formatUsdValue(totalExpectedLoss)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
              
              {balances.perpetualPositions.map((position, index) => (
                <PositionCard
                  key={index}
                  position={position}
                  orders={balances.orders}
                  takerFee={advancedSettings.takerFee}
                  makerFee={advancedSettings.makerFee}
                  accountValue={balances.accountValue}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Spot Balances */}
      {balances.spotBalances.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Spot Balances</CardTitle>
            <CardDescription>
              Your spot wallet balances
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {balances.spotBalances.map((balance, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <p className="font-semibold">{balance.coin}</p>
                  <div className="text-right">
                    <p className="font-semibold">{balance.total}</p>
                    {parseFloat(balance.hold) > 0 && (
                      <p className="text-sm text-muted-foreground">
                        On hold: {balance.hold}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Staking Balance */}
      {storedBalance && storedBalance.stakingValue > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Staking Balance</CardTitle>
            <CardDescription>
              Your HYPE staking positions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold">
                  {hlService.formatUsdValue(storedBalance.stakingValue)}
                </p>
              </div>
              {balances?.staking && (
                <>
                  <div>
                    <p className="text-sm text-muted-foreground">Staked Amount</p>
                    <p className="text-lg font-semibold">
                      {balances.staking.totalStaked} HYPE
                    </p>
                  </div>
                  {parseFloat(balances.staking.pendingWithdrawals) > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground">Pending Withdrawals</p>
                      <p className="text-lg font-semibold text-orange-600">
                        {balances.staking.pendingWithdrawals} HYPE
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}