export interface ApiResponse<T> {
  data: T;
  meta: { request_id: string; timestamp: string };
  pagination?: PaginationMeta;
}

export interface PaginationMeta {
  cursor: string | null;
  has_more: boolean;
  limit: number;
}

export interface ListParams {
  cursor?: string;
  limit?: number;
}
