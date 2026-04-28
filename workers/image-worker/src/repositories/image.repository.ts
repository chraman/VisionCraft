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
  async create(data: CreateImageData): Promise<{ id: string }> {
    const image = await prisma.image.create({
      data: {
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
      select: { id: true },
    });
    return image;
  },
};
