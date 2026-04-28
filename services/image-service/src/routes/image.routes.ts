import { Router } from 'express';
import { imageController } from '../controllers/image.controller';
import { asyncHandler } from '../middleware/asyncHandler';
import { requireFlag } from '../middleware/featureFlag';

export const imageRouter = Router();

imageRouter.post(
  '/generate/text',
  requireFlag('image.text_generation.enabled'),
  asyncHandler(imageController.generateText)
);

imageRouter.post(
  '/generate/image',
  requireFlag('image.img2img.enabled'),
  asyncHandler(imageController.generateImage)
);

imageRouter.post('/upload-url', asyncHandler(imageController.getUploadUrl));

imageRouter.get('/jobs/:id', asyncHandler(imageController.getJob));

// SSE — not wrapped in asyncHandler; manages its own lifecycle
imageRouter.get('/jobs/:id/events', imageController.streamJobEvents);

imageRouter.get('/', asyncHandler(imageController.listImages));

imageRouter.post('/:id/save', asyncHandler(imageController.saveImage));

imageRouter.delete('/:id', asyncHandler(imageController.deleteImage));

// Must be last — matches any /:id not already claimed above
imageRouter.get('/:id', asyncHandler(imageController.getImageById));
