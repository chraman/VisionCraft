import { AppError } from '@ai-platform/types';
import { TIERS, REDIS_KEYS, REDIS_TTL } from '@ai-platform/config';
import type { UserTier } from '@ai-platform/types';
import { prisma } from '../lib/prisma';
import { getRedis } from '../lib/redis';

type QuotaCache = { used: number; limit: number };

function getNextMonthReset(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

export async function checkQuota(userId: string, tier: string): Promise<void> {
  const redis = getRedis();
  const cacheKey = REDIS_KEYS.quota(userId);
  const cached = await redis.get(cacheKey);

  let used: number;
  let limit: number;

  if (cached) {
    const parsed = JSON.parse(cached) as QuotaCache;
    used = parsed.used;
    limit = parsed.limit;
  } else {
    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { generationsThisMonth: true, quotaResetAt: true },
    });
    if (!user) throw new AppError('NOT_FOUND', 'User not found', 404);

    if (new Date() > user.quotaResetAt) {
      await prisma.user.update({
        where: { id: userId },
        data: { generationsThisMonth: 0, quotaResetAt: getNextMonthReset() },
      });
      used = 0;
    } else {
      used = user.generationsThisMonth;
    }

    limit = TIERS[(tier as UserTier) in TIERS ? (tier as UserTier) : 'free'].monthlyQuota;

    await redis.set(cacheKey, JSON.stringify({ used, limit }), 'EX', REDIS_TTL.QUOTA);
  }

  if (used >= limit) {
    throw new AppError('QUOTA_EXCEEDED', 'Monthly generation limit reached', 429, {
      used,
      limit,
      tier,
    });
  }
}

export async function invalidateQuotaCache(userId: string): Promise<void> {
  await getRedis().del(REDIS_KEYS.quota(userId));
}
