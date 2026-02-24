import { createLogger } from '@ai-platform/utils';
import http from 'http';

const logger = createLogger('image-service');
const PORT = parseInt(process.env['PORT'] ?? '3003', 10);

const server = http.createServer((_, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok', service: 'image-service' }));
});

server.listen(PORT, () => {
  logger.info('Service started', { action: 'startup', port: PORT });
});
