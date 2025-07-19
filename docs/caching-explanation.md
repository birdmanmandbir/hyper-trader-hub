# How the 30-Second Balance Cache Works

## Overview
The balance caching mechanism uses Cloudflare's Cache API to store balance data for 30 seconds, reducing API calls during navigation between routes.

## Cache Lifecycle

### 1. First Request (Cache Miss)
When a user first loads a route that needs balance data:
```
User navigates to /home
  → loader calls getBalanceData()
  → getCachedData() checks cache (miss)
  → Fetches fresh data from Hyperliquid API
  → Stores in cache with 30s TTL
  → Returns data to user
```

### 2. Subsequent Requests Within 30s (Cache Hit)
When navigating to another route within 30 seconds:
```
User navigates to /daily-target
  → loader calls getBalanceData()
  → getCachedData() checks cache (hit)
  → Returns cached data immediately
  → No API call made
```

### 3. After 30 Seconds (Cache Expired)
When the cache expires:
```
User navigates after 30s
  → loader calls getBalanceData()
  → getCachedData() checks cache (expired/miss)
  → Fetches fresh data from Hyperliquid API
  → Updates cache with new 30s TTL
  → Returns fresh data
```

## How It Works Technically

### Cache Storage
```typescript
// In getCachedData() function:
const cacheUrl = new URL(`https://cache.hyperliquid.local/${cacheKey}`);
const cache = caches.default; // Cloudflare's edge cache
```

### Cache Headers
```typescript
const response = new Response(JSON.stringify(freshData), {
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': `max-age=${ttl}`, // max-age=30
  },
});
```

The `max-age=30` header tells Cloudflare's cache to:
- Store the response for 30 seconds
- Automatically expire after 30 seconds
- Return stale data if still within TTL

### Automatic Expiration
- **No manual cleanup needed**: Cloudflare automatically removes expired entries
- **No background jobs**: The cache expires based on the `max-age` header
- **Edge-based**: Cached at Cloudflare's edge servers closest to the user

## Benefits

1. **Fast Navigation**: Routes load instantly when data is cached
2. **Reduced API Load**: Fewer calls to Hyperliquid API
3. **No State Management**: Cache handles expiration automatically
4. **Global Distribution**: Cached at edge locations worldwide

## Auto-Refresh Mechanism

In addition to the cache, routes that display balance data use the `useAutoRefresh` hook:

### How Auto-Refresh Works
```typescript
useAutoRefresh(30000); // Refresh every 30 seconds
```

1. **Interval-based**: Automatically calls `revalidator.revalidate()` every 30s
2. **Focus-based**: Refreshes data when user returns to the window
3. **Non-blocking**: Uses React Router's revalidator to fetch in background
4. **Smart**: Only refreshes when not already loading

### Benefits of Auto-Refresh
- **Always Fresh**: Data is never more than 30s old while user is active
- **Background Updates**: UI doesn't block during refresh
- **Focus Refresh**: Immediate update when returning to the app

## Trade-offs

- **30s Staleness**: Balance data can be up to 30 seconds old between refreshes
- **Per-User Cache**: Each user has their own cache entry
- **Network Usage**: Makes API calls every 30s while page is open

## Request Coalescing

Additionally, if multiple requests happen simultaneously (e.g., multiple components request balance), they share the same promise:
```typescript
// In coalesceRequests():
if (pendingRequests.has(key)) {
  return pendingRequests.get(key); // Return existing promise
}
```

This prevents duplicate API calls even within the same request cycle.