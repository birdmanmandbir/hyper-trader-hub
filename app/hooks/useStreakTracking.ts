import { useEffect } from "react";
import { useLocalStorage } from "./useLocalStorage";

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastUpdateDate: string;
  dailyProgress: Record<string, number>; // date -> progress percentage
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

      // Check if we need to update streak
      if (prev.lastUpdateDate !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];

        // Check if yesterday met the threshold
        const yesterdayProgress = prev.dailyProgress[yesterdayStr] || 0;
        
        if (prev.lastUpdateDate === yesterdayStr) {
          // Continuing from yesterday
          if (yesterdayProgress >= advancedSettings.streakThreshold) {
            // Yesterday was successful, check today
            if (progressPercentage >= advancedSettings.streakThreshold) {
              newData.currentStreak = prev.currentStreak + 1;
            } else {
              // Today hasn't met threshold yet, keep the streak
              newData.currentStreak = prev.currentStreak;
            }
          } else {
            // Yesterday failed, reset or check today
            if (progressPercentage >= advancedSettings.streakThreshold) {
              newData.currentStreak = 1;
            } else {
              newData.currentStreak = 0;
            }
          }
        } else if (prev.lastUpdateDate) {
          // Gap in tracking, check if today meets threshold
          if (progressPercentage >= advancedSettings.streakThreshold) {
            newData.currentStreak = 1;
          } else {
            newData.currentStreak = 0;
          }
        } else {
          // First time tracking
          if (progressPercentage >= advancedSettings.streakThreshold) {
            newData.currentStreak = 1;
          }
        }

        newData.lastUpdateDate = today;
      } else {
        // Same day update
        if (progressPercentage >= advancedSettings.streakThreshold && prev.currentStreak === 0) {
          newData.currentStreak = 1;
        } else if (progressPercentage < advancedSettings.streakThreshold && prev.currentStreak > 0) {
          // Don't reset streak during the day, only at day boundary
        }
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

  return {
    currentStreak: streakData.currentStreak,
    longestStreak: streakData.longestStreak,
    updateDailyProgress,
    resetStreak,
    getStreakEmoji,
    streakThreshold: advancedSettings.streakThreshold,
  };
}