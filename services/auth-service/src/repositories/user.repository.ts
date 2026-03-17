import type { User, Prisma } from '@prisma/client';
import { AppError } from '@ai-platform/types';
import { prisma } from '../lib/prisma.js';

export type CreateUserData = {
  email: string;
  passwordHash?: string;
  name?: string;
  avatarUrl?: string;
};

export type UpdateUserData = Partial<{
  emailVerifiedAt: Date;
  passwordHash: string;
  name: string;
  avatarUrl: string;
  isTwoFactorEnabled: boolean;
  totpSecret: string | null;
  generationsThisMonth: number;
  quotaResetAt: Date;
  deletedAt: Date | null;
}>;

export const userRepository = {
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null },
    });
  },

  async findById(id: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: { id, deletedAt: null },
    });
  },

  async create(data: CreateUserData): Promise<User> {
    return prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash: data.passwordHash,
        name: data.name,
        avatarUrl: data.avatarUrl,
      },
    });
  },

  async update(id: string, data: UpdateUserData, version: number): Promise<User> {
    try {
      return await prisma.user.update({
        where: { id, version },
        data: { ...data, version: { increment: 1 } },
      });
    } catch (err) {
      const prismaErr = err as Prisma.PrismaClientKnownRequestError;
      if (prismaErr.code === 'P2025') {
        throw new AppError('RESOURCE_CONFLICT', 'User was modified concurrently', 409);
      }
      throw err;
    }
  },

  async emailExists(email: string): Promise<boolean> {
    const count = await prisma.user.count({
      where: { email: email.toLowerCase() },
    });
    return count > 0;
  },

  async findOrCreateOAuthUser(data: {
    oauthProvider: string;
    oauthProviderId: string;
    email: string;
    name?: string;
    avatarUrl?: string;
  }): Promise<User> {
    const email = data.email.toLowerCase();

    // 1. Find by provider + provider ID (returning user)
    const byProvider = await prisma.user.findFirst({
      where: {
        oauthProvider: data.oauthProvider,
        oauthProviderId: data.oauthProviderId,
        deletedAt: null,
      },
    });
    if (byProvider) {
      // Refresh name/avatar in case they changed on Google's side
      return prisma.user.update({
        where: { id: byProvider.id },
        data: { name: data.name, avatarUrl: data.avatarUrl, version: { increment: 1 } },
      });
    }

    // 2. Email already exists — link OAuth to the existing account
    const byEmail = await prisma.user.findFirst({
      where: { email, deletedAt: null },
    });
    if (byEmail) {
      return prisma.user.update({
        where: { id: byEmail.id },
        data: {
          oauthProvider: data.oauthProvider,
          oauthProviderId: data.oauthProviderId,
          avatarUrl: byEmail.avatarUrl ?? data.avatarUrl,
          emailVerifiedAt: byEmail.emailVerifiedAt ?? new Date(),
          version: { increment: 1 },
        },
      });
    }

    // 3. New user — create
    return prisma.user.create({
      data: {
        email,
        name: data.name,
        avatarUrl: data.avatarUrl,
        oauthProvider: data.oauthProvider,
        oauthProviderId: data.oauthProviderId,
        emailVerifiedAt: new Date(), // Google-verified emails are trusted
      },
    });
  },
};
