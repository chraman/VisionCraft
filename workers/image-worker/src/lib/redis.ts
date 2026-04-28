import Redis, { type RedisOptions } from 'ioredis';
import { createLogger } from '@ai-platform/utils';

const logger = createLogger('image-worker');

// General-purpose Redis client (pub/sub, del, set)
let redisClient: Redis | null = null;
// BullMQ-specific connection — BullMQ requires maxRetriesPerRequest: null
let bullmqClient: Redis | null = null;

const REDIS_URL = process.env['REDIS_URL'] ?? 'redis://localhost:6379';

function makeClient(opts: RedisOptions): Redis {
  const client = new Redis(REDIS_URL, opts);
  client.on('error', (err) => {
    logger.error('Redis connection error', { action: 'redis_error', error: err.message });
  });
  return client;
}

export function getRedis(): Redis {
  if (!redisClient) {
    redisClient = makeClient({ maxRetriesPerRequest: 3, enableReadyCheck: true });
  }
  return redisClient;
}

/** Separate connection for BullMQ — it validates maxRetriesPerRequest === null */
export function getBullMQRedis(): Redis {
  if (!bullmqClient) {
    bullmqClient = makeClient({ maxRetriesPerRequest: null, enableReadyCheck: false });
  }
  return bullmqClient;
}

export async function closeRedis(): Promise<void> {
  if (bullmqClient) {
    await bullmqClient.quit();
    bullmqClient = null;
  }
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}
