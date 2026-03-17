import { useEffect, useRef } from 'react';
import { setAccessToken } from '@ai-platform/api-client';
import { useAuthStore } from '@ai-platform/store';
import { refreshToken, getMe } from '../services/auth.service';

export function useTokenRefresh() {
  const hasRun = useRef(false);
  const { setUser, setLoading, clearUser } = useAuthStore();

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    refreshToken()
      .then(async ({ accessToken }) => {
        setAccessToken(accessToken);
        // Restore user state so ProtectedRoute doesn't redirect to login
        const user = await getMe();
        setUser(user);
      })
      .catch(() => {
        // Refresh failed — user is not authenticated (no valid cookie)
        setAccessToken(null);
        clearUser();
      })
      .finally(() => {
        setLoading(false);
      });
  }, [setUser, setLoading, clearUser]);
}
