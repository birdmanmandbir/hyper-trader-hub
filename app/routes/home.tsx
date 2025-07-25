import * as React from "react";
import { useLoaderData } from "react-router";
import type { Route } from "./+types/home";
import { BalanceDisplay } from "~/components/balance-display";
import { getSessionUser } from "~/lib/auth.server";
import { getBalanceData } from "~/services/balance.server";
import { getUserSettings } from "~/db/client.server";
import { getDb } from "~/db/client.server";
import { useAutoRefresh } from "~/hooks/useAutoRefresh";
import { useRealtimePnL } from "~/hooks/useRealtimePnL";
import { formatUsdValue, formatPercentage } from "~/lib/formatting";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { AlertCircle } from "lucide-react";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Hyper Trader Hub - Hyperliquid Portfolio Tracker" },
    { name: "description", content: "Track your Hyperliquid perpetual and spot balances, set daily goals, and monitor your trading performance." },
  ];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  // Get user address from session
  const userAddress = await getSessionUser(request, context.cloudflare.env);

  // If no user address, return empty data
  if (!userAddress) {
    return {
      userAddress: null,
      balance: null,
      dailyStartBalance: null,
      timestamp: null,
      settings: null,
    };
  }

  // Get user settings for timezone
  const db = getDb(context.cloudflare.env);
  const settings = await getUserSettings(db, userAddress);
  const timezoneOffset = settings?.timezoneOffset || 0;

  // Get balance data with position analysis and risk metrics
  const { balance, dailyStartBalance, timestamp, positionAnalysis, calculated, riskMetrics } = await getBalanceData(
    context.cloudflare.env,
    userAddress,
    timezoneOffset
  );

  return {
    userAddress,
    balance,
    dailyStartBalance,
    timestamp,
    settings,
    expectedPnL: positionAnalysis,
    calculated,
    riskMetrics,
  };
}


export default function Home() {
  const { userAddress, balance, settings, expectedPnL, calculated, riskMetrics } = useLoaderData<typeof loader>();

  // Show welcome message when not connected
  if (!userAddress) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="text-center py-16">
          <h2 className="text-3xl font-bold mb-4">Welcome to Hyper Trader Hub</h2>
          <p className="text-muted-foreground mb-8">
            Connect your wallet to start tracking your Hyperliquid portfolio and trading performance.
          </p>
          <p className="text-sm text-muted-foreground">
            Use the Connect Wallet button in the top right to get started.
          </p>
        </div>
      </main>
    );
  }
  // Auto-refresh balance data every 30 seconds
  const { secondsUntilRefresh, isRefreshing } = useAutoRefresh(30000);

  // Get realtime P&L
  const { totalPnL: realtimePnL } = useRealtimePnL(balance?.perpetualPositions || []);

  // Calculate realtime total value
  const realtimeTotalValue = React.useMemo(() => {
    if (!balance) return 0;

    const baseValue = parseFloat(balance.accountValue);
    const oldUnrealizedPnL = balance.perpetualPositions.reduce((sum, pos) =>
      sum + parseFloat(pos.unrealizedPnl || "0"), 0
    );

    return baseValue - oldUnrealizedPnL + realtimePnL;
  }, [balance, realtimePnL]);

  // Update document title with realtime values (client-side only)
  React.useEffect(() => {
    if (typeof document === 'undefined') return; // Skip on server

    if (balance) {
      const hasPositions = balance.perpetualPositions && balance.perpetualPositions.length > 0;

      if (hasPositions && realtimePnL !== 0) {
        // Format title with realtime P&L and total value
        const pnlSign = realtimePnL >= 0 ? '+' : '';
        const pnlFormatted = formatUsdValue(realtimePnL, 2).replace('$', '');
        const valueFormatted = formatUsdValue(realtimeTotalValue).replace('$', '');
        
        // Add loss percentage if available
        let extraInfo = '';
        if (riskMetrics && riskMetrics.isInLoss) {
          extraInfo += ` | -${formatPercentage(riskMetrics.lossPercentage * 100, 1)}`;
        }

        document.title = `${pnlSign}$${pnlFormatted} | $${valueFormatted}${extraInfo} - HTH`;
      } else if (realtimeTotalValue > 0) {
        // No positions but has account value
        const valueFormatted = formatUsdValue(realtimeTotalValue).replace('$', '');
        document.title = `$${valueFormatted} - HTH`;
      } else {
        document.title = "Hyper Trader Hub";
      }
    } else {
      document.title = "Hyper Trader Hub";
    }
  }, [balance, realtimePnL, realtimeTotalValue, riskMetrics, calculated]);


  return (
    <main className="container mx-auto px-4 py-8">
      <header className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2">Portfolio Overview</h2>
        <p className="text-muted-foreground">
          Track your Hyperliquid portfolio and trading performance
        </p>
        <div className="mt-2 text-sm text-muted-foreground">
          {isRefreshing ? (
            <span>Refreshing...</span>
          ) : (
            <span>Next refresh in {secondsUntilRefresh}s</span>
          )}
        </div>
      </header>

      {/* Risk Notice - Show when in loss */}
      {riskMetrics && riskMetrics.isInLoss && (
        <div className="w-full max-w-4xl mx-auto mb-6">
          <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              <div className="space-y-1">
                <p className="font-medium">
                  Risk Notice: You have lost {formatPercentage(riskMetrics.lossPercentage * 100)} of your balance
                </p>
                <p className="text-sm">
                  You will need to make {formatPercentage(riskMetrics.recoveryPercentage * 100)} profit to recover to your initial balance
                </p>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}

      <BalanceDisplay
        walletAddress={userAddress}
        balances={balance}
        storedBalance={null}
        isLoading={false}
        onDisconnect={() => { }}
        advancedSettings={settings?.advancedSettings ? JSON.parse(settings.advancedSettings) : undefined}
        expectedPnL={expectedPnL}
        calculated={calculated}
      />

    </main>
  );
}
