import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Flame, ShieldCheck, Trophy, TrendingUp } from "lucide-react";
import type { StreakData } from "~/db/schema";

interface StreakDisplayProps {
  streakData: StreakData | null;
  isTargetAchieved: boolean;
  hasSignificantLoss: boolean;
  unconfirmedAchievementStreak?: number;
  unconfirmedNoLossStreak?: number;
}

export function StreakDisplay({ 
  streakData, 
  isTargetAchieved, 
  hasSignificantLoss,
  unconfirmedAchievementStreak,
  unconfirmedNoLossStreak
}: StreakDisplayProps) {
  if (!streakData) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Trading Streaks</span>
          <Trophy className="w-5 h-5 text-yellow-600" />
        </CardTitle>
        <CardDescription>
          Your consistency in achieving goals
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Achievement Streak */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-600" />
                <span className="font-medium">Target Achievement Streak</span>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 justify-end">
                  <p className="text-2xl font-bold">{streakData.currentAchievementStreak}</p>
                  {unconfirmedAchievementStreak !== undefined && unconfirmedAchievementStreak !== streakData.currentAchievementStreak && (
                    <span className="text-lg text-muted-foreground">
                      → {unconfirmedAchievementStreak}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Best: {streakData.bestAchievementStreak}</p>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
              <div 
                className="h-2 rounded-full bg-gradient-to-r from-orange-500 to-red-600 transition-all duration-500"
                style={{ 
                  width: `${Math.min((streakData.currentAchievementStreak / Math.max(streakData.bestAchievementStreak, 10)) * 100, 100)}%` 
                }}
              />
            </div>
            {isTargetAchieved && (
              <p className="text-sm text-green-600 dark:text-green-400">
                🎯 Target achieved today! Keep the streak going!
              </p>
            )}
          </div>

          {/* No Significant Loss Streak */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <span className="font-medium">No Significant Loss Streak</span>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 justify-end">
                  <p className="text-2xl font-bold">{streakData.currentNoLossStreak}</p>
                  {unconfirmedNoLossStreak !== undefined && unconfirmedNoLossStreak !== streakData.currentNoLossStreak && (
                    <span className="text-lg text-muted-foreground">
                      → {unconfirmedNoLossStreak}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Best: {streakData.bestNoLossStreak}</p>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
              <div 
                className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-600 transition-all duration-500"
                style={{ 
                  width: `${Math.min((streakData.currentNoLossStreak / Math.max(streakData.bestNoLossStreak, 10)) * 100, 100)}%` 
                }}
              />
            </div>
            {hasSignificantLoss && (
              <p className="text-sm text-red-600 dark:text-red-400">
                ⚠️ Significant loss today. Streak will reset tomorrow.
              </p>
            )}
          </div>

          {/* Overall Stats */}
          <div className="grid grid-cols-2 gap-3 pt-3 border-t">
            <div className="text-center p-2 bg-muted rounded-lg">
              <TrendingUp className="w-4 h-4 mx-auto mb-1 text-green-600" />
              <p className="text-sm text-muted-foreground">Total Positive Days</p>
              <p className="font-semibold">{streakData.totalPositiveDays}</p>
            </div>
            <div className="text-center p-2 bg-muted rounded-lg">
              <Trophy className="w-4 h-4 mx-auto mb-1 text-yellow-600" />
              <p className="text-sm text-muted-foreground">Target Achieved Days</p>
              <p className="font-semibold">{streakData.totalTargetAchievedDays}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}