import { createLogger } from '@ai-platform/utils';

const logger = createLogger('image-worker');

// Sprint 3: Full BullMQ worker implementation
// For now: log and keep alive
logger.info('Worker started', { action: 'startup', queue: 'image-generation' });

// Keep the process alive
setInterval(() => {
  logger.info('Worker heartbeat', { action: 'heartbeat' });
}, 60_000);
