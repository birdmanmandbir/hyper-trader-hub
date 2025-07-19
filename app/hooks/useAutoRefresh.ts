import { useEffect, useState, useCallback } from "react";
import { useRevalidator } from "react-router";

/**
 * Hook to automatically refresh route data at specified intervals
 * Uses React Router's revalidator to refetch loader data
 * Returns seconds until next refresh
 */
export function useAutoRefresh(intervalMs: number = 30000) {
  const revalidator = useRevalidator();
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(Math.floor(intervalMs / 1000));
  const [lastRefreshTime, setLastRefreshTime] = useState(Date.now());
  
  const refresh = useCallback(() => {
    if (revalidator.state === "idle") {
      console.log("Refreshing data...");
      revalidator.revalidate();
      setLastRefreshTime(Date.now());
      setSecondsUntilRefresh(Math.floor(intervalMs / 1000));
    }
  }, [revalidator, intervalMs]);
  
  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      const elapsed = Date.now() - lastRefreshTime;
      const remaining = Math.max(0, intervalMs - elapsed);
      setSecondsUntilRefresh(Math.ceil(remaining / 1000));
    }, 1000);
    
    return () => clearInterval(timer);
  }, [lastRefreshTime, intervalMs]);
  
  // Auto-refresh interval
  useEffect(() => {
    const interval = setInterval(() => {
      refresh();
    }, intervalMs);
    
    return () => clearInterval(interval);
  }, [intervalMs, refresh]);
  
  // Also revalidate when window regains focus
  useEffect(() => {
    const handleFocus = () => {
      refresh();
    };
    
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [refresh]);
  
  return { secondsUntilRefresh, isRefreshing: revalidator.state === "loading" };
}