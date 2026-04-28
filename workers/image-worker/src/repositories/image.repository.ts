import { prisma } from '../lib/prisma';

export type CreateImageData = {
  userId: string;
  jobId: string;
  url: string;
  cdnUrl: string;
  prompt: string;
  model: string;
  provider: string;
  width?: number;
  height?: number;
};

export const workerImageRepository = {
  async upsert(data: CreateImageData): Promise<{ id: string }> {
    const image = await prisma.image.upsert({
      where: { jobId: data.jobId },
      create: {
        userId: data.userId,
        jobId: data.jobId,
        url: data.url,
        cdnUrl: data.cdnUrl,
        prompt: data.prompt,
        model: data.model,
        provider: data.provider,
        width: data.width,
        height: data.height,
        isSaved: false,
      },
      update: {
        url: data.url,
        cdnUrl: data.cdnUrl,
        model: data.model,
        provider: data.provider,
        width: data.width,
        height: data.height,
        version: { increment: 1 },
      },
      select: { id: true },
    });
    return image;
  },
};
