import { create } from 'zustand';
import { HyperliquidService } from '~/services/hyperliquid';

interface HyperliquidStore {
  service: HyperliquidService;
}

export const useHyperliquidStore = create<HyperliquidStore>(() => ({
  service: new HyperliquidService(),
}));

export const useHyperliquidService = () => useHyperliquidStore((state) => state.service);