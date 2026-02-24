import { createLogger } from '@ai-platform/utils';

const logger = createLogger('api-gateway');

// Sprint 1: Full Express app with JWT middleware, rate limiting, and routing
// For now: health check stub
const PORT = parseInt(process.env['PORT'] ?? '3000', 10);

import http from 'http';

const server = http.createServer((_, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok', service: 'api-gateway' }));
});

server.listen(PORT, () => {
  logger.info('Service started', { action: 'startup', port: PORT });
});
