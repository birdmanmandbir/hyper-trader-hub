import { useState, useEffect, useCallback } from "react";
import { useLocalStorage } from "./useLocalStorage";
import { HyperliquidService, type BalanceInfo } from "~/lib/hyperliquid";

interface StoredBalance {
  accountValue: number;
  spotValue: number;
  stakingValue: number;
  perpsValue: number;
  lastUpdated: number;
  rawData: BalanceInfo;
}

interface DailyStartBalance {
  date: string; // YYYY-MM-DD format
  accountValue: number;
}

const UPDATE_INTERVAL = 30000; // 30 seconds

export function useBalanceUpdater(walletAddress: string | null) {
  const [storedBalance, setStoredBalance] = useLocalStorage<StoredBalance | null>("balance-data", null);
  const [dailyStartBalance, setDailyStartBalance] = useLocalStorage<DailyStartBalance | null>("daily-start-balance", null);
  const [nextUpdateIn, setNextUpdateIn] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);
  const hlService = new HyperliquidService();

  const getTodayDateString = () => {
    const today = new Date();
    return today.toLocaleDateString('en-CA'); // Returns YYYY-MM-DD format
  };

  const updateBalances = useCallback(async () => {
    if (!walletAddress) return;

    setIsUpdating(true);
    try {
      const balances = await hlService.getUserBalances(walletAddress);
      const [hypePrice, allPrices] = await Promise.all([
        hlService.getHypePrice(),
        hlService.infoClient.allMids()
      ]);

      // Calculate values
      const perpsValue = parseFloat(balances.accountValue);
      const spotValue = balances.spotBalances.reduce((total, balance) => {
        const amount = parseFloat(balance.total);
        if (amount === 0) return total;
        
        // For USDC, value is 1:1
        if (balance.coin === "USDC") {
          return total + amount;
        }
        
        // For other coins, use their mid price
        const price = allPrices[balance.coin];
        if (price) {
          return total + amount * parseFloat(price);
        }
        
        return total;
      }, 0);
      
      const stakingValue = balances.staking 
        ? (parseFloat(balances.staking.totalStaked) + parseFloat(balances.staking.pendingWithdrawals)) * hypePrice 
        : 0;
      
      const accountValue = perpsValue + spotValue + stakingValue;

      const newBalance: StoredBalance = {
        accountValue,
        spotValue,
        stakingValue,
        perpsValue,
        lastUpdated: Date.now(),
        rawData: balances
      };

      setStoredBalance(newBalance);

      // Check if we need to set daily start balance
      const todayDate = getTodayDateString();
      if (!dailyStartBalance || dailyStartBalance.date !== todayDate) {
        setDailyStartBalance({
          date: todayDate,
          accountValue
        });
      }
    } catch (error) {
      console.error("Error updating balances:", error);
    } finally {
      setIsUpdating(false);
    }
  }, [walletAddress, hlService, setStoredBalance, dailyStartBalance, setDailyStartBalance]);

  // Initial update and periodic updates
  useEffect(() => {
    if (!walletAddress) return;

    // Initial update if needed
    if (!storedBalance || Date.now() - storedBalance.lastUpdated > UPDATE_INTERVAL) {
      updateBalances();
    }

    // Set up periodic updates
    const interval = setInterval(() => {
      updateBalances();
    }, UPDATE_INTERVAL);

    return () => clearInterval(interval);
  }, [walletAddress, updateBalances]);

  // Update countdown timer
  useEffect(() => {
    if (!storedBalance) return;

    const updateCountdown = () => {
      const elapsed = Date.now() - storedBalance.lastUpdated;
      const remaining = Math.max(0, UPDATE_INTERVAL - elapsed);
      setNextUpdateIn(Math.ceil(remaining / 1000));
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [storedBalance]);

  return {
    balance: storedBalance,
    dailyStartBalance,
    nextUpdateIn,
    isUpdating,
    updateNow: updateBalances
  };
}