import { useEffect, useRef } from 'react';
import { setAccessToken } from '@ai-platform/api-client';
import { useAuthStore } from '@ai-platform/store';
import { refreshToken } from '../services/auth.service';

export function useTokenRefresh() {
  const hasRun = useRef(false);
  const { setLoading, clearUser } = useAuthStore();

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    refreshToken()
      .then(({ accessToken }) => {
        setAccessToken(accessToken);
      })
      .catch(() => {
        // Refresh failed — user is not authenticated
        setAccessToken(null);
        clearUser();
      })
      .finally(() => {
        setLoading(false);
      });
  }, [setLoading, clearUser]);
}
