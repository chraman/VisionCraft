export type JobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export type GenerationJobType = 'TEXT2IMG' | 'IMG2IMG' | 'UPSCALE' | 'INPAINT' | 'VIDEO';

export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';

export type ImageQuality = 'standard' | 'hd';

export interface Image {
  id: string;
  userId: string;
  jobId: string;
  url: string;
  cdnUrl: string | null;
  prompt: string;
  negativePrompt: string | null;
  model: string;
  provider: string;
  width: number;
  height: number;
  seed: number | null;
  stylePreset: string | null;
  collectionId: string | null;
  isSaved: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface GenerationJob {
  id: string;
  userId: string;
  type: GenerationJobType;
  status: JobStatus;
  prompt: string;
  negativePrompt: string | null;
  model: string;
  aspectRatio: AspectRatio;
  quality: ImageQuality;
  imageId: string | null;
  cdnUrl: string | null;
  errorMessage: string | null;
  // Reserved for Phase 2 batch generation
  batchId: string | null;
  parentJobId: string | null;
  startedAt: string | null;
  completedAt: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface Collection {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  imageCount: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface SavedImage {
  id: string;
  userId: string;
  imageId: string;
  collectionId: string | null;
  createdAt: string;
}

export interface GenerateTextRequest {
  prompt: string;
  negativePrompt?: string;
  model?: string;
  aspectRatio?: AspectRatio;
  quality?: ImageQuality;
}

export interface GenerateImageRequest {
  imageUrl: string;
  prompt: string;
  strength?: number;
  model?: string;
}

export interface GenerateJobResponse {
  jobId: string;
  status: JobStatus;
}
