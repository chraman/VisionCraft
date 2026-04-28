import type { GenerationJob, JobStatus, GenerationJobType, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

export type CreateJobData = {
  userId: string;
  type: GenerationJobType;
  prompt: string;
  negativePrompt?: string;
  model: string;
  aspectRatio: string;
  quality: string;
  metadata?: Record<string, unknown>;
};

type JobWithImage = GenerationJob & { image: { id: string } | null };

export const jobRepository = {
  async create(data: CreateJobData): Promise<JobWithImage> {
    return prisma.generationJob.create({
      data: {
        userId: data.userId,
        type: data.type,
        status: 'PENDING',
        prompt: data.prompt,
        negativePrompt: data.negativePrompt,
        model: data.model,
        aspectRatio: data.aspectRatio,
        quality: data.quality,
        metadata: data.metadata as Prisma.InputJsonValue,
      },
      include: { image: { select: { id: true } } },
    });
  },

  async findById(id: string): Promise<JobWithImage | null> {
    return prisma.generationJob.findFirst({
      where: { id, deletedAt: null },
      include: { image: { select: { id: true } } },
    });
  },

  async findByIdAndUser(id: string, userId: string): Promise<JobWithImage | null> {
    return prisma.generationJob.findFirst({
      where: { id, userId, deletedAt: null },
      include: { image: { select: { id: true } } },
    });
  },

  async updateStatus(
    id: string,
    status: JobStatus,
    extra?: { startedAt?: Date; completedAt?: Date; errorMessage?: string }
  ): Promise<JobWithImage> {
    return prisma.generationJob.update({
      where: { id },
      data: {
        status,
        ...(extra?.startedAt && { startedAt: extra.startedAt }),
        ...(extra?.completedAt && { completedAt: extra.completedAt }),
        ...(extra?.errorMessage !== undefined && { errorMessage: extra.errorMessage }),
        version: { increment: 1 },
      },
      include: { image: { select: { id: true } } },
    });
  },
};
