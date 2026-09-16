import { Redis } from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

export const redis = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
});

// Prevent unhandled error events from crashing the process.
// ioredis will still retry the connection automatically.
redis.on("error", (err: Error) => {
    console.warn("[Redis] Connection error:", err.message);
});