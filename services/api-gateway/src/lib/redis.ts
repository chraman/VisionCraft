import Redis from 'ioredis';
import { createLogger } from '@ai-platform/utils';

const logger = createLogger('api-gateway');

let redisClient: Redis | null = null;

export function getRedis(): Redis {
  if (!redisClient) {
    redisClient = new Redis(process.env['REDIS_URL'] ?? 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,
      enableReadyCheck: false,
      lazyConnect: true,
    });

    redisClient.on('error', (err) => {
      logger.error('Redis connection error', { action: 'redis_error', error: err.message });
    });
  }
  return redisClient;
}
