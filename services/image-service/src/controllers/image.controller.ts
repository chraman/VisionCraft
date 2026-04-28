import type { Request, Response } from 'express';
import { createLogger } from '@ai-platform/utils';
import { REDIS_KEYS } from '@ai-platform/config';
import { imageService } from '../services/image.service';
import { jobRepository } from '../repositories/job.repository';
import { getRedis, getSubscriber } from '../lib/redis';
import {
  generateTextSchema,
  generateImageSchema,
  uploadUrlSchema,
  listImagesSchema,
} from '../schemas/image.schemas';
import { AppError } from '@ai-platform/types';

const logger = createLogger('image-service');

function getUserId(req: Request): string {
  const userId = req.headers['x-user-id'] as string | undefined;
  if (!userId) throw new AppError('UNAUTHORIZED', 'Missing user identity', 401);
  return userId;
}

function getTier(req: Request): string {
  return (req.headers['x-user-tier'] as string | undefined) ?? 'free';
}

function requestId(res: Response): string {
  return (res.locals['requestId'] as string) ?? 'unknown';
}

export const imageController = {
  async generateText(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);
    const tier = getTier(req);
    const parsed = generateTextSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.issues[0]?.message ?? 'Invalid input',
        },
        requestId: requestId(res),
      });
      return;
    }
    const result = await imageService.createTextJob(userId, tier, parsed.data);
    res.status(202).json({ success: true, data: result, requestId: requestId(res) });
  },

  async generateImage(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);
    const tier = getTier(req);
    const parsed = generateImageSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.issues[0]?.message ?? 'Invalid input',
        },
        requestId: requestId(res),
      });
      return;
    }
    const result = await imageService.createImageJob(userId, tier, parsed.data);
    res.status(202).json({ success: true, data: result, requestId: requestId(res) });
  },

  async getUploadUrl(req: Request, res: Response): Promise<void> {
    getUserId(req);
    const parsed = uploadUrlSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.issues[0]?.message ?? 'Invalid input',
        },
        requestId: requestId(res),
      });
      return;
    }
    const result = await imageService.getPresignedUploadUrl(parsed.data);
    res.json({ success: true, data: result, requestId: requestId(res) });
  },

  async getJob(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);
    const { id } = req.params as { id: string };
    const job = await imageService.getJobWithOwnership(id, userId);
    res.json({ success: true, data: job, requestId: requestId(res) });
  },

  // SSE — not wrapped in asyncHandler; manages its own lifecycle
  streamJobEvents(req: Request, res: Response): void {
    const userId = (req.headers['x-user-id'] as string | undefined) ?? '';
    const { id: jobId } = req.params as { id: string };

    if (!userId) {
      res
        .status(401)
        .json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Missing user identity' },
        });
      return;
    }

    // Verify ownership before opening the stream
    void jobRepository.findByIdAndUser(jobId, userId).then((job) => {
      if (!job) {
        res
          .status(404)
          .json({ success: false, error: { code: 'NOT_FOUND', message: 'Job not found' } });
        return;
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders();

      // Send current cached state immediately
      void getRedis()
        .get(REDIS_KEYS.jobStatus(jobId))
        .then((cached) => {
          if (cached) res.write(`data: ${cached}\n\n`);
        });

      // If already terminal, close immediately
      if (job.status === 'COMPLETED' || job.status === 'FAILED') {
        res.end();
        return;
      }

      const channel = REDIS_KEYS.jobStatus(jobId);
      const subscriber = getSubscriber();

      const heartbeat = setInterval(() => {
        if (!res.writableEnded) res.write(': heartbeat\n\n');
      }, 30_000);

      const cleanup = () => {
        clearInterval(heartbeat);
        void subscriber.unsubscribe(channel).then(() => subscriber.disconnect());
        if (!res.writableEnded) res.end();
      };

      void subscriber.subscribe(channel).then(() => {
        subscriber.on('message', (_ch: string, message: string) => {
          if (!res.writableEnded) res.write(`data: ${message}\n\n`);
          try {
            const update = JSON.parse(message) as { status: string };
            if (update.status === 'COMPLETED' || update.status === 'FAILED') {
              cleanup();
            }
          } catch {
            // ignore malformed messages
          }
        });
      });

      req.on('close', cleanup);
      req.on('finish', cleanup);

      logger.info('SSE stream opened', { action: 'sse_open', jobId, userId });
    });
  },

  async listImages(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);
    const parsed = listImagesSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.issues[0]?.message ?? 'Invalid query',
        },
        requestId: requestId(res),
      });
      return;
    }
    const result = await imageService.listSavedImages(userId, parsed.data);
    res.json({ success: true, ...result, requestId: requestId(res) });
  },

  async saveImage(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);
    const { id } = req.params as { id: string };
    await imageService.saveImage(id, userId);
    res.json({ success: true, data: null, requestId: requestId(res) });
  },

  async deleteImage(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);
    const { id } = req.params as { id: string };
    await imageService.deleteImage(id, userId);
    res.json({ success: true, data: null, requestId: requestId(res) });
  },
};
