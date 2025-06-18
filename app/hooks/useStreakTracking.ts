import { useEffect } from "react";
import { useLocalStorage } from "./useLocalStorage";
import type { AdvancedSettings } from "~/lib/types";
import { DEFAULT_ADVANCED_SETTINGS, STORAGE_KEYS } from "~/lib/constants";

// Type definition for organized streak data
export interface StreakInfo {
  current: number;
  unconfirmed: number;
  longest: number;
  getEmoji: (streak: number) => string;
  threshold: number;
}

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastUpdateDate: string;
  dailyProgress: Record<string, number>; // date -> progress percentage
  dailyMinimum: Record<string, number>; // date -> minimum progress reached during the day
  unconfirmedStreak: number; // potential streak if today ends successfully
  // No significant loss streak tracking
  noLossStreak: number; // current streak of days without significant loss
  longestNoLossStreak: number; // longest streak without significant loss
  unconfirmedNoLossStreak: number; // potential no-loss streak if today ends successfully
}

// Helper function to get local date string in YYYY-MM-DD format
function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function useStreakTracking() {
  const [streakData, setStreakData] = useLocalStorage<StreakData>(STORAGE_KEYS.STREAK_DATA, {
    currentStreak: 0,
    longestStreak: 0,
    lastUpdateDate: "",
    dailyProgress: {},
    dailyMinimum: {},
    unconfirmedStreak: 0,
    noLossStreak: 0,
    longestNoLossStreak: 0,
    unconfirmedNoLossStreak: 0,
  });

  const [advancedSettings] = useLocalStorage<AdvancedSettings>(
    STORAGE_KEYS.ADVANCED_SETTINGS,
    DEFAULT_ADVANCED_SETTINGS
  );

  const updateDailyProgress = (progressPercentage: number) => {
    const today = getLocalDateString(); // YYYY-MM-DD format in local timezone
    
    setStreakData((prev) => {
      const newData = { ...prev };
      newData.dailyProgress[today] = progressPercentage;
      
      // Track minimum progress for the day
      if (newData.dailyMinimum[today] === undefined || progressPercentage < newData.dailyMinimum[today]) {
        newData.dailyMinimum[today] = progressPercentage;
      }

      // Check if we need to update streak (new day)
      if (prev.lastUpdateDate !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = getLocalDateString(yesterday);

        // Check if yesterday met the threshold (only check final progress)
        const yesterdayProgress = prev.dailyProgress[yesterdayStr] || 0;
        const yesterdaySuccess = yesterdayProgress >= advancedSettings.streakThreshold;
        
        // Check if yesterday had no significant loss
        const yesterdayNoSignificantLoss = yesterdayProgress > -(advancedSettings.lossThreshold);
        
        if (prev.lastUpdateDate === yesterdayStr) {
          // Continuing from yesterday
          if (yesterdaySuccess) {
            // Yesterday was successful, confirm the unconfirmed streak
            newData.currentStreak = prev.unconfirmedStreak;
          } else {
            // Yesterday failed, reset streak
            newData.currentStreak = 0;
          }
          
          // Handle no-loss streak
          if (yesterdayNoSignificantLoss) {
            // Yesterday had no significant loss, confirm the unconfirmed no-loss streak
            newData.noLossStreak = prev.unconfirmedNoLossStreak;
          } else {
            // Yesterday had significant loss, reset no-loss streak
            newData.noLossStreak = 0;
          }
        } else if (prev.lastUpdateDate) {
          // Gap in tracking, reset streaks
          newData.currentStreak = 0;
          newData.noLossStreak = 0;
        } else {
          // First time tracking - streaks start at 0
          newData.currentStreak = 0;
          newData.noLossStreak = 0;
        }

        newData.lastUpdateDate = today;
      }

      // Update unconfirmed streak based on today's progress
      const todayProgress = progressPercentage;
      if (todayProgress >= advancedSettings.streakThreshold) {
        // Today is going well, unconfirmed streak would be current + 1
        newData.unconfirmedStreak = newData.currentStreak + 1;
      } else {
        // Today is below threshold, unconfirmed streak stays at current
        newData.unconfirmedStreak = newData.currentStreak;
      }
      
      // Update unconfirmed no-loss streak based on today's progress
      if (todayProgress > -(advancedSettings.lossThreshold)) {
        // Today has no significant loss, unconfirmed no-loss streak would be current + 1
        newData.unconfirmedNoLossStreak = newData.noLossStreak + 1;
      } else {
        // Today has significant loss, unconfirmed no-loss streak stays at current
        newData.unconfirmedNoLossStreak = newData.noLossStreak;
      }

      // Update longest streaks
      if (newData.currentStreak > newData.longestStreak) {
        newData.longestStreak = newData.currentStreak;
      }
      
      if (newData.noLossStreak > newData.longestNoLossStreak) {
        newData.longestNoLossStreak = newData.noLossStreak;
      }

      return newData;
    });
  };

  const resetStreak = () => {
    setStreakData((prev) => ({
      ...prev,
      currentStreak: 0,
      unconfirmedStreak: 0,
      noLossStreak: 0,
      unconfirmedNoLossStreak: 0,
    }));
  };

  const getStreakEmoji = (streak: number) => {
    if (streak === 0) return "🌱";
    if (streak < 3) return "🔥";
    if (streak < 7) return "🔥🔥";
    if (streak < 14) return "🔥🔥🔥";
    if (streak < 30) return "🌟";
    return "🏆";
  };
  
  const getNoLossStreakEmoji = (streak: number) => {
    if (streak === 0) return "🛡️";
    if (streak < 3) return "💪";
    if (streak < 7) return "🛡️💪";
    if (streak < 14) return "🛡️💪💪";
    if (streak < 30) return "⭐";
    return "🎖️";
  };

  const getTodayStatus = () => {
    const today = getLocalDateString();
    const todayMinimum = streakData.dailyMinimum[today];
    const todayProgress = streakData.dailyProgress[today] || 0;
    
    return {
      currentlyAboveThreshold: todayProgress >= advancedSettings.streakThreshold,
      droppedBelowThreshold: todayMinimum !== undefined && todayMinimum < advancedSettings.streakThreshold,
      currentProgress: todayProgress,
      currentlyNoSignificantLoss: todayProgress > -(advancedSettings.lossThreshold),
      hadSignificantLoss: todayMinimum !== undefined && todayMinimum <= -(advancedSettings.lossThreshold)
    };
  };

  // Organize streak data into logical groups
  const achievementStreak: StreakInfo = {
    current: streakData.currentStreak,
    unconfirmed: streakData.unconfirmedStreak,
    longest: streakData.longestStreak,
    getEmoji: getStreakEmoji,
    threshold: advancedSettings.streakThreshold,
  };

  const noLossStreak: StreakInfo = {
    current: streakData.noLossStreak,
    unconfirmed: streakData.unconfirmedNoLossStreak,
    longest: streakData.longestNoLossStreak,
    getEmoji: getNoLossStreakEmoji,
    threshold: advancedSettings.lossThreshold,
  };

  return {
    achievementStreak,
    noLossStreak,
    todayStatus: getTodayStatus(),
    updateDailyProgress,
    resetStreak,
  };
}