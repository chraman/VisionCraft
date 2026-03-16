import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '@ai-platform/types';
import { authService } from '../services/auth.service.js';
import { registerSchema, loginSchema } from '../schemas/auth.schemas.js';
import { verifyAccessToken } from '../lib/jwt.js';
import { userRepository } from '../repositories/user.repository.js';

const REFRESH_COOKIE = 'refresh_token';
const REFRESH_COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env['NODE_ENV'] === 'production',
  sameSite: 'strict' as const,
  path: '/api/v1/auth',
  maxAge: parseInt(process.env['JWT_REFRESH_TTL'] ?? '604800', 10) * 1000,
};

function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE, token, REFRESH_COOKIE_OPTS);
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, { ...REFRESH_COOKIE_OPTS, maxAge: 0 });
}

function getMeta(req: Request) {
  return {
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  };
}

export const authController = {
  async register(req: Request, res: Response): Promise<void> {
    let input;
    try {
      input = registerSchema.parse(req.body);
    } catch (err) {
      if (err instanceof ZodError) {
        throw new AppError('VALIDATION_ERROR', err.errors[0]?.message ?? 'Validation failed', 400, {
          fields: err.flatten().fieldErrors,
        });
      }
      throw err;
    }

    const result = await authService.register(input, getMeta(req));
    setRefreshCookie(res, result.refreshToken);

    res.status(201).json({
      success: true,
      data: { user: result.user, accessToken: result.accessToken },
      requestId: res.locals['requestId'],
    });
  },

  async login(req: Request, res: Response): Promise<void> {
    let input;
    try {
      input = loginSchema.parse(req.body);
    } catch (err) {
      if (err instanceof ZodError) {
        throw new AppError('VALIDATION_ERROR', err.errors[0]?.message ?? 'Validation failed', 400, {
          fields: err.flatten().fieldErrors,
        });
      }
      throw err;
    }

    const result = await authService.login(input, getMeta(req));
    setRefreshCookie(res, result.refreshToken);

    res.json({
      success: true,
      data: { user: result.user, accessToken: result.accessToken },
      requestId: res.locals['requestId'],
    });
  },

  async refresh(req: Request, res: Response): Promise<void> {
    const rawRefreshToken = req.cookies?.[REFRESH_COOKIE] as string | undefined;

    if (!rawRefreshToken) {
      throw new AppError('UNAUTHORIZED', 'No refresh token provided', 401);
    }

    const { accessToken, refreshToken } = await authService.refresh(rawRefreshToken);
    setRefreshCookie(res, refreshToken);

    res.json({
      success: true,
      data: { accessToken },
      requestId: res.locals['requestId'],
    });
  },

  async logout(req: Request, res: Response): Promise<void> {
    const authHeader = req.headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
      clearRefreshCookie(res);
      res.json({ success: true, data: null, requestId: res.locals['requestId'] });
      return;
    }

    const token = authHeader.slice(7);
    try {
      const payload = verifyAccessToken(token);
      const now = Math.floor(Date.now() / 1000);
      const remaining = payload.exp - now;

      await authService.logout(
        payload.sub,
        payload.jti,
        req.cookies?.[REFRESH_COOKIE] as string | undefined,
        remaining,
        getMeta(req)
      );
    } catch {
      // Even if token invalid, clear cookie and return success
    }

    clearRefreshCookie(res);
    res.json({ success: true, data: null, requestId: res.locals['requestId'] });
  },

  async me(req: Request, res: Response): Promise<void> {
    // userId attached by JWT middleware on the gateway — exposed via x-user-id header
    const userId = req.headers['x-user-id'] as string | undefined;
    if (!userId) {
      throw new AppError('UNAUTHORIZED', 'Not authenticated', 401);
    }

    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError('NOT_FOUND', 'User not found', 404);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- excluded from API response for security
    const { passwordHash: _pw, totpSecret: _ts, ...safeUser } = user;

    res.json({
      success: true,
      data: safeUser,
      requestId: res.locals['requestId'],
    });
  },
};
