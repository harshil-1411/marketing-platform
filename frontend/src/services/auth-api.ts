import { api } from './api-client';

interface LoginRequest {
  email: string;
  password: string;
}

interface AuthUser {
  email: string;
  name: string;
  tenant_id: string;
  role: 'owner' | 'admin' | 'manager' | 'staff' | 'platform_admin';
}

interface LoginResponse {
  token: string;
  user: AuthUser;
}

export async function login(data: LoginRequest) {
  return api.post<LoginResponse>('/auth/login', data);
}

export async function logout() {
  return api.post<null>('/auth/logout', {});
}
