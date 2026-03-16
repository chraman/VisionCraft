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
};
