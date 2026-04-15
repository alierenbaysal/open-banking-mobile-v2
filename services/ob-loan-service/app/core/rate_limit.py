"""Per-TPP token-bucket rate limiter, backed by Redis.

Algorithm (atomic via Lua):
  bucket_key = "rl:loan:<tpp_id>"
  - Each bucket has `capacity` tokens, refills at `rate` tokens/sec.
  - On each call, deduct 1 token. If unavailable, raise RateLimited.
  - State stored as a hash {tokens, last_refill}, TTL = capacity / rate.

Returns (allowed, remaining, reset_at_epoch).
"""

from __future__ import annotations

import time

from app.config import settings
from app.core.errors import RateLimited
from app.core.redis import get_redis

_LUA_TOKEN_BUCKET = """
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local rate = tonumber(ARGV[2])    -- tokens / sec
local now = tonumber(ARGV[3])
local cost = 1

local data = redis.call('HMGET', key, 'tokens', 'ts')
local tokens = tonumber(data[1])
local last = tonumber(data[2])
if tokens == nil then
    tokens = capacity
    last = now
end

local elapsed = math.max(0, now - last)
tokens = math.min(capacity, tokens + (elapsed * rate))

local allowed = 0
if tokens >= cost then
    tokens = tokens - cost
    allowed = 1
end

redis.call('HMSET', key, 'tokens', tokens, 'ts', now)
redis.call('EXPIRE', key, math.ceil(capacity / rate) * 2)
return {allowed, tokens, capacity}
"""


async def consume(tpp_id: str, capacity: int | None = None) -> tuple[int, int]:
    """Try to consume one token. Returns (remaining, capacity).
    Raises RateLimited if no token available."""
    cap = capacity or settings.rate_limit_per_minute
    rate_per_sec = cap / 60.0
    now = time.time()
    key = f"rl:loan:{tpp_id}"

    redis = get_redis()
    result = await redis.eval(_LUA_TOKEN_BUCKET, 1, key, cap, rate_per_sec, now)
    allowed, tokens, _ = result
    remaining = int(float(tokens))
    if int(allowed) == 0:
        retry_after = max(1, int((1.0 - float(tokens)) / rate_per_sec))
        raise RateLimited(
            f"Rate limit of {cap} requests/min exceeded for TPP",
            headers={
                "Retry-After": str(retry_after),
                "X-RateLimit-Limit": str(cap),
                "X-RateLimit-Remaining": "0",
            },
        )
    return remaining, cap
