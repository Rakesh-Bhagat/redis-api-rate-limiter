import express, { type Request, type Response, type NextFunction } from "express"
import { tokenBucketLimiter } from "./middleware/tokenBucketLimiter.js"
import { fixedRateLimiter } from "./middleware/fixedWindowLimiter.js"
import { ConnectRedis } from "./lib/redis.js"
const app = express()
await ConnectRedis()

app.get("/", fixedRateLimiter(10), async(req:Request, res: Response)=>{
    return res.json({message: "passed"})
})
app.get("/token",tokenBucketLimiter(10, 2), async(req: Request, res: Response) => {
    return res.json({message: "passed"})
})
app.listen(8000,(e)=>{if (e) console.log(e)
    console.log("server running on port: " + 8000);
    console.log(Date.now())
})