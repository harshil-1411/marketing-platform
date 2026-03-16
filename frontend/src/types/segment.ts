export interface Segment {
  id: string;
  name: string;
  description: string;
  rules: SegmentRule[];
  customer_count: number;
  created_at: string;
  updated_at: string;
}

export interface SegmentRule {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'in' | 'between';
  value: string | number | string[];
}

export interface CreateSegmentRequest {
  name: string;
  description?: string;
  rules: SegmentRule[];
}

export interface SegmentListParams {
  cursor?: string;
  limit?: number;
}
