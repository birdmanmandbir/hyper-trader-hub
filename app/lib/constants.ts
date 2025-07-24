import type { AdvancedSettings, DailyTarget } from "./types";
import { getDefaultLeverage } from "./crypto-config";

// Default values for Advanced Settings
export const DEFAULT_ADVANCED_SETTINGS: AdvancedSettings = {
  takerFee: 0.0450,
  makerFee: 0.0150,
  streakThreshold: 90,
  lossThreshold: 30,
  preferredTradingTimes: [],
  avoidedTradingTimes: [],
  leverageMap: { 
    "ETH": getDefaultLeverage("ETH"), 
    "BTC": getDefaultLeverage("BTC"), 
    "SOL": getDefaultLeverage("SOL"),
    "kPEPE": getDefaultLeverage("kPEPE")
  },
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

// Popular cryptocurrencies for trading
import { getCryptoList } from "./crypto-config";

export const CRYPTO_LIST = getCryptoList();