import Redis from 'ioredis';
import { createLogger } from '@ai-platform/utils';

const logger = createLogger('image-service');

let redisClient: Redis | null = null;
let bullmqClient: Redis | null = null;

const REDIS_URL = process.env['REDIS_URL'] ?? 'redis://localhost:6379';

function attachErrorHandler(client: Redis, label: string): void {
  client.on('error', (err: Error) => {
    logger.error(`Redis ${label} error`, { action: 'redis_error', error: err.message });
  });
  client.on('reconnecting', () => {
    logger.info(`Redis ${label} reconnecting`, { action: 'redis_reconnect' });
  });
}

function makeRetryStrategy(maxRetries: number) {
  return (times: number) => {
    if (times > maxRetries) return null; // stop retrying → emit error
    return Math.min(times * 100, 3000);
  };
}

export function getRedis(): Redis {
  if (!redisClient) {
    redisClient = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
      retryStrategy: makeRetryStrategy(10),
    });
    attachErrorHandler(redisClient, 'main');
    redisClient.on('connect', () => {
      logger.info('Redis connected', { action: 'redis_connect' });
    });
  }
  return redisClient;
}

export function getBullMQRedis(): Redis {
  if (!bullmqClient) {
    bullmqClient = new Redis(REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      retryStrategy: makeRetryStrategy(20),
    });
    attachErrorHandler(bullmqClient, 'bullmq');
  }
  return bullmqClient;
}

export function getSubscriber(): Redis {
  const sub = getRedis().duplicate();
  // Every subscriber must have its own error handler — otherwise a dropped
  // TCP socket on the duplicate throws an unhandled exception that crashes
  // the process.
  attachErrorHandler(sub, 'subscriber');
  return sub;
}

export async function closeRedis(): Promise<void> {
  if (bullmqClient) {
    try {
      await bullmqClient.quit();
    } catch {
      /* already closed */
    }
    bullmqClient = null;
  }
  if (redisClient) {
    try {
      await redisClient.quit();
    } catch {
      /* already closed */
    }
    redisClient = null;
  }
}
