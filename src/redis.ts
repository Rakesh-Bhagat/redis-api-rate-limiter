import type { NextFunction, Request, Response } from "express";
import { createClient, createClientPool } from "redis";

const client = createClient()

client.on("error", err => console.log("redis client error", err))

await client.connect()

export function fixedRateLimiter(limit: number,) {

    return async function (req: Request, res: Response, next: NextFunction) {
        const key = `rate:${req.ip}`
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