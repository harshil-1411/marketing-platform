# Skill: Data Fetching with React Query

**Reference files:**
- `.claude/context/REACT_PATTERNS.md` — Section 2 (API Client), Section 3 (React Query Hooks)

This skill is a decision guide and anti-pattern list.
The full code patterns are already in REACT_PATTERNS.md — read that first.

---

## The Core Rule

```
Server data  →  React Query (useQuery / useMutation)
URL state    →  useSearchParams
Form state   →  React Hook Form
Global UI    →  Zustand
Local UI     →  useState
```

If you are about to write `useEffect` + `fetch` or `useState` to store API data — stop.
Use React Query instead.

---

## Creating a New Hook — Checklist

When adding a new data fetching hook in `hooks/`:

### 1. Create the API function first (in `services/`)

```typescript
// services/template-api.ts
export async function fetchTemplates(params: TemplateListParams) {
  return api.get<Template[]>('/templates', { ... })
}

export async function createTemplate(data: CreateTemplateRequest) {
  return api.post<Template>('/templates', data)
}

export async function submitTemplateToMeta(id: string) {
  return api.post<Template>(`/templates/${id}/submit`, {})
}
```

### 2. Define query key factory (always, no exceptions)

```typescript
// Every entity needs a key factory — prevents cache key mismatches
export const templateKeys = {
  all: ['templates'] as const,
  lists: () => [...templateKeys.all, 'list'] as const,
  list: (params: TemplateListParams) => [...templateKeys.lists(), params] as const,
  details: () => [...templateKeys.all, 'detail'] as const,
  detail: (id: string) => [...templateKeys.details(), id] as const,
}
```

### 3. Write the hooks

```typescript
// Query hook
export function useTemplates(params: TemplateListParams = {}) {
  return useQuery({
    queryKey: templateKeys.list(params),
    queryFn: () => templateApi.fetchTemplates(params),
    staleTime: 30_000,
  })
}

// Detail query — always use enabled flag
export function useTemplate(id: string) {
  return useQuery({
    queryKey: templateKeys.detail(id),
    queryFn: () => templateApi.fetchTemplate(id),
    enabled: !!id,  // don't fetch if id is empty/undefined
  })
}

// Mutation — always invalidate on success
export function useCreateTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateTemplateRequest) => templateApi.createTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() })
    },
  })
}

// Mutation that also updates detail cache
export function useSubmitTemplateToMeta() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => templateApi.submitTemplateToMeta(id),
    onSuccess: (updatedTemplate, id) => {
      // Update the detail cache immediately (optimistic)
      queryClient.setQueryData(templateKeys.detail(id), updatedTemplate)
      // Invalidate list (status changed)
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() })
    },
  })
}
```

---

## staleTime Reference

| Data type | staleTime | Reason |
|-----------|-----------|--------|
| Campaign list | 30_000 (30s) | Changes moderately |
| Campaign detail | 10_000 (10s) | Status updates frequently during execution |
| Template list | 60_000 (1min) | Changes infrequently |
| Customer list | 60_000 (1min) | Large, changes infrequently |
| Analytics | 60_000 (1min) | Expensive to compute |
| Billing/subscription | 0 | Always fresh — financial data |
| Tenant/auth data | Infinity | Changes only on user action |

---

## Common Mistakes

```typescript
// ❌ WRONG — fetching in useEffect
useEffect(() => {
  fetch('/api/v1/campaigns').then(r => r.json()).then(setCampaigns)
}, [])

// ❌ WRONG — storing server data in useState
const [campaigns, setCampaigns] = useState([])

// ❌ WRONG — calling api directly in component
function CampaignList() {
  const handleDelete = async () => {
    await api.delete(`/campaigns/${id}`)  // bypass mutation hook — no cache invalidation
  }
}

// ❌ WRONG — no enabled flag on dependent query
const { data: campaign } = useQuery({
  queryKey: ['campaign', id],
  queryFn: () => fetchCampaign(id),
  // id might be undefined on first render — this will fire an invalid request
})

// ✅ CORRECT
const { data: campaign } = useQuery({
  queryKey: campaignKeys.detail(id),
  queryFn: () => fetchCampaign(id),
  enabled: !!id,
})
```

---

## Polling for Meta Template Approval Status

Templates need to poll until Meta approves/rejects them.
Use React Query's `refetchInterval` — not a manual setInterval:

```typescript
export function useTemplate(id: string) {
  return useQuery({
    queryKey: templateKeys.detail(id),
    queryFn: () => templateApi.fetchTemplate(id),
    enabled: !!id,
    // Poll every 30s only while status is pending_approval
    refetchInterval: (data) => {
      if (data?.data?.status === 'pending_approval') return 30_000
      return false  // stop polling once approved or rejected
    },
  })
}
```

---

## Error Handling in Mutations

```typescript
export function useCreateCampaign() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: campaignApi.createCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.lists() })
      // Toast handled by the component calling the mutation, not here
    },
    onError: (error) => {
      // Log to Sentry in production — do not show alert() here
      console.error('Create campaign failed:', error)
      // Error display is handled by the component
    },
  })
}

// In the component:
const createCampaign = useCreateCampaign()

async function handleSubmit(data: FormData) {
  try {
    await createCampaign.mutateAsync(data)
    toast.success('Campaign created')
    navigate('/campaigns')
  } catch (error) {
    // error is already an ApiRequestError with .message and .code
    toast.error(error instanceof ApiRequestError ? error.message : 'Something went wrong')
  }
}
```
