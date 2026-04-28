import type { Image, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

export type CreateImageData = {
  userId: string;
  jobId: string;
  url: string;
  cdnUrl?: string;
  prompt: string;
  negativePrompt?: string;
  model: string;
  provider: string;
  width?: number;
  height?: number;
  seed?: number;
  metadata?: Record<string, unknown>;
};

export type PaginatedImages = {
  images: Image[];
  total: number;
};

export const imageRepository = {
  async create(data: CreateImageData): Promise<Image> {
    return prisma.image.create({
      data: {
        userId: data.userId,
        jobId: data.jobId,
        url: data.url,
        cdnUrl: data.cdnUrl,
        prompt: data.prompt,
        negativePrompt: data.negativePrompt,
        model: data.model,
        provider: data.provider,
        width: data.width,
        height: data.height,
        seed: data.seed,
        isSaved: false,
        metadata: data.metadata as Prisma.InputJsonValue,
      },
    });
  },

  async findById(id: string): Promise<Image | null> {
    return prisma.image.findFirst({
      where: { id, deletedAt: null },
    });
  },

  async findByIdAndUser(id: string, userId: string): Promise<Image | null> {
    return prisma.image.findFirst({
      where: { id, userId, deletedAt: null },
    });
  },

  async findSavedByUser(
    userId: string,
    params: { limit: number; cursor?: string; order?: 'asc' | 'desc' }
  ): Promise<PaginatedImages> {
    const { limit, cursor, order = 'desc' } = params;

    const [images, total] = await Promise.all([
      prisma.image.findMany({
        where: { userId, isSaved: true, deletedAt: null },
        orderBy: { createdAt: order },
        take: limit + 1,
        ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      }),
      prisma.image.count({
        where: { userId, isSaved: true, deletedAt: null },
      }),
    ]);

    return { images, total };
  },

  async setSaved(id: string, userId: string, isSaved: boolean): Promise<Image> {
    return prisma.image.update({
      where: { id },
      data: {
        isSaved,
        version: { increment: 1 },
      },
    });
  },

  async softDelete(id: string, userId: string): Promise<void> {
    await prisma.image.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        version: { increment: 1 },
      },
    });
    void userId; // ownership already verified by caller
  },
};
