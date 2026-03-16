import jwt from 'jsonwebtoken';
import { randomUUID, generateKeyPairSync } from 'crypto';
import { createLogger } from '@ai-platform/utils';
import type { UserRole, UserTier } from '@ai-platform/types';

const logger = createLogger('auth-service');

// ─── Dev key generation ───────────────────────────────────────────────────────

let _privateKey: string;
let _publicKey: string;

function getKeys(): { privateKey: string; publicKey: string } {
  if (_privateKey && _publicKey) {
    return { privateKey: _privateKey, publicKey: _publicKey };
  }

  const envPrivate = process.env['JWT_PRIVATE_KEY'];
  const envPublic = process.env['JWT_PUBLIC_KEY'];

  if (envPrivate && envPublic) {
    _privateKey = envPrivate.replace(/\\n/g, '\n');
    _publicKey = envPublic.replace(/\\n/g, '\n');
    return { privateKey: _privateKey, publicKey: _publicKey };
  }

  if (process.env['NODE_ENV'] !== 'development') {
    throw new Error(
      'JWT_PRIVATE_KEY and JWT_PUBLIC_KEY must be set in non-development environments'
    );
  }

  logger.warn(
    'JWT keys not set — auto-generating in-memory dev keys (tokens will reset on restart)',
    {
      action: 'jwt_dev_keygen',
    }
  );

  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  _privateKey = privateKey as string;
  _publicKey = publicKey as string;
  return { privateKey: _privateKey, publicKey: _publicKey };
}

// ─── Token payloads ───────────────────────────────────────────────────────────

export interface AccessTokenPayload {
  sub: string; // userId
  jti: string;
  type: 'access';
  role: UserRole;
  tier: UserTier;
  iat: number;
  exp: number;
}

export interface RefreshTokenPayload {
  sub: string; // userId
  jti: string;
  family: string;
  type: 'refresh';
  iat: number;
  exp: number;
}

// ─── Sign ─────────────────────────────────────────────────────────────────────

export function signAccessToken(
  userId: string,
  role: UserRole,
  tier: UserTier
): { token: string; jti: string } {
  const { privateKey } = getKeys();
  const jti = randomUUID();
  const ttl = parseInt(process.env['JWT_ACCESS_TTL'] ?? '900', 10);

  const token = jwt.sign({ sub: userId, jti, type: 'access', role, tier }, privateKey, {
    algorithm: 'RS256',
    expiresIn: ttl,
  });

  return { token, jti };
}

export function signRefreshToken(userId: string, family: string): { token: string; jti: string } {
  const { privateKey } = getKeys();
  const jti = randomUUID();
  const ttl = parseInt(process.env['JWT_REFRESH_TTL'] ?? '604800', 10);

  const token = jwt.sign({ sub: userId, jti, family, type: 'refresh' }, privateKey, {
    algorithm: 'RS256',
    expiresIn: ttl,
  });

  return { token, jti };
}

// ─── Verify ───────────────────────────────────────────────────────────────────

export function verifyAccessToken(token: string): AccessTokenPayload {
  const { publicKey } = getKeys();
  return jwt.verify(token, publicKey, { algorithms: ['RS256'] }) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const { publicKey } = getKeys();
  return jwt.verify(token, publicKey, { algorithms: ['RS256'] }) as RefreshTokenPayload;
}

export function getPublicKey(): string {
  return getKeys().publicKey;
}

export function getRefreshTtlSeconds(): number {
  return parseInt(process.env['JWT_REFRESH_TTL'] ?? '604800', 10);
}
