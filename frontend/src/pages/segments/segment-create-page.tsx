import { useNavigate, Link } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeftIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { segmentSchema, type SegmentFormData } from '@/schemas/segment-schema';
import { useCreateSegment } from '@/hooks/use-segments';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';

const OPERATORS = [
  { value: 'eq', label: 'Equals' },
  { value: 'neq', label: 'Not Equals' },
  { value: 'gt', label: 'Greater Than' },
  { value: 'lt', label: 'Less Than' },
  { value: 'gte', label: 'Greater or Equal' },
  { value: 'lte', label: 'Less or Equal' },
  { value: 'contains', label: 'Contains' },
];

const FIELDS = [
  { value: 'total_visits', label: 'Total Visits' },
  { value: 'last_visit', label: 'Last Visit' },
  { value: 'tags', label: 'Tags' },
  { value: 'created_at', label: 'Created At' },
];

export function SegmentCreatePage() {
  const navigate = useNavigate();
  const { mutate: create, isPending } = useCreateSegment();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<SegmentFormData>({
    resolver: zodResolver(segmentSchema),
    defaultValues: {
      rules: [{ field: '', operator: 'eq', value: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'rules',
  });

  const onSubmit = (data: SegmentFormData) => {
    create(data, {
      onSuccess: () => navigate('/segments'),
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Segment"
        description="Define rules to group your customers"
        actions={
          <Link to="/segments">
            <Button variant="secondary" leftIcon={<ArrowLeftIcon className="h-4 w-4" />}>
              Back
            </Button>
          </Link>
        }
      />

      <div className="mx-auto max-w-2xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Segment Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              {...register('name')}
              className={`mt-1 block w-full rounded-lg border text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-0 ${
                errors.name
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-green-600 focus:ring-green-600'
              }`}
              placeholder="e.g., High-Value Customers"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-600" role="alert">{errors.name.message}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="description"
              rows={2}
              {...register('description')}
              className="mt-1 block w-full rounded-lg border border-gray-300 text-sm shadow-sm focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-0"
              placeholder="Optional description"
            />
          </div>

          {/* Rules */}
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                Rules <span className="text-red-500">*</span>
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                leftIcon={<PlusIcon className="h-3 w-3" />}
                onClick={() => append({ field: '', operator: 'eq', value: '' })}
              >
                Add Rule
              </Button>
            </div>
            {errors.rules?.message && (
              <p className="mt-1 text-xs text-red-600" role="alert">{errors.rules.message}</p>
            )}
            <div className="mt-2 space-y-3">
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-start gap-2 rounded-lg border border-gray-200 p-3">
                  <select
                    {...register(`rules.${index}.field`)}
                    className="block w-full rounded-lg border border-gray-300 text-sm shadow-sm focus:border-green-600 focus:ring-green-600"
                  >
                    <option value="">Field...</option>
                    {FIELDS.map((f) => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                  <select
                    {...register(`rules.${index}.operator`)}
                    className="block w-full rounded-lg border border-gray-300 text-sm shadow-sm focus:border-green-600 focus:ring-green-600"
                  >
                    {OPERATORS.map((op) => (
                      <option key={op.value} value={op.value}>{op.label}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    {...register(`rules.${index}.value`)}
                    placeholder="Value"
                    className="block w-full rounded-lg border border-gray-300 text-sm shadow-sm focus:border-green-600 focus:ring-green-600"
                  />
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="shrink-0 rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-50 hover:text-red-600"
                      aria-label="Remove rule"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 border-t border-gray-200 pt-5">
            <Link to="/segments">
              <Button type="button" variant="secondary">Cancel</Button>
            </Link>
            <Button type="submit" isLoading={isPending} loadingText="Saving...">
              Save Segment
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
