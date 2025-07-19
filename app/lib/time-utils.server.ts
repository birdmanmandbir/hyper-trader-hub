// Server-side time utilities for consistent timezone handling

export function convertUTCToUserTime(utcDate: Date, offset: number): Date {
  const userTime = new Date(utcDate.getTime() + offset * 60 * 60 * 1000);
  return userTime;
}

export function convertUserTimeToUTC(userDate: Date, offset: number): Date {
  const utcTime = new Date(userDate.getTime() - offset * 60 * 60 * 1000);
  return utcTime;
}

export function formatUserTime(utcDate: Date, offset: number, format: string): string {
  const userTime = convertUTCToUserTime(utcDate, offset);
  
  // Simple format implementation for common patterns
  let formatted = format;
  
  const hours = userTime.getHours();
  const minutes = userTime.getMinutes();
  const seconds = userTime.getSeconds();
  const day = userTime.getDate();
  const month = userTime.getMonth() + 1;
  const year = userTime.getFullYear();
  
  formatted = formatted.replace('YYYY', year.toString());
  formatted = formatted.replace('MM', month.toString().padStart(2, '0'));
  formatted = formatted.replace('DD', day.toString().padStart(2, '0'));
  formatted = formatted.replace('HH', hours.toString().padStart(2, '0'));
  formatted = formatted.replace('mm', minutes.toString().padStart(2, '0'));
  formatted = formatted.replace('ss', seconds.toString().padStart(2, '0'));
  
  return formatted;
}

export function getDayBoundariesUTC(userDate: Date, offset: number): { start: Date; end: Date } {
  // Get user's midnight
  const userMidnight = new Date(userDate);
  userMidnight.setHours(0, 0, 0, 0);
  
  // Convert to UTC
  const utcStart = convertUserTimeToUTC(userMidnight, offset);
  const utcEnd = new Date(utcStart.getTime() + 24 * 60 * 60 * 1000);
  
  return { start: utcStart, end: utcEnd };
}

export function getUserDateString(utcDate: Date, offset: number): string {
  const userTime = convertUTCToUserTime(utcDate, offset);
  return formatUserTime(utcDate, offset, 'YYYY-MM-DD');
}

export function getTimezoneDisplayName(offset: number): string {
  const sign = offset >= 0 ? '+' : '';
  return `UTC${sign}${offset}`;
}

export function parseTimezoneOffset(timezoneName: string): number {
  // Parse formats like "UTC+8", "UTC-5", "UTC"
  if (timezoneName === 'UTC') return 0;
  
  const match = timezoneName.match(/UTC([+-]\d+)/);
  if (match) {
    return parseInt(match[1], 10);
  }
  
  return 0; // Default to UTC
}

// Common timezone options for UI
export const TIMEZONE_OPTIONS = [
  { value: -12, label: 'UTC-12 (Baker Island)' },
  { value: -11, label: 'UTC-11 (American Samoa)' },
  { value: -10, label: 'UTC-10 (Hawaii)' },
  { value: -9, label: 'UTC-9 (Alaska)' },
  { value: -8, label: 'UTC-8 (PST - Los Angeles)' },
  { value: -7, label: 'UTC-7 (MST - Denver)' },
  { value: -6, label: 'UTC-6 (CST - Chicago)' },
  { value: -5, label: 'UTC-5 (EST - New York)' },
  { value: -4, label: 'UTC-4 (Atlantic)' },
  { value: -3, label: 'UTC-3 (Brazil)' },
  { value: -2, label: 'UTC-2 (Mid-Atlantic)' },
  { value: -1, label: 'UTC-1 (Azores)' },
  { value: 0, label: 'UTC (London)' },
  { value: 1, label: 'UTC+1 (Paris)' },
  { value: 2, label: 'UTC+2 (Cairo)' },
  { value: 3, label: 'UTC+3 (Moscow)' },
  { value: 4, label: 'UTC+4 (Dubai)' },
  { value: 5, label: 'UTC+5 (Karachi)' },
  { value: 5.5, label: 'UTC+5:30 (India)' },
  { value: 6, label: 'UTC+6 (Dhaka)' },
  { value: 7, label: 'UTC+7 (Bangkok)' },
  { value: 8, label: 'UTC+8 (Beijing/Singapore)' },
  { value: 9, label: 'UTC+9 (Tokyo)' },
  { value: 10, label: 'UTC+10 (Sydney)' },
  { value: 11, label: 'UTC+11 (Solomon Islands)' },
  { value: 12, label: 'UTC+12 (Auckland)' },
  { value: 13, label: 'UTC+13 (Tonga)' },
  { value: 14, label: 'UTC+14 (Line Islands)' },
];