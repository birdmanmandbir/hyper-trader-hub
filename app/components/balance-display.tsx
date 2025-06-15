import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { Button } from "~/components/ui/button";
import { HyperliquidService, type BalanceInfo } from "~/lib/hyperliquid";

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
            <CardTitle>Perpetual Positions</CardTitle>
            <CardDescription>
              Your open perpetual positions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {balances.perpetualPositions.map((position, index) => (
                <div key={index} className="p-3 bg-muted rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold">{position.coin}</p>
                      <p className="text-sm text-muted-foreground">
                        Size: {position.szi} @ {hlService.formatUsdValue(position.entryPx)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${parseFloat(position.unrealizedPnl) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {hlService.formatUsdValue(position.unrealizedPnl)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        ROE: {(parseFloat(position.returnOnEquity) * 100).toFixed(2)}%
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-4">
                      <span className="text-muted-foreground">
                        Margin: <span className="font-medium text-foreground">{hlService.formatUsdValue(position.marginUsed)}</span>
                      </span>
                      <span className="text-muted-foreground">
                        Leverage: <span className="font-medium text-foreground">{position.leverage.toFixed(2)}x ({position.leverageType})</span>
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {parseFloat(balances.accountValue) > 0 && (
                        <span>
                          {((parseFloat(position.marginUsed) / parseFloat(balances.accountValue)) * 100).toFixed(1)}% of account
                        </span>
                      )}
                    </div>
                  </div>
                </div>
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