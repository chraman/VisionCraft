import { Router } from 'express';
import type { Request, Response } from 'express';
import { AppError } from '@ai-platform/types';
import type { User, UserQuota } from '@ai-platform/types';
import { TIERS } from '@ai-platform/config';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { prisma } from '../lib/prisma.js';

export const userRouter = Router();

function requireUserId(req: Request): string {
  const userId = req.headers['x-user-id'] as string | undefined;
  if (!userId) {
    throw new AppError('UNAUTHORIZED', 'Not authenticated', 401);
  }
  return userId;
}

function toUserDTO(user: {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: string;
  tier: string;
  emailVerifiedAt: Date | null;
  isTwoFactorEnabled: boolean;
  credits: number | null;
  teamId: string | null;
  isPublic: boolean;
  apiKeyHash: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}): User {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    role: user.role as User['role'],
    tier: user.tier as User['tier'],
    isEmailVerified: user.emailVerifiedAt !== null,
    isTwoFactorEnabled: user.isTwoFactorEnabled,
    credits: user.credits,
    teamId: user.teamId,
    isPublic: user.isPublic,
    apiKeyHash: user.apiKeyHash,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    deletedAt: user.deletedAt?.toISOString() ?? null,
  };
}

userRouter.get(
  '/me',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = requireUserId(req);

    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });

    if (!user) {
      throw new AppError('NOT_FOUND', 'User not found', 404);
    }

    res.json({
      success: true,
      data: toUserDTO(user),
      requestId: res.locals['requestId'],
    });
  })
);

userRouter.patch(
  '/me',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = requireUserId(req);

    const { name, avatarUrl } = req.body as { name?: string; avatarUrl?: string };

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name !== undefined && { name }),
        ...(avatarUrl !== undefined && { avatarUrl }),
        version: { increment: 1 },
      },
    });

    res.json({
      success: true,
      data: toUserDTO(user),
      requestId: res.locals['requestId'],
    });
  })
);

userRouter.get(
  '/me/quota',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = requireUserId(req);

    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { tier: true, generationsThisMonth: true, quotaResetAt: true },
    });

    if (!user) {
      throw new AppError('NOT_FOUND', 'User not found', 404);
    }

    const quota: UserQuota = {
      used: user.generationsThisMonth,
      limit: TIERS[user.tier].monthlyQuota,
      resetAt: user.quotaResetAt.toISOString(),
      tier: user.tier,
    };

    res.json({
      success: true,
      data: quota,
      requestId: res.locals['requestId'],
    });
  })
);
