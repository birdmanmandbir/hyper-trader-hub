import { getDb, getDailyBalance, createDailyBalance, getUserSettings } from "~/db/client.server";
import { HyperliquidService, type BalanceInfo } from "~/lib/hyperliquid";
import { getUserDateString } from "~/lib/time-utils.server";
import { getCachedData, getUserCacheKey } from "~/services/cache.server";
import { coalesceRequests } from "~/services/request-coalescing.server";
import { calculatePositionAnalysis, type PositionAnalysisResult } from "~/services/position-analysis.server";
import { DEFAULT_ADVANCED_SETTINGS } from "~/lib/constants";
import type { AdvancedSettings } from "~/lib/types";

export class BalanceService {
  constructor(
    private env: Env,
    private userAddress: string,
    private timezoneOffset: number = 0
  ) {}

  /**
   * Fetch balance with caching and request coalescing
   * Cache for 30 seconds to avoid repeated API calls during navigation
   */
  async getBalance(): Promise<BalanceInfo> {
    const cacheKey = getUserCacheKey(this.userAddress, 'balance');
    const coalescingKey = `balance:${this.userAddress}`;
    
    const balance = await coalesceRequests(
      coalescingKey,
      () => getCachedData(
        cacheKey,
        async () => {
          const hlService = new HyperliquidService();
          return await hlService.getUserBalances(this.userAddress);
        },
        { ttl: 30 } // Cache for 30 seconds
      )
    );
    
    // Ensure daily balance record exists in the background
    // Don't await this since it's not critical for displaying data
    this.ensureDailyBalance(balance).catch(err => {
      console.error('Failed to ensure daily balance:', err);
    });
    
    return balance;
  }

  /**
   * Get today's starting balance
   */
  async getDailyStartBalance(): Promise<number> {
    const db = getDb(this.env);
    const now = new Date();
    const userDate = getUserDateString(now, this.timezoneOffset);
    
    const dailyBalance = await getDailyBalance(db, this.userAddress, userDate);
    return dailyBalance?.startBalance || 0;
  }

  /**
   * Ensure daily balance record exists for today
   */
  private async ensureDailyBalance(balance: BalanceInfo): Promise<void> {
    const db = getDb(this.env);
    const now = new Date();
    const utcDate = now.toISOString().split('T')[0];
    const userDate = getUserDateString(now, this.timezoneOffset);
    
    // Check if daily balance already exists
    const existing = await getDailyBalance(db, this.userAddress, userDate);
    if (existing) return;
    
    // Create new daily balance record
    const accountValue = parseFloat(balance.accountValue);
    
    await createDailyBalance(db, {
      userAddress: this.userAddress,
      date: utcDate,
      userDate: userDate,
      startBalance: accountValue,
      accountValue,
      perpsValue: accountValue,
      spotValue: 0, // Not tracking spot anymore
      stakingValue: 0, // Not tracking staking anymore
    });
  }
}

/**
 * Calculate risk metrics for positions in loss
 */
export function calculateRiskMetrics(balance: BalanceInfo) {
  if (!balance || balance.perpetualPositions.length === 0) {
    return null;
  }

  // Calculate total unrealized P&L from all positions
  const totalUnrealizedPnL = balance.perpetualPositions.reduce((sum, pos) => 
    sum + parseFloat(pos.unrealizedPnl || "0"), 0
  );
  
  // Current account value already includes unrealized P&L
  const currentAccountValue = parseFloat(balance.accountValue);
  
  // Initial balance (before unrealized P&L) = current value - unrealized P&L
  // This is the balance you would have if you closed all positions at entry price
  const initialBalance = currentAccountValue - totalUnrealizedPnL;
  
  if (totalUnrealizedPnL < 0) {
    // Loss percentage = |loss| / initial balance
    const lossPercentage = Math.abs(totalUnrealizedPnL) / initialBalance;
    
    // Recovery percentage = |loss| / current balance
    const recoveryPercentage = Math.abs(totalUnrealizedPnL) / currentAccountValue;
    
    return {
      isInLoss: true,
      unrealizedPnL: totalUnrealizedPnL,
      lossPercentage,
      recoveryPercentage,
      currentValue: currentAccountValue,
      initialValue: initialBalance
    };
  }
  
  return null;
}

/**
 * Loader helper to get balance data with position analysis
 */
export async function getBalanceData(
  env: Env,
  userAddress: string,
  timezoneOffset: number = 0
) {
  const service = new BalanceService(env, userAddress, timezoneOffset);
  const db = getDb(env);
  
  // Fetch balance, daily start balance, and user settings in parallel
  const [balance, dailyStartBalance, settings] = await Promise.all([
    service.getBalance(),
    service.getDailyStartBalance(),
    getUserSettings(db, userAddress)
  ]);
  
  // Calculate position analysis if there are positions
  let positionAnalysis: PositionAnalysisResult | null = null;
  if (balance.perpetualPositions.length > 0) {
    const advancedSettings: AdvancedSettings = settings?.advancedSettings 
      ? JSON.parse(settings.advancedSettings) 
      : DEFAULT_ADVANCED_SETTINGS;
    
    positionAnalysis = calculatePositionAnalysis(
      balance.perpetualPositions,
      balance.orders,
      advancedSettings
    );
  }
  
  // Calculate additional fields
  const accountValue = parseFloat(balance.accountValue);
  const notionalPosition = parseFloat(balance.totalNotionalPosition);
  const marginUsed = parseFloat(balance.totalMarginUsed);
  
  const leverage = accountValue > 0 ? notionalPosition / accountValue : 0;
  const marginUsagePercent = accountValue > 0 ? (marginUsed / accountValue) * 100 : 0;
  
  // Calculate risk metrics
  const riskMetrics = calculateRiskMetrics(balance);
  
  return {
    balance,
    dailyStartBalance,
    timestamp: Date.now(),
    positionAnalysis,
    calculated: {
      leverage,
      leverageFormatted: `${leverage.toFixed(2)}x`,
      marginUsagePercent,
      marginUsageFormatted: `${marginUsagePercent.toFixed(1)}%`,
      hasPositions: balance.perpetualPositions.length > 0
    },
    riskMetrics
  };
}