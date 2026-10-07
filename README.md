# Redis Rate Limiter

A small Express + TypeScript project that implements four rate-limiting algorithms as middleware, backed by Redis.

## Algorithms

| Route             | Middleware              | Behavior                                                                                                   |
| ----------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------- |
| `/`               | `fixedRateLimiter`      | Fixed window: max 10 requests per IP per 60 seconds (limit is configurable)                                |
| `/token`          | `tokenBucketLimiter`    | Token bucket: capacity 10, refills 2 tokens/second, per IP (limit is configurable)                         |
| `/slidinglog`     | `slidingLogLimiter`     | Sliding window log: max 5 requests per IP in any rolling 60 seconds (limit and window are configurable)    |
| `/slidingcounter` | `slidingCounterLimiter` | Sliding window counter: max 10 requests per IP in a rolling 60 seconds, counted in 10 second sub-windows   |

### Fixed window

Keeps one counter per IP. The first request creates the counter with a 60 second TTL, and every request increments it. Requests are allowed while the counter is at or below the limit, and rejected until the key expires and a new window starts. It is the simplest and cheapest algorithm, but a client can send up to twice the limit around a window boundary (a full burst at the end of one window and another at the start of the next).

`fixedRateLimiter(limit)`

### Token bucket

Each IP has a bucket that holds up to `capacity` tokens and refills continuously at `refillRate` tokens per second. Every request spends one token, and a request is rejected when less than one token is available. The state is a hash with the current token count and the last refill time, and tokens are added lazily on each request based on the elapsed time. It allows short bursts up to the bucket capacity while enforcing a steady average rate.

`tokenBucketLimiter(capacity, refillRate)`

### Sliding window log

Stores one entry per request in a Redis sorted set, scored by timestamp in milliseconds. On each request, entries older than the window are removed, the remaining entries are counted, and the request is allowed only if the count is below the limit. It is exact, but memory grows with the number of requests in the window.

`slidingLogLimiter(maxRequest, intervalSeconds)`

### Sliding window counter

Splits the window into fixed sub-windows and keeps one counter per sub-window. A request is allowed if the sum of the counters covering the last window is below the limit. It uses much less memory than the log, but it is an approximation: the error is at most one sub-window of traffic, and a smaller sub-window is more accurate at the cost of more keys.

`slidingCounterLimiter(limit, windowSizeSeconds, subWindowSizeSeconds)`

Requests over the limit get a `429` response: `{ "message": "too many requests" }`.

## Project structure

```
src/
  index.ts                       # Express app and routes
  lib/redis.ts                   # Shared Redis client and connect helper
  middleware/
    fixedWindowLimiter.ts        # Fixed window limiter (INCR + EXPIRE)
    tokenBucketLimiter.ts        # Token bucket limiter (hash in Redis)
    slidingWindowLog.ts          # Sliding window log limiter (sorted set)
    slidingWindowCounter.ts      # Sliding window counter limiter (one counter key per sub-window)
```

## Requirements

- Node.js
- pnpm
- A Redis server running on `localhost:6379` (the default)

## Getting started

```bash
pnpm install
pnpm dev        # run with tsx in watch mode
```

Production build:

```bash
pnpm build
pnpm start
```

The server listens on port `8000`.

## Try it

```bash
curl http://localhost:8000/        # fixed window
curl http://localhost:8000/token   # token bucket
curl http://localhost:8000/slidinglog      # sliding window log
curl http://localhost:8000/slidingcounter  # sliding window counter
```

Send requests quickly past a route's limit and you will start getting `429` responses.

## Redis keys

- `fixed:<ip>`: request counter with a 60 second TTL
- `bucket:<ip>`: hash with `availableToken` and `lastRefillTime`
- `slidingLog<ip>`: sorted set, one `<timestamp>-<random>` member per request, scored by timestamp
- `slidingCounter<ip>:<bucket>`: request counter for one sub-window (`bucket` is `floor(now / subWindowMs)`), expires once it leaves the window
