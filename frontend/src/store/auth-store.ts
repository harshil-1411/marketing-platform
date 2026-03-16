import { create } from 'zustand';

interface User {
  email: string;
  name: string;
  tenantId: string;
  role: 'owner' | 'admin' | 'manager' | 'staff' | 'platform_admin';
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  signOut: () => void;
}

const storedToken = localStorage.getItem('auth_token');

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: storedToken,
  isAuthenticated: !!storedToken,
  setAuth: (user, token) => {
    localStorage.setItem('auth_token', token);
    set({ user, token, isAuthenticated: true });
  },
  signOut: () => {
    localStorage.removeItem('auth_token');
    set({ user: null, token: null, isAuthenticated: false });
  },
}));
