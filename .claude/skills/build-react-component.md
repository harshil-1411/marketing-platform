# Skill: Build a React Component

**Reference files:**
- `.claude/context/REACT_PATTERNS.md` — full code patterns
- `.claude/context/UX_DESIGN_SYSTEM.md` — design tokens and component catalog
- `.claude/skills/no-ai-defaults.md` — design enforcement checklist

---

## Step-by-Step: Creating Any New Component

### Step 1 — Classify the component

| Type | Location | Examples |
|------|----------|---------|
| UI primitive | `components/ui/` | Button, Badge, Input, Modal, Skeleton |
| Layout | `components/layout/` | Sidebar, TopBar, PageHeader |
| Feature-specific | `components/{feature}/` | CampaignTable, SegmentBuilder, TemplatePreview |

Never put feature logic inside `components/ui/`. UI primitives are dumb — they accept props and render. No API calls, no hooks that fetch data.

---

### Step 2 — Define the TypeScript interface first

Write the props interface before writing any JSX. Every prop must be explicitly typed.

```typescript
// ✅ Always define props interface first
interface CampaignCardProps {
  campaign: Campaign           // never use `any`
  onCancel: (id: string) => void
  isLoading?: boolean          // optional props get ?
  className?: string           // always allow className passthrough on UI components
}

// ❌ Never do this
function CampaignCard(props: any) { ... }
function CampaignCard({ campaign, ...rest }: { campaign: any }) { ... }
```

---

### Step 3 — Internal structure order

Always follow this order inside the component function:

```typescript
export function MyComponent({ prop1, prop2 }: MyComponentProps) {
  // 1. All hooks first — no hooks after conditionals or returns
  const [localState, setLocalState] = useState(false)
  const { data } = useSomeQuery()
  const store = useUIStore()

  // 2. Derived values (useMemo if expensive, inline if cheap)
  const isDisabled = !data || localState

  // 3. Event handlers
  function handleClick() { ... }
  function handleSubmit(data: FormData) { ... }

  // 4. Early returns for edge cases
  if (!data) return <EmptyState entity="campaign" />

  // 5. Main render
  return ( ... )
}
```

---

### Step 4 — Handle all states

Every component that depends on async data must handle all four states:

```tsx
// ✅ Required pattern
if (isLoading) return <LoadingSkeleton variant="table" rows={5} />
if (isError)   return <ErrorState error={error} onRetry={refetch} />
if (!data || data.length === 0) return <EmptyState entity="campaign" />
return <ActualContent data={data} />

// ❌ Never do this
return <div>{data?.map(...)}</div>  // skips loading/error/empty states
```

---

### Step 5 — JSX length rule

If JSX exceeds ~50 lines, extract sub-components:

```tsx
// ✅ Extract to named sub-components in the same file or separate file
function CampaignTableRow({ campaign }: { campaign: Campaign }) {
  return <tr>...</tr>
}

export function CampaignTable({ campaigns }: CampaignTableProps) {
  return (
    <table>
      <thead>...</thead>
      <tbody>
        {campaigns.map(c => <CampaignTableRow key={c.campaignId} campaign={c} />)}
      </tbody>
    </table>
  )
}
```

---

### Step 6 — Tailwind class hygiene

```typescript
// ✅ Use cn() for conditional classes
import { cn } from '@/utils/cn'

className={cn(
  'base-classes-always-applied',
  isActive && 'active-classes',
  hasError && 'error-classes',
  className  // always accept and spread className prop on primitives
)}

// ❌ Never use string interpolation for Tailwind (purge won't catch dynamic classes)
className={`bg-${color}-500`}  // BAD
```

---

### Step 7 — Accessibility minimum

Every component must have:

```
✅ All interactive elements reachable by keyboard (Tab, Enter, Space, Escape)
✅ focus:ring-2 ring-blue-500 ring-offset-2 on all focusable elements
✅ aria-label on icon-only buttons
✅ role="alert" on error messages
✅ Heading levels never skip (H1 → H2 → H3, no H1 → H3)
```

---

### Step 8 — File naming

```
PascalCase   → component files:  CampaignTable.tsx, StatusBadge.tsx
camelCase    → hook files:       useCampaigns.ts, useDebounce.ts
camelCase    → util files:       formatDate.ts, phoneUtils.ts
kebab-case   → page files:       campaign-list-page.tsx (matches route)
```

---

## Common Mistakes to Avoid

```
❌ Fetching data directly in a component with useEffect + fetch
❌ Storing server response in useState
❌ Calling api.get() directly inside a component (use hooks)
❌ Conditional hook calls (hooks must always be called in the same order)
❌ Using index as key in lists where items can reorder or be removed
❌ Forgetting to handle the empty state
❌ Hardcoding colors instead of using the design system classes
❌ Creating a new Zustand store for server data (use React Query for that)
```
