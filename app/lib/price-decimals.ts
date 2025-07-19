/**
 * Get the number of decimal places to display based on price value
 * 
 * Rules:
 * - price < 10: 4 decimal places
 * - price < 100: 3 decimal places
 * - price < 1000: 2 decimal places
 * - price < 10000: 1 decimal place
 * - price >= 10000: 0 decimal places
 */
export function getPriceDecimals(price: number): number {
  const absPrice = Math.abs(price);
  
  if (absPrice < 10) return 4;
  if (absPrice < 100) return 3;
  if (absPrice < 1000) return 2;
  if (absPrice < 10000) return 1;
  return 0;
}

/**
 * Format a price with the appropriate number of decimal places
 */
export function formatPrice(price: number): string {
  const decimals = getPriceDecimals(price);
  return price.toFixed(decimals);
}

/**
 * Format a price with currency symbol
 */
export function formatPriceWithCurrency(price: number, currency: string = '$'): string {
  const formattedPrice = formatPrice(price);
  return `${currency}${formattedPrice}`;
}

/**
 * Format a percentage with appropriate decimals based on the underlying price
 */
export function formatPricePercentage(percentage: number, basePrice: number): string {
  const decimals = Math.min(getPriceDecimals(basePrice), 2);
  return `${percentage.toFixed(decimals)}%`;
}