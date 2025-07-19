import * as React from "react";
import * as hl from "@nktkas/hyperliquid";

interface AllMidsData {
  mids: Record<string, string>;
}

interface UseHyperliquidWebSocketOptions {
  enabled?: boolean;
  onPriceUpdate?: (coin: string, price: string) => void;
}

export function useHyperliquidWebSocket({ 
  enabled = true, 
  onPriceUpdate 
}: UseHyperliquidWebSocketOptions = {}) {
  const [isConnected, setIsConnected] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  
  React.useEffect(() => {
    if (!enabled) return;
    
    let transport: hl.WebSocketTransport | null = null;
    let client: hl.SubscriptionClient | null = null;
    let subscription: { unsubscribe: () => Promise<void> } | null = null;
    let isCancelled = false;
    
    const connect = async () => {
      try {
        setError(null);
        
        // Create WebSocket transport
        transport = new hl.WebSocketTransport();
        client = new hl.SubscriptionClient({ transport });
        
        // Check if cancelled before subscribing
        if (isCancelled) {
          transport.close();
          return;
        }
        
        // Subscribe to all mid prices
        subscription = await client.allMids((event: AllMidsData) => {
          // Check if component is still mounted
          if (isCancelled) return;
          
          setIsConnected(true);
          
          // Call the price update handler if provided
          if (onPriceUpdate && event.mids) {
            Object.entries(event.mids).forEach(([coin, price]) => {
              onPriceUpdate(coin, price);
            });
          }
        });
        
      } catch (err) {
        // Only log error if component is still mounted
        if (!isCancelled) {
          console.error("WebSocket connection error:", err);
          setError(err instanceof Error ? err.message : "Failed to connect to price feed");
          setIsConnected(false);
        }
      }
    };
    
    // Small delay to prevent immediate connection on mount
    const timer = setTimeout(() => {
      if (!isCancelled) {
        connect();
      }
    }, 100);
    
    // Cleanup function
    return () => {
      isCancelled = true;
      clearTimeout(timer);
      
      const cleanup = async () => {
        if (subscription) {
          try {
            await subscription.unsubscribe();
          } catch (err) {
            // Ignore errors during cleanup
          }
        }
        if (transport) {
          try {
            transport.close();
          } catch (err) {
            // Ignore errors during cleanup
          }
        }
      };
      
      cleanup();
      setIsConnected(false);
    };
  }, [enabled, onPriceUpdate]);
  
  // Subscribe and unsubscribe functions for specific coins
  // These are no-ops since we subscribe to all mids
  const subscribe = React.useCallback((coins: string[]) => {
    // No-op: we subscribe to all mids
  }, []);
  
  const unsubscribe = React.useCallback((coins: string[]) => {
    // No-op: we subscribe to all mids
  }, []);
  
  return { isConnected, error, subscribe, unsubscribe };
}