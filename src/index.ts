import express, { type Request, type Response, type NextFunction } from "express"
import { fixedRateLimiter } from "./redis.js"
const app = express()

app.get("/",fixedRateLimiter(5), async(req: Request, res: Response) => {
    return res.json({message: "passed"})
})
app.listen(8000,(e)=>{if (e) console.log(e)
    console.log("server running on port: " + 8000);
})