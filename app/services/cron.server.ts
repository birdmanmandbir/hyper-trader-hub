import { getDb } from "~/db/client.server";
import { dailyBalances, userSettings, cronLogs, streakData } from "~/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { getUserDateString } from "~/lib/time-utils.server";
import { HyperliquidService } from "~/lib/hyperliquid";
import { updateStreakData, updateDailyBalanceAchievements } from "~/db/streak.server";
import type { AdvancedSettings, DailyTarget } from "~/lib/types";
import { DEFAULT_ADVANCED_SETTINGS, DEFAULT_DAILY_TARGET } from "~/lib/constants";

export async function handleCronTrigger(cron: string, env: Env, ctx: ExecutionContext) {
  const db = getDb(env);
  
  // Log cron execution start
  await db.insert(cronLogs).values({
    jobName: getCronType(cron),
    status: "started",
    executionTimeMs: 0,
    usersProcessed: 0,
  });

  try {
    switch (cron) {
      case "0 0 * * *": // Daily reset at 00:00 UTC
        await dailyReset(db, env);
        break;
      case "*/30 * * * *": // Position snapshots every 30 minutes
        await capturePositionSnapshots(db, env);
        break;
      case "0 3 * * SUN": // Weekly cleanup
        await cleanupOldData(db, env);
        break;
      default:
        console.warn(`Unknown cron trigger: ${cron}`);
    }

    // Log successful completion
    await db.insert(cronLogs).values({
      jobName: getCronType(cron),
      status: "completed",
      executionTimeMs: Date.now(),
      usersProcessed: 0,
    });
  } catch (error) {
    // Log error
    await db.insert(cronLogs).values({
      jobName: getCronType(cron),
      status: "failed",
      executionTimeMs: Date.now(),
      errorMessage: error instanceof Error ? error.message : String(error),
      usersProcessed: 0,
    });
    throw error;
  }
}

function getCronType(cron: string): string {
  switch (cron) {
    case "0 0 * * *":
      return "daily_reset";
    case "*/30 * * * *":
      return "position_snapshot";
    case "0 3 * * SUN":
      return "weekly_cleanup";
    default:
      return "unknown";
  }
}

async function dailyReset(db: ReturnType<typeof getDb>, env: Env) {
  console.log("Starting daily reset...");
  
  // Get all users who have had activity in the last 7 days
  const activeUsers = await db
    .select({ userAddress: dailyBalances.userAddress })
    .from(dailyBalances)
    .where(sql`${dailyBalances.createdAt} > ${Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60}`)
    .groupBy(dailyBalances.userAddress);

  console.log(`Processing ${activeUsers.length} active users...`);

  const hlService = new HyperliquidService();

  for (const { userAddress } of activeUsers) {
    try {
      // Get user's timezone offset
      const userSetting = await db
        .select()
        .from(userSettings)
        .where(eq(userSettings.userAddress, userAddress))
        .get();
      
      const timezoneOffset = userSetting?.timezoneOffset || 0;
      const yesterdayDate = getUserDateString(new Date(Date.now() - 24 * 60 * 60 * 1000), timezoneOffset);
      const todayDate = getUserDateString(new Date(), timezoneOffset);

      // Get current balance from Hyperliquid
      const balance = await hlService.getUserBalances(userAddress);
      const currentAccountValue = parseFloat(balance.accountValue);

      // Get yesterday's balance entry
      const yesterdayBalance = await db
        .select()
        .from(dailyBalances)
        .where(
          and(
            eq(dailyBalances.userAddress, userAddress),
            eq(dailyBalances.userDate, yesterdayDate)
          )
        )
        .get();

      if (yesterdayBalance) {
        // Calculate yesterday's final P&L
        const startBalance = yesterdayBalance.startBalance;
        const dailyPnl = currentAccountValue - startBalance;
        const dailyPnlPercentage = startBalance > 0 ? (dailyPnl / startBalance) * 100 : 0;

        // Update yesterday's end balance
        await db
          .update(dailyBalances)
          .set({
            endBalance: currentAccountValue,
            dailyPnl,
            dailyPnlPercentage,
            updatedAt: Math.floor(Date.now() / 1000),
          })
          .where(
            and(
              eq(dailyBalances.userAddress, userAddress),
              eq(dailyBalances.userDate, yesterdayDate)
            )
          );

        // Get user's settings for streak calculation
        const settings = userSetting?.advancedSettings ? JSON.parse(userSetting.advancedSettings) as AdvancedSettings : null;
        const target = userSetting?.dailyTarget ? JSON.parse(userSetting.dailyTarget) as DailyTarget : null;
        
        const dailyTarget = target || DEFAULT_DAILY_TARGET;
        const advancedSettings = settings || DEFAULT_ADVANCED_SETTINGS;

        // Check if target was achieved
        const targetAchieved = dailyPnlPercentage >= dailyTarget.targetPercentage;
        
        // Check if significant loss occurred (based on loss threshold)
        const significantLoss = dailyPnlPercentage < -(dailyTarget.targetPercentage * (advancedSettings.lossThreshold / 100));

        // Update achievement status
        await updateDailyBalanceAchievements(
          db,
          userAddress,
          yesterdayDate,
          targetAchieved,
          significantLoss
        );

        // Update streak data
        await updateStreakData(
          db,
          userAddress,
          yesterdayBalance,
          targetAchieved,
          significantLoss,
          todayDate
        );
      }

      // Create today's starting balance entry
      const todayBalance = await db
        .select()
        .from(dailyBalances)
        .where(
          and(
            eq(dailyBalances.userAddress, userAddress),
            eq(dailyBalances.userDate, todayDate)
          )
        )
        .get();

      if (!todayBalance) {
        const utcDate = new Date().toISOString().split('T')[0];
        
        // For perps-only focus, account value equals perps value
        const perpsValue = currentAccountValue;
        const spotValue = 0; // Not tracking spot anymore
        const stakingValue = 0; // Not tracking staking anymore
        
        await db.insert(dailyBalances).values({
          userAddress,
          date: utcDate,
          userDate: todayDate,
          startBalance: currentAccountValue,
          endBalance: currentAccountValue,
          accountValue: currentAccountValue,
          perpsValue: perpsValue,
          spotValue: spotValue,
          stakingValue: stakingValue,
          dailyPnl: 0,
          dailyPnlPercentage: 0,
          targetAchieved: 0,
          significantLoss: 0,
        });
      }

      console.log(`Processed daily reset for user ${userAddress}`);
    } catch (error) {
      console.error(`Error processing daily reset for user ${userAddress}:`, error);
      // Continue with next user
    }
  }

  console.log("Daily reset completed");
}

async function capturePositionSnapshots(db: ReturnType<typeof getDb>, env: Env) {
  // Implementation for position snapshots
  console.log("Capturing position snapshots...");
  // This would capture current positions for active traders
  // Not implementing now as it's not critical for streak functionality
}

async function cleanupOldData(db: ReturnType<typeof getDb>, env: Env) {
  console.log("Starting weekly cleanup...");
  
  const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;
  
  // Delete old cron logs
  await db
    .delete(cronLogs)
    .where(sql`${cronLogs.createdAt} < ${thirtyDaysAgo}`);
  
  console.log("Weekly cleanup completed");
}