import type { NextFunction, Request, Response } from "express";
import { client } from "../lib/redis.js";


export function leakybucketLimiter(capacity: number, leakRate: number){
    if (capacity <= 0 || leakRate <= 0){
        throw new Error("capacity and leakrate must be greater than zero")
    }
    return async(req:Request, res: Response, next:NextFunction)=>{
        try {
            const key = `leaky:${req.ip}`
        const value = await client.hGetAll(key)
        const currentTime = Date.now()

        let level=0;
        let lastLeakTime= currentTime

        if(Object.keys(value).length !== 0){
            level = Number(value.level)
            lastLeakTime = Number(value.lastLeakTime)
        }

        const elapsed = (currentTime - lastLeakTime)/1000
        level = Math.max(0, level - elapsed * leakRate)

        if(level+1 <= capacity){
            await client
            .multi()
            .hSet(key, {level: level+1, lastLeakTime: currentTime})
            .expire(key, (capacity/leakRate) + 5)
            .exec()
            return next()
        }
        return res.status(429).json({message: "too many request"})
        } catch (error) {
            console.log("rate limiter error", error)
            return next()
        }
        
    }
}