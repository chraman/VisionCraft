import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { requestId } from './middleware/requestId.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authRouter } from './routes/auth.routes.js';
import { configurePassport, passport } from './lib/passport.js';

export function createApp(): express.Express {
  const app = express();

  // Configure Passport strategies (runs once at startup — logs warning if Google creds missing)
  configurePassport();

  // Security headers
  app.use(helmet());

  // CORS — only api-gateway + local dev calls this service directly in dev
  app.use(
    cors({
      origin: process.env['ALLOWED_ORIGINS']?.split(',') ?? [
        'http://localhost:3000',
        'http://localhost:5173',
      ],
      credentials: true,
    })
  );

  // Body parsing
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false }));

  // Cookies (for refresh token)
  app.use(cookieParser());

  // Passport (session: false — stateless JWT, no session store needed)
  app.use(passport.initialize());

  // Request ID on every request
  app.use(requestId);

  // Health check — unauthenticated
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'auth-service' });
  });

  // Auth routes
  app.use('/api/v1/auth', authRouter);

  // 404
  app.use((_req, res) => {
    res
      .status(404)
      .json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } });
  });

  // Central error handler (must be last)
  app.use(errorHandler);

  return app;
}
