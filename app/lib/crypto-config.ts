export interface CryptoConfig {
  symbol: string;
  defaultLeverage: number;
  displayName?: string;
}

export const CRYPTO_CONFIG: CryptoConfig[] = [
  { symbol: "BTC", defaultLeverage: 40 },
  { symbol: "ETH", defaultLeverage: 25 },
  { symbol: "SOL", defaultLeverage: 15 },
  { symbol: "DOGE", defaultLeverage: 10 },
  { symbol: "AVAX", defaultLeverage: 10 },
  { symbol: "APT", defaultLeverage: 10 },
  { symbol: "MATIC", defaultLeverage: 10 },
  { symbol: "ARB", defaultLeverage: 10 },
  { symbol: "OP", defaultLeverage: 10 },
  { symbol: "INJ", defaultLeverage: 10 },
  { symbol: "SUI", defaultLeverage: 10 },
  { symbol: "JTO", defaultLeverage: 10 },
  { symbol: "SEI", defaultLeverage: 10 },
  { symbol: "FTM", defaultLeverage: 10 },
  { symbol: "LINK", defaultLeverage: 10 },
  { symbol: "NEAR", defaultLeverage: 10 },
  { symbol: "TAO", defaultLeverage: 10 },
  { symbol: "RNDR", defaultLeverage: 10 },
  { symbol: "DOT", defaultLeverage: 10 },
  { symbol: "ICP", defaultLeverage: 10 },
  { symbol: "IMX", defaultLeverage: 10 },
  { symbol: "ADA", defaultLeverage: 10 },
  { symbol: "FIL", defaultLeverage: 10 },
  { symbol: "ATOM", defaultLeverage: 10 },
  { symbol: "WIF", defaultLeverage: 8 },
  { symbol: "ORDI", defaultLeverage: 8 },
  { symbol: "PEPE", defaultLeverage: 5 },
  { symbol: "SHIB", defaultLeverage: 5 },
  { symbol: "FLOKI", defaultLeverage: 5 },
  { symbol: "BONK", defaultLeverage: 5 },
  { symbol: "HYPE", defaultLeverage: 8 },
  { symbol: "kPEPE", defaultLeverage: 0.5, displayName: "kPEPE" },
];

// Helper function to get crypto list
export const getCryptoList = (): string[] => {
  return CRYPTO_CONFIG.map(crypto => crypto.symbol);
};

// Helper function to get default leverage for a crypto
export const getDefaultLeverage = (symbol: string): number => {
  const crypto = CRYPTO_CONFIG.find(c => c.symbol === symbol);
  return crypto?.defaultLeverage || 10;
};

// Helper function to get display name (useful for special cases like kPEPE)
export const getCryptoDisplayName = (symbol: string): string => {
  const crypto = CRYPTO_CONFIG.find(c => c.symbol === symbol);
  return crypto?.displayName || symbol;
};