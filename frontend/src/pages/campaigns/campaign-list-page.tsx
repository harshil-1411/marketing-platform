import { useSearchParams, Link } from 'react-router-dom';
import { PlusIcon, MegaphoneIcon } from '@heroicons/react/24/outline';
import { useCampaigns } from '@/hooks/use-campaigns';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { TableSkeleton } from '@/components/ui/skeleton';
import { CampaignStatusBadge } from '@/components/campaigns/campaign-status-badge';
import { formatDateTime } from '@/utils/format-date';
import { formatNumber } from '@/utils/format-number';
import type { CampaignStatus } from '@/types/campaign';

const STATUS_FILTERS: { label: string; value: CampaignStatus | '' }[] = [
  { label: 'All', value: '' },
  { label: 'Draft', value: 'draft' },
  { label: 'Scheduled', value: 'scheduled' },
  { label: 'Executing', value: 'executing' },
  { label: 'Completed', value: 'completed' },
  { label: 'Failed', value: 'failed' },
];

export function CampaignListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = (searchParams.get('status') as CampaignStatus) || undefined;
  const cursor = searchParams.get('cursor') ?? undefined;

  const { data, isLoading, isError, error, refetch } = useCampaigns({
    status: statusFilter,
    cursor,
    limit: 25,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campaigns"
        description="Manage your WhatsApp marketing campaigns"
        actions={
          <Link to="/campaigns/new">
            <Button leftIcon={<PlusIcon className="h-4 w-4" />}>
              Create Campaign
            </Button>
          </Link>
        }
      />

      {/* Status filter tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.value}
            onClick={() => {
              const params = new URLSearchParams();
              if (filter.value) params.set('status', filter.value);
              setSearchParams(params);
            }}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              (statusFilter ?? '') === filter.value
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Content states */}
      {isLoading && <TableSkeleton rows={5} />}
      {isError && <ErrorState error={error} onRetry={refetch} />}
      {data && data.data.length === 0 && (
        <EmptyState
          icon={MegaphoneIcon}
          title="No campaigns yet"
          description="Create your first WhatsApp campaign to start reaching customers."
          action={
            <Link to="/campaigns/new">
              <Button leftIcon={<PlusIcon className="h-4 w-4" />}>
                Create Campaign
              </Button>
            </Link>
          }
        />
      )}
      {data && data.data.length > 0 && (
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
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Recipients
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Delivered
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Scheduled
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {data.data.map((campaign) => (
                <tr
                  key={campaign.id}
                  className="transition-colors hover:bg-gray-50"
                >
                  <td className="px-4 py-3">
                    <Link
                      to={`/campaigns/${campaign.id}`}
                      className="text-sm font-medium text-gray-900 hover:text-green-700"
                    >
                      {campaign.name}
                    </Link>
                    <p className="text-xs text-gray-500">{campaign.type}</p>
                  </td>
                  <td className="px-4 py-3">
                    <CampaignStatusBadge status={campaign.status} />
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-900">
                    {formatNumber(campaign.total_recipients)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-900">
                    {formatNumber(campaign.delivered_count)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                    {formatDateTime(campaign.scheduled_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
