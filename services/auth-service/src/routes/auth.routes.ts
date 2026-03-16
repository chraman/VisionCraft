import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getPublicKey } from '../lib/jwt.js';

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

// Google OAuth — stubbed until Google credentials configured
authRouter.get('/google', (_req, res) => {
  res.status(501).json({
    success: false,
    error: { code: 'FEATURE_DISABLED', message: 'Google OAuth not configured' },
    requestId: res.locals['requestId'],
  });
});
