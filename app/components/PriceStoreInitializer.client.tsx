import { useEffect } from 'react';
import { usePriceStore } from '~/stores/priceStore';

export function PriceStoreInitializer() {
  const connect = usePriceStore((state) => state.connect);
  const disconnect = usePriceStore((state) => state.disconnect);

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return null;
}