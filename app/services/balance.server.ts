import { getDb, getDailyBalance, createDailyBalance } from "~/db/client.server";
import { HyperliquidService, type BalanceInfo } from "~/lib/hyperliquid";
import { getUserDateString } from "~/lib/time-utils.server";

export class BalanceService {
  constructor(
    private env: Env,
    private userAddress: string,
    private timezoneOffset: number = 0
  ) {}

  /**
   * Fetch balance directly from Hyperliquid API
   * No caching - always fresh data
   */
  async getBalance(): Promise<BalanceInfo> {
    const hlService = new HyperliquidService();
    const balance = await hlService.getUserBalances(this.userAddress);
    
    // Ensure daily balance record exists
    await this.ensureDailyBalance(balance);
    
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