import { apiClient, unwrapResponse } from '@ai-platform/api-client';
import { API_ROUTES } from '@ai-platform/config';
import type { User, UserQuota } from '@ai-platform/types';

export async function getCurrentUser(): Promise<User> {
  const res = await apiClient.get<{ success: true; data: User; requestId: string }>(
    API_ROUTES.USERS.ME
  );
  return unwrapResponse(res);
}

export async function updateProfile(
  data: Partial<Pick<User, 'name' | 'avatarUrl'>>
): Promise<User> {
  const res = await apiClient.patch<{ success: true; data: User; requestId: string }>(
    API_ROUTES.USERS.ME,
    data
  );
  return unwrapResponse(res);
}

export async function getQuota(): Promise<UserQuota> {
  const res = await apiClient.get<{ success: true; data: UserQuota; requestId: string }>(
    API_ROUTES.USERS.ME_QUOTA
  );
  return unwrapResponse(res);
}
