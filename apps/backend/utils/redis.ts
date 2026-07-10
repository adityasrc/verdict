import { Redis } from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:16379";

export const redis = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
});