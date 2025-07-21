import React from 'react';
import { ClientOnly } from 'remix-utils/client-only';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccountEffect } from 'wagmi';
import { useFetcher } from 'react-router';
import { Web3Providers } from './Web3Providers';

function WalletConnectionClient() {
  const fetcher = useFetcher();

  // Use wagmi's built-in account effect hook
  useAccountEffect({
    onConnect(data) {
      if (fetcher.state === 'idle') {
        fetcher.submit(
          { action: 'connect', address: data.address },
          { method: 'post', action: '/' }
        );
      }
    },
    onDisconnect() {
      if (fetcher.state === 'idle') {
        fetcher.submit(
          { action: 'disconnect' },
          { method: 'post', action: '/' }
        );
      }
    },
  });

  return (
    <ConnectButton
      showBalance={false}
      chainStatus="none"
      accountStatus="address"
    />
  );
}

// Fallback component for SSR
function WalletConnectionFallback() {
  return (
    <button
      className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium"
      disabled
    >
      Connect Wallet
    </button>
  );
}

// Main component that wraps everything in ClientOnly
export function WalletConnection() {
  return (
    <ClientOnly fallback={<WalletConnectionFallback />}>
      {() => (
        <Web3Providers>
          <WalletConnectionClient />
        </Web3Providers>
      )}
    </ClientOnly>
  );
}
