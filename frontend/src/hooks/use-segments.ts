import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as segmentApi from '@/services/segment-api';
import type { CreateSegmentRequest, SegmentListParams } from '@/types/segment';

export const segmentKeys = {
  all: ['segments'] as const,
  lists: () => [...segmentKeys.all, 'list'] as const,
  list: (params: SegmentListParams) => [...segmentKeys.lists(), params] as const,
  details: () => [...segmentKeys.all, 'detail'] as const,
  detail: (id: string) => [...segmentKeys.details(), id] as const,
};

export function useSegments(params: SegmentListParams = {}) {
  return useQuery({
    queryKey: segmentKeys.list(params),
    queryFn: () => segmentApi.fetchSegments(params),
  });
}

export function useSegment(id: string) {
  return useQuery({
    queryKey: segmentKeys.detail(id),
    queryFn: () => segmentApi.fetchSegment(id),
    enabled: !!id,
  });
}

export function useCreateSegment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSegmentRequest) => segmentApi.createSegment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: segmentKeys.lists() });
      toast.success('Segment created');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create segment');
    },
  });
}

export function useDeleteSegment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => segmentApi.deleteSegment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: segmentKeys.lists() });
      toast.success('Segment deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete segment');
    },
  });
}
