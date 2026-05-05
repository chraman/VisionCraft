export interface GenerationJobPayload {
  jobId: string;
  userId: string;
  type: 'TEXT2IMG' | 'IMG2IMG' | 'INFLUENCER';
  prompt: string;
  negativePrompt?: string;
  model: string;
  aspectRatio: string;
  quality: string;
  imageUrls?: string[]; // IMG2IMG — S3 keys in uploads bucket
  strength?: number; // IMG2IMG
  // INFLUENCER
  influencerId?: string;
  characterDna?: Record<string, unknown>;
  emotionModifier?: string;
  sceneParams?: string;
  useInt8?: boolean;
}

export interface JobStatusUpdate {
  jobId: string;
  userId: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  imageId?: string;
  imageUrl?: string;
  cdnUrl?: string;
  provider?: string;
  model?: string;
  prompt?: string;
  aspectRatio?: string;
  quality?: string;
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
  augmented_prompt?: string;
}

export interface AiServiceResponse {
  job_id: string;
  image_key: string; // S3 key in generated bucket
  provider: string;
  model: string;
  width: number;
  height: number;
  seed: number | null;
  augmented_prompt?: string;
}
