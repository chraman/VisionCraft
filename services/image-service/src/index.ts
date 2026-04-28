import 'dotenv/config';
import { createLogger } from '@ai-platform/utils';
import { createApp } from './app';
import { prisma } from './lib/prisma';
import { getRedis, closeRedis } from './lib/redis';
import { closeQueue } from './lib/queue';

const logger = createLogger('image-service');
const PORT = parseInt(process.env['PORT'] ?? '3003', 10);

async function main(): Promise<void> {
  await prisma.$connect();
  logger.info('Database connected', { action: 'startup' });

  const redis = getRedis();
  await redis.ping();
  logger.info('Redis connected', { action: 'startup' });

  const app = createApp();

  const server = app.listen(PORT, () => {
    logger.info('Image service started', { action: 'startup', port: PORT });
  });

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal} — shutting down`, { action: 'shutdown' });
    server.close(async () => {
      await closeQueue();
      await prisma.$disconnect();
      await closeRedis();
      logger.info('Image service stopped', { action: 'shutdown' });
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((err) => {
  logger.error('Failed to start image service', {
    action: 'startup_error',
    error: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});
