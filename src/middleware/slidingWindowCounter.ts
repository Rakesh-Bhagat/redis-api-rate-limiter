import type { NextFunction, Request, Response } from "express";
import { client } from "../lib/redis.js";


export function slidingCounterLimiter(limit: number, windowSize: number, subWindowSize: number){
    if(subWindowSize <= 0){
        throw new Error("subWindowSize must be greater than zero")
    }
    if (subWindowSize > windowSize){
        throw new Error("subWindowSize cannot be greater than windowSize")
    }
    const subWindowMs = subWindowSize * 1000
    const totalBucket = Math.ceil(windowSize / subWindowSize)
    const bucketTTL = Math.ceil(totalBucket * subWindowSize)
    return async(req: Request, res: Response, next: NextFunction) => {
        try {
            const now = Date.now()
            const keyPrefix = `slidingCounter${req.ip}`
            const currentSubWindow = Math.floor(now / subWindowMs)
            const keys: string[] = []

            for(let i=0; i< totalBucket; i++){
                keys.push(`${keyPrefix}:${currentSubWindow - i}`)
            }
            const counts = await client.mGet(keys)

            const totalRequests = counts.reduce((sum , c) => sum + Number(c ?? 0), 0)

            if (totalRequests >= limit){
                return res.status(429).json({message: "too many requests"})
            }

            await client
            .multi()
            .incr(keys[0]!)
            .expire(keys[0]!, bucketTTL)
            .exec()

            return next()
        } catch (error) {
            console.error("rate limiter error", error)
            return next()
        }
        
        
    }
}