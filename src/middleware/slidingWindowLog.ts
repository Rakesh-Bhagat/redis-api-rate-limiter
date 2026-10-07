import type { NextFunction, Request, Response } from "express";
import { randomBytes } from "node:crypto"
import { client } from "../lib/redis.js";


export function slidingLogLimiter(maxRequest: number, interval: number) {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const key = `slidingLog${req.ip}`
            const currentTimestamp = Date.now()
            const windowMs = interval * 1000

            await client.zRemRangeByScore(key, 0, currentTimestamp - windowMs)
            const currentRequestCount = await client.zCard(key)

            if (currentRequestCount < maxRequest) {
                await client
                .multi()
                .zAdd(key, { score: currentTimestamp, value: `${currentTimestamp}-${randomBytes(8).toString('hex')}` })
                .expire(key, interval + 5)
                .exec()
                return next()
            }

            return res.status(429).json({ message: "too many requests" })
        } catch (error) {
            console.error("rate limiter error", error)
            return next()
        }

    }
}