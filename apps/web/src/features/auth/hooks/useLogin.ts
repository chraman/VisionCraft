import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { setAccessToken } from '@ai-platform/api-client';
import { useAuthStore } from '@ai-platform/store';
import { getErrorMessage } from '../../../lib/errors';
import { login, type LoginFormData } from '../../../services/auth.service';
import { track } from '../../../lib/analytics';

export function useLogin() {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();

  return useMutation({
    mutationFn: (credentials: LoginFormData) => login(credentials),
    onSuccess: ({ user, accessToken }) => {
      setAccessToken(accessToken);
      setUser(user);
      track({ event: 'login', userId: user.id });
      navigate('/generate');
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
    },
  });
}
