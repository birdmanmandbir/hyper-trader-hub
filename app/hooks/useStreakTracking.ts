import { useEffect } from "react";
import { useLocalStorage } from "./useLocalStorage";

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastUpdateDate: string;
  dailyProgress: Record<string, number>; // date -> progress percentage
  dailyMinimum: Record<string, number>; // date -> minimum progress reached during the day
}

interface AdvancedSettings {
  takerFee: number;
  makerFee: number;
  streakThreshold: number;
}

export function useStreakTracking() {
  const [streakData, setStreakData] = useLocalStorage<StreakData>("streakData", {
    currentStreak: 0,
    longestStreak: 0,
    lastUpdateDate: "",
    dailyProgress: {},
    dailyMinimum: {},
  });

  const [advancedSettings] = useLocalStorage<AdvancedSettings>("advancedSettings", {
    takerFee: 0.04,
    makerFee: 0.012,
    streakThreshold: 90,
  });

  const updateDailyProgress = (progressPercentage: number) => {
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format
    
    setStreakData((prev) => {
      const newData = { ...prev };
      newData.dailyProgress[today] = progressPercentage;
      
      // Track minimum progress for the day
      if (newData.dailyMinimum[today] === undefined || progressPercentage < newData.dailyMinimum[today]) {
        newData.dailyMinimum[today] = progressPercentage;
      }

      // Check if we need to update streak
      if (prev.lastUpdateDate !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];

        // Check if yesterday met the threshold (only check final progress)
        const yesterdayProgress = prev.dailyProgress[yesterdayStr] || 0;
        const yesterdaySuccess = yesterdayProgress >= advancedSettings.streakThreshold;
        
        if (prev.lastUpdateDate === yesterdayStr) {
          // Continuing from yesterday
          if (yesterdaySuccess) {
            // Yesterday was successful, increment streak
            newData.currentStreak = prev.currentStreak + 1;
          } else {
            // Yesterday failed, reset streak
            newData.currentStreak = 0;
          }
        } else if (prev.lastUpdateDate) {
          // Gap in tracking, reset streak
          newData.currentStreak = 0;
        } else {
          // First time tracking
          newData.currentStreak = 0;
        }

        newData.lastUpdateDate = today;
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
    const today = new Date().toISOString().split("T")[0];
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
    longestStreak: streakData.longestStreak,
    updateDailyProgress,
    resetStreak,
    getStreakEmoji,
    streakThreshold: advancedSettings.streakThreshold,
    todayStatus: getTodayStatus(),
  };
}