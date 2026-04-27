import { createLogger } from '@ai-platform/utils';
import { createApp } from './app.js';

const logger = createLogger('user-service');
const PORT = parseInt(process.env['PORT'] ?? '3002', 10);

const app = createApp();

app.listen(PORT, () => {
  logger.info('Service started', { action: 'startup', port: PORT });
});
