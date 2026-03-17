import bcrypt from 'bcrypt';
import { AppError } from '@ai-platform/types';
import { REDIS_KEYS } from '@ai-platform/config';
import { createLogger } from '@ai-platform/utils';
import { userRepository } from '../repositories/user.repository.js';
import { tokenRepository } from '../repositories/token.repository.js';
import { auditRepository } from '../repositories/audit.repository.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  getRefreshTtlSeconds,
} from '../lib/jwt.js';
import { getRedis } from '../lib/redis.js';
import type { RegisterInput, LoginInput } from '../schemas/auth.schemas.js';
import type { GoogleProfile } from '../lib/passport.js';
import type { User } from '@prisma/client';

const logger = createLogger('auth-service');
const BCRYPT_ROUNDS = 12;

export type AuthResult = {
  user: Omit<User, 'passwordHash' | 'totpSecret'>;
  accessToken: string;
  refreshToken: string;
};

function sanitizeUser(user: User): Omit<User, 'passwordHash' | 'totpSecret'> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- excluded from API response for security
  const { passwordHash: _pw, totpSecret: _ts, ...safe } = user;
  return safe;
}

export const authService = {
  async register(
    input: RegisterInput,
    meta: { ipAddress?: string; userAgent?: string }
  ): Promise<AuthResult> {
    const exists = await userRepository.emailExists(input.email);
    if (exists) {
      throw new AppError('DUPLICATE_EMAIL', 'An account with this email already exists', 409);
    }

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    const user = await userRepository.create({
      email: input.email,
      passwordHash,
      name: input.name,
    });

    const { token: accessToken, jti: accessJti } = signAccessToken(user.id, user.role, user.tier);
    const { token: refreshToken, jti: refreshJti } = signRefreshToken(user.id, user.id);

    const ttl = getRefreshTtlSeconds();
    await tokenRepository.create({
      userId: user.id,
      jti: refreshJti,
      family: user.id, // initial family = userId
      expiresAt: new Date(Date.now() + ttl * 1000),
    });

    auditRepository.log({
      userId: user.id,
      action: 'REGISTER',
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    logger.info('User registered', {
      action: 'register',
      userId: user.id,
      accessJti,
    });

    return { user: sanitizeUser(user), accessToken, refreshToken };
  },

  async login(
    input: LoginInput,
    meta: { ipAddress?: string; userAgent?: string }
  ): Promise<AuthResult> {
    const user = await userRepository.findByEmail(input.email);

    if (!user || !user.passwordHash) {
      // Constant-time rejection — don't reveal whether email exists
      await bcrypt.compare(input.password, '$2b$12$invalidhashforconstanttimeXXXXXXXXXXXXXXX');
      auditRepository.log({
        action: 'FAILED_LOGIN',
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        details: { email: `${input.email.split('@')[0]}@***` },
      });
      throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      auditRepository.log({
        userId: user.id,
        action: 'FAILED_LOGIN',
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      });
      throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
    }

    const { token: accessToken, jti: accessJti } = signAccessToken(user.id, user.role, user.tier);
    const { token: refreshToken, jti: refreshJti } = signRefreshToken(user.id, user.id);

    const ttl = getRefreshTtlSeconds();
    await tokenRepository.create({
      userId: user.id,
      jti: refreshJti,
      family: user.id,
      expiresAt: new Date(Date.now() + ttl * 1000),
    });

    auditRepository.log({
      userId: user.id,
      action: 'LOGIN',
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    logger.info('User logged in', {
      action: 'login',
      userId: user.id,
      accessJti,
    });

    return { user: sanitizeUser(user), accessToken, refreshToken };
  },

  async refresh(rawRefreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    let payload;
    try {
      payload = verifyRefreshToken(rawRefreshToken);
    } catch {
      throw new AppError('INVALID_TOKEN', 'Invalid or expired refresh token', 401);
    }

    if (payload.type !== 'refresh') {
      throw new AppError('INVALID_TOKEN', 'Invalid token type', 401);
    }

    const storedToken = await tokenRepository.findByJti(payload.jti);

    if (!storedToken) {
      throw new AppError('INVALID_TOKEN', 'Refresh token not found', 401);
    }

    if (storedToken.revokedAt) {
      // Token reuse detected — revoke entire family
      await tokenRepository.revokeByFamily(payload.family);
      auditRepository.log({
        userId: payload.sub,
        action: 'TOKEN_FAMILY_REVOKED',
        details: { family: payload.family, reason: 'reuse_detected' },
      });
      logger.warn('Token reuse detected — family revoked', {
        action: 'token_reuse',
        userId: payload.sub,
        family: payload.family,
      });
      throw new AppError('INVALID_TOKEN', 'Token reuse detected — please log in again', 401);
    }

    // Rotate: revoke old, issue new
    await tokenRepository.revokeByJti(payload.jti);

    const user = await userRepository.findById(payload.sub);
    if (!user) {
      throw new AppError('UNAUTHORIZED', 'User not found', 401);
    }

    const { token: accessToken, jti: newAccessJti } = signAccessToken(
      user.id,
      user.role,
      user.tier
    );
    const { token: newRefreshToken, jti: newRefreshJti } = signRefreshToken(
      user.id,
      payload.family
    );

    const ttl = getRefreshTtlSeconds();
    await tokenRepository.create({
      userId: user.id,
      jti: newRefreshJti,
      family: payload.family,
      expiresAt: new Date(Date.now() + ttl * 1000),
    });

    logger.info('Token refreshed', {
      action: 'refresh',
      userId: user.id,
      newAccessJti,
    });

    return { accessToken, refreshToken: newRefreshToken };
  },

  async handleOAuthLogin(
    profile: GoogleProfile,
    meta: { ipAddress?: string; userAgent?: string }
  ): Promise<AuthResult> {
    const user = await userRepository.findOrCreateOAuthUser({
      oauthProvider: profile.provider,
      oauthProviderId: profile.id,
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.avatarUrl,
    });

    const { token: accessToken, jti: accessJti } = signAccessToken(user.id, user.role, user.tier);
    const { token: refreshToken, jti: refreshJti } = signRefreshToken(user.id, user.id);

    const ttl = getRefreshTtlSeconds();
    await tokenRepository.create({
      userId: user.id,
      jti: refreshJti,
      family: user.id,
      expiresAt: new Date(Date.now() + ttl * 1000),
    });

    auditRepository.log({
      userId: user.id,
      action: 'OAUTH_LOGIN',
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      details: { provider: profile.provider },
    });

    logger.info('OAuth login', {
      action: 'oauth_login',
      userId: user.id,
      provider: profile.provider,
      accessJti,
    });

    return { user: sanitizeUser(user), accessToken, refreshToken };
  },

  async logout(
    userId: string,
    accessJti: string,
    refreshToken: string | undefined,
    accessTtlRemaining: number,
    meta: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    // Blacklist access token in Redis for remaining TTL
    const redis = getRedis();
    await redis.set(REDIS_KEYS.revokedToken(accessJti), '1', 'EX', Math.max(accessTtlRemaining, 1));

    // Revoke refresh token if provided
    if (refreshToken) {
      try {
        const payload = verifyRefreshToken(refreshToken);
        await tokenRepository.revokeByJti(payload.jti);
      } catch {
        // If refresh token is invalid, that's fine — we still revoke the access token
      }
    }

    auditRepository.log({
      userId,
      action: 'LOGOUT',
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    logger.info('User logged out', { action: 'logout', userId, accessJti });
  },
};
