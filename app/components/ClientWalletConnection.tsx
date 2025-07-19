import { Web3Provider } from "~/components/Web3Provider.client";
import { WalletConnector } from "~/components/WalletConnector.client";

export function ClientWalletConnection() {
  return (
    <Web3Provider>
      <div className="min-h-screen flex items-center justify-center p-4">
        <WalletConnector />
      </div>
    </Web3Provider>
  );
}