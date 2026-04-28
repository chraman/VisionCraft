import Redis from 'ioredis';
import { createLogger } from '@ai-platform/utils';

const logger = createLogger('image-service');

let redisClient: Redis | null = null;
// BullMQ-specific connection — BullMQ requires maxRetriesPerRequest: null
let bullmqClient: Redis | null = null;

const REDIS_URL = process.env['REDIS_URL'] ?? 'redis://localhost:6379';

export function getRedis(): Redis {
  if (!redisClient) {
    redisClient = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    });

    redisClient.on('error', (err) => {
      logger.error('Redis connection error', { action: 'redis_error', error: err.message });
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected', { action: 'redis_connect' });
    });
  }
  return redisClient;
}

/** Separate connection for BullMQ — it validates maxRetriesPerRequest === null */
export function getBullMQRedis(): Redis {
  if (!bullmqClient) {
    bullmqClient = new Redis(REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
    bullmqClient.on('error', (err) => {
      logger.error('Redis (BullMQ) connection error', {
        action: 'redis_error',
        error: err.message,
      });
    });
  }
  return bullmqClient;
}

// Creates a dedicated subscriber connection — ioredis subscribers cannot issue
// other commands while subscribed, so we duplicate the main client.
export function getSubscriber(): Redis {
  return getRedis().duplicate();
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
