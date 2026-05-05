import { Router } from 'express';
import { influencerController } from '../controllers/influencer.controller';
import { asyncHandler } from '../middleware/asyncHandler';
import { requireFlag } from '../middleware/featureFlag';

export const influencerRouter = Router();

influencerRouter.use(requireFlag('image.influencer.enabled'));

/**
 * @openapi
 * /api/v1/influencers:
 *   post:
 *     summary: Create a new influencer profile (extracts character DNA via Gemini)
 *     tags: [Influencers]
 *   get:
 *     summary: List user's influencer profiles (cursor-paginated)
 *     tags: [Influencers]
 */
influencerRouter.post('/', asyncHandler(influencerController.create));
influencerRouter.get('/', asyncHandler(influencerController.list));

/**
 * @openapi
 * /api/v1/influencers/{id}/generate:
 *   post:
 *     summary: Enqueue a DNA-anchored image generation job
 *     tags: [Influencers]
 */
influencerRouter.post('/:id/generate', asyncHandler(influencerController.generate));

/**
 * @openapi
 * /api/v1/influencers/{id}:
 *   delete:
 *     summary: Soft-delete an influencer profile
 *     tags: [Influencers]
 */
influencerRouter.delete('/:id', asyncHandler(influencerController.remove));
