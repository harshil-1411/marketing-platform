import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import * as authApi from '@/services/auth-api';
import { useAuthStore } from '@/store/auth-store';
import type { LoginFormData } from '@/schemas/login-schema';

export function useLogin() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: (data: LoginFormData) => authApi.login(data),
    onSuccess: (response) => {
      const { token, user } = response.data;
      setAuth(
        {
          email: user.email,
          name: user.name,
          tenantId: user.tenant_id,
          role: user.role,
        },
        token,
      );
      toast.success('Signed in successfully');
      navigate('/dashboard', { replace: true });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to sign in');
    },
  });
}

export function useLogout() {
  const navigate = useNavigate();
  const signOut = useAuthStore((s) => s.signOut);

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      signOut();
      navigate('/login', { replace: true });
    },
  });
}
