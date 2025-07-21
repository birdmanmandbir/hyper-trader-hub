/**
 * Server-side caching utilities for Cloudflare Workers
 * Uses the Cache API for edge caching
 */

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  cacheKey?: string; // Custom cache key
}

const DEFAULT_TTL = 30; // 30 seconds default cache

/**
 * Get cached data or fetch fresh data
 */
export async function getCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  const { ttl = DEFAULT_TTL, cacheKey = key } = options;
  
  // Create a cache key URL
  const cacheUrl = new URL(`https://cache.hyperliquid.local/${cacheKey}`);
  const cache = caches.default;
  
  // Try to get from cache
  const cachedResponse = await cache.match(cacheUrl);
  
  if (cachedResponse) {
    const data = await cachedResponse.json();
    return data as T;
  }
  
  // Fetch fresh data
  const freshData = await fetcher();
  
  // Store in cache
  const response = new Response(JSON.stringify(freshData), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': `max-age=${ttl}`,
    },
  });
  
  // Don't await cache.put to avoid blocking
  cache.put(cacheUrl, response).catch(err => {
    console.error('Cache put error:', err);
  });
  
  return freshData;
}

/**
 * Invalidate cache for a specific key
 */
export async function invalidateCache(key: string): Promise<void> {
  const cacheUrl = new URL(`https://cache.hyperliquid.local/${key}`);
  const cache = caches.default;
  await cache.delete(cacheUrl);
}

/**
 * Create a cache key for user-specific data
 */
export function getUserCacheKey(userAddress: string, dataType: string): string {
  if (!userAddress) {
    throw new Error('User address is required for cache key');
  }
  return `user:${userAddress.toLowerCase()}:${dataType}`;
}