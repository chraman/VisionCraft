import type { AuthToken } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export type CreateTokenData = {
  userId: string;
  jti: string;
  family: string;
  expiresAt: Date;
};

export const tokenRepository = {
  async create(data: CreateTokenData): Promise<AuthToken> {
    return prisma.authToken.create({ data });
  },

  async findByJti(jti: string): Promise<AuthToken | null> {
    return prisma.authToken.findFirst({
      where: { jti, deletedAt: null },
    });
  },

  async findActiveByFamily(family: string): Promise<AuthToken[]> {
    return prisma.authToken.findMany({
      where: { family, revokedAt: null, deletedAt: null },
    });
  },

  async revokeByJti(jti: string): Promise<void> {
    await prisma.authToken.updateMany({
      where: { jti },
      data: { revokedAt: new Date() },
    });
  },

  async revokeByFamily(family: string): Promise<void> {
    await prisma.authToken.updateMany({
      where: { family, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  async revokeAllForUser(userId: string): Promise<void> {
    await prisma.authToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },
};
