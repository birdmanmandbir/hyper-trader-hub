import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import type { TimePeriod } from "~/lib/types";

interface TradingTimeBarProps {
  preferredTimes: TimePeriod[];
  avoidedTimes: TimePeriod[];
}

export function TradingTimeBar({ preferredTimes, avoidedTimes }: TradingTimeBarProps) {
  // Initialize with null to avoid hydration mismatch
  const [currentTime, setCurrentTime] = React.useState<Date | null>(null);

  React.useEffect(() => {
    // Set initial time after mount
    setCurrentTime(new Date());
    
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const getCurrentMinutes = (): number => {
    if (!currentTime) return 0;
    return currentTime.getHours() * 60 + currentTime.getMinutes();
  };

  const formatTime = (date: Date | null): string => {
    if (!date) return '--:--';
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const isInPeriod = (current: number, period: TimePeriod): boolean => {
    const start = timeToMinutes(period.start);
    const end = timeToMinutes(period.end);
    
    if (start <= end) {
      return current >= start && current <= end;
    } else {
      // Handle periods that cross midnight
      return current >= start || current <= end;
    }
  };

  const currentMinutes = getCurrentMinutes();
  const currentPositionPercent = (currentMinutes / (24 * 60)) * 100;

  // Check current trading status
  const inPreferredTime = preferredTimes.some(period => isInPeriod(currentMinutes, period));
  const inAvoidedTime = avoidedTimes.some(period => isInPeriod(currentMinutes, period));

  const getTimeStatus = () => {
    if (inAvoidedTime) return { text: "Avoid Trading", color: "text-red-600 dark:text-red-400", emoji: "🚫" };
    if (inPreferredTime) return { text: "Optimal Trading Time", color: "text-green-600 dark:text-green-400", emoji: "✅" };
    return { text: "Neutral Time", color: "text-gray-600 dark:text-gray-400", emoji: "⏰" };
  };

  const timeStatus = getTimeStatus();

  const renderTimePeriod = (period: TimePeriod, type: 'preferred' | 'avoided') => {
    const start = timeToMinutes(period.start);
    const end = timeToMinutes(period.end);
    const totalMinutes = 24 * 60;
    
    let width, left;
    
    if (start <= end) {
      width = ((end - start) / totalMinutes) * 100;
      left = (start / totalMinutes) * 100;
    } else {
      // Period crosses midnight - render two segments
      return (
        <>
          <div
            key={`${period.start}-${period.end}-1`}
            className={`absolute h-full ${type === 'preferred' ? 'bg-green-500/30' : 'bg-red-500/30'}`}
            style={{
              left: `${(start / totalMinutes) * 100}%`,
              width: `${((totalMinutes - start) / totalMinutes) * 100}%`
            }}
            title={`${period.label || ''} ${period.start} - ${period.end}`}
          />
          <div
            key={`${period.start}-${period.end}-2`}
            className={`absolute h-full ${type === 'preferred' ? 'bg-green-500/30' : 'bg-red-500/30'}`}
            style={{
              left: '0%',
              width: `${(end / totalMinutes) * 100}%`
            }}
            title={`${period.label || ''} ${period.start} - ${period.end}`}
          />
        </>
      );
    }
    
    return (
      <div
        key={`${period.start}-${period.end}`}
        className={`absolute h-full ${type === 'preferred' ? 'bg-green-500/30' : 'bg-red-500/30'}`}
        style={{
          left: `${left}%`,
          width: `${width}%`
        }}
        title={`${period.label || ''} ${period.start} - ${period.end}`}
      />
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="text-lg">Trading Time Indicator</span>
          <span className={`text-sm font-medium ${timeStatus.color}`}>
            {timeStatus.emoji} {timeStatus.text}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Current Time Display */}
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Current Time</span>
            <span className="font-semibold">{currentTime ? formatTime(currentTime) : '--:--'}</span>
          </div>

          {/* Time Bar */}
          <div className="relative">
            <div className="relative h-12 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
              {/* Render avoided times first (bottom layer) */}
              {avoidedTimes.map((period) => renderTimePeriod(period, 'avoided'))}
              
              {/* Render preferred times (top layer) */}
              {preferredTimes.map((period) => renderTimePeriod(period, 'preferred'))}

              {/* Current time indicator */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-blue-600 dark:bg-blue-400 z-10"
                style={{ left: `${currentPositionPercent}%` }}
              >
                <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full" />
                <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full" />
              </div>
            </div>

            {/* Hour markers */}
            <div className="flex justify-between mt-1 text-xs text-muted-foreground">
              <span>00:00</span>
              <span>06:00</span>
              <span>12:00</span>
              <span>18:00</span>
              <span>24:00</span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex gap-4 justify-center text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500/30 rounded" />
              <span>Preferred</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-500/30 rounded" />
              <span>Avoid</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-600 rounded-full" />
              <span>Now</span>
            </div>
          </div>

          {/* Active Periods List */}
          {(preferredTimes.length > 0 || avoidedTimes.length > 0) && (
            <div className="pt-3 border-t space-y-2">
              {preferredTimes.map((period, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="text-green-600 dark:text-green-400">
                    ✅ {period.label || 'Preferred'}: {period.start} - {period.end}
                  </span>
                  {isInPeriod(currentMinutes, period) && (
                    <span className="text-xs bg-green-100 dark:bg-green-900/40 px-2 py-0.5 rounded">Active</span>
                  )}
                </div>
              ))}
              {avoidedTimes.map((period, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="text-red-600 dark:text-red-400">
                    🚫 {period.label || 'Avoid'}: {period.start} - {period.end}
                  </span>
                  {isInPeriod(currentMinutes, period) && (
                    <span className="text-xs bg-red-100 dark:bg-red-900/40 px-2 py-0.5 rounded">Active</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}