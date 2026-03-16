import { useParams, Link } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useTemplate } from '@/hooks/use-templates';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { CardSkeleton } from '@/components/ui/skeleton';
import { TemplateStatusBadge } from '@/components/templates/template-status-badge';
import { formatDateTime } from '@/utils/format-date';

export function TemplateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError, error, refetch } = useTemplate(id ?? '');

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
        <CardSkeleton count={1} />
      </div>
    );
  }

  if (isError) return <ErrorState error={error} onRetry={refetch} />;
  if (!data) return null;

  const template = data.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title={template.name}
        actions={
          <Link to="/templates">
            <Button variant="secondary" leftIcon={<ArrowLeftIcon className="h-4 w-4" />}>
              Back
            </Button>
          </Link>
        }
      />

      <div className="mx-auto max-w-2xl space-y-6">
        {/* Metadata */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">Details</h2>
          <dl className="mt-4 space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Status</dt>
              <dd><TemplateStatusBadge status={template.status} /></dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Category</dt>
              <dd className="text-sm capitalize text-gray-900">{template.category}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Language</dt>
              <dd className="text-sm uppercase text-gray-900">{template.language}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Created</dt>
              <dd className="text-sm text-gray-900">{formatDateTime(template.created_at)}</dd>
            </div>
          </dl>
        </div>

        {/* Preview */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">Message Preview</h2>
          <div className="mt-4 space-y-3 rounded-lg bg-gray-50 p-4">
            {template.header_text && (
              <p className="text-sm font-semibold text-gray-900">{template.header_text}</p>
            )}
            <p className="whitespace-pre-wrap text-sm text-gray-700">{template.body_text}</p>
            {template.footer_text && (
              <p className="text-xs text-gray-500">{template.footer_text}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
