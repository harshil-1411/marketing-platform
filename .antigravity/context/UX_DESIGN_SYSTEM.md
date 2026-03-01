# UX Design System & Frontend Standards

**Project:** Salon WhatsApp Marketing Campaign Platform
**Version:** 1.0 | February 2026
**Audience:** Claude + Antigravity, Frontend Developers

---

## 1. Design Philosophy

### 1.1 Core Principles

1. **Clarity first.** Every element should communicate its purpose instantly. If a user needs to think about what a button does, the design has failed.
2. **Reduce cognitive load.** Show only what's needed right now. Use progressive disclosure — advanced options appear when needed, not upfront.
3. **Consistent and predictable.** Same action = same pattern everywhere. A "Schedule" button looks and behaves identically across all pages.
4. **Data-dense but not cluttered.** SaaS dashboards need to show lots of data. Use whitespace, typography hierarchy, and subtle borders to organize — not heavy visual elements.
5. **Mobile-aware, desktop-optimized.** This is a business tool. Most usage is desktop. Design for desktop first, then ensure tablet is usable and mobile is readable.

### 1.2 Design Inspiration

Follow patterns from best-in-class SaaS marketing tools: Mailchimp (campaign wizard), Resend (clean API-first dashboard), Stripe (billing UI), Linear (navigation and speed), Intercom (messaging UI).

---

## 2. Color System

### 2.1 Color Palette

```css
/* Primary — Used for primary actions, active states, links */
--color-primary-50:  #EFF6FF;   /* Backgrounds, hover states */
--color-primary-100: #DBEAFE;   /* Selected states, badges */
--color-primary-200: #BFDBFE;   /* Borders, dividers */
--color-primary-500: #3B82F6;   /* Primary buttons, links */
--color-primary-600: #2563EB;   /* Primary button hover */
--color-primary-700: #1D4ED8;   /* Primary button active */
--color-primary-900: #1E3A5F;   /* Dark text on light backgrounds */

/* Neutral — Used for text, backgrounds, borders */
--color-gray-50:  #F9FAFB;     /* Page background */
--color-gray-100: #F3F4F6;     /* Card backgrounds, table rows (alt) */
--color-gray-200: #E5E7EB;     /* Borders, dividers */
--color-gray-300: #D1D5DB;     /* Disabled borders */
--color-gray-400: #9CA3AF;     /* Placeholder text, disabled text */
--color-gray-500: #6B7280;     /* Secondary text, icons */
--color-gray-700: #374151;     /* Body text */
--color-gray-900: #111827;     /* Headings, emphasis */

/* Semantic — Used for status, feedback, alerts */
--color-success-50:  #F0FDF4;  --color-success-500: #22C55E;  --color-success-700: #15803D;
--color-warning-50:  #FFFBEB;  --color-warning-500: #F59E0B;  --color-warning-700: #B45309;
--color-error-50:    #FEF2F2;  --color-error-500:   #EF4444;  --color-error-700:   #B91C1C;
--color-info-50:     #EFF6FF;  --color-info-500:    #3B82F6;  --color-info-700:    #1D4ED8;
```

### 2.2 Color Usage Rules

| Context | Color | Tailwind Class |
|---------|-------|---------------|
| Page background | gray-50 | `bg-gray-50` |
| Card background | white | `bg-white` |
| Sidebar background | gray-900 | `bg-gray-900` |
| Primary button | primary-500 | `bg-blue-500 hover:bg-blue-600` |
| Secondary button | white + gray border | `bg-white border-gray-300` |
| Danger button | error-500 | `bg-red-500 hover:bg-red-600` |
| Body text | gray-700 | `text-gray-700` |
| Heading text | gray-900 | `text-gray-900` |
| Secondary text | gray-500 | `text-gray-500` |
| Links | primary-500 | `text-blue-500 hover:text-blue-600` |
| Success badge | success-50 + success-700 | `bg-green-50 text-green-700` |
| Warning badge | warning-50 + warning-700 | `bg-amber-50 text-amber-700` |
| Error badge | error-50 + error-700 | `bg-red-50 text-red-700` |
| Borders | gray-200 | `border-gray-200` |
| Focus ring | primary-500 | `ring-2 ring-blue-500 ring-offset-2` |

### 2.3 Dark Mode

Not in scope for v1. Design tokens are structured to support it later. Use Tailwind's `dark:` variants when it's implemented.

---

## 3. Typography

### 3.1 Font Stack

```css
/* Primary font — clean, professional, excellent for data */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

/* Monospace — for code, API keys, IDs */
font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
```

Load Inter from Google Fonts (weights: 400, 500, 600, 700).

### 3.2 Type Scale

| Element | Size | Weight | Line Height | Tailwind |
|---------|------|--------|-------------|----------|
| Page title (H1) | 24px | 700 (bold) | 32px | `text-2xl font-bold` |
| Section title (H2) | 20px | 600 (semibold) | 28px | `text-xl font-semibold` |
| Card title (H3) | 16px | 600 (semibold) | 24px | `text-base font-semibold` |
| Subsection (H4) | 14px | 600 (semibold) | 20px | `text-sm font-semibold` |
| Body text | 14px | 400 (regular) | 20px | `text-sm` |
| Small text / captions | 12px | 400 (regular) | 16px | `text-xs` |
| Badge / tag text | 12px | 500 (medium) | 16px | `text-xs font-medium` |
| Button text | 14px | 500 (medium) | 20px | `text-sm font-medium` |
| Input text | 14px | 400 (regular) | 20px | `text-sm` |
| Table header | 12px | 500 (medium) | 16px | `text-xs font-medium uppercase tracking-wider` |
| Table cell | 14px | 400 (regular) | 20px | `text-sm` |
| KPI value | 30px | 700 (bold) | 36px | `text-3xl font-bold` |
| KPI label | 12px | 500 (medium) | 16px | `text-xs font-medium text-gray-500` |

### 3.3 Typography Rules

- **Never use more than 3 font weights** on a single page.
- **Headings are gray-900**, body text is gray-700, secondary text is gray-500.
- **No underlines** except on links (and only on hover).
- **No ALL CAPS** except table headers and badge text.
- **Truncate long text** with ellipsis (`truncate` class) rather than wrapping multi-line in tables.

---

## 4. Spacing System

### 4.1 Base Unit: 4px

All spacing uses multiples of 4px. Tailwind's default spacing scale is used:

| Token | Value | Use Case |
|-------|-------|----------|
| `1` | 4px | Tight gaps (icon + text) |
| `2` | 8px | Related element spacing |
| `3` | 12px | Compact padding |
| `4` | 16px | Standard padding, form gaps |
| `5` | 20px | Card padding (compact) |
| `6` | 24px | Card padding (standard) |
| `8` | 32px | Section spacing |
| `10` | 40px | Large section gaps |
| `12` | 48px | Page top/bottom padding |
| `16` | 64px | Major section dividers |

### 4.2 Spacing Rules

```
Page padding:         px-6 py-8 (24px horizontal, 32px vertical)
Card padding:         p-6 (24px all around)
Card gap (in grid):   gap-6 (24px)
Form field gap:       space-y-4 (16px between fields)
Button gap:           gap-3 (12px between buttons)
Section gap:          space-y-8 (32px between sections)
Table cell padding:   px-4 py-3 (16px horizontal, 12px vertical)
```

---

## 5. Component Catalog

### 5.1 Buttons

```tsx
// Primary button — for main actions (Create Campaign, Schedule, Save)
<button className="inline-flex items-center justify-center rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
  Create Campaign
</button>

// Secondary button — for secondary actions (Cancel, Back, Filter)
<button className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors">
  Cancel
</button>

// Danger button — for destructive actions (Delete, Cancel Campaign)
<button className="inline-flex items-center justify-center rounded-lg bg-red-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors">
  Delete Segment
</button>

// Ghost button — for tertiary actions (View Details, Export)
<button className="inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors">
  Export CSV
</button>

// Icon button — for compact actions (Edit, Delete in tables)
<button className="rounded-lg p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors" aria-label="Edit campaign">
  <PencilIcon className="h-4 w-4" />
</button>
```

**Button rules:**
- Only ONE primary button per visible area (above the fold).
- Destructive buttons always require a confirmation dialog.
- Buttons have loading state (spinner + disabled) during async operations.
- Icon-only buttons must have `aria-label`.
- Minimum touch target: 44x44px (even if visually smaller, padding extends hit area).

### 5.2 Status Badges

```tsx
const STATUS_STYLES: Record<CampaignStatus, string> = {
  draft:      'bg-gray-100 text-gray-700',
  scheduled:  'bg-blue-50 text-blue-700',
  executing:  'bg-amber-50 text-amber-700',
  paused:     'bg-orange-50 text-orange-700',
  completed:  'bg-green-50 text-green-700',
  cancelled:  'bg-gray-100 text-gray-500',
  failed:     'bg-red-50 text-red-700',
};

function StatusBadge({ status }: { status: CampaignStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
```

### 5.3 Cards

```tsx
// Standard card
<div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
  <h3 className="text-base font-semibold text-gray-900">Card Title</h3>
  <p className="mt-1 text-sm text-gray-500">Description text</p>
  {/* Card content */}
</div>

// KPI card
<div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
  <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Delivery Rate</p>
  <p className="mt-2 text-3xl font-bold text-gray-900">94.2%</p>
  <p className="mt-1 flex items-center text-xs text-green-600">
    <ArrowUpIcon className="mr-1 h-3 w-3" />
    +2.3% from last campaign
  </p>
</div>

// Clickable card (hover state)
<div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:border-blue-200 hover:shadow-md cursor-pointer transition-all">
```

### 5.4 Data Tables

```tsx
<div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
  <table className="min-w-full divide-y divide-gray-200">
    <thead className="bg-gray-50">
      <tr>
        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
          Campaign
        </th>
        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
          Status
        </th>
        {/* ... more headers */}
      </tr>
    </thead>
    <tbody className="divide-y divide-gray-200">
      {campaigns.map((campaign) => (
        <tr key={campaign.campaignId} className="hover:bg-gray-50 transition-colors">
          <td className="px-4 py-3 text-sm text-gray-900 font-medium">
            {campaign.name}
          </td>
          <td className="px-4 py-3">
            <StatusBadge status={campaign.status} />
          </td>
          {/* ... more cells */}
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

**Table rules:**
- Always include hover state on rows.
- Use fixed header when table scrolls vertically.
- Provide loading skeleton (not spinner) while data loads.
- Show empty state component when no results.
- Truncate long text with tooltip on hover.
- Right-align numbers and currency values.
- Action column (edit/delete) is always the last column.
- Sortable columns show sort direction indicator.

### 5.5 Forms and Inputs

```tsx
// Text input with label
<div>
  <label htmlFor="campaign-name" className="block text-sm font-medium text-gray-700">
    Campaign Name <span className="text-red-500">*</span>
  </label>
  <input
    id="campaign-name"
    type="text"
    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
    placeholder="e.g., Diwali Special Offer 2026"
  />
  <p className="mt-1 text-xs text-gray-500">Max 200 characters</p>
</div>

// Input with error state
<div>
  <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
  <input
    id="email"
    type="email"
    className="mt-1 block w-full rounded-lg border-red-300 text-sm shadow-sm focus:border-red-500 focus:ring-red-500"
    aria-invalid="true"
    aria-describedby="email-error"
  />
  <p id="email-error" className="mt-1 text-xs text-red-600" role="alert">
    Please enter a valid email address
  </p>
</div>

// Select
<select className="mt-1 block w-full rounded-lg border-gray-300 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500">
  <option value="">Select campaign type...</option>
  <option value="birthday">Birthday Wishes</option>
  <option value="festival">Festival Greetings</option>
</select>
```

**Form rules:**
- Every input has an associated `<label>` (not placeholder-as-label).
- Required fields marked with red asterisk.
- Error messages appear below the input, in red, with `role="alert"`.
- Help text appears below the input in gray-500.
- Inputs are 100% width within their container.
- Form preserves input values on validation error (never clear the form).
- Submit button shows loading state during API call.
- Disable submit button until required fields are filled.

### 5.6 Modals / Dialogs

```tsx
// Confirmation dialog (for destructive actions)
<Dialog>
  <div className="rounded-xl bg-white p-6 shadow-xl max-w-md w-full">
    <div className="flex items-start gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
        <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
      </div>
      <div>
        <h3 className="text-base font-semibold text-gray-900">Cancel Campaign</h3>
        <p className="mt-2 text-sm text-gray-500">
          Are you sure you want to cancel "Diwali Special Offer"?
          This action cannot be undone. 1,200 queued messages will not be sent.
        </p>
      </div>
    </div>
    <div className="mt-6 flex justify-end gap-3">
      <button className="...secondary">Keep Running</button>
      <button className="...danger">Cancel Campaign</button>
    </div>
  </div>
</Dialog>
```

**Modal rules:**
- Focus is trapped inside the modal when open.
- Escape key closes the modal.
- Background overlay is clickable to dismiss (except for destructive confirmations).
- Confirmation dialogs state the specific action and consequences.
- Destructive action button is on the right.
- Modal width: `max-w-md` (confirmation), `max-w-lg` (form), `max-w-2xl` (complex).

### 5.7 Toast Notifications

```tsx
// Success toast
<div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 shadow-lg">
  <CheckCircleIcon className="h-5 w-5 text-green-500 shrink-0" />
  <p className="text-sm font-medium text-green-800">Campaign scheduled successfully</p>
  <button className="ml-auto text-green-400 hover:text-green-600" aria-label="Dismiss">
    <XMarkIcon className="h-4 w-4" />
  </button>
</div>
```

**Toast rules:**
- Auto-dismiss after 5 seconds (success), 10 seconds (warning), persistent (error).
- Position: top-right of viewport.
- Maximum 3 toasts visible at once.
- Toasts are announced to screen readers via `aria-live="polite"`.
- Include dismiss button on all toasts.

### 5.8 Empty States

```tsx
function EmptyState({ entity }: { entity: string }) {
  const config: Record<string, { title: string; description: string; icon: any; cta: string; href: string }> = {
    campaign: {
      title: 'No campaigns yet',
      description: 'Create your first WhatsApp campaign to reach your customers with targeted messages.',
      icon: MegaphoneIcon,
      cta: 'Create Campaign',
      href: '/campaigns/new',
    },
    segment: {
      title: 'No segments created',
      description: 'Segments help you target the right customers. Create one based on visit history, loyalty tier, or custom criteria.',
      icon: UsersIcon,
      cta: 'Create Segment',
      href: '/segments/new',
    },
    // ... more entities
  };

  const { title, description, icon: Icon, cta, href } = config[entity];

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
      <Icon className="h-12 w-12 text-gray-400" />
      <h3 className="mt-4 text-base font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-gray-500">{description}</p>
      <a href={href} className="mt-6 ...primary-button">{cta}</a>
    </div>
  );
}
```

### 5.9 Loading Skeletons

```tsx
// Always use skeletons, never spinners for page-level loading
function CampaignListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-xl border border-gray-200 bg-white p-6">
          <div className="h-4 w-48 rounded bg-gray-200" />
          <div className="mt-3 h-3 w-32 rounded bg-gray-100" />
          <div className="mt-4 flex gap-4">
            <div className="h-6 w-20 rounded-full bg-gray-100" />
            <div className="h-6 w-16 rounded bg-gray-100" />
          </div>
        </div>
      ))}
    </div>
  );
}
```

**Loading rules:**
- Page-level: Use skeleton matching the content layout.
- Button-level: Use inline spinner + disabled state.
- Table: Show 5 skeleton rows.
- Never show a blank white page during loading.
- Never use a full-page spinner (only skeleton or partial loading).

---

## 6. Layout System

### 6.1 Page Layout

```
┌─────────────────────────────────────────────────┐
│ Top Bar (h-16, fixed, z-30)                     │
│  Logo | Breadcrumbs              Notifications  │
├──────┬──────────────────────────────────────────┤
│      │ Page Header (h-16)                        │
│ Side │  Page Title        Primary Action Button  │
│ bar  ├──────────────────────────────────────────┤
│ w-64 │                                           │
│      │ Page Content (scrollable)                 │
│      │  - Filters / Tabs                         │
│      │  - Data Table or Cards                    │
│      │  - Pagination                             │
│      │                                           │
└──────┴──────────────────────────────────────────┘
```

### 6.2 Sidebar Navigation

```tsx
const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Campaigns', href: '/campaigns', icon: MegaphoneIcon },
  { name: 'Segments', href: '/segments', icon: UsersIcon },
  { name: 'Templates', href: '/templates', icon: DocumentTextIcon },
  { name: 'Customers', href: '/customers', icon: UserGroupIcon },
  { name: 'Analytics', href: '/analytics', icon: ChartBarIcon },
  { divider: true },
  { name: 'Settings', href: '/settings', icon: CogIcon },
];
```

Sidebar rules:
- Fixed width: 256px (w-64) on desktop.
- Collapsible to icon-only (w-16) on tablet.
- Hidden on mobile (hamburger menu trigger).
- Active item has blue-50 background + blue-500 left border.
- Icon + label on expanded, icon-only with tooltip on collapsed.

### 6.3 Responsive Breakpoints

| Breakpoint | Behavior |
|-----------|----------|
| < 640px (mobile) | Sidebar hidden, single column, bottom nav bar, read-only optimized |
| 640px - 1024px (tablet) | Sidebar collapsed (icons only), full-width content, forms usable |
| 1024px - 1280px (desktop) | Sidebar expanded, standard content width |
| > 1280px (wide) | Sidebar expanded, wider content area, side panels possible |

### 6.4 Page Header Pattern

Every page has a consistent header:

```tsx
function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b border-gray-200 pb-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
      </div>
      <div className="flex items-center gap-3">
        {actions}
      </div>
    </div>
  );
}

// Usage
<PageHeader
  title="Campaigns"
  description="Manage your WhatsApp marketing campaigns"
  actions={<Button href="/campaigns/new">Create Campaign</Button>}
/>
```

---

## 7. Interaction Patterns

### 7.1 Campaign Creation Wizard

Multi-step wizard with progress indicator:

```
Step 1: Basics        → Campaign name, type, description
Step 2: Audience      → Select or create segment, preview audience size
Step 3: Content       → Select template, map variables, preview message
Step 4: Schedule      → Send now, schedule, or set recurring
Step 5: Review        → Summary of all settings, send test, confirm
```

Rules:
- Steps are navigable by clicking the step indicator (but only completed/current steps).
- Each step validates before allowing next.
- "Back" button preserves all input.
- "Save as Draft" available at any step.
- Step 3 shows a live WhatsApp message preview (phone mockup).
- Step 2 shows real-time audience count as criteria are adjusted.

### 7.2 Segment Builder

Visual query builder pattern:

```
[Last Visit Date] [is more than] [30 days ago]           [x]
         AND
[Loyalty Tier]    [is one of]    [Gold, Platinum]         [x]
         AND
[Opted In]        [equals]       [Yes]                    [x]

[+ Add Criteria]

Matching customers: 1,247
[Preview Customers]
```

Rules:
- Each criterion is a row with field selector, operator selector, and value input.
- Operators change based on field type (date fields show date operators, etc.).
- Loyalty-sourced fields are visually distinguished (small badge: "from Loyalty").
- "Preview Customers" shows a sample of 10 matching customers.
- Audience count updates in real-time (debounced 500ms after criteria change).

### 7.3 WhatsApp Message Preview

Show a realistic phone mockup with the rendered message:

```
┌──────────────────────────────┐
│ ◄  Salon Beauty Studio    ⋮ │
│ ─────────────────────────── │
│                              │
│  ┌─────────────────────────┐│
│  │ 🎉 Happy Birthday,     ││
│  │ Priya!                  ││
│  │                         ││
│  │ Enjoy 20% off on your  ││
│  │ next visit. Use code:   ││
│  │ BDAY2026               ││
│  │                         ││
│  │ ┌─────────────────────┐││
│  │ │  Book Now ↗         │││
│  │ └─────────────────────┘││
│  │                 10:30 ✓✓││
│  └─────────────────────────┘│
│                              │
│  Type a message...        📎│
└──────────────────────────────┘
```

- Preview updates live as template variables are mapped.
- Show with sample customer data (first customer from segment).
- Toggle between different sample customers.
- Show both header (image/text) and footer if present.
- Show buttons (Quick Reply / URL / Phone) as they appear in WhatsApp.

### 7.4 Campaign Analytics View

```
[Campaign Name: Diwali Special Offer]  [Status: Completed]  [Duration: 2h 15m]

┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│   2,450   │  │   94.2%  │  │   67.3%  │  │   12.1%  │  │    2.8%  │
│   Sent    │  │ Delivered│  │   Read   │  │ Responded│  │  Failed  │
│  +5% ↑   │  │  +2% ↑  │  │  -1% ↓  │  │  +3% ↑  │  │  -0.5% ↓│
└──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘

[Delivery Timeline Chart — area chart showing messages over time]

[Message Log Table — paginated list of individual messages]
```

---

## 8. Accessibility Standards (WCAG 2.1 AA)

### 8.1 Required Checks

| Check | Standard | Implementation |
|-------|----------|---------------|
| Color contrast | 4.5:1 (text), 3:1 (large text, UI) | Verify all color combinations |
| Focus visible | All interactive elements | `focus:ring-2 ring-blue-500 ring-offset-2` |
| Keyboard navigation | All workflows navigable | Tab order, Enter/Space activation, Escape to close |
| Screen reader text | All non-text content | `alt` on images, `aria-label` on icon buttons |
| Error identification | Form errors announced | `role="alert"`, `aria-invalid`, `aria-describedby` |
| Skip navigation | Skip to main content | Skip link as first focusable element |
| Live regions | Dynamic content changes | `aria-live="polite"` for toasts, `assertive` for errors |
| Heading hierarchy | Logical heading order | No skipping levels (H1 → H2 → H3) |

### 8.2 ARIA Patterns

```tsx
// Tab panel
<div role="tablist" aria-label="Campaign sections">
  <button role="tab" aria-selected={activeTab === 'details'} aria-controls="panel-details">
    Details
  </button>
</div>
<div role="tabpanel" id="panel-details" aria-labelledby="tab-details">
  {/* content */}
</div>

// Data table with sort
<th scope="col" aria-sort={sortDirection}>
  <button onClick={toggleSort}>
    Name {sortDirection === 'ascending' ? '↑' : '↓'}
  </button>
</th>

// Loading state
<div aria-busy={isLoading} aria-live="polite">
  {isLoading ? <Skeleton /> : <Content />}
</div>
```

---

## 9. Animation & Transitions

### 9.1 Approved Transitions

```css
/* Standard transition for interactive elements */
transition-colors     /* Buttons, links, hover states: 150ms */
transition-all        /* Cards with hover elevation: 200ms */
transition-opacity    /* Fade in/out: 200ms */

/* Animations */
animate-pulse         /* Skeleton loading only */
animate-spin          /* Button loading spinner only */
```

### 9.2 Animation Rules

- **No decorative animations.** Every animation must serve a functional purpose.
- **Respect `prefers-reduced-motion`.** Disable all animations when this media query matches.
- **Maximum duration: 300ms** for any transition.
- **No page transition animations** (instant navigation).
- **Skeleton pulse** is the only approved loading animation.
- **No bounce, no slide, no scale** animations on page elements.

---

## 10. Icon System

Use **Heroicons** (Outline variant, 20px size for UI, 24px for standalone):

```tsx
import { MegaphoneIcon, UsersIcon, ChartBarIcon } from '@heroicons/react/24/outline';

// In navigation and buttons: h-5 w-5
<MegaphoneIcon className="h-5 w-5" />

// In empty states: h-12 w-12 text-gray-400
<MegaphoneIcon className="h-12 w-12 text-gray-400" />
```

Rules:
- Use outline variant for navigation, form icons, and UI elements.
- Use solid variant only for active/selected states.
- Never mix icon libraries. Heroicons only.
- Every icon used as a button must have `aria-label`.
