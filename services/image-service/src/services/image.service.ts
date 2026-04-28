import { randomUUID } from 'crypto';
import { AppError } from '@ai-platform/types';
import { REDIS_KEYS, REDIS_TTL, QUEUE_NAMES } from '@ai-platform/config';
import type { Image } from '@prisma/client';
import { jobRepository } from '../repositories/job.repository';
import { imageRepository } from '../repositories/image.repository';
import { checkQuota } from './quota.service';
import { getRedis } from '../lib/redis';
import { getImageQueue } from '../lib/queue';
import { generatePresignedUploadUrl, toCdnUrl } from '../lib/s3';
import type {
  GenerateTextInput,
  GenerateImageInput,
  UploadUrlInput,
  ListImagesInput,
} from '../schemas/image.schemas';

export type GenerateJobResponse = { jobId: string; status: string };

export type PaginatedImagesResponse = {
  data: Image[];
  pagination: { nextCursor: string | null; hasMore: boolean; total: number };
};

export const imageService = {
  async createTextJob(
    userId: string,
    tier: string,
    input: GenerateTextInput
  ): Promise<GenerateJobResponse> {
    await checkQuota(userId, tier);

    const job = await jobRepository.create({
      userId,
      type: 'TEXT2IMG',
      prompt: input.prompt,
      negativePrompt: input.negativePrompt,
      model: input.model ?? 'sdxl',
      aspectRatio: input.aspectRatio ?? '1:1',
      quality: input.quality ?? 'standard',
    });

    const payload = {
      jobId: job.id,
      userId,
      type: 'TEXT2IMG' as const,
      prompt: input.prompt,
      negativePrompt: input.negativePrompt,
      model: input.model ?? 'sdxl',
      aspectRatio: input.aspectRatio ?? '1:1',
      quality: input.quality ?? 'standard',
    };

    await getRedis().set(
      REDIS_KEYS.jobStatus(job.id),
      JSON.stringify({ jobId: job.id, userId, status: 'PENDING' }),
      'EX',
      REDIS_TTL.JOB_STATUS
    );

    await getImageQueue().add(QUEUE_NAMES.IMAGE_GENERATION, payload);

    return { jobId: job.id, status: 'PENDING' };
  },

  async createImageJob(
    userId: string,
    tier: string,
    input: GenerateImageInput
  ): Promise<GenerateJobResponse> {
    await checkQuota(userId, tier);

    const job = await jobRepository.create({
      userId,
      type: 'IMG2IMG',
      prompt: input.prompt,
      model: input.model ?? 'sdxl',
      aspectRatio: '1:1',
      quality: 'standard',
      metadata: { imageUrl: input.imageUrl, strength: input.strength ?? 0.75 },
    });

    const payload = {
      jobId: job.id,
      userId,
      type: 'IMG2IMG' as const,
      prompt: input.prompt,
      model: input.model ?? 'sdxl',
      aspectRatio: '1:1',
      quality: 'standard',
      imageUrl: input.imageUrl,
      strength: input.strength ?? 0.75,
    };

    await getRedis().set(
      REDIS_KEYS.jobStatus(job.id),
      JSON.stringify({ jobId: job.id, userId, status: 'PENDING' }),
      'EX',
      REDIS_TTL.JOB_STATUS
    );

    await getImageQueue().add(QUEUE_NAMES.IMAGE_GENERATION, payload);

    return { jobId: job.id, status: 'PENDING' };
  },

  async getPresignedUploadUrl(input: UploadUrlInput): Promise<{ uploadUrl: string; key: string }> {
    const bucket = process.env['AWS_BUCKET_UPLOADS'] ?? 'uploads';
    const ext = input.filename.split('.').pop() ?? 'jpg';
    const key = `uploads/${randomUUID()}.${ext}`;
    const uploadUrl = await generatePresignedUploadUrl(bucket, key, input.contentType);
    return { uploadUrl, key };
  },

  async getJobWithOwnership(jobId: string, userId: string) {
    const job = await jobRepository.findByIdAndUser(jobId, userId);
    if (!job) throw new AppError('NOT_FOUND', 'Job not found', 404);
    return {
      ...job,
      imageId: job.image?.id ?? null,
      cdnUrl: job.image ? ((await imageRepository.findById(job.image.id))?.cdnUrl ?? null) : null,
    };
  },

  async listSavedImages(userId: string, params: ListImagesInput): Promise<PaginatedImagesResponse> {
    const limit = params.limit ?? 20;
    const { images, total } = await imageRepository.findSavedByUser(userId, {
      limit,
      cursor: params.cursor,
      order: params.order ?? 'desc',
    });

    const hasMore = images.length > limit;
    const items = hasMore ? images.slice(0, limit) : images;
    const nextCursor = hasMore ? (items[items.length - 1]?.id ?? null) : null;

    return {
      data: items,
      pagination: { nextCursor, hasMore, total },
    };
  },

  async saveImage(imageId: string, userId: string): Promise<void> {
    const image = await imageRepository.findByIdAndUser(imageId, userId);
    if (!image) throw new AppError('NOT_FOUND', 'Image not found', 404);
    await imageRepository.setSaved(imageId, userId, true);
  },

  async deleteImage(imageId: string, userId: string): Promise<void> {
    const image = await imageRepository.findByIdAndUser(imageId, userId);
    if (!image) throw new AppError('NOT_FOUND', 'Image not found', 404);
    await imageRepository.softDelete(imageId, userId);
  },

  toCdnUrl,
};
