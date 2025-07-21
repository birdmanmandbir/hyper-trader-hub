import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { arbitrum, base, mainnet, optimism, polygon } from 'wagmi/chains';
import { cookieStorage, createStorage } from 'wagmi';

export const config = getDefaultConfig({
  appName: 'TraderHub',
  projectId: 'c517873f18d28be9920ec039b1b3b601',
  chains: [mainnet, polygon, optimism, arbitrum, base],
  ssr: true,
  storage: createStorage({
    storage: cookieStorage,
  }),
});