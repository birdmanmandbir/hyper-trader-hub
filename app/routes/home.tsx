import { useState, useEffect } from "react";
import type { Route } from "./+types/home";
import { WalletSetup } from "~/components/wallet-setup";
import { BalanceDisplay } from "~/components/balance-display";
import { useLocalStorage } from "~/hooks/useLocalStorage";
import { useBalanceUpdater } from "~/hooks/useBalanceUpdater";
import { HyperliquidService, type BalanceInfo } from "~/lib/hyperliquid";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Hyper Trader Hub - Hyperliquid Portfolio Tracker" },
    { name: "description", content: "Track your Hyperliquid perpetual and spot balances, set daily goals, and monitor your trading performance." },
  ];
}

export default function Home() {
  const [walletAddress, setWalletAddress] = useLocalStorage<string | null>("hyperliquid-wallet", null);
  const [error, setError] = useState<string | null>(null);
  const { balance, nextUpdateIn, isUpdating, updateNow } = useBalanceUpdater(walletAddress);
  const hlService = new HyperliquidService();

  // Update document title when balance changes
  useEffect(() => {
    if (balance?.rawData) {
      const hasPositions = balance.rawData.perpetualPositions && balance.rawData.perpetualPositions.length > 0;
      
      if (hasPositions) {
        // Calculate total P&L
        const totalPnL = balance.rawData.perpetualPositions.reduce((sum, pos) => 
          sum + parseFloat(pos.unrealizedPnl || "0"), 0
        );
        
        // Get account value
        const accountValue = parseFloat(balance.rawData.accountValue || "0");
        
        // Format title with P&L and account value
        const pnlSign = totalPnL >= 0 ? '+' : '';
        const pnlFormatted = hlService.formatUsdValue(totalPnL).replace('$', '');
        const accountFormatted = hlService.formatUsdValue(accountValue).replace('$', '');
        
        document.title = `${pnlSign}$${pnlFormatted} | $${accountFormatted} - HTH`;
      } else if (balance.accountValue > 0) {
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

  const handleWalletSubmit = async (address: string) => {
    setWalletAddress(address);
    // Balance will be fetched automatically by the hook
  };

  const handleDisconnect = () => {
    setWalletAddress(null);
    setError(null);
    // Clear balance-related data from localStorage
    localStorage.removeItem("balance-data");
    localStorage.removeItem("daily-start-balance");
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <header className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2">Portfolio Overview</h2>
        <p className="text-muted-foreground">
          Track your Hyperliquid portfolio and trading performance
        </p>
      </header>

        {!walletAddress ? (
          <WalletSetup 
            onWalletSubmit={handleWalletSubmit} 
            isLoading={false}
            error={error}
          />
        ) : (
          <BalanceDisplay
            walletAddress={walletAddress}
            balances={balance?.rawData || null}
            storedBalance={balance}
            isLoading={!balance && !error}
            onDisconnect={handleDisconnect}
          />
        )}
    </main>
  );
}