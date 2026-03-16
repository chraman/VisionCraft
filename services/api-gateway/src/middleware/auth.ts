import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import { AppError } from '@ai-platform/types';
import { REDIS_KEYS } from '@ai-platform/config';
import { createLogger } from '@ai-platform/utils';
import { getRedis } from '../lib/redis.js';

const logger = createLogger('api-gateway');

let _publicKey: string | null = null;

async function getPublicKey(): Promise<string> {
  if (_publicKey) return _publicKey;

  const envKey = process.env['JWT_PUBLIC_KEY'];
  if (envKey) {
    _publicKey = envKey.replace(/\\n/g, '\n');
    return _publicKey;
  }

  // Fetch from auth-service if not set locally (allows key rotation without gateway restart)
  const authUrl = process.env['AUTH_SERVICE_URL'] ?? 'http://localhost:3001';
  try {
    const res = await axios.get<{ data: { publicKey: string } }>(
      `${authUrl}/api/v1/auth/public-key`
    );
    _publicKey = res.data.data.publicKey;
    logger.info('Fetched JWT public key from auth-service', { action: 'key_fetch' });
    return _publicKey;
  } catch {
    throw new AppError('INTERNAL_ERROR', 'Unable to fetch JWT public key from auth-service', 503);
  }
}

export interface JwtPayload {
  sub: string;
  jti: string;
  type: string;
  role: string;
  tier: string;
  iat: number;
  exp: number;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) {
    return next(new AppError('UNAUTHORIZED', 'Authentication required', 401));
  }

  const token = authHeader.slice(7);

  let payload: JwtPayload;
  try {
    const publicKey = await getPublicKey();
    payload = jwt.verify(token, publicKey, { algorithms: ['RS256'] }) as JwtPayload;
  } catch (_err: unknown) {
    if (_err instanceof jwt.TokenExpiredError) {
      return next(new AppError('TOKEN_EXPIRED', 'Access token expired', 401));
    }
    return next(new AppError('INVALID_TOKEN', 'Invalid access token', 401));
  }

  if (payload.type !== 'access') {
    return next(new AppError('INVALID_TOKEN', 'Invalid token type', 401));
  }

  // Check Redis blacklist
  try {
    const redis = getRedis();
    const revoked = await redis.get(REDIS_KEYS.revokedToken(payload.jti));
    if (revoked) {
      return next(new AppError('INVALID_TOKEN', 'Token has been revoked', 401));
    }
  } catch {
    // If Redis is down, allow request but log the degradation
    logger.warn('Redis unavailable for token blacklist check — allowing request', {
      action: 'redis_degraded',
      userId: payload.sub,
    });
  }

  // Attach user context as headers for downstream services
  req.headers['x-user-id'] = payload.sub;
  req.headers['x-user-role'] = payload.role;
  req.headers['x-user-tier'] = payload.tier;
  req.headers['x-access-jti'] = payload.jti;

  next();
}

export function requireRole(role: 'admin') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (req.headers['x-user-role'] !== role) {
      return next(new AppError('FORBIDDEN', 'Insufficient permissions', 403));
    }
    next();
  };
}
