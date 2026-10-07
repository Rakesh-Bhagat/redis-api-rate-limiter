import type { NextFunction, Request, Response } from "express"
import { client } from "../lib/redis.js"

export function tokenBucketLimiter(capacity: number, refillRate: number) {
    return async (req: Request, res: Response, next: NextFunction) => {
        const key = `bucket:${req.ip}`
        const value = await client.hGetAll(key)
        let availableToken: number
        let lastRefillTime: number
        if (Object.keys(value).length === 0) {
            availableToken = capacity
            lastRefillTime = Date.now()
        } else {
            availableToken = Number(value.availableToken)
            lastRefillTime = Number(value.lastRefillTime)
        }

        const currentTime = Date.now()
        const elapsed = (currentTime - lastRefillTime) / 1000

        const newtoken = elapsed * refillRate

        const token = Math.min(capacity, availableToken+newtoken)

        if (token >= 1) {
            await client
            .multi()
            .hSet(key, { availableToken: token - 1, lastRefillTime: Date.now()})
            .expire(key, (capacity/refillRate) + 5)
            .exec()
            return next()
        }

        return res.status(429).json({ message: "too many requests" })
    }
}