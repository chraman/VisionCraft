export type UserTier = 'free' | 'pro' | 'enterprise';

export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: UserRole;
  tier: UserTier;
  isEmailVerified: boolean;
  isTwoFactorEnabled: boolean;
  // Reserved for Phase 2-3 features
  credits: number | null;
  teamId: string | null;
  isPublic: boolean;
  apiKeyHash: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface UserQuota {
  used: number;
  limit: number;
  resetAt: string;
  tier: UserTier;
}

export interface AuthToken {
  id: string;
  userId: string;
  jti: string;
  family: string;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
}
