import { z } from 'zod';

export const previewInfluencerSchema = z
  .object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    sourceImageUrl: z.string().optional(),
    descriptionText: z.string().max(2000).optional(),
  })
  .refine((d) => d.sourceImageUrl || d.descriptionText, {
    message: 'Either sourceImageUrl or descriptionText must be provided',
  });

export const createInfluencerSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  sourceImageUrl: z.string().optional(),
  characterDna: z.record(z.unknown()),
  profileImageUrl: z.string().url(),
});

export const generateInfluencerSchema = z.object({
  influencerId: z.string().cuid(),
  targetPrompt: z.string().min(3).max(2000),
  emotionModifier: z.string().max(200).optional(),
  sceneParams: z.string().max(500).optional(),
  model: z.string().optional().default('sdxl'),
  aspectRatio: z.enum(['1:1', '16:9', '9:16', '4:3', '3:4', '4:5']).optional().default('1:1'),
  quality: z.enum(['standard', 'hd']).optional().default('standard'),
  useInt8: z.boolean().optional().default(false),
  referenceStrength: z.number().min(0).max(1).default(0.25).optional(),
  sceneImageUrl: z.string().optional(),
});

export const listInfluencersSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  cursor: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const extractDnaSchema = z
  .object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    sourceImageUrl: z.string().optional(),
    descriptionText: z.string().max(2000).optional(),
  })
  .refine((d) => d.sourceImageUrl || d.descriptionText, {
    message: 'Either sourceImageUrl or descriptionText must be provided',
  });

export const previewImageSchema = z.object({
  name: z.string().min(1).max(100),
  characterDna: z.record(z.unknown()),
  sourceImageUrl: z.string().optional(),
});

export type PreviewInfluencerInput = z.infer<typeof previewInfluencerSchema>;
export type CreateInfluencerInput = z.infer<typeof createInfluencerSchema>;
export type GenerateInfluencerInput = z.infer<typeof generateInfluencerSchema>;
export type ListInfluencersInput = z.infer<typeof listInfluencersSchema>;
export type ExtractDnaInput = z.infer<typeof extractDnaSchema>;
export type PreviewImageInput = z.infer<typeof previewImageSchema>;
