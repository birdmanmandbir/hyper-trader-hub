import { create } from 'zustand';
import * as hl from "@nktkas/hyperliquid";

interface AllMidsData {
  mids: Record<string, string>;
}

interface PriceStore {
  prices: Record<string, string>;
  isConnected: boolean;
  error: string | null;
  transport: hl.WebSocketTransport | null;
  client: hl.SubscriptionClient | null;
  subscription: { unsubscribe: () => Promise<void> } | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  subscribe: (coins: string[]) => void;
  unsubscribe: (coins: string[]) => void;
}

export const usePriceStore = create<PriceStore>((set, get) => ({
  prices: {},
  isConnected: false,
  error: null,
  transport: null,
  client: null,
  subscription: null,

  connect: async () => {
    const state = get();
    if (state.isConnected || state.transport) return;

    try {
      set({ error: null });

      const transport = new hl.WebSocketTransport();
      const client = new hl.SubscriptionClient({ transport });

      const subscription = await client.allMids((event: AllMidsData) => {
        if (event.mids) {
          set((state) => ({
            prices: { ...state.prices, ...event.mids },
            isConnected: true,
          }));
        }
      });

      set({ transport, client, subscription, isConnected: true });
    } catch (err) {
      console.error("WebSocket connection error:", err);
      set({
        error: err instanceof Error ? err.message : "Failed to connect to price feed",
        isConnected: false,
      });
    }
  },

  disconnect: async () => {
    const { subscription, transport } = get();

    if (subscription) {
      try {
        await subscription.unsubscribe();
      } catch (err) {
        console.error("Error unsubscribing:", err);
      }
    }

    if (transport) {
      try {
        transport.close();
      } catch (err) {
        console.error("Error closing transport:", err);
      }
    }

    set({
      transport: null,
      client: null,
      subscription: null,
      isConnected: false,
    });
  },

  subscribe: (coins: string[]) => {
    // No-op: we subscribe to all mids
  },

  unsubscribe: (coins: string[]) => {
    // No-op: we subscribe to all mids
  },
}));

export const usePrices = () => {
  const prices = usePriceStore((state) => state.prices);
  const subscribe = usePriceStore((state) => state.subscribe);
  const unsubscribe = usePriceStore((state) => state.unsubscribe);
  
  return { prices, subscribe, unsubscribe };
};