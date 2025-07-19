import { createConfig, http } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

// Configure wagmi (client-only)
export const config = createConfig({
  chains: [mainnet],
  connectors: [
    injected({
      target() {
        return {
          id: 'metamask',
          name: 'MetaMask',
          provider: window.ethereum,
        };
      },
    }),
    injected({
      target() {
        return {
          id: 'rabby',
          name: 'Rabby Wallet',
          provider: window.rabby,
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