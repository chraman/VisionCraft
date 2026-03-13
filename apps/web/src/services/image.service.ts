import { apiClient, unwrapResponse } from '@ai-platform/api-client';
import { API_ROUTES } from '@ai-platform/config';
import type {
  Image,
  GenerationJob,
  GenerateTextRequest,
  GenerateImageRequest,
  GenerateJobResponse,
  PaginatedResponse,
  CursorPaginationParams,
} from '@ai-platform/types';

export async function generateFromText(req: GenerateTextRequest): Promise<GenerateJobResponse> {
  const res = await apiClient.post<{
    success: true;
    data: GenerateJobResponse;
    requestId: string;
  }>(API_ROUTES.IMAGES.GENERATE_TEXT, req);
  return unwrapResponse(res);
}

export async function generateFromImage(req: GenerateImageRequest): Promise<GenerateJobResponse> {
  const res = await apiClient.post<{
    success: true;
    data: GenerateJobResponse;
    requestId: string;
  }>(API_ROUTES.IMAGES.GENERATE_IMAGE, req);
  return unwrapResponse(res);
}

export async function getJobStatus(jobId: string): Promise<GenerationJob> {
  const res = await apiClient.get<{ success: true; data: GenerationJob; requestId: string }>(
    API_ROUTES.IMAGES.JOB(jobId)
  );
  return unwrapResponse(res);
}

export async function getPresignedUploadUrl(
  filename: string,
  contentType: string
): Promise<{ uploadUrl: string; key: string }> {
  const res = await apiClient.post<{
    success: true;
    data: { uploadUrl: string; key: string };
    requestId: string;
  }>(API_ROUTES.IMAGES.UPLOAD_URL, { filename, contentType });
  return unwrapResponse(res);
}

export async function uploadFileToS3(uploadUrl: string, file: File): Promise<void> {
  // Direct S3 PUT — plain fetch, not apiClient (no auth header on S3 presigned URLs)
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  });
  if (!response.ok) {
    throw new Error(`S3 upload failed: ${response.status} ${response.statusText}`);
  }
}

export async function getSavedImages(
  params: CursorPaginationParams = {}
): Promise<PaginatedResponse<Image>> {
  const res = await apiClient.get<{
    success: true;
    data: PaginatedResponse<Image>;
    requestId: string;
  }>(API_ROUTES.IMAGES.LIST, { params });
  return unwrapResponse(res);
}

export async function saveImage(imageId: string): Promise<void> {
  await apiClient.post(API_ROUTES.IMAGES.SAVE(imageId));
}

export async function deleteImage(imageId: string): Promise<void> {
  await apiClient.delete(API_ROUTES.IMAGES.BY_ID(imageId));
}
