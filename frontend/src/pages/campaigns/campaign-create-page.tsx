import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { campaignSchema, type CampaignFormData } from '@/schemas/campaign-schema';
import { useCreateCampaign } from '@/hooks/use-campaigns';
import { useTemplates } from '@/hooks/use-templates';
import { useSegments } from '@/hooks/use-segments';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';

export function CampaignCreatePage() {
  const navigate = useNavigate();
  const { mutate: create, isPending } = useCreateCampaign();
  const { data: templatesData } = useTemplates({ limit: 100 });
  const { data: segmentsData } = useSegments({ limit: 100 });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CampaignFormData>({
    resolver: zodResolver(campaignSchema),
  });

  const onSubmit = (data: CampaignFormData) => {
    create(data, {
      onSuccess: () => navigate('/campaigns'),
    });
  };

  const templates = templatesData?.data ?? [];
  const segments = segmentsData?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Campaign"
        description="Set up a new WhatsApp marketing campaign"
        actions={
          <Link to="/campaigns">
            <Button variant="secondary" leftIcon={<ArrowLeftIcon className="h-4 w-4" />}>
              Back
            </Button>
          </Link>
        }
      />

      <div className="mx-auto max-w-2xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          {/* Campaign Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Campaign Name <span className="text-red-500">*</span>
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
              placeholder="e.g., Diwali Special Offer 2026"
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={errors.name ? 'name-error' : undefined}
            />
            {errors.name && (
              <p id="name-error" className="mt-1 text-xs text-red-600" role="alert">
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="description"
              rows={3}
              {...register('description')}
              className="mt-1 block w-full rounded-lg border border-gray-300 text-sm shadow-sm focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-0"
              placeholder="Optional description for internal reference"
            />
          </div>

          {/* Campaign Type */}
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700">
              Campaign Type <span className="text-red-500">*</span>
            </label>
            <select
              id="type"
              {...register('type')}
              className={`mt-1 block w-full rounded-lg border text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-0 ${
                errors.type
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-green-600 focus:ring-green-600'
              }`}
              aria-invalid={errors.type ? true : undefined}
            >
              <option value="">Select type...</option>
              <option value="birthday">Birthday Wishes</option>
              <option value="anniversary">Anniversary</option>
              <option value="festival">Festival Greetings</option>
              <option value="offer">Special Offer</option>
              <option value="new_service">New Service</option>
              <option value="reminder">Reminder</option>
              <option value="reengagement">Re-engagement</option>
              <option value="custom">Custom</option>
            </select>
            {errors.type && (
              <p className="mt-1 text-xs text-red-600" role="alert">
                {errors.type.message}
              </p>
            )}
          </div>

          {/* Template */}
          <div>
            <label htmlFor="template_id" className="block text-sm font-medium text-gray-700">
              Template <span className="text-red-500">*</span>
            </label>
            <select
              id="template_id"
              {...register('template_id')}
              className={`mt-1 block w-full rounded-lg border text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-0 ${
                errors.template_id
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-green-600 focus:ring-green-600'
              }`}
              aria-invalid={errors.template_id ? true : undefined}
            >
              <option value="">Select template...</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            {errors.template_id && (
              <p className="mt-1 text-xs text-red-600" role="alert">
                {errors.template_id.message}
              </p>
            )}
          </div>

          {/* Segment */}
          <div>
            <label htmlFor="segment_id" className="block text-sm font-medium text-gray-700">
              Segment <span className="text-red-500">*</span>
            </label>
            <select
              id="segment_id"
              {...register('segment_id')}
              className={`mt-1 block w-full rounded-lg border text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-0 ${
                errors.segment_id
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-green-600 focus:ring-green-600'
              }`}
              aria-invalid={errors.segment_id ? true : undefined}
            >
              <option value="">Select segment...</option>
              {segments.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.customer_count} customers)
                </option>
              ))}
            </select>
            {errors.segment_id && (
              <p className="mt-1 text-xs text-red-600" role="alert">
                {errors.segment_id.message}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 border-t border-gray-200 pt-5">
            <Link to="/campaigns">
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </Link>
            <Button type="submit" isLoading={isPending} loadingText="Saving...">
              Save Campaign
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
