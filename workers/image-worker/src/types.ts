export interface GenerationJobPayload {
  jobId: string;
  userId: string;
  type: 'TEXT2IMG' | 'IMG2IMG';
  prompt: string;
  negativePrompt?: string;
  model: string;
  aspectRatio: string;
  quality: string;
  imageUrl?: string; // IMG2IMG — S3 key in uploads bucket
  strength?: number; // IMG2IMG
}

export interface JobStatusUpdate {
  jobId: string;
  userId: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  imageUrl?: string;
  cdnUrl?: string;
  provider?: string;
  model?: string;
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface AiServiceResponse {
  job_id: string;
  image_key: string; // S3 key in generated bucket
  provider: string;
  model: string;
  width: number;
  height: number;
  seed: number | null;
}
