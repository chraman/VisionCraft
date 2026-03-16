import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { setAccessToken } from '@ai-platform/api-client';
import { useAuthStore } from '@ai-platform/store';
import { getErrorMessage } from '../../../lib/errors';
import { register, type RegisterFormData } from '../../../services/auth.service';
import { track } from '../../../lib/analytics';

export function useRegister() {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();

  return useMutation({
    mutationFn: (credentials: RegisterFormData) => register(credentials),
    onSuccess: ({ user, accessToken }) => {
      setAccessToken(accessToken);
      setUser(user);
      track({ event: 'signup_completed', userId: user.id });
      navigate('/generate');
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
    },
  });
}
