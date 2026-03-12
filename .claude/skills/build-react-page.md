# Skill: Build a New Page

**Reference files:**
- `.claude/context/REACT_PATTERNS.md` — Section 7 (Page Pattern)
- `.claude/context/UX_DESIGN_SYSTEM.md` — Section 6 (Layout System), Section 7 (Interaction Patterns)
- `.claude/skills/no-ai-defaults.md` — run this checklist before outputting any JSX
- `.claude/skills/build-react-component.md` — component rules apply to pages too

---

## The Golden Rule for Pages

**Pages are thin orchestrators. They do not contain business logic.**

A page file should only:
- Import and compose components
- Call data hooks
- Handle URL state (filters, pagination, active tabs)
- Pass data and callbacks down to components

If a page file is getting long, you are putting too much into it. Extract to components.

---

## Step-by-Step: Creating a New Page

### Step 1 — Create the file

Location: `pages/{feature}/{page-name}-page.tsx`
Examples: `pages/campaigns/campaign-list-page.tsx`, `pages/templates/template-detail-page.tsx`

---

### Step 2 — Standard page skeleton

Every page follows this exact structure — do not deviate:

```tsx
// pages/campaigns/campaign-list-page.tsx
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useCampaigns } from '@/hooks/use-campaigns'
import { PageHeader } from '@/components/layout/page-header'
import { CampaignTable } from '@/components/campaigns/campaign-table'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'
import { ErrorState } from '@/components/ui/error-state'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'

export function CampaignListPage() {
  // 1. URL state — source of truth for filters and pagination
  const [searchParams, setSearchParams] = useSearchParams()
  const statusFilter = searchParams.get('status') ?? undefined
  const cursor = searchParams.get('cursor') ?? undefined

  // 2. Data hooks only — no direct API calls
  const { data, isLoading, isError, error, refetch } = useCampaigns({
    status: statusFilter,
    cursor,
    limit: 25,
  })

  // 3. Render — always all four states
  return (
    <div className="space-y-6">
      <PageHeader
        title="Campaigns"
        description="Manage your WhatsApp marketing campaigns"
        actions={<Button href="/campaigns/new" variant="primary">Create Campaign</Button>}
      />

      {isLoading && <LoadingSkeleton variant="table" rows={5} />}
      {isError && <ErrorState error={error} onRetry={refetch} />}
      {data?.data.length === 0 && <EmptyState entity="campaign" />}
      {data && data.data.length > 0 && (
        <CampaignTable
          campaigns={data.data}
          pagination={data.pagination}
          onPageChange={(cursor) => {
            setSearchParams(prev => {
              cursor ? prev.set('cursor', cursor) : prev.delete('cursor')
              return prev
            })
          }}
        />
      )}
    </div>
  )
}
```

---

### Step 3 — PageHeader is mandatory on every page

Every page must start with `<PageHeader>`. No exceptions.

```tsx
// Minimum required
<PageHeader title="Page Title" />

// With description and action
<PageHeader
  title="Campaigns"
  description="Manage your WhatsApp marketing campaigns"
  actions={<Button href="/campaigns/new">Create Campaign</Button>}
/>
```

Rules from UX_DESIGN_SYSTEM.md:
- ONE primary action button maximum in the header
- Title is H1, `text-2xl font-bold text-gray-900`
- Description is `text-sm text-gray-500`
- Separated from content by `border-b border-gray-200 pb-5`

---

### Step 4 — URL is the source of truth for all filter/pagination state

```tsx
// ✅ Correct — filter state lives in URL
const [searchParams, setSearchParams] = useSearchParams()
const status = searchParams.get('status')

// ✅ Update filter
setSearchParams(status ? { status } : {})

// ❌ Wrong — filter state in useState (breaks browser back button, sharing links)
const [statusFilter, setStatusFilter] = useState('')
```

---

### Step 5 — Register the route in the router

After creating the page, add it to the router in `app.tsx`:

```tsx
<Route path="/campaigns" element={<CampaignListPage />} />
<Route path="/campaigns/new" element={<CampaignCreatePage />} />
<Route path="/campaigns/:id" element={<CampaignDetailPage />} />
```

Wrap all authenticated routes in the `<ErrorBoundary>` component.

---

### Step 6 — Page layout rules

```
✅ Outer wrapper: <div className="space-y-6">
✅ Page padding is handled by the layout shell (not the page itself)
✅ Content sections separated by space-y-6 or space-y-8
✅ Filters/tabs appear between PageHeader and main content

❌ Do not add px-*/py-* to the page root (layout shell handles this)
❌ Do not add max-w-* constraints to the page root
❌ Do not use flex layout on the page root (use space-y-* for vertical stacking)
```

---

## Multi-Step Wizard Pages (Campaign Create, Onboarding)

For wizard flows, follow the pattern in UX_DESIGN_SYSTEM.md Section 7.1:

```tsx
// Step state lives in URL for back-button support
const step = Number(searchParams.get('step') ?? '1')

// Step components are separate files
const STEPS = [
  { id: 1, title: 'Basics',    component: <StepBasics /> },
  { id: 2, title: 'Audience',  component: <StepAudience /> },
  { id: 3, title: 'Content',   component: <StepContent /> },
  { id: 4, title: 'Schedule',  component: <StepSchedule /> },
  { id: 5, title: 'Review',    component: <StepReview /> },
]

// Wizard state (form data across steps) lives in Zustand, not URL
const wizardData = useWizardStore(s => s.campaignDraft)
```

Rules:
- Each step validates before allowing next (React Hook Form per step)
- "Back" never loses data
- "Save as Draft" available at every step
- Progress indicator shows completed steps as clickable
