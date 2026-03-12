# Skill: Forms (React Hook Form + Zod)

**Reference files:**
- `.claude/context/REACT_PATTERNS.md` — Section 5 (Form Patterns)
- `.claude/context/UX_DESIGN_SYSTEM.md` — Section 5.5 (Forms and Inputs)

Full code example is in REACT_PATTERNS.md Section 5.1. This skill covers the decision rules
and the gaps not covered there.

---

## The Non-Negotiable Rules

```
✅ Every form uses React Hook Form + Zod. No exceptions.
✅ Zod schema is defined in /schemas/ folder, not inline in the component
✅ Schema field names match backend Pydantic model field names exactly
✅ noValidate on every <form> element (disable browser validation)
✅ Error messages come from Zod — no hardcoded strings in JSX
✅ Submit button is disabled and shows spinner during isSubmitting
✅ Form input is never cleared on validation error
✅ Every input has an associated <label> — no placeholder-as-label
```

---

## Schema Location and Naming

```
frontend/src/
  schemas/
    campaign-schema.ts    # campaignSchema, CampaignFormData
    segment-schema.ts     # segmentSchema, SegmentFormData
    template-schema.ts    # templateSchema, TemplateFormData
    auth-schema.ts        # loginSchema, etc.
```

Import the schema in both the form component AND anywhere you need the type:

```typescript
// schemas/template-schema.ts
import { z } from 'zod'

export const templateSchema = z.object({
  name: z
    .string()
    .min(1, 'Template name is required')
    .max(512, 'Must be under 512 characters')
    .regex(/^[a-z0-9_]+$/, 'Only lowercase letters, numbers, and underscores')
    .trim(),
  language: z.enum(['en', 'hi'], {
    errorMap: () => ({ message: 'Please select a language' })
  }),
  category: z.enum(['MARKETING', 'UTILITY']),
  body_text: z
    .string()
    .min(1, 'Message body is required')
    .max(1024, 'Body must be under 1024 characters'),
})

export type TemplateFormData = z.infer<typeof templateSchema>
```

---

## Standard Form Component Structure

```tsx
// components/templates/template-form.tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { templateSchema, type TemplateFormData } from '@/schemas/template-schema'

interface TemplateFormProps {
  onSubmit: (data: TemplateFormData) => void
  isSubmitting: boolean
  defaultValues?: Partial<TemplateFormData>
}

export function TemplateForm({ onSubmit, isSubmitting, defaultValues }: TemplateFormProps) {
  const {
    register,
    handleSubmit,
    watch,                    // use watch() for live preview (e.g. WhatsApp preview)
    formState: { errors },
  } = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: defaultValues ?? {
      language: 'en',
      category: 'MARKETING',
    },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      {/* Fields here */}
      <SubmitRow isSubmitting={isSubmitting} />
    </form>
  )
}
```

---

## Input Field Pattern (copy-paste template)

Every field follows this exact HTML structure:

```tsx
<div>
  <label htmlFor="field-id" className="block text-sm font-medium text-gray-700">
    Field Label <span className="text-red-500">*</span>
  </label>
  <input
    id="field-id"
    type="text"
    {...register('fieldName')}
    className={cn(
      'mt-1 block w-full rounded-lg border text-sm shadow-sm',
      errors.fieldName
        ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
    )}
    aria-invalid={!!errors.fieldName}
    aria-describedby={errors.fieldName ? 'field-id-error' : undefined}
  />
  {/* Optional help text */}
  <p className="mt-1 text-xs text-gray-500">Help text here</p>
  {/* Error message */}
  {errors.fieldName && (
    <p id="field-id-error" className="mt-1 text-xs text-red-600" role="alert">
      {errors.fieldName.message}
    </p>
  )}
</div>
```

---

## Submit Button Pattern

```tsx
// Always at the bottom, right-aligned, with cancel
<div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
  <button
    type="button"
    onClick={onCancel}
    className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
  >
    Cancel
  </button>
  <button
    type="submit"
    disabled={isSubmitting}
    className="inline-flex items-center rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
  >
    {isSubmitting && <Spinner className="mr-2 h-4 w-4" />}
    {isSubmitting ? 'Saving...' : 'Save'}
  </button>
</div>
```

---

## Using the Form in a Page

The page owns the mutation. The form is purely presentational:

```tsx
// pages/templates/template-create-page.tsx
export function TemplateCreatePage() {
  const navigate = useNavigate()
  const createTemplate = useCreateTemplate()

  async function handleSubmit(data: TemplateFormData) {
    try {
      await createTemplate.mutateAsync(data)
      toast.success('Template created')
      navigate('/templates')
    } catch (error) {
      toast.error(error instanceof ApiRequestError ? error.message : 'Something went wrong')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="New Template" />
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <TemplateForm
          onSubmit={handleSubmit}
          isSubmitting={createTemplate.isPending}
        />
      </div>
    </div>
  )
}
```

---

## Multi-Step Wizard Forms

For the Campaign creation wizard, each step is its own form:

```typescript
// Each step has its own schema and useForm instance
// Step data is accumulated in Zustand (not React Query — it's not server data yet)

// store/campaign-wizard-store.ts
interface CampaignWizardState {
  step: number
  basics: Partial<CampaignBasicsFormData>
  audience: Partial<CampaignAudienceFormData>
  content: Partial<CampaignContentFormData>
  schedule: Partial<CampaignScheduleFormData>
  setStep: (step: number) => void
  setBasics: (data: CampaignBasicsFormData) => void
  // ... setters for each step
  reset: () => void
}
```

Rules:
- Each step's form calls `wizardStore.setStepData(data)` on valid submit, then advances step
- Final step (Review) calls the actual API mutation using accumulated store data
- `reset()` is called after successful campaign creation
- Navigating back never loses data — it's in the store

---

## WhatsApp Template Body — Live Preview Hook

The template body field needs to update the WhatsApp preview in real-time:

```typescript
// Use watch() to get live field values for the preview
const bodyText = watch('body_text')
const headerText = watch('header_text')

// Pass to preview component
<WhatsAppMessagePreview
  body={bodyText}
  header={headerText}
  variables={sampleVariables}
/>
```
