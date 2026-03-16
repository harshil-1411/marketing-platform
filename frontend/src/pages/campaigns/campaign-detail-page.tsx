import { useParams, Link } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useCampaign } from '@/hooks/use-campaigns';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { CardSkeleton } from '@/components/ui/skeleton';
import { CampaignStatusBadge } from '@/components/campaigns/campaign-status-badge';
import { formatDateTime } from '@/utils/format-date';
import { formatNumber, formatPercent } from '@/utils/format-number';

export function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError, error, refetch } = useCampaign(id ?? '');

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
        <CardSkeleton count={2} />
      </div>
    );
  }

  if (isError) return <ErrorState error={error} onRetry={refetch} />;
  if (!data) return null;

  const campaign = data.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title={campaign.name}
        description={campaign.description}
        actions={
          <Link to="/campaigns">
            <Button variant="secondary" leftIcon={<ArrowLeftIcon className="h-4 w-4" />}>
              Back
            </Button>
          </Link>
        }
      />

      {/* Status + metadata */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">Details</h2>
          <dl className="mt-4 space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Status</dt>
              <dd><CampaignStatusBadge status={campaign.status} /></dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Type</dt>
              <dd className="text-sm text-gray-900 capitalize">{campaign.type.replace('_', ' ')}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Template</dt>
              <dd className="text-sm text-gray-900">{campaign.template_name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Segment</dt>
              <dd className="text-sm text-gray-900">{campaign.segment_name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Scheduled</dt>
              <dd className="text-sm text-gray-900">{formatDateTime(campaign.scheduled_at)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Created</dt>
              <dd className="text-sm text-gray-900">{formatDateTime(campaign.created_at)}</dd>
            </div>
          </dl>
        </div>

        {/* Delivery stats */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">Delivery</h2>
          <dl className="mt-4 space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Recipients</dt>
              <dd className="text-sm font-medium text-gray-900">
                {formatNumber(campaign.total_recipients)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Sent</dt>
              <dd className="text-sm text-gray-900">
                {formatNumber(campaign.sent_count)} ({formatPercent(campaign.sent_count, campaign.total_recipients)})
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Delivered</dt>
              <dd className="text-sm text-gray-900">
                {formatNumber(campaign.delivered_count)} ({formatPercent(campaign.delivered_count, campaign.total_recipients)})
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Read</dt>
              <dd className="text-sm text-gray-900">
                {formatNumber(campaign.read_count)} ({formatPercent(campaign.read_count, campaign.total_recipients)})
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Failed</dt>
              <dd className="text-sm text-red-600">
                {formatNumber(campaign.failed_count)} ({formatPercent(campaign.failed_count, campaign.total_recipients)})
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
