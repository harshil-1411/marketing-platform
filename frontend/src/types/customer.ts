export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  tags: string[];
  last_visit: string | null;
  total_visits: number;
  created_at: string;
  updated_at: string;
}

export interface CreateCustomerRequest {
  name: string;
  phone: string;
  email?: string;
  tags?: string[];
}

export interface CustomerListParams {
  search?: string;
  tag?: string;
  cursor?: string;
  limit?: number;
}
