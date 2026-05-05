import type { Request, Response } from 'express';
import { createLogger } from '@ai-platform/utils';
import { AppError } from '@ai-platform/types';
import { influencerService } from '../services/influencer.service';
import {
  previewInfluencerSchema,
  createInfluencerSchema,
  generateInfluencerSchema,
  listInfluencersSchema,
  extractDnaSchema,
  previewImageSchema,
} from '../schemas/influencer.schemas';

const logger = createLogger('image-service');

function getUserId(req: Request): string {
  const userId = req.headers['x-user-id'] as string | undefined;
  if (!userId) throw new AppError('UNAUTHORIZED', 'Missing user identity', 401);
  return userId;
}

function getTier(req: Request): string {
  return (req.headers['x-user-tier'] as string | undefined) ?? 'free';
}

function reqId(res: Response): string {
  return (res.locals['requestId'] as string | undefined) ?? 'unknown';
}

export const influencerController = {
  async preview(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);
    const parsed = previewInfluencerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.issues[0]?.message ?? 'Invalid input',
        },
        requestId: reqId(res),
      });
      return;
    }
    logger.info('Previewing influencer', { action: 'influencer_preview', userId });
    const result = await influencerService.previewInfluencer(userId, parsed.data);
    res.json({ success: true, data: result, requestId: reqId(res) });
  },

  async extractDna(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);
    const parsed = extractDnaSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.issues[0]?.message ?? 'Invalid input',
        },
        requestId: reqId(res),
      });
      return;
    }
    logger.info('Extracting influencer DNA', { action: 'influencer_extract_dna', userId });
    const result = await influencerService.extractDna(userId, parsed.data);
    res.json({ success: true, data: result, requestId: reqId(res) });
  },

  async previewImage(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);
    const parsed = previewImageSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.issues[0]?.message ?? 'Invalid input',
        },
        requestId: reqId(res),
      });
      return;
    }
    logger.info('Generating influencer preview image', {
      action: 'influencer_preview_image',
      userId,
    });
    const result = await influencerService.previewImage(userId, parsed.data);
    res.json({ success: true, data: result, requestId: reqId(res) });
  },

  async create(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);
    const tier = getTier(req);
    const parsed = createInfluencerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.issues[0]?.message ?? 'Invalid input',
        },
        requestId: reqId(res),
      });
      return;
    }
    logger.info('Creating influencer', { action: 'influencer_create', userId });
    const influencer = await influencerService.createInfluencer(userId, tier, parsed.data);
    res.status(201).json({ success: true, data: influencer, requestId: reqId(res) });
  },

  async list(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);
    const parsed = listInfluencersSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.issues[0]?.message ?? 'Invalid query',
        },
        requestId: reqId(res),
      });
      return;
    }
    const result = await influencerService.listInfluencers(userId, parsed.data);
    res.json({ success: true, data: result, requestId: reqId(res) });
  },

  async generate(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);
    const tier = getTier(req);
    const body = { ...req.body, influencerId: req.params['id'] };
    const parsed = generateInfluencerSchema.safeParse(body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.issues[0]?.message ?? 'Invalid input',
        },
        requestId: reqId(res),
      });
      return;
    }
    const result = await influencerService.createInfluencerJob(userId, tier, parsed.data);
    res.status(202).json({ success: true, data: result, requestId: reqId(res) });
  },

  async remove(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);
    const { id } = req.params as { id: string };
    await influencerService.deleteInfluencer(id, userId);
    res.json({ success: true, data: null, requestId: reqId(res) });
  },
};
