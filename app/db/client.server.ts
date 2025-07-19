import { drizzle } from "drizzle-orm/d1";
import { eq, and, desc, gt } from "drizzle-orm";
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

// User session helpers
export async function createUserSession(
  db: ReturnType<typeof getDb>,
  userAddress: string
): Promise<string> {
  const sessionId = crypto.randomUUID();
  const expiresAt = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60); // 30 days
  
  await db
    .insert(schema.userSessions)
    .values({
      id: sessionId,
      userAddress,
      expiresAt,
    });
  
  return sessionId;
}

export async function getUserSession(
  db: ReturnType<typeof getDb>,
  sessionId: string
): Promise<schema.UserSession | null> {
  const result = await db
    .select()
    .from(schema.userSessions)
    .where(
      and(
        eq(schema.userSessions.id, sessionId),
        gt(schema.userSessions.expiresAt, Math.floor(Date.now() / 1000))
      )
    )
    .limit(1);
  
  return result[0] || null;
}

// User checklist helpers
export async function getUserChecklists(
  db: ReturnType<typeof getDb>,
  userAddress: string
): Promise<{ entry: any[], exit: any[] }> {
  const result = await db
    .select()
    .from(schema.userChecklists)
    .where(eq(schema.userChecklists.userAddress, userAddress));
  
  const checklists = { entry: [], exit: [] };
  
  for (const row of result) {
    try {
      checklists[row.checklistType as 'entry' | 'exit'] = JSON.parse(row.items);
    } catch {
      // Invalid JSON, use empty array
    }
  }
  
  return checklists;
}

export async function upsertUserChecklist(
  db: ReturnType<typeof getDb>,
  userAddress: string,
  checklistType: 'entry' | 'exit',
  items: any[]
): Promise<void> {
  await db
    .insert(schema.userChecklists)
    .values({
      userAddress,
      checklistType,
      items: JSON.stringify(items),
    })
    .onConflictDoUpdate({
      target: [schema.userChecklists.userAddress, schema.userChecklists.checklistType],
      set: {
        items: JSON.stringify(items),
        updatedAt: Math.floor(Date.now() / 1000),
      },
    });
}