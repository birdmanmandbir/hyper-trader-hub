import { useEffect } from "react";
import { useLocalStorage } from "./useLocalStorage";
import type { AdvancedSettings } from "~/lib/types";

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastUpdateDate: string;
  dailyProgress: Record<string, number>; // date -> progress percentage
  dailyMinimum: Record<string, number>; // date -> minimum progress reached during the day
  unconfirmedStreak: number; // potential streak if today ends successfully
}

// Helper function to get local date string in YYYY-MM-DD format
function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function useStreakTracking() {
  const [streakData, setStreakData] = useLocalStorage<StreakData>("streakData", {
    currentStreak: 0,
    longestStreak: 0,
    lastUpdateDate: "",
    dailyProgress: {},
    dailyMinimum: {},
    unconfirmedStreak: 0,
  });

  const [advancedSettings] = useLocalStorage<AdvancedSettings>("advancedSettings", {
    takerFee: 0.04,
    makerFee: 0.012,
    streakThreshold: 90,
    lossThreshold: 30,
    preferredTradingTimes: [],
    avoidedTradingTimes: [],
  });

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
        
        if (prev.lastUpdateDate === yesterdayStr) {
          // Continuing from yesterday
          if (yesterdaySuccess) {
            // Yesterday was successful, confirm the unconfirmed streak
            newData.currentStreak = prev.unconfirmedStreak;
          } else {
            // Yesterday failed, reset streak
            newData.currentStreak = 0;
          }
        } else if (prev.lastUpdateDate) {
          // Gap in tracking, reset streak
          newData.currentStreak = 0;
        } else {
          // First time tracking - streak starts at 0
          newData.currentStreak = 0;
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

      // Update longest streak
      if (newData.currentStreak > newData.longestStreak) {
        newData.longestStreak = newData.currentStreak;
      }

      return newData;
    });
  };

  const resetStreak = () => {
    setStreakData((prev) => ({
      ...prev,
      currentStreak: 0,
      unconfirmedStreak: 0,
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

  const getTodayStatus = () => {
    const today = getLocalDateString();
    const todayMinimum = streakData.dailyMinimum[today];
    const todayProgress = streakData.dailyProgress[today] || 0;
    
    return {
      currentlyAboveThreshold: todayProgress >= advancedSettings.streakThreshold,
      droppedBelowThreshold: todayMinimum !== undefined && todayMinimum < advancedSettings.streakThreshold,
      currentProgress: todayProgress
    };
  };

  return {
    currentStreak: streakData.currentStreak,
    unconfirmedStreak: streakData.unconfirmedStreak,
    longestStreak: streakData.longestStreak,
    updateDailyProgress,
    resetStreak,
    getStreakEmoji,
    streakThreshold: advancedSettings.streakThreshold,
    todayStatus: getTodayStatus(),
  };
}