import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { requestId } from './middleware/requestId.js';
import { errorHandler } from './middleware/errorHandler.js';
import { userRouter } from './routes/user.routes.js';

export function createApp(): express.Express {
  const app = express();

  app.use(helmet());

  app.use(
    cors({
      origin: process.env['ALLOWED_ORIGINS']?.split(',') ?? [
        'http://localhost:3000',
        'http://localhost:5173',
      ],
      credentials: true,
    })
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false }));
  app.use(requestId);

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'user-service' });
  });

  app.use('/api/v1/users', userRouter);

  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Route not found' },
    });
  });

  app.use(errorHandler);

  return app;
}
