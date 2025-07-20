import { createConfig, http } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

// Configure wagmi with SSR support
export const config = createConfig({
  chains: [mainnet],
  ssr: true, // Enable SSR mode
  connectors: [
    injected({
      target() {
        return {
          id: 'metamask',
          name: 'MetaMask',
          provider: typeof window !== 'undefined' ? window.ethereum : undefined,
        };
      },
    }),
    injected({
      target() {
        return {
          id: 'rabby',
          name: 'Rabby Wallet',
          provider: typeof window !== 'undefined' ? window.rabby : undefined,
        };
      },
    }),
    injected(), // Generic injected connector for other wallets
  ],
  transports: {
    [mainnet.id]: http(),
  },
});

// Extend window type for wallet providers
declare global {
  interface Window {
    ethereum?: any;
    rabby?: any;
  }
}