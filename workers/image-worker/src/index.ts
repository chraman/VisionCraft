import 'dotenv/config';
import { createLogger } from '@ai-platform/utils';
import { QUEUE_NAMES } from '@ai-platform/config';
import { prisma } from './lib/prisma';
import { getRedis, closeRedis } from './lib/redis';
import { startWorker } from './worker';

const logger = createLogger('image-worker');

async function main(): Promise<void> {
  await prisma.$connect();
  logger.info('Database connected', { action: 'startup' });

  const redis = getRedis();
  await redis.ping();
  logger.info('Redis connected', { action: 'startup' });

  const worker = startWorker();
  logger.info('Worker started', { action: 'startup', queue: QUEUE_NAMES.IMAGE_GENERATION });

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal} — shutting down`, { action: 'shutdown' });
    await worker.close();
    await prisma.$disconnect();
    await closeRedis();
    logger.info('Worker stopped', { action: 'shutdown' });
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((err) => {
  logger.error('Failed to start image worker', {
    action: 'startup_error',
    error: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});
