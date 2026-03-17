import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { setAccessToken } from '@ai-platform/api-client';
import { useAuthStore } from '@ai-platform/store';
import type { User } from '@ai-platform/types';
import { PageLoader } from '../../../components/PageLoader';
import { track } from '../../../lib/analytics';

// Handles the redirect back from Google OAuth.
// Backend redirects to /auth/callback?token=<jwt>&user=<base64(JSON)>
export default function OAuthCallbackPage() {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const userParam = params.get('user');
    const error = params.get('error');

    if (error || !token || !userParam) {
      navigate('/login?error=oauth_failed', { replace: true });
      return;
    }

    try {
      const user = JSON.parse(atob(userParam)) as User;
      setAccessToken(token);
      setUser(user);
      track({ event: 'login', userId: user.id });
      navigate('/generate', { replace: true });
    } catch {
      navigate('/login?error=oauth_failed', { replace: true });
    }
  }, [navigate, setUser]);

  return <PageLoader />;
}
