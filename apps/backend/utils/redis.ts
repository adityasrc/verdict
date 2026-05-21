import { Redis } from "ioredis";

// Access process.env through globalThis to prevent bundler constant folding
// This forces runtime evaluation instead of build-time optimization
const env = (globalThis as any).process?.env || {};
const nodeEnv = env.NODE_ENV || "development";
const isProduction = nodeEnv === "production";

// Only load dotenv in development (not in production/Kubernetes)
if (!isProduction) {
    import("dotenv").then(({ config }) => {
        config();
    }).catch(() => {
        // Ignore if dotenv not available
    });
}

// Always prefer the environment variable first. 
// If it doesn't exist, ONLY THEN fall back to localhost.
const redisUrl = env.REDIS_URL || "redis://localhost:16379";

console.log(`Redis connecting to: ${redisUrl} (${isProduction ? "production" : "development"})`);

export const redis = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
});