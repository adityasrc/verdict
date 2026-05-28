import { Redis } from "ioredis";


const redisUrl = process.env.REDIS_URL || "redis://localhost:16379";
const isProduction = process.env.NODE_ENV === "production";

console.log(`Redis connecting to: ${redisUrl} (${isProduction ? "production" : "development"})`);

export const redis = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
});