import { apiClient, unwrapResponse } from '@ai-platform/api-client';
import { API_ROUTES } from '@ai-platform/config';
import type { User } from '@ai-platform/types';

export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface AuthResponse {
  user: User;
  accessToken: string;
}

export async function login(credentials: LoginFormData): Promise<AuthResponse> {
  const res = await apiClient.post<{ success: true; data: AuthResponse; requestId: string }>(
    API_ROUTES.AUTH.LOGIN,
    { email: credentials.email, password: credentials.password }
  );
  return unwrapResponse(res);
}

export async function register(credentials: RegisterFormData): Promise<AuthResponse> {
  const res = await apiClient.post<{ success: true; data: AuthResponse; requestId: string }>(
    API_ROUTES.AUTH.REGISTER,
    { name: credentials.name, email: credentials.email, password: credentials.password }
  );
  return unwrapResponse(res);
}

export async function logout(): Promise<void> {
  await apiClient.post(API_ROUTES.AUTH.LOGOUT);
}

export async function refreshToken(): Promise<{ accessToken: string }> {
  const res = await apiClient.post<{
    success: true;
    data: { accessToken: string };
    requestId: string;
  }>(API_ROUTES.AUTH.REFRESH);
  return unwrapResponse(res);
}

export async function getMe(): Promise<User> {
  const res = await apiClient.get<{ success: true; data: User; requestId: string }>(
    API_ROUTES.AUTH.ME
  );
  return unwrapResponse(res);
}

export function loginWithGoogle(): void {
  const base = import.meta.env.VITE_API_BASE_URL ?? '';
  window.location.href = `${base}${API_ROUTES.AUTH.GOOGLE}`;
}
