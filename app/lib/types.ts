// Shared types used across the application

export interface TimePeriod {
  start: string; // HH:MM format
  end: string; // HH:MM format
  label?: string; // Optional label like "NY Open"
}

export interface AdvancedSettings {
  takerFee: number; // in percentage, e.g., 0.04
  makerFee: number; // in percentage, e.g., 0.02
  streakThreshold: number; // in percentage, e.g., 90
  lossThreshold: number; // in percentage, e.g., 30 (negative percentage of daily target)
  preferredTradingTimes: TimePeriod[]; // Best times to trade
  avoidedTradingTimes: TimePeriod[]; // Times to avoid trading
  leverageMap: Record<string, number>; // Per-crypto leverage settings, e.g., { "ETH": 25, "BTC": 40 }
  defaultLeverage: number; // Default leverage for cryptos not in the map
}

export interface DailyTarget {
  targetPercentage: number;
  minimumTrades: number;
}