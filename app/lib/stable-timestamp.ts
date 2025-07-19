// Utility for stable timestamps that work with SSR
// Avoids hydration mismatches by using consistent values

export function getStableTimestamp(): number {
  // In SSR environment, return a rounded timestamp to avoid microsecond differences
  // Round to the nearest second to ensure consistency
  return Math.floor(Date.now() / 1000) * 1000;
}

export function getStableDate(): Date {
  return new Date(getStableTimestamp());
}

export function formatDateStable(date: Date, options?: Intl.DateTimeFormatOptions): string {
  // Always use UTC to ensure consistency between server and client
  const utcOptions: Intl.DateTimeFormatOptions = {
    ...options,
    timeZone: 'UTC',
  };
  return date.toLocaleDateString('en-US', utcOptions);
}