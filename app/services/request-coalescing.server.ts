/**
 * Request coalescing to prevent duplicate API calls
 * If multiple requests for the same resource happen within a short window,
 * they'll share the same promise
 */

const pendingRequests = new Map<string, Promise<any>>();

/**
 * Coalesce requests - if a request is already in progress for the same key,
 * return the existing promise instead of making a new request
 */
export async function coalesceRequests<T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  // Check if there's already a pending request
  const pending = pendingRequests.get(key);
  if (pending) {
    return pending;
  }
  
  // Create a new request
  const promise = fetcher()
    .finally(() => {
      // Clean up after the request completes
      pendingRequests.delete(key);
    });
  
  // Store the pending request
  pendingRequests.set(key, promise);
  
  return promise;
}