import { api } from './api-client';
import type { Segment, CreateSegmentRequest, SegmentListParams } from '@/types/segment';

export async function fetchSegments(params: SegmentListParams = {}) {
  return api.get<Segment[]>('/segments', {
    ...(params.limit && { limit: String(params.limit) }),
    ...(params.cursor && { cursor: params.cursor }),
  });
}

export async function fetchSegment(id: string) {
  return api.get<Segment>(`/segments/${id}`);
}

export async function createSegment(data: CreateSegmentRequest) {
  return api.post<Segment>('/segments', data);
}

export async function deleteSegment(id: string) {
  return api.delete<null>(`/segments/${id}`);
}
