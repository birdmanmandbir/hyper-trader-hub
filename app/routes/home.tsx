import * as React from "react";
import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import type { Route } from "./+types/home";
import { BalanceDisplay } from "~/components/balance-display";
import { getSessionUser } from "~/lib/auth.server";
import { getBalanceData } from "~/services/balance.server";
import { getUserSettings } from "~/db/client.server";
import { getDb } from "~/db/client.server";
import { useHyperliquidService } from "~/stores/hyperliquidStore";
import { useAutoRefresh } from "~/hooks/useAutoRefresh";
import { useRealtimePnL } from "~/hooks/useRealtimePnL";
import { calculateExpectedPnL } from "~/services/expected-pnl.server";
import { DEFAULT_ADVANCED_SETTINGS } from "~/lib/constants";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Hyper Trader Hub - Hyperliquid Portfolio Tracker" },
    { name: "description", content: "Track your Hyperliquid perpetual and spot balances, set daily goals, and monitor your trading performance." },
  ];
}

export async function loader({ request, context }: LoaderFunctionArgs) {
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
  
  // Get user settings and balance data
  const db = getDb(context.cloudflare.env);

  // Get settings
  const settings = await getUserSettings(db, userAddress);
  const timezoneOffset = settings?.timezoneOffset || 0;

  // Get balance data
  const { balance, dailyStartBalance, timestamp } = await getBalanceData(
    context.cloudflare.env,
    userAddress,
    timezoneOffset
  );

  // Calculate expected P&L on server side
  let expectedPnL = null;
  if (balance && balance.perpetualPositions.length > 0) {
    const advancedSettings = settings?.advancedSettings 
      ? JSON.parse(settings.advancedSettings) 
      : DEFAULT_ADVANCED_SETTINGS;
    
    expectedPnL = calculateExpectedPnL(
      balance.perpetualPositions,
      balance.orders,
      advancedSettings
    );
  }

  return {
    userAddress,
    balance,
    dailyStartBalance,
    timestamp,
    settings,
    expectedPnL,
  };
}


export default function Home() {
  const { userAddress, balance, settings, expectedPnL } = useLoaderData<typeof loader>();
  
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
  const hlService = useHyperliquidService();

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
        const pnlFormatted = hlService.formatUsdValue(realtimePnL, 2).replace('$', '');
        const valueFormatted = hlService.formatUsdValue(realtimeTotalValue).replace('$', '');

        document.title = `${pnlSign}$${pnlFormatted} | $${valueFormatted} - HTH`;
      } else if (realtimeTotalValue > 0) {
        // No positions but has account value
        const valueFormatted = hlService.formatUsdValue(realtimeTotalValue).replace('$', '');
        document.title = `$${valueFormatted} - HTH`;
      } else {
        document.title = "Hyper Trader Hub";
      }
    } else {
      document.title = "Hyper Trader Hub";
    }
  }, [balance, realtimePnL, realtimeTotalValue]);


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

      <BalanceDisplay
        walletAddress={userAddress}
        balances={balance}
        storedBalance={null}
        isLoading={false}
        onDisconnect={() => {}}
        advancedSettings={settings?.advancedSettings ? JSON.parse(settings.advancedSettings) : undefined}
        expectedPnL={expectedPnL}
      />

    </main>
  );
}
