import { createClient } from "redis";
import { createNodeRedisClient } from "bullmq";

const useTls = process.env.REDIS_TLS === "true";

export const redis = createClient({
  username: process.env.REDIS_USERNAME ?? "default",
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_HOST ?? "localhost",
    port: parseInt(process.env.REDIS_PORT ?? "6379", 10),
    ...(useTls ? { tls: true as const } : {}),
  },
});

export const connection = createNodeRedisClient(redis as any);
