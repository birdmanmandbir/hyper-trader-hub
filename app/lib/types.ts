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
}

export interface DailyTarget {
  targetPercentage: number;
  minimumTrades: number;
  riskRewardRatio: number;
  preferredLeverage: number;
  marginUtilizationRate: number; // percentage of funds to use for perps
}