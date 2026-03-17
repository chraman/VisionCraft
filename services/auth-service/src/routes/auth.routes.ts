import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getPublicKey } from '../lib/jwt.js';
import { passport } from '../lib/passport.js';
import { authService } from '../services/auth.service.js';
import { SERVICE_URLS } from '@ai-platform/config';
import type { GoogleProfile } from '../lib/passport.js';

export const authRouter = Router();

/**
 * @openapi
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 8 }
 *               name: { type: string }
 *     responses:
 *       201:
 *         description: User registered successfully
 *       409:
 *         description: Email already in use
 */
authRouter.post('/register', asyncHandler(authController.register));

/**
 * @openapi
 * /api/v1/auth/login:
 *   post:
 *     summary: Log in with email + password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Login successful, returns access token
 *       401:
 *         description: Invalid credentials
 */
authRouter.post('/login', asyncHandler(authController.login));

/**
 * @openapi
 * /api/v1/auth/refresh:
 *   post:
 *     summary: Rotate access token using httpOnly refresh cookie
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: New access token issued
 *       401:
 *         description: Invalid or expired refresh token
 */
authRouter.post('/refresh', asyncHandler(authController.refresh));

/**
 * @openapi
 * /api/v1/auth/logout:
 *   post:
 *     summary: Revoke tokens and clear session
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out
 */
authRouter.post('/logout', asyncHandler(authController.logout));

/**
 * @openapi
 * /api/v1/auth/me:
 *   get:
 *     summary: Get current authenticated user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user
 */
authRouter.get('/me', asyncHandler(authController.me));

/**
 * @openapi
 * /api/v1/auth/public-key:
 *   get:
 *     summary: Get the RS256 public key for JWT verification
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: PEM-encoded public key
 */
authRouter.get('/public-key', (_req, res) => {
  res.json({
    success: true,
    data: { publicKey: getPublicKey() },
    requestId: res.locals['requestId'],
  });
});

// ─── Google OAuth ─────────────────────────────────────────────────────────────

const GOOGLE_SCOPES = ['email', 'profile'];
const REFRESH_COOKIE = 'refresh_token';
const REFRESH_COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env['NODE_ENV'] === 'production',
  sameSite: 'strict' as const,
  path: '/api/v1/auth',
  maxAge: parseInt(process.env['JWT_REFRESH_TTL'] ?? '604800', 10) * 1000,
};

function googleConfigured(): boolean {
  return Boolean(process.env['GOOGLE_CLIENT_ID'] && process.env['GOOGLE_CLIENT_SECRET']);
}

/**
 * @openapi
 * /api/v1/auth/google:
 *   get:
 *     summary: Initiate Google OAuth flow
 *     tags: [Auth]
 *     responses:
 *       302:
 *         description: Redirect to Google consent screen
 *       501:
 *         description: Google OAuth not configured
 */
authRouter.get('/google', (req: Request, res: Response, next: NextFunction) => {
  if (!googleConfigured()) {
    res.status(501).json({
      success: false,
      error: { code: 'FEATURE_DISABLED', message: 'Google OAuth not configured' },
      requestId: res.locals['requestId'],
    });
    return;
  }
  passport.authenticate('google', { scope: GOOGLE_SCOPES, session: false })(req, res, next);
});

/**
 * @openapi
 * /api/v1/auth/google/callback:
 *   get:
 *     summary: Google OAuth callback — called by Google after consent
 *     tags: [Auth]
 *     responses:
 *       302:
 *         description: Redirect to frontend with access token
 */
authRouter.get(
  '/google/callback',
  (req: Request, res: Response, next: NextFunction) => {
    const frontendUrl = SERVICE_URLS.FRONTEND();
    passport.authenticate('google', {
      session: false,
      failureRedirect: `${frontendUrl}/login?error=oauth_failed`,
    })(req, res, next);
  },
  asyncHandler(async (req: Request, res: Response) => {
    const profile = req.user as GoogleProfile;
    const result = await authService.handleOAuthLogin(profile, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.cookie(REFRESH_COOKIE, result.refreshToken, REFRESH_COOKIE_OPTS);

    const frontendUrl = SERVICE_URLS.FRONTEND();
    const userEncoded = Buffer.from(JSON.stringify(result.user)).toString('base64');
    res.redirect(
      `${frontendUrl}/auth/callback?token=${encodeURIComponent(result.accessToken)}&user=${userEncoded}`
    );
  })
);
