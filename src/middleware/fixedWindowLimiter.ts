import type { NextFunction, Request, Response } from "express"
import { client } from "../lib/redis.js"

export function fixedRateLimiter(limit: number,) {

    return async function (req: Request, res: Response, next: NextFunction) {
        const key = `fixed:${req.ip}`
        const counter = await client.INCR(key)
        if (counter === 1) {
            await client.expire(key, 60)
        }
        if (counter <= limit) {
            return next()
        }
        return res.status(429).json({ message: "too many requests" })
    }
}