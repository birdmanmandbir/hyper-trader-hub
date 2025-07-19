import { eq, and } from "drizzle-orm";
import { streakData, dailyBalances, type StreakData, type DailyBalance } from "./schema";
import { getUserDateString } from "~/lib/time-utils.server";
import type { getDb } from "./client.server";

/**
 * Get or create streak data for a user
 */
export async function getOrCreateStreakData(
  db: ReturnType<typeof getDb>,
  userAddress: string,
  userDate: string
): Promise<StreakData> {
  
  // Try to get existing streak data
  const existing = await db
    .select()
    .from(streakData)
    .where(eq(streakData.userAddress, userAddress))
    .get();
  
  if (existing) {
    return existing;
  }
  
  // Create new streak data
  const newStreak = {
    userAddress,
    currentAchievementStreak: 0,
    bestAchievementStreak: 0,
    currentNoLossStreak: 0,
    bestNoLossStreak: 0,
    lastUpdateDate: userDate,
    totalPositiveDays: 0,
    totalNegativeDays: 0,
    totalTargetAchievedDays: 0,
    totalSignificantLossDays: 0,
  };
  
  await db.insert(streakData).values(newStreak);
  
  return newStreak as StreakData;
}

/**
 * Update streak data based on today's performance
 */
export async function updateStreakData(
  db: ReturnType<typeof getDb>,
  userAddress: string,
  dailyBalance: DailyBalance,
  targetAchieved: boolean,
  significantLoss: boolean,
  userDate: string
): Promise<StreakData> {
  
  // Get current streak data
  const currentStreak = await getOrCreateStreakData(db, userAddress, userDate);
  
  // Skip if already updated today
  if (currentStreak.lastUpdateDate === userDate) {
    return currentStreak;
  }
  
  // Calculate new streak values
  let newAchievementStreak = currentStreak.currentAchievementStreak;
  let newNoLossStreak = currentStreak.currentNoLossStreak;
  
  // Update achievement streak
  if (targetAchieved) {
    newAchievementStreak = currentStreak.currentAchievementStreak + 1;
  } else {
    newAchievementStreak = 0; // Reset streak
  }
  
  // Update no loss streak
  if (!significantLoss) {
    newNoLossStreak = currentStreak.currentNoLossStreak + 1;
  } else {
    newNoLossStreak = 0; // Reset streak
  }
  
  // Update best streaks if needed
  const bestAchievementStreak = Math.max(currentStreak.bestAchievementStreak, newAchievementStreak);
  const bestNoLossStreak = Math.max(currentStreak.bestNoLossStreak, newNoLossStreak);
  
  // Update totals
  const totalPositiveDays = currentStreak.totalPositiveDays + (dailyBalance.dailyPnl && dailyBalance.dailyPnl > 0 ? 1 : 0);
  const totalNegativeDays = currentStreak.totalNegativeDays + (dailyBalance.dailyPnl && dailyBalance.dailyPnl < 0 ? 1 : 0);
  const totalTargetAchievedDays = currentStreak.totalTargetAchievedDays + (targetAchieved ? 1 : 0);
  const totalSignificantLossDays = currentStreak.totalSignificantLossDays + (significantLoss ? 1 : 0);
  
  // Update streak data
  await db
    .update(streakData)
    .set({
      currentAchievementStreak: newAchievementStreak,
      bestAchievementStreak,
      currentNoLossStreak: newNoLossStreak,
      bestNoLossStreak,
      lastUpdateDate: userDate,
      totalPositiveDays,
      totalNegativeDays,
      totalTargetAchievedDays,
      totalSignificantLossDays,
      updatedAt: Math.floor(Date.now() / 1000),
    })
    .where(eq(streakData.userAddress, userAddress));
  
  // Return updated data
  return await db
    .select()
    .from(streakData)
    .where(eq(streakData.userAddress, userAddress))
    .get() as StreakData;
}

/**
 * Update daily balance with achievement status
 */
export async function updateDailyBalanceAchievements(
  db: ReturnType<typeof getDb>,
  userAddress: string,
  userDate: string,
  targetAchieved: boolean,
  significantLoss: boolean
): Promise<void> {
  await db
    .update(dailyBalances)
    .set({
      targetAchieved: targetAchieved ? 1 : 0,
      significantLoss: significantLoss ? 1 : 0,
      updatedAt: Math.floor(Date.now() / 1000),
    })
    .where(
      and(
        eq(dailyBalances.userAddress, userAddress),
        eq(dailyBalances.userDate, userDate)
      )
    );
}