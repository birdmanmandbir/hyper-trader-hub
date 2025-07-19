import { useState, useEffect } from "react";

export function useLocalStorage<T>(key: string, initialValue: T) {
  // Always use initialValue for the initial render to avoid hydration mismatch
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage after hydration
  useEffect(() => {
    setIsHydrated(true);
    
    if (typeof window === "undefined") {
      return;
    }
    
    try {
      // Get from local storage by key
      const item = window.localStorage.getItem(key);
      if (!item) {
        // No stored value, save initialValue
        window.localStorage.setItem(key, JSON.stringify(initialValue));
        return;
      }
      
      const parsed = JSON.parse(item);
      
      // If initialValue is an object, merge with defaults to handle missing properties
      if (typeof initialValue === 'object' && initialValue !== null && !Array.isArray(initialValue)) {
        const merged = { ...initialValue, ...parsed };
        // Check if we added any new properties
        if (JSON.stringify(merged) !== JSON.stringify(parsed)) {
          window.localStorage.setItem(key, JSON.stringify(merged));
        }
        setStoredValue(merged as T);
      } else {
        setStoredValue(parsed);
      }
    } catch (error) {
      // If error also use initialValue
      console.log(error);
      window.localStorage.setItem(key, JSON.stringify(initialValue));
    }
  }, []); // Only run once after mount

  // Return a wrapped version of useState's setter function that ...
  // ... persists the new value to localStorage.
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      // Save state
      setStoredValue(valueToStore);
      // Save to local storage
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      // A more advanced implementation would handle the error case
      console.log(error);
    }
  };

  return [storedValue, setValue] as const;
}