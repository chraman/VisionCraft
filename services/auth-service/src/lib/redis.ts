import Redis from 'ioredis';
import { createLogger } from '@ai-platform/utils';

const logger = createLogger('auth-service');

let redisClient: Redis | null = null;

export function getRedis(): Redis {
  if (!redisClient) {
    redisClient = new Redis(process.env['REDIS_URL'] ?? 'redis://localhost:6379', {
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

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}
