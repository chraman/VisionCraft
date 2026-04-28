import { z } from 'zod';

export const generateTextSchema = z.object({
  prompt: z.string().min(3, 'Prompt must be at least 3 characters').max(2000),
  negativePrompt: z.string().max(500).optional(),
  model: z.string().optional().default('sdxl'),
  aspectRatio: z.enum(['1:1', '16:9', '9:16', '4:3', '3:4']).optional().default('1:1'),
  quality: z.enum(['standard', 'hd']).optional().default('standard'),
});

export const generateImageSchema = z.object({
  imageUrl: z.string().min(1, 'Image URL or key is required'),
  prompt: z.string().min(3, 'Prompt must be at least 3 characters').max(2000),
  strength: z.number().min(0.1).max(1.0).optional().default(0.75),
  model: z.string().optional().default('sdxl'),
});

export const uploadUrlSchema = z.object({
  filename: z.string().min(1),
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
});

export const listImagesSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  cursor: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type GenerateTextInput = z.infer<typeof generateTextSchema>;
export type GenerateImageInput = z.infer<typeof generateImageSchema>;
export type UploadUrlInput = z.infer<typeof uploadUrlSchema>;
export type ListImagesInput = z.infer<typeof listImagesSchema>;
