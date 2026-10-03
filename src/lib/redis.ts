import { createClient } from "redis";
export const client = createClient()

client.on("error", err => console.log("redis client error", err))
export async function ConnectRedis(){
    if(!client.isOpen) await client.connect()
}
