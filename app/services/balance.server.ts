import { getDb, getCurrentBalance, upsertCurrentBalance, getDailyBalance, createDailyBalance } from "~/db/client.server";
import { HyperliquidService, type BalanceInfo } from "~/lib/hyperliquid";
import { getUserDateString, convertUTCToUserTime } from "~/lib/time-utils.server";

export class BalanceService {
  constructor(
    private env: Env,
    private userAddress: string,
    private timezoneOffset: number = 0
  ) {}

  /**
   * Get current balance from D1 cache
   * Returns null if not found or too old (> 60 seconds)
   */
  async getCachedBalance(): Promise<BalanceInfo | null> {
    const db = getDb(this.env);
    const cached = await getCurrentBalance(db, this.userAddress);
    
    if (!cached) return null;
    
    // Check if cache is fresh (less than 60 seconds old)
    const age = Math.floor(Date.now() / 1000) - cached.updatedAt;
    if (age > 60) return null;
    
    try {
      return JSON.parse(cached.balanceData) as BalanceInfo;
    } catch {
      return null;
    }
  }

  /**
   * Fetch fresh balance from Hyperliquid and update D1
   */
  async fetchAndUpdateBalance(): Promise<BalanceInfo> {
    const db = getDb(this.env);
    const hlService = new HyperliquidService();
    
    // Fetch fresh balance
    const balance = await hlService.getUserBalances(this.userAddress);
    
    // Update current balance in D1
    await upsertCurrentBalance(db, this.userAddress, balance);
    
    // Check if we need to initialize daily balance
    await this.ensureDailyBalance(balance);
    
    return balance;
  }

  /**
   * Get balance with cache-first strategy
   */
  async getBalance(): Promise<BalanceInfo> {
    // Try cache first
    const cached = await this.getCachedBalance();
    if (cached) return cached;
    
    // Fetch fresh if cache miss or stale
    return await this.fetchAndUpdateBalance();
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
    
    // Calculate spot value
    const allPrices = await hlService.infoClient.allMids();
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
    const hypePrice = await hlService.getHypePrice();
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