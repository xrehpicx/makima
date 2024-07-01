import { createClient } from "redis";
import { ENV } from "../lib/env_validation";

export const redisClient = await createClient({
  url: ENV.REDIS_URL,
})
  .on("error", (err) => console.log("Redis Client Error", err))
  .connect();

await redisClient.set("key", "reddis is up");
const value = await redisClient.get("key");
console.log(value);
redisClient.del("key");
