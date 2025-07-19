import { useEffect } from "react";
import { json, redirect, type LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import type { Route } from "./+types/home";
import { BalanceDisplay } from "~/components/balance-display";
import { getSessionUser, destroySession } from "~/lib/auth.server";
import { getBalanceData } from "~/services/balance.server";
import { getUserSettings } from "~/db/client.server";
import { getDb } from "~/db/client.server";
import { HyperliquidService } from "~/lib/hyperliquid";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Hyper Trader Hub - Hyperliquid Portfolio Tracker" },
    { name: "description", content: "Track your Hyperliquid perpetual and spot balances, set daily goals, and monitor your trading performance." },
  ];
}

export async function loader({ request, context }: LoaderFunctionArgs) {
  // Check if user is authenticated
  const userAddress = await getSessionUser(request, context.env);
  
  if (!userAddress) {
    throw redirect("/connect-wallet");
  }
  
  // Get user settings and balance data
  const db = getDb(context.env);
  const settings = await getUserSettings(db, userAddress);
  const timezoneOffset = settings?.timezoneOffset || 0;
  
  // Get balance data
  const { balance, dailyStartBalance, timestamp } = await getBalanceData(
    context.env,
    userAddress,
    timezoneOffset
  );
  
  return json({
    userAddress,
    balance,
    dailyStartBalance,
    timestamp,
    settings,
  });
}

export async function action({ request }: LoaderFunctionArgs) {
  const formData = await request.formData();
  const action = formData.get("action");
  
  if (action === "disconnect") {
    const headers = await destroySession(request);
    return redirect("/connect-wallet", { headers });
  }
  
  return json({ error: "Invalid action" }, { status: 400 });
}

export default function Home() {
  const { userAddress, balance, settings } = useLoaderData<typeof loader>();
  const hlService = new HyperliquidService();
  
  // Update document title when balance changes
  useEffect(() => {
    if (balance) {
      const hasPositions = balance.perpetualPositions && balance.perpetualPositions.length > 0;
      
      if (hasPositions) {
        // Calculate total P&L
        const totalPnL = balance.perpetualPositions.reduce((sum, pos) => 
          sum + parseFloat(pos.unrealizedPnl || "0"), 0
        );
        
        // Get account value
        const accountValue = parseFloat(balance.accountValue || "0");
        
        // Format title with P&L and account value
        const pnlSign = totalPnL >= 0 ? '+' : '';
        const pnlFormatted = hlService.formatUsdValue(totalPnL, 2).replace('$', '');
        const accountFormatted = hlService.formatUsdValue(accountValue).replace('$', '');
        
        document.title = `${pnlSign}$${pnlFormatted} | $${accountFormatted} - HTH`;
      } else if (parseFloat(balance.accountValue) > 0) {
        // No positions but has account value
        const accountFormatted = hlService.formatUsdValue(balance.accountValue).replace('$', '');
        document.title = `$${accountFormatted} - HTH`;
      } else {
        document.title = "Hyper Trader Hub";
      }
    } else {
      document.title = "Hyper Trader Hub";
    }
  }, [balance]);
  
  const handleDisconnect = () => {
    // Submit form to disconnect
    const form = document.createElement('form');
    form.method = 'POST';
    form.innerHTML = '<input name="action" value="disconnect" />';
    document.body.appendChild(form);
    form.submit();
  };
  
  return (
    <main className="container mx-auto px-4 py-8">
      <header className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2">Portfolio Overview</h2>
        <p className="text-muted-foreground">
          Track your Hyperliquid portfolio and trading performance
        </p>
      </header>
      
      <BalanceDisplay
        walletAddress={userAddress}
        balances={balance}
        storedBalance={null}
        isLoading={false}
        onDisconnect={handleDisconnect}
        advancedSettings={settings?.advancedSettings ? JSON.parse(settings.advancedSettings) : undefined}
      />
    </main>
  );
}