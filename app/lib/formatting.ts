import { getPriceDecimals } from "./price-decimals";

/**
 * Format a USD value with appropriate decimal places
 */
export function formatUsdValue(value: string | number, forceDecimals?: number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  const decimals = forceDecimals ?? getPriceDecimals(num);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: forceDecimals ?? Math.min(decimals, 2),
    maximumFractionDigits: decimals,
  }).format(num);
}

/**
 * Format a price with appropriate decimal places (no currency symbol)
 */
export function formatPrice(price: number): string {
  const decimals = getPriceDecimals(price);
  return price.toFixed(decimals);
}

/**
 * Format a percentage value
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format leverage value (e.g., 2.5x)
 */
export function formatLeverage(leverage: number): string {
  return `${leverage.toFixed(2)}x`;
}

/**
 * Format address with ellipsis (e.g., 0x1234...5678)
 */
export function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Format a number with comma separators
 */
export function formatNumber(value: number, decimals?: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format crypto amount with appropriate decimals
 */
export function formatCryptoAmount(amount: number, symbol: string): string {
  const decimals = amount < 1 ? 6 : amount < 10 ? 4 : 2;
  return `${formatNumber(amount, decimals)} ${symbol}`;
}