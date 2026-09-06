interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();
const WINDOW_SIZE_MS = 60 * 1000; // 1 phút
const MAX_REQUESTS_PER_WINDOW = 40; // Tối đa 40 truy vấn / phút

/**
 * In-memory rate limiter chống brute force và thu thập hàng loạt PII
 */
export function checkRateLimit(identifier: string): { success: boolean; remaining: number; reset: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);

  // Dọn dẹp cache cũ nếu cần
  if (rateLimitMap.size > 5000) {
    rateLimitMap.forEach((value, key) => {
      if (now > value.resetTime) {
        rateLimitMap.delete(key);
      }
    });
  }

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + WINDOW_SIZE_MS,
    });
    return {
      success: true,
      remaining: MAX_REQUESTS_PER_WINDOW - 1,
      reset: Math.ceil(WINDOW_SIZE_MS / 1000),
    };
  }

  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    return {
      success: false,
      remaining: 0,
      reset: Math.ceil((entry.resetTime - now) / 1000),
    };
  }

  entry.count++;
  return {
    success: true,
    remaining: MAX_REQUESTS_PER_WINDOW - entry.count,
    reset: Math.ceil((entry.resetTime - now) / 1000),
  };
}
