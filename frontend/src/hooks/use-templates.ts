import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as templateApi from '@/services/template-api';
import type { CreateTemplateRequest, TemplateListParams } from '@/types/template';

export const templateKeys = {
  all: ['templates'] as const,
  lists: () => [...templateKeys.all, 'list'] as const,
  list: (params: TemplateListParams) => [...templateKeys.lists(), params] as const,
  details: () => [...templateKeys.all, 'detail'] as const,
  detail: (id: string) => [...templateKeys.details(), id] as const,
};

export function useTemplates(params: TemplateListParams = {}) {
  return useQuery({
    queryKey: templateKeys.list(params),
    queryFn: () => templateApi.fetchTemplates(params),
  });
}

export function useTemplate(id: string) {
  return useQuery({
    queryKey: templateKeys.detail(id),
    queryFn: () => templateApi.fetchTemplate(id),
    enabled: !!id,
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTemplateRequest) => templateApi.createTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() });
      toast.success('Template created');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create template');
    },
  });
}

export function useSubmitTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => templateApi.submitTemplate(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: templateKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() });
      toast.success('Template submitted for approval');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to submit template');
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => templateApi.deleteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() });
      toast.success('Template deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete template');
    },
  });
}
