import * as hl from "@nktkas/hyperliquid";

export interface StakingInfo {
  totalStaked: string;
  pendingWithdrawals: string;
}

export interface Order {
  coin: string;
  oid: string;
  side: string;
  limitPx: string;
  sz: string;
  origSz: string;
  orderType: string;
  timestamp: number;
  reduceOnly: boolean;
  cloid?: string;
  triggerPx?: string;
  tpsl?: string;
  children?: any[];
  isTrigger?: boolean;
  isPositionTpsl?: boolean;
  triggerCondition?: string;
}

export interface BalanceInfo {
  accountValue: string;
  withdrawable: string;
  totalMarginUsed: string;
  totalNotionalPosition: string;
  spotBalances: Array<{
    coin: string;
    total: string;
    hold: string;
  }>;
  perpetualPositions: Array<{
    coin: string;
    szi: string;
    entryPx: string;
    positionValue: string;
    unrealizedPnl: string;
    returnOnEquity: string;
    marginUsed: string;
    leverage: number;
    leverageType: string;
  }>;
  staking?: StakingInfo;
  orders?: Order[];
}

export class HyperliquidService {
  public infoClient: hl.InfoClient;

  constructor() {
    const transport = new hl.HttpTransport();
    this.infoClient = new hl.InfoClient({ transport });
  }

  async getUserBalances(userAddress: string): Promise<BalanceInfo> {
    try {
      // Validate address format
      if (!userAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
        throw new Error("Invalid Ethereum address format");
      }

      // Fetch both perps and spot state in parallel
      const [perpsState, spotState] = await Promise.all([
        this.infoClient.clearinghouseState({ 
          user: userAddress as `0x${string}`
        }),
        this.infoClient.spotClearinghouseState({ 
          user: userAddress as `0x${string}`
        })
      ]);

      // Extract balance information
      const marginSummary = perpsState.marginSummary;

      // Format positions
      const perpetualPositions = perpsState.assetPositions
        .filter((pos) => pos.position.szi !== "0")
        .map((pos) => ({
          coin: pos.position.coin,
          szi: pos.position.szi,
          entryPx: pos.position.entryPx || "0",
          positionValue: pos.position.positionValue || "0",
          unrealizedPnl: pos.position.unrealizedPnl || "0",
          returnOnEquity: pos.position.returnOnEquity || "0",
          marginUsed: pos.position.marginUsed || "0",
          leverage: pos.position.leverage?.value || 0,
          leverageType: pos.position.leverage?.type || "cross",
        }));

      // Format spot balances
      const spotBalances = spotState.balances
        .filter((bal) => parseFloat(bal.total) > 0)
        .map((bal) => ({
          coin: bal.coin,
          total: bal.total,
          hold: bal.hold,
        }));

      // Fetch staking information
      let staking: StakingInfo | undefined;
      try {
        const [delegations, delegatorSummary] = await Promise.all([
          this.infoClient.delegations({ 
            user: userAddress as `0x${string}` 
          }),
          this.infoClient.delegatorSummary({ 
            user: userAddress as `0x${string}` 
          })
        ]);

        const totalStaked = delegatorSummary.delegated || "0";
        const pendingWithdrawals = delegatorSummary.totalPendingWithdrawal || "0";

        staking = {
          totalStaked,
          pendingWithdrawals
        };
      } catch (stakingError) {
        console.warn("Error fetching staking data:", stakingError);
        // Continue without staking data if it fails
      }

      // Fetch open orders using frontendOpenOrders for more details
      let orders: Order[] = [];
      try {
        const frontendOrders = await this.infoClient.frontendOpenOrders({ 
          user: userAddress as `0x${string}` 
        });
        
        orders = frontendOrders.map((order: any) => ({
          coin: order.coin,
          oid: order.oid,
          side: order.side,
          limitPx: order.limitPx,
          sz: order.sz,
          origSz: order.origSz,
          orderType: order.orderType,
          timestamp: order.timestamp,
          reduceOnly: order.reduceOnly || false,
          cloid: order.cloid,
          triggerPx: order.triggerPx,
          tpsl: order.tpsl,
          children: order.children,
          isTrigger: order.isTrigger,
          isPositionTpsl: order.isPositionTpsl,
          triggerCondition: order.triggerCondition,
        }));
        
      } catch (orderError) {
        console.warn("Error fetching orders:", orderError);
        // Continue without orders if it fails
      }

      return {
        accountValue: marginSummary.accountValue,
        withdrawable: perpsState.withdrawable,
        totalMarginUsed: marginSummary.totalMarginUsed,
        totalNotionalPosition: marginSummary.totalNtlPos,
        spotBalances,
        perpetualPositions,
        staking,
        orders,
      };
    } catch (error) {
      console.error("Error fetching user balances:", error);
      throw error;
    }
  }

  formatUsdValue(value: string | number): string {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  }

  async getHypePrice(): Promise<number> {
    try {
      const mids = await this.infoClient.allMids();
      const hypePrice = mids.HYPE;
      return hypePrice ? parseFloat(hypePrice) : 0;
    } catch (error) {
      console.warn("Error fetching HYPE price:", error);
      return 0;
    }
  }
}