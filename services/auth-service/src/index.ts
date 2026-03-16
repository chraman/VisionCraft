import 'dotenv/config';
import { createLogger } from '@ai-platform/utils';
import { createApp } from './app.js';
import { prisma } from './lib/prisma.js';
import { getRedis, closeRedis } from './lib/redis.js';

const logger = createLogger('auth-service');
const PORT = parseInt(process.env['PORT'] ?? '3001', 10);

async function main(): Promise<void> {
  // Validate DB connection
  await prisma.$connect();
  logger.info('Database connected', { action: 'startup' });

  // Validate Redis connection
  const redis = getRedis();
  await redis.ping();
  logger.info('Redis connected', { action: 'startup' });

  const app = createApp();

  const server = app.listen(PORT, () => {
    logger.info('Auth service started', { action: 'startup', port: PORT });
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal} — shutting down`, { action: 'shutdown' });
    server.close(async () => {
      await prisma.$disconnect();
      await closeRedis();
      logger.info('Auth service stopped', { action: 'shutdown' });
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  logger.error('Failed to start auth service', {
    action: 'startup_error',
    error: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});
