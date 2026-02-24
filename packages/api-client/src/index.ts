import axios, {
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import type { APIResponse, APIErrorResponse } from '@ai-platform/types';

export type { APIResponse, APIErrorResponse };

let accessToken: string | null = null;

/**
 * Set the access token for subsequent API calls.
 * Called by the auth service after login / token refresh.
 */
export function setAccessToken(token: string | null): void {
  accessToken = token;
}

/**
 * Get the current access token.
 */
export function getAccessToken(): string | null {
  return accessToken;
}

/**
 * Creates an Axios instance pre-configured with:
 * - Base URL passed as parameter (or empty for relative URLs)
 * - JWT Bearer token injection
 * - withCredentials for httpOnly cookie refresh token
 */
export function createApiClient(baseURL = ''): AxiosInstance {
  const client = axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
    },
    withCredentials: true, // Required for httpOnly cookie refresh token
  });

  // Inject access token
  client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    if (accessToken && config.headers) {
      config.headers['Authorization'] = `Bearer ${accessToken}`;
    }
    return config;
  });

  return client;
}

/**
 * Default singleton API client (relative URLs — works with Vite proxy and Railway).
 * Apps should call createApiClient(VITE_API_BASE_URL) for an explicit base URL.
 */
export const apiClient = createApiClient();

/**
 * Unwrap the standard API response envelope.
 */
export function unwrapResponse<T>(response: AxiosResponse<APIResponse<T>>): T {
  return response.data.data;
}
