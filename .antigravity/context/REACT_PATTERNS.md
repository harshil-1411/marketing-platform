# React Patterns & Frontend Architecture

**Project:** Salon WhatsApp Marketing Campaign Platform
**Version:** 1.0 | February 2026
**Audience:** Claude + Antigravity

---

## 1. Project Structure

```
frontend/src/
  app.tsx                    # Root component with router
  main.tsx                   # Entry point
  components/
    ui/                      # Shared UI primitives (Button, Badge, Card, Input, Modal, etc.)
    layout/                  # Layout components (Sidebar, TopBar, PageHeader, etc.)
    campaigns/               # Campaign-specific components
    segments/                # Segment-specific components
    templates/               # Template-specific components
    analytics/               # Charts, KPI cards
  pages/
    dashboard-page.tsx
    campaigns/
      campaign-list-page.tsx
      campaign-create-page.tsx
      campaign-detail-page.tsx
    segments/
      segment-list-page.tsx
      segment-create-page.tsx
    settings/
      settings-page.tsx
      billing-page.tsx
  hooks/
    use-campaigns.ts         # Campaign data hooks
    use-segments.ts
    use-templates.ts
    use-auth.ts              # Auth state hook
    use-notifications.ts
    use-debounce.ts          # Generic utility hooks
    use-pagination.ts
  services/
    api-client.ts            # Base HTTP client (fetch wrapper)
    campaign-api.ts          # Campaign endpoint calls
    segment-api.ts
    template-api.ts
    auth-api.ts
    billing-api.ts
  store/
    auth-store.ts            # Zustand store for auth state
    ui-store.ts              # Zustand store for UI state (sidebar, modals)
  types/
    campaign.ts
    segment.ts
    template.ts
    api.ts                   # API response types
    common.ts
  utils/
    format-date.ts
    format-number.ts
    phone-utils.ts
    cn.ts                    # Tailwind class merger utility
```

---

## 2. API Client Pattern

### 2.1 Base Client

```typescript
// services/api-client.ts
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

interface ApiResponse<T> {
  data: T;
  meta: { request_id: string; timestamp: string };
  pagination?: { cursor: string | null; has_more: boolean; limit: number };
}

interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    request_id: string;
  };
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    method: string,
    path: string,
    options?: { body?: unknown; params?: Record<string, string> },
  ): Promise<ApiResponse<T>> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (options?.params) {
      Object.entries(options.params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) url.searchParams.set(k, v);
      });
    }

    const token = localStorage.getItem('auth_token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(url.toString(), {
      method,
      headers,
      body: options?.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new ApiRequestError(
        error.error.message,
        error.error.code,
        response.status,
        error.error.details,
      );
    }

    return response.json();
  }

  get<T>(path: string, params?: Record<string, string>) {
    return this.request<T>('GET', path, { params });
  }

  post<T>(path: string, body: unknown) {
    return this.request<T>('POST', path, { body });
  }

  put<T>(path: string, body: unknown) {
    return this.request<T>('PUT', path, { body });
  }

  delete<T>(path: string) {
    return this.request<T>('DELETE', path);
  }
}

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

export const api = new ApiClient(API_BASE);
```

### 2.2 Resource API Module

```typescript
// services/campaign-api.ts
import { api } from './api-client';
import type { Campaign, CreateCampaignRequest, CampaignListParams } from '@/types/campaign';

export async function fetchCampaigns(params: CampaignListParams) {
  return api.get<Campaign[]>('/campaigns', {
    limit: String(params.limit ?? 25),
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

export async function cancelCampaign(id: string) {
  return api.post<Campaign>(`/campaigns/${id}/cancel`, {});
}
```

---

## 3. React Query Hooks

### 3.1 Data Fetching Hook

```typescript
// hooks/use-campaigns.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as campaignApi from '@/services/campaign-api';
import type { Campaign, CreateCampaignRequest, CampaignListParams } from '@/types/campaign';

/** Query key factory for consistent cache management. */
export const campaignKeys = {
  all: ['campaigns'] as const,
  lists: () => [...campaignKeys.all, 'list'] as const,
  list: (params: CampaignListParams) => [...campaignKeys.lists(), params] as const,
  details: () => [...campaignKeys.all, 'detail'] as const,
  detail: (id: string) => [...campaignKeys.details(), id] as const,
};

/** Fetch paginated campaign list. */
export function useCampaigns(params: CampaignListParams = {}) {
  return useQuery({
    queryKey: campaignKeys.list(params),
    queryFn: () => campaignApi.fetchCampaigns(params),
    staleTime: 30_000, // 30 seconds before refetch
  });
}

/** Fetch single campaign detail. */
export function useCampaign(id: string) {
  return useQuery({
    queryKey: campaignKeys.detail(id),
    queryFn: () => campaignApi.fetchCampaign(id),
    enabled: !!id,
  });
}

/** Create campaign mutation with optimistic cache update. */
export function useCreateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCampaignRequest) => campaignApi.createCampaign(data),
    onSuccess: () => {
      // Invalidate list cache so new campaign appears
      queryClient.invalidateQueries({ queryKey: campaignKeys.lists() });
    },
  });
}

/** Schedule campaign mutation. */
export function useScheduleCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, scheduledAt }: { id: string; scheduledAt?: string }) =>
      campaignApi.scheduleCampaign(id, scheduledAt),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: campaignKeys.lists() });
    },
  });
}
```

### 3.2 Hook Rules

1. **Query key factories** for every entity. Prevents key mismatches across components.
2. **`staleTime: 30_000`** (30s) for list queries. Prevents excessive refetching.
3. **`enabled`** flag for conditional queries (don't fetch if ID is missing).
4. **Invalidate on mutation success.** Always invalidate related list caches after create/update/delete.
5. **Never call `api` directly in components.** Always go through hooks.

---

## 4. State Management

### 4.1 Zustand for UI State

```typescript
// store/ui-store.ts
import { create } from 'zustand';

interface UIState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  confirmDialog: {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null;
  showConfirmDialog: (config: { title: string; message: string; onConfirm: () => void }) => void;
  closeConfirmDialog: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  confirmDialog: null,
  showConfirmDialog: (config) =>
    set({ confirmDialog: { isOpen: true, ...config } }),
  closeConfirmDialog: () => set({ confirmDialog: null }),
}));
```

### 4.2 State Management Rules

| State Type | Where to Store | Example |
|-----------|---------------|---------|
| Server data (campaigns, customers) | React Query | `useCampaigns()` |
| URL state (filters, pagination) | URL search params | `useSearchParams()` |
| Form state | React Hook Form | `useForm()` |
| Derived/computed | `useMemo` / inline | `filteredList = useMemo(...)` |
| Global UI state | Zustand | Sidebar, modals, toasts |
| Component-local UI | `useState` | Dropdown open, hover state |

**Never use:**
- Redux (overkill for this project)
- Context API for frequently updating state (causes re-renders)
- `useEffect` to sync state (derive it instead)

---

## 5. Form Patterns (React Hook Form + Zod)

### 5.1 Campaign Creation Form

```typescript
// components/campaigns/campaign-form.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const campaignSchema = z.object({
  name: z
    .string()
    .min(1, 'Campaign name is required')
    .max(200, 'Name must be under 200 characters')
    .trim(),
  description: z.string().max(1000).optional().default(''),
  type: z.enum(
    ['birthday', 'anniversary', 'festival', 'offer', 'new_service', 'reminder', 'reengagement', 'custom'],
    { errorMap: () => ({ message: 'Please select a campaign type' }) },
  ),
  templateId: z.string().min(1, 'Please select a template'),
  segmentId: z.string().min(1, 'Please select a segment'),
});

type CampaignFormData = z.infer<typeof campaignSchema>;

interface CampaignFormProps {
  onSubmit: (data: CampaignFormData) => void;
  isSubmitting: boolean;
  defaultValues?: Partial<CampaignFormData>;
}

export function CampaignForm({ onSubmit, isSubmitting, defaultValues }: CampaignFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CampaignFormData>({
    resolver: zodResolver(campaignSchema),
    defaultValues,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      {/* Campaign Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Campaign Name <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          type="text"
          {...register('name')}
          className={`mt-1 block w-full rounded-lg border text-sm shadow-sm ${
            errors.name ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
          }`}
          placeholder="e.g., Diwali Special Offer 2026"
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'name-error' : undefined}
        />
        {errors.name && (
          <p id="name-error" className="mt-1 text-xs text-red-600" role="alert">
            {errors.name.message}
          </p>
        )}
      </div>

      {/* Campaign Type */}
      <div>
        <label htmlFor="type" className="block text-sm font-medium text-gray-700">
          Campaign Type <span className="text-red-500">*</span>
        </label>
        <select
          id="type"
          {...register('type')}
          className="mt-1 block w-full rounded-lg border-gray-300 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="">Select type...</option>
          <option value="birthday">Birthday Wishes</option>
          <option value="festival">Festival Greetings</option>
          <option value="offer">Special Offer</option>
          <option value="new_service">New Service</option>
          <option value="reengagement">Re-engagement</option>
          <option value="custom">Custom</option>
        </select>
        {errors.type && (
          <p className="mt-1 text-xs text-red-600" role="alert">{errors.type.message}</p>
        )}
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <button type="button" className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700">
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : 'Save Campaign'}
        </button>
      </div>
    </form>
  );
}
```

### 5.2 Form Rules

1. **Zod schema matches backend Pydantic model.** Same field names, same validation rules.
2. **`noValidate` on form element.** Disable browser validation; use Zod instead.
3. **Error messages appear below inputs**, not in toasts or alerts.
4. **Submit button shows loading state** (`isSubmitting`) and is disabled during submission.
5. **`aria-invalid` and `aria-describedby`** for accessibility on error fields.
6. **Never clear the form on error.** Preserve all user input.

---

## 6. Error Handling Pattern

### 6.1 Error Boundary

```typescript
// components/ui/error-boundary.tsx
import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
    // Send to Sentry in production
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex flex-col items-center justify-center p-12 text-center" role="alert">
          <h2 className="text-lg font-semibold text-gray-900">Something went wrong</h2>
          <p className="mt-2 text-sm text-gray-500">
            An unexpected error occurred. Please try refreshing the page.
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-4 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white"
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

### 6.2 API Error Display

```typescript
// components/ui/error-state.tsx
import { ApiRequestError } from '@/services/api-client';

interface ErrorStateProps {
  error: Error | null;
  onRetry?: () => void;
}

export function ErrorState({ error, onRetry }: ErrorStateProps) {
  const message = error instanceof ApiRequestError
    ? error.message
    : 'An unexpected error occurred. Please try again.';

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center" role="alert">
      <p className="text-sm font-medium text-red-800">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 rounded-lg bg-red-100 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-200"
        >
          Retry
        </button>
      )}
    </div>
  );
}
```

---

## 7. Page Pattern

```typescript
// pages/campaigns/campaign-list-page.tsx
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCampaigns } from '@/hooks/use-campaigns';
import { PageHeader } from '@/components/layout/page-header';
import { CampaignTable } from '@/components/campaigns/campaign-table';
import { CampaignFilters } from '@/components/campaigns/campaign-filters';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { Button } from '@/components/ui/button';
import type { CampaignStatus } from '@/types/campaign';

export function CampaignListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get('status') as CampaignStatus | null;
  const cursor = searchParams.get('cursor') ?? undefined;

  const { data, isLoading, isError, error, refetch } = useCampaigns({
    status: statusFilter ?? undefined,
    cursor,
    limit: 25,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campaigns"
        description="Manage your WhatsApp marketing campaigns"
        actions={
          <Button href="/campaigns/new" variant="primary">
            Create Campaign
          </Button>
        }
      />

      <CampaignFilters
        currentStatus={statusFilter}
        onStatusChange={(status) => {
          setSearchParams(status ? { status } : {});
        }}
      />

      {isLoading && <LoadingSkeleton variant="table" rows={5} />}
      {isError && <ErrorState error={error} onRetry={refetch} />}
      {data && data.data.length === 0 && <EmptyState entity="campaign" />}
      {data && data.data.length > 0 && (
        <CampaignTable
          campaigns={data.data}
          pagination={data.pagination}
          onPageChange={(newCursor) => {
            setSearchParams((prev) => {
              if (newCursor) prev.set('cursor', newCursor);
              else prev.delete('cursor');
              return prev;
            });
          }}
        />
      )}
    </div>
  );
}
```

### 7.1 Page Rules

1. **Pages are thin orchestrators.** They compose components, hooks, and handle routing. No business logic.
2. **URL is the source of truth** for filters, pagination, and active tab. Use `useSearchParams`.
3. **Handle all states:** loading, error, empty, and data. Never show a blank page.
4. **One primary action per page** in the PageHeader (Create Campaign, Create Segment, etc.).
5. **Wrap pages in ErrorBoundary** at the router level.

---

## 8. Utility: Tailwind Class Merger

```typescript
// utils/cn.ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind classes without conflicts. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Usage:
// cn('px-4 py-2', isActive && 'bg-blue-500', className)
```

Install: `npm install clsx tailwind-merge`
