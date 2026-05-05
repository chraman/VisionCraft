import type { Influencer, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

export type CreateInfluencerData = {
  userId: string;
  name: string;
  description?: string;
  sourceImageUrl?: string;
  characterDna: Record<string, unknown>;
};

export type PaginatedInfluencers = { influencers: Influencer[]; total: number };

export const influencerRepository = {
  async create(data: CreateInfluencerData): Promise<Influencer> {
    return prisma.influencer.create({
      data: {
        userId: data.userId,
        name: data.name,
        description: data.description,
        sourceImageUrl: data.sourceImageUrl,
        characterDna: data.characterDna as Prisma.InputJsonValue,
      },
    });
  },

  async findById(id: string): Promise<Influencer | null> {
    return prisma.influencer.findFirst({ where: { id, deletedAt: null } });
  },

  async findByIdAndUser(id: string, userId: string): Promise<Influencer | null> {
    return prisma.influencer.findFirst({ where: { id, userId, deletedAt: null } });
  },

  async findByUser(
    userId: string,
    params: { limit: number; cursor?: string; order?: 'asc' | 'desc' }
  ): Promise<PaginatedInfluencers> {
    const { limit, cursor, order = 'desc' } = params;
    const [influencers, total] = await Promise.all([
      prisma.influencer.findMany({
        where: { userId, deletedAt: null },
        orderBy: { createdAt: order },
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      }),
      prisma.influencer.count({ where: { userId, deletedAt: null } }),
    ]);
    return { influencers, total };
  },

  async softDelete(id: string): Promise<void> {
    await prisma.influencer.update({
      where: { id },
      data: { deletedAt: new Date(), version: { increment: 1 } },
    });
  },
};
