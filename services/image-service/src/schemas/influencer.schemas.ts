import { z } from 'zod';

export const createInfluencerSchema = z
  .object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    sourceImageUrl: z.string().optional(),
    descriptionText: z.string().max(2000).optional(),
  })
  .refine((d) => d.sourceImageUrl || d.descriptionText, {
    message: 'Either sourceImageUrl or descriptionText must be provided',
  });

export const generateInfluencerSchema = z.object({
  influencerId: z.string().cuid(),
  targetPrompt: z.string().min(3).max(2000),
  emotionModifier: z.string().max(200).optional(),
  sceneParams: z.string().max(500).optional(),
  model: z.string().optional().default('sdxl'),
  aspectRatio: z.enum(['1:1', '16:9', '9:16', '4:3', '3:4']).optional().default('1:1'),
  quality: z.enum(['standard', 'hd']).optional().default('standard'),
  useInt8: z.boolean().optional().default(false),
});

export const listInfluencersSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  cursor: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type CreateInfluencerInput = z.infer<typeof createInfluencerSchema>;
export type GenerateInfluencerInput = z.infer<typeof generateInfluencerSchema>;
export type ListInfluencersInput = z.infer<typeof listInfluencersSchema>;
