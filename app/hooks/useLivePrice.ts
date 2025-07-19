import * as React from "react";
import * as hl from "@nktkas/hyperliquid";
import { formatPrice } from "~/lib/price-decimals";

interface AllMidsData {
  mids: Record<string, string>;
}

export function useLivePrice(coin: string) {
  const [price, setPrice] = React.useState<string>("");
  const [isConnected, setIsConnected] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  
  React.useEffect(() => {
    if (!coin) return;
    
    let transport: hl.WebSocketTransport | null = null;
    let client: hl.SubscriptionClient | null = null;
    let subscription: { unsubscribe: () => Promise<void> } | null = null;
    
    const connect = async () => {
      try {
        setError(null);
        
        // Create WebSocket transport
        transport = new hl.WebSocketTransport();
        client = new hl.SubscriptionClient({ transport });
        
        // Subscribe to all mid prices
        subscription = await client.allMids((event: AllMidsData) => {
          setIsConnected(true);
          
          // Get the price for the selected coin
          if (event.mids && event.mids[coin]) {
            const midPrice = event.mids[coin];
            // Format price based on value
            const priceNum = parseFloat(midPrice);
            const formattedPrice = formatPrice(priceNum);
            setPrice(formattedPrice);
          }
        });
        
      } catch (err) {
        console.error("WebSocket connection error:", err);
        setError(err instanceof Error ? err.message : "Failed to connect to price feed");
        setIsConnected(false);
      }
    };
    
    connect();
    
    // Cleanup function
    return () => {
      const cleanup = async () => {
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
      };
      
      cleanup();
      setIsConnected(false);
    };
  }, [coin]);
  
  return { price, isConnected, error };
}