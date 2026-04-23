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
 * Default singleton API client.
 * In Vite browser builds, reads VITE_API_BASE_URL injected at build time.
 * Falls back to relative URLs (works with Vite dev proxy locally).
 */
export const apiClient = createApiClient(
  typeof import.meta !== 'undefined'
    ? ((import.meta as unknown as { env?: { VITE_API_BASE_URL?: string } }).env
        ?.VITE_API_BASE_URL ?? '')
    : ''
);

/**
 * Unwrap the standard API response envelope.
 */
export function unwrapResponse<T>(response: AxiosResponse<APIResponse<T>>): T {
  return response.data.data;
}
