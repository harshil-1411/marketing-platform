import { api } from './api-client';
import type { Template, CreateTemplateRequest, TemplateListParams } from '@/types/template';

export async function fetchTemplates(params: TemplateListParams = {}) {
  return api.get<Template[]>('/templates', {
    ...(params.limit && { limit: String(params.limit) }),
    ...(params.cursor && { cursor: params.cursor }),
    ...(params.status && { status: params.status }),
  });
}

export async function fetchTemplate(id: string) {
  return api.get<Template>(`/templates/${id}`);
}

export async function createTemplate(data: CreateTemplateRequest) {
  return api.post<Template>('/templates', data);
}

export async function submitTemplate(id: string) {
  return api.post<Template>(`/templates/${id}/submit`, {});
}

export async function deleteTemplate(id: string) {
  return api.delete<null>(`/templates/${id}`);
}
