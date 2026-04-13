/**
 * Rate Limiting for API Usage
 *
 * Prevents abuse of Claude API and other paid services.
 * Uses in-memory store for simplicity (single-server).
 * For distributed systems, replace with Redis.
 *
 * Default limits:
 * - 10 extractions per hour per user (Claude calls are expensive)
 * - 50 exports per hour per user
 * - 100 uploads per hour per user
 */

interface RateLimitEntry {
  count: number
  resetTime: number
}

interface RateLimitConfig {
  maxRequests: number
  windowMs: number // milliseconds
}

const DEFAULT_LIMITS: Record<string, RateLimitConfig> = {
  extraction: {
    maxRequests: 10,
    windowMs: 3600 * 1000, // 1 hour
  },
  export: {
    maxRequests: 50,
    windowMs: 3600 * 1000,
  },
  upload: {
    maxRequests: 100,
    windowMs: 3600 * 1000,
  },
}

// In-memory store: key = "${operation}:${userId}" value = RateLimitEntry
const rateLimitStore = new Map<string, RateLimitEntry>()

/**
 * Check if operation is rate limited
 * @returns true if allowed, false if exceeded
 */
export function checkRateLimit(
  userId: string,
  operation: keyof typeof DEFAULT_LIMITS
): { allowed: boolean; remaining: number; resetTime: number } {
  const config = DEFAULT_LIMITS[operation]
  if (!config) {
    throw new Error(`Unknown operation: ${operation}`)
  }

  const key = `${operation}:${userId}`
  const now = Date.now()

  let entry = rateLimitStore.get(key)

  // Create new entry or reset if window expired
  if (!entry || now > entry.resetTime) {
    entry = {
      count: 0,
      resetTime: now + config.windowMs,
    }
    rateLimitStore.set(key, entry)
  }

  // Check if limit exceeded
  const allowed = entry.count < config.maxRequests
  if (allowed) {
    entry.count++
  }

  return {
    allowed,
    remaining: Math.max(0, config.maxRequests - entry.count),
    resetTime: entry.resetTime,
  }
}

/**
 * Enforce rate limit and throw if exceeded
 */
export function enforceRateLimit(
  userId: string,
  operation: keyof typeof DEFAULT_LIMITS
): { remaining: number; resetTime: number } {
  const result = checkRateLimit(userId, operation)

  if (!result.allowed) {
    const resetDate = new Date(result.resetTime).toISOString()
    throw new Error(
      `Rate limit exceeded for ${operation}. Resets at ${resetDate}. Try again later.`
    )
  }

  return {
    remaining: result.remaining,
    resetTime: result.resetTime,
  }
}

/**
 * Refund a rate limit request (e.g., if extraction fails and returns no data)
 */
export function refundRateLimit(userId: string, operation: keyof typeof DEFAULT_LIMITS): void {
  const key = `${operation}:${userId}`
  const entry = rateLimitStore.get(key)

  if (entry && entry.count > 0) {
    entry.count--
  }
}

/**
 * Get current usage for debugging
 */
export function getUsage(userId: string, operation: keyof typeof DEFAULT_LIMITS) {
  const key = `${operation}:${userId}`
  const entry = rateLimitStore.get(key)

  if (!entry) {
    return {
      count: 0,
      limit: DEFAULT_LIMITS[operation].maxRequests,
      remaining: DEFAULT_LIMITS[operation].maxRequests,
      resetTime: Date.now() + DEFAULT_LIMITS[operation].windowMs,
    }
  }

  return {
    count: entry.count,
    limit: DEFAULT_LIMITS[operation].maxRequests,
    remaining: DEFAULT_LIMITS[operation].maxRequests - entry.count,
    resetTime: entry.resetTime,
  }
}

/**
 * Cleanup expired entries (run periodically)
 */
export function cleanupExpired() {
  const now = Date.now()
  let removed = 0

  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key)
      removed++
    }
  }

  return removed
}

// Cleanup every 5 minutes
if (typeof global !== 'undefined') {
  const interval = setInterval(cleanupExpired, 5 * 60 * 1000)
  // Don't keep process alive just for this
  if (interval.unref) {
    interval.unref()
  }
}
