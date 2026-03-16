import { api } from './api-client';
import type { Campaign, CreateCampaignRequest, CampaignListParams } from '@/types/campaign';

export async function fetchCampaigns(params: CampaignListParams = {}) {
  return api.get<Campaign[]>('/campaigns', {
    ...(params.limit && { limit: String(params.limit) }),
    ...(params.cursor && { cursor: params.cursor }),
    ...(params.status && { status: params.status }),
  });
}

export async function fetchCampaign(id: string) {
  return api.get<Campaign>(`/campaigns/${id}`);
}

export async function createCampaign(data: CreateCampaignRequest) {
  return api.post<Campaign>('/campaigns', data);
}

export async function scheduleCampaign(id: string, scheduledAt?: string) {
  return api.post<Campaign>(`/campaigns/${id}/schedule`, {
    scheduled_at: scheduledAt,
  });
}

export async function pauseCampaign(id: string) {
  return api.post<Campaign>(`/campaigns/${id}/pause`, {});
}

export async function cancelCampaign(id: string) {
  return api.post<Campaign>(`/campaigns/${id}/cancel`, {});
}
