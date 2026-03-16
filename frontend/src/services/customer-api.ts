import { api } from './api-client';
import type { Customer, CreateCustomerRequest, CustomerListParams } from '@/types/customer';

export async function fetchCustomers(params: CustomerListParams = {}) {
  return api.get<Customer[]>('/customers', {
    ...(params.limit && { limit: String(params.limit) }),
    ...(params.cursor && { cursor: params.cursor }),
    ...(params.search && { search: params.search }),
    ...(params.tag && { tag: params.tag }),
  });
}

export async function fetchCustomer(id: string) {
  return api.get<Customer>(`/customers/${id}`);
}

export async function createCustomer(data: CreateCustomerRequest) {
  return api.post<Customer>('/customers', data);
}

export async function deleteCustomer(id: string) {
  return api.delete<null>(`/customers/${id}`);
}
