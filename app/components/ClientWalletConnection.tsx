import * as React from "react";
import { Web3Provider } from "~/components/Web3Provider";
import { WalletConnector } from "~/components/WalletConnector";

export function ClientWalletConnection() {
  return (
    <Web3Provider>
      <div className="min-h-screen flex items-center justify-center p-4">
        <WalletConnector />
      </div>
    </Web3Provider>
  );
}
