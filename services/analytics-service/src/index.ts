import { createLogger } from '@ai-platform/utils';
import http from 'http';

const logger = createLogger('analytics-service');
const PORT = parseInt(process.env['PORT'] ?? '3005', 10);

const server = http.createServer((_, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok', service: 'analytics-service' }));
});

server.listen(PORT, () => {
  logger.info('Service started', { action: 'startup', port: PORT });
});
