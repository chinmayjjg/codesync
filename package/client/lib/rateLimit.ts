import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterMs?: number;
  limit?: number;
  resetAt?: number;
};

type RateLimitStore = {
  limit: (
    identifier: string,
    scope: string,
    limit: number,
    windowMs: number
  ) => Promise<RateLimitResult>;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

class MemoryRateLimitStore implements RateLimitStore {
  private readonly store = new Map<string, RateLimitEntry>();

  async limit(
    identifier: string,
    scope: string,
    limit: number,
    windowMs: number
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const key = `${scope}:${identifier}`;
    const current = this.store.get(key);

    if (!current || current.resetAt <= now) {
      const resetAt = now + windowMs;
      this.store.set(key, {
        count: 1,
        resetAt,
      });

      return {
        allowed: true,
        remaining: limit - 1,
        limit,
        resetAt,
      };
    }

    if (current.count >= limit) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs: Math.max(current.resetAt - now, 0),
        limit,
        resetAt: current.resetAt,
      };
    }

    current.count += 1;
    this.store.set(key, current);

    return {
      allowed: true,
      remaining: Math.max(limit - current.count, 0),
      limit,
      resetAt: current.resetAt,
    };
  }
}

class UpstashRateLimitStore implements RateLimitStore {
  private readonly redis = Redis.fromEnv();
  private readonly ratelimiters = new Map<string, Ratelimit>();

  private getLimiter(scope: string, limit: number, windowMs: number) {
    const cacheKey = `${scope}:${limit}:${windowMs}`;
    const existing = this.ratelimiters.get(cacheKey);

    if (existing) {
      return existing;
    }

    const ratelimit = new Ratelimit({
      redis: this.redis,
      limiter: Ratelimit.slidingWindow(limit, toDuration(windowMs)),
      prefix: `codesync:ratelimit:${scope}`,
    });

    this.ratelimiters.set(cacheKey, ratelimit);
    return ratelimit;
  }

  async limit(
    identifier: string,
    scope: string,
    limit: number,
    windowMs: number
  ): Promise<RateLimitResult> {
    const result = await this.getLimiter(scope, limit, windowMs).limit(
      identifier
    );

    return {
      allowed: result.success,
      remaining: result.remaining,
      retryAfterMs: result.success
        ? undefined
        : Math.max(result.reset - Date.now(), 0),
      limit: result.limit,
      resetAt: result.reset,
    };
  }
}

function hasUpstashConfig() {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL?.trim() &&
      process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  );
}

function toDuration(windowMs: number): `${number} ms` | `${number} s` {
  if (windowMs % 1000 === 0) {
    return `${windowMs / 1000} s`;
  }

  return `${windowMs} ms`;
}

function getClientKey(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip") || "unknown";
}

const globalForRateLimit = globalThis as typeof globalThis & {
  __codesyncRateLimitStore?: RateLimitStore;
};

function getRateLimitStore() {
  if (!globalForRateLimit.__codesyncRateLimitStore) {
    globalForRateLimit.__codesyncRateLimitStore = hasUpstashConfig()
      ? new UpstashRateLimitStore()
      : new MemoryRateLimitStore();
  }

  return globalForRateLimit.__codesyncRateLimitStore;
}

export async function checkRateLimit(
  request: Request,
  scope: string,
  limit: number,
  windowMs: number
) {
  return getRateLimitStore().limit(
    getClientKey(request),
    scope,
    limit,
    windowMs
  );
}
