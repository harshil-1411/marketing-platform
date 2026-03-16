import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as campaignApi from '@/services/campaign-api';
import type { CreateCampaignRequest, CampaignListParams } from '@/types/campaign';

export const campaignKeys = {
  all: ['campaigns'] as const,
  lists: () => [...campaignKeys.all, 'list'] as const,
  list: (params: CampaignListParams) => [...campaignKeys.lists(), params] as const,
  details: () => [...campaignKeys.all, 'detail'] as const,
  detail: (id: string) => [...campaignKeys.details(), id] as const,
};

export function useCampaigns(params: CampaignListParams = {}) {
  return useQuery({
    queryKey: campaignKeys.list(params),
    queryFn: () => campaignApi.fetchCampaigns(params),
  });
}

export function useCampaign(id: string) {
  return useQuery({
    queryKey: campaignKeys.detail(id),
    queryFn: () => campaignApi.fetchCampaign(id),
    enabled: !!id,
  });
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCampaignRequest) => campaignApi.createCampaign(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.lists() });
      toast.success('Campaign created');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create campaign');
    },
  });
}

export function useScheduleCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, scheduledAt }: { id: string; scheduledAt?: string }) =>
      campaignApi.scheduleCampaign(id, scheduledAt),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: campaignKeys.lists() });
      toast.success('Campaign scheduled');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to schedule campaign');
    },
  });
}

export function usePauseCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => campaignApi.pauseCampaign(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: campaignKeys.lists() });
      toast.success('Campaign paused');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to pause campaign');
    },
  });
}

export function useCancelCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => campaignApi.cancelCampaign(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: campaignKeys.lists() });
      toast.success('Campaign cancelled');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to cancel campaign');
    },
  });
}
