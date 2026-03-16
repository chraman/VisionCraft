import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { requestId } from './middleware/requestId.js';
import { errorHandler } from './middleware/errorHandler.js';
import { proxyRouter } from './routes/proxy.routes.js';

export function createApp(): express.Express {
  const app = express();

  app.use(helmet());

  const allowedOrigins = (process.env['ALLOWED_ORIGINS'] ?? 'http://localhost:5173').split(',');
  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
    })
  );

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());
  app.use(requestId);

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'api-gateway' });
  });

  app.use('/api', proxyRouter);

  app.use(errorHandler);

  return app;
}
