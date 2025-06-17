import type { AdvancedSettings, DailyTarget } from "./types";

// Default values for Advanced Settings
export const DEFAULT_ADVANCED_SETTINGS: AdvancedSettings = {
  takerFee: 0.04,
  makerFee: 0.012,
  streakThreshold: 90,
  lossThreshold: 30,
  preferredTradingTimes: [],
  avoidedTradingTimes: [],
  leverageMap: { "ETH": 25, "BTC": 40, "ADA": 10 },
  defaultLeverage: 10,
  defaultLongCrypto: "ETH",
  defaultShortCrypto: "BTC",
};

// Default values for Daily Target
export const DEFAULT_DAILY_TARGET: DailyTarget = {
  targetPercentage: 10,
  minimumTrades: 2,
  fixedLeverageRatio: 10,
  fixedSLPercentage: 2,
};

// Common localStorage keys
export const STORAGE_KEYS = {
  WALLET_ADDRESS: "hyperliquid-wallet",
  DAILY_TARGET: "dailyTarget",
  ADVANCED_SETTINGS: "advancedSettings",
  BALANCE_DATA: "balance-data",
  DAILY_START_BALANCE: "daily-start-balance",
  ENTRY_CHECKLIST: "trading-entry-checklist",
  EXIT_CHECKLIST: "trading-exit-checklist",
  DEFAULT_COIN: "defaultTradingCoin",
  STREAK_DATA: "streakData",
} as const;

// Popular cryptocurrencies for trading
export const CRYPTO_LIST = [
  "BTC",
  "ETH",
  "SOL",
  "ARB",
  "MATIC",
  "AVAX",
  "BNB",
  "DOGE",
  "ADA",
  "DOT",
  "LINK",
  "UNI",
  "XRP",
  "LTC",
  "ATOM",
  "NEAR",
  "OP",
  "FTM",
  "APT",
  "SEI",
  "SUI",
  "INJ",
  "TIA",
  "BLUR",
  "WLD",
  "ORDI",
  "PEPE",
  "SHIB",
  "FLOKI",
  "BONK",
  "HYPE",
  "kPEPE",
] as const;