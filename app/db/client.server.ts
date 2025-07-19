import { drizzle } from "drizzle-orm/d1";
import { eq, and, desc } from "drizzle-orm";
import * as schema from "./schema";
import type { BalanceInfo } from "~/lib/hyperliquid";

export function getDb(env: Env) {
  return drizzle(env.DB, { schema });
}

// Type-safe query helpers
export async function getUserSettings(db: ReturnType<typeof getDb>, userAddress: string) {
  const result = await db
    .select()
    .from(schema.userSettings)
    .where(eq(schema.userSettings.userAddress, userAddress))
    .limit(1);
  
  return result[0] || null;
}

export async function getDailyBalance(
  db: ReturnType<typeof getDb>, 
  userAddress: string,
  userDate: string
) {
  const result = await db
    .select()
    .from(schema.dailyBalances)
    .where(
      and(
        eq(schema.dailyBalances.userAddress, userAddress),
        eq(schema.dailyBalances.userDate, userDate)
      )
    )
    .limit(1);
  
  return result[0] || null;
}

export async function getLatestPositionSnapshot(
  db: ReturnType<typeof getDb>,
  userAddress: string
) {
  const result = await db
    .select()
    .from(schema.positionSnapshots)
    .where(eq(schema.positionSnapshots.userAddress, userAddress))
    .orderBy(desc(schema.positionSnapshots.snapshotTime))
    .limit(1);
  
  return result[0] || null;
}

export async function upsertUserSettings(
  db: ReturnType<typeof getDb>,
  settings: schema.NewUserSettings
) {
  return await db
    .insert(schema.userSettings)
    .values(settings)
    .onConflictDoUpdate({
      target: schema.userSettings.userAddress,
      set: {
        ...settings,
        updatedAt: Math.floor(Date.now() / 1000),
      },
    });
}

export async function createDailyBalance(
  db: ReturnType<typeof getDb>,
  balance: schema.NewDailyBalance
) {
  return await db
    .insert(schema.dailyBalances)
    .values(balance)
    .onConflictDoNothing();
}

export async function updateDailyBalance(
  db: ReturnType<typeof getDb>,
  userAddress: string,
  userDate: string,
  updates: Partial<schema.DailyBalance>
) {
  return await db
    .update(schema.dailyBalances)
    .set({
      ...updates,
      updatedAt: Math.floor(Date.now() / 1000),
    })
    .where(
      and(
        eq(schema.dailyBalances.userAddress, userAddress),
        eq(schema.dailyBalances.userDate, userDate)
      )
    );
}

export async function createPositionSnapshot(
  db: ReturnType<typeof getDb>,
  snapshot: schema.NewPositionSnapshot
) {
  return await db
    .insert(schema.positionSnapshots)
    .values(snapshot);
}

export async function logCronExecution(
  db: ReturnType<typeof getDb>,
  jobName: string,
  status: string,
  errorMessage: string | null,
  executionTimeMs: number,
  usersProcessed: number = 0
) {
  return await db
    .insert(schema.cronLogs)
    .values({
      jobName,
      status,
      errorMessage,
      usersProcessed,
      executionTimeMs,
    });
}

// Current balance helpers
export async function getCurrentBalance(
  db: ReturnType<typeof getDb>,
  userAddress: string
): Promise<schema.CurrentBalance | null> {
  const result = await db
    .select()
    .from(schema.currentBalances)
    .where(eq(schema.currentBalances.userAddress, userAddress))
    .limit(1);
  
  return result[0] || null;
}

export async function upsertCurrentBalance(
  db: ReturnType<typeof getDb>,
  userAddress: string,
  balance: BalanceInfo
): Promise<void> {
  const accountValue = parseFloat(balance.accountValue);
  const perpsValue = accountValue; // For perps-only accounts
  
  // Calculate spot value
  const spotValue = balance.spotBalances.reduce((total, bal) => {
    const amount = parseFloat(bal.total);
    if (amount === 0) return total;
    // For USDC, value is 1:1
    if (bal.coin === "USDC") return total + amount;
    // For other coins, would need price data
    return total;
  }, 0);
  
  // Calculate staking value (would need HYPE price)
  const stakingValue = 0; // TODO: Calculate with HYPE price
  
  await db
    .insert(schema.currentBalances)
    .values({
      userAddress,
      balanceData: JSON.stringify(balance),
      accountValue,
      perpsValue,
      spotValue,
      stakingValue,
      updatedAt: Math.floor(Date.now() / 1000),
    })
    .onConflictDoUpdate({
      target: schema.currentBalances.userAddress,
      set: {
        balanceData: JSON.stringify(balance),
        accountValue,
        perpsValue,
        spotValue,
        stakingValue,
        updatedAt: Math.floor(Date.now() / 1000),
      },
    });
}