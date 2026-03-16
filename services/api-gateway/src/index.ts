import 'dotenv/config';
import { createLogger } from '@ai-platform/utils';
import { createApp } from './app.js';

const logger = createLogger('api-gateway');
const PORT = parseInt(process.env['PORT'] ?? '3000', 10);

const app = createApp();

const server = app.listen(PORT, () => {
  logger.info('API gateway started', { action: 'startup', port: PORT });
});

const shutdown = (signal: string) => {
  logger.info(`Received ${signal} — shutting down`, { action: 'shutdown' });
  server.close(() => {
    logger.info('API gateway stopped', { action: 'shutdown' });
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
