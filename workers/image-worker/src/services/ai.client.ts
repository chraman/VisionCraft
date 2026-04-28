import axios from 'axios';
import { SERVICE_URLS } from '@ai-platform/config';
import type { GenerationJobPayload, AiServiceResponse } from '../types';

const aiClient = axios.create({
  timeout: 120_000, // 2 minutes — AI generation is slow
  headers: { 'Content-Type': 'application/json' },
});

function aiServiceUrl(): string {
  return SERVICE_URLS.AI();
}

export async function callAiServiceText(payload: GenerationJobPayload): Promise<AiServiceResponse> {
  const response = await aiClient.post<AiServiceResponse>(`${aiServiceUrl()}/generate/text`, {
    job_id: payload.jobId,
    user_id: payload.userId,
    prompt: payload.prompt,
    negative_prompt: payload.negativePrompt ?? null,
    model: payload.model,
    aspect_ratio: payload.aspectRatio,
    quality: payload.quality,
  });
  return response.data;
}

export async function callAiServiceImage(
  payload: GenerationJobPayload
): Promise<AiServiceResponse> {
  const response = await aiClient.post<AiServiceResponse>(`${aiServiceUrl()}/generate/image`, {
    job_id: payload.jobId,
    user_id: payload.userId,
    image_url: payload.imageUrl,
    prompt: payload.prompt,
    strength: payload.strength ?? 0.75,
    model: payload.model,
  });
  return response.data;
}
