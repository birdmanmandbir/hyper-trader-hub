import { getDb, getDailyBalance, createDailyBalance } from "~/db/client.server";
import { HyperliquidService, type BalanceInfo } from "~/lib/hyperliquid";
import { getUserDateString } from "~/lib/time-utils.server";
import { getCachedData, getUserCacheKey } from "~/services/cache.server";
import { coalesceRequests } from "~/services/request-coalescing.server";

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
    const hlService = new HyperliquidService();
    
    // Parallelize price fetching (no caching - prices should be real-time)
    const [allPrices, hypePrice] = await Promise.all([
      hlService.infoClient.allMids(),
      hlService.getHypePrice()
    ]);
    
    // Calculate spot value
    const spotValue = balance.spotBalances.reduce((total, bal) => {
      const amount = parseFloat(bal.total);
      if (amount === 0) return total;
      
      if (bal.coin === "USDC") {
        return total + amount;
      }
      
      const price = allPrices[bal.coin];
      if (price) {
        return total + amount * parseFloat(price);
      }
      
      return total;
    }, 0);
    
    // Calculate staking value
    const stakingValue = balance.staking 
      ? (parseFloat(balance.staking.totalStaked) + parseFloat(balance.staking.pendingWithdrawals)) * hypePrice 
      : 0;
    
    await createDailyBalance(db, {
      userAddress: this.userAddress,
      date: utcDate,
      userDate: userDate,
      startBalance: accountValue,
      accountValue,
      perpsValue: accountValue,
      spotValue,
      stakingValue,
    });
  }
}

/**
 * Loader helper to get balance data
 */
export async function getBalanceData(
  env: Env,
  userAddress: string,
  timezoneOffset: number = 0
) {
  const service = new BalanceService(env, userAddress, timezoneOffset);
  
  const [balance, dailyStartBalance] = await Promise.all([
    service.getBalance(),
    service.getDailyStartBalance()
  ]);
  
  return {
    balance,
    dailyStartBalance,
    timestamp: Date.now()
  };
}