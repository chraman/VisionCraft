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

export async function describeSceneImage(file: File): Promise<string> {
  const imageBase64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      // Strip "data:<mime>;base64," prefix
      resolve(dataUrl.split(',')[1] ?? '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const res = await apiClient.post<{ success: true; data: { prompt: string }; requestId: string }>(
    API_ROUTES.IMAGES.DESCRIBE_SCENE,
    { imageBase64, mimeType: file.type }
  );
  return unwrapResponse(res).prompt;
}

export async function describeSceneUrl(imageUrl: string): Promise<string> {
  const res = await apiClient.post<{ success: true; data: { prompt: string }; requestId: string }>(
    API_ROUTES.IMAGES.DESCRIBE_SCENE,
    { imageUrl }
  );
  return unwrapResponse(res).prompt;
}

export interface StockPhoto {
  id: string;
  thumbUrl: string;
  fullUrl: string;
  author: string;
  source: 'unsplash' | 'pexels';
}

export async function searchStockPhotos(
  source: 'unsplash' | 'pexels',
  query: string,
  page = 1,
  perPage = 20
): Promise<StockPhoto[]> {
  const res = await apiClient.get<{ success: true; data: StockPhoto[]; requestId: string }>(
    API_ROUTES.IMAGES.STOCK_SEARCH,
    { params: { source, query, page, perPage } }
  );
  return unwrapResponse(res);
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
