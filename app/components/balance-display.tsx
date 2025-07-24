import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { Button } from "~/components/ui/button";
import { type BalanceInfo } from "~/lib/hyperliquid";
import { PositionCard } from "~/components/PositionCard";
import { RealtimePnLSummary } from "~/components/RealtimePnLSummary";
import { RealtimeTotalValue } from "~/components/RealtimeTotalValue";
import { DEFAULT_ADVANCED_SETTINGS } from "~/lib/constants";
import type { AdvancedSettings } from "~/lib/types";
import type { PositionAnalysisResult } from "~/services/position-analysis.server";
import { formatUsdValue, formatAddress } from "~/lib/formatting";

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
  advancedSettings?: AdvancedSettings;
  expectedPnL?: PositionAnalysisResult | null;
  calculated?: {
    leverage: number;
    leverageFormatted: string;
    marginUsagePercent: number;
    marginUsageFormatted: string;
    hasPositions: boolean;
  };
}

export const BalanceDisplay = React.memo(function BalanceDisplay({ walletAddress, balances, storedBalance, isLoading, onDisconnect, advancedSettings, expectedPnL, calculated }: BalanceDisplayProps) {
  const settings = advancedSettings || DEFAULT_ADVANCED_SETTINGS;

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
              <RealtimeTotalValue 
                baseAccountValue={balances.accountValue}
                positions={balances.perpetualPositions}
              />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Withdrawable</p>
              <p className="text-lg">
                {formatUsdValue(balances.withdrawable)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Margin Used</p>
              <p className="text-lg">
                {formatUsdValue(balances.totalMarginUsed)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Notional Position</p>
              <p className="text-lg">
                {formatUsdValue(balances.totalNotionalPosition)}
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
                    {calculated?.leverageFormatted || "0.00x"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Notional Position</p>
                  <p className="text-2xl font-bold">
                    {formatUsdValue(balances.totalNotionalPosition)}
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Margin Usage</span>
                  <span className={calculated && calculated.marginUsagePercent > 80 ? "text-amber-600 font-semibold" : ""}>
                    {calculated?.marginUsageFormatted || "0.0%"}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 dark:bg-gray-700">
                  <div 
                    className={`h-3 rounded-full transition-all duration-500 ${
                      calculated && calculated.marginUsagePercent > 80 
                        ? 'bg-amber-600' 
                        : calculated && calculated.marginUsagePercent > 60 
                        ? 'bg-yellow-600' 
                        : 'bg-green-600'
                    }`}
                    style={{ width: `${Math.min(calculated?.marginUsagePercent || 0, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Margin Used: {formatUsdValue(balances.totalMarginUsed)}</span>
                  <span>Available: {formatUsdValue(parseFloat(balances.accountValue) - parseFloat(balances.totalMarginUsed))}</span>
                </div>
              </div>

              {calculated && calculated.marginUsagePercent > 80 && (
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
              {/* Display server-calculated expected P&L */}
              {expectedPnL && (expectedPnL.totalExpectedProfit > 0 || expectedPnL.totalExpectedLoss > 0) && (
                <div className="mb-4 p-3 bg-muted rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Total Expected P&L</span>
                    <div className="flex items-center gap-4">
                      {expectedPnL.totalExpectedProfit > 0 && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Profit: </span>
                          <span className="font-semibold text-green-600">
                            +{formatUsdValue(expectedPnL.totalExpectedProfit, 2)}
                          </span>
                        </div>
                      )}
                      {expectedPnL.totalExpectedLoss > 0 && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Risk: </span>
                          <span className="font-semibold text-red-600">
                            -{formatUsdValue(expectedPnL.totalExpectedLoss, 2)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Position cards */}
              {balances.perpetualPositions.map((position, index) => {
                const analysis = expectedPnL?.positionAnalysis?.find(
                  a => a.coin === position.coin
                );
                return (
                  <PositionCard
                    key={index}
                    position={position}
                    orders={balances.orders}
                    takerFee={settings.takerFee}
                    makerFee={settings.makerFee}
                    accountValue={balances.accountValue}
                    analysis={analysis}
                  />
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
});