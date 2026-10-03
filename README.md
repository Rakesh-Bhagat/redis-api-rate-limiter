# Redis Rate Limiter

A small Express + TypeScript project that implements two rate-limiting algorithms as middleware, backed by Redis.

## Algorithms

| Route    | Middleware           | Behavior                                                                   |
| -------- | -------------------- | -------------------------------------------------------------------------- |
| `/`      | `fixedRateLimiter`   | Fixed window: max 10 requests per IP per 60 seconds (limit is configurable)                        |
| `/token` | `tokenBucketLimiter` | Token bucket: capacity 10, refills 2 tokens/second, per IP (limit is configurable)                 |

Requests over the limit get a `429` response: `{ "message": "too many requests" }`.

## Project structure

```
src/
  index.ts                       # Express app and routes
  lib/redis.ts                   # Shared Redis client and connect helper
  middleware/
    fixedWindowLimiter.ts        # Fixed window limiter (INCR + EXPIRE)
    tokenBucketLimiter.ts        # Token bucket limiter (hash in Redis)
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
```

Send more than 10 requests quickly and you will start getting `429` responses.

## Redis keys

- `fixed:<ip>`: request counter with a 60 second TTL
- `bucket:<ip>`: hash with `availableToken` and `lastRefillTime`
