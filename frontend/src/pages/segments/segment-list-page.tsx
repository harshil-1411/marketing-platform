import { Link } from 'react-router-dom';
import { PlusIcon, FunnelIcon } from '@heroicons/react/24/outline';
import { useSegments } from '@/hooks/use-segments';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { TableSkeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/utils/format-date';
import { formatNumber } from '@/utils/format-number';

export function SegmentListPage() {
  const { data, isLoading, isError, error, refetch } = useSegments({ limit: 25 });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Segments"
        description="Manage customer segments for targeted campaigns"
        actions={
          <Link to="/segments/new">
            <Button leftIcon={<PlusIcon className="h-4 w-4" />}>
              Create Segment
            </Button>
          </Link>
        }
      />

      {isLoading && <TableSkeleton rows={5} />}
      {isError && <ErrorState error={error} onRetry={refetch} />}
      {data && data.data.length === 0 && (
        <EmptyState
          icon={FunnelIcon}
          title="No segments yet"
          description="Create a segment to group your customers for targeted campaigns."
          action={
            <Link to="/segments/new">
              <Button leftIcon={<PlusIcon className="h-4 w-4" />}>
                Create Segment
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
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Description
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Customers
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Rules
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {data.data.map((segment) => (
                <tr key={segment.id} className="transition-colors hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-gray-900">
                      {segment.name}
                    </span>
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-sm text-gray-500">
                    {segment.description || '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-900">
                    {formatNumber(segment.customer_count)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-600">
                    {segment.rules.length}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                    {formatDate(segment.created_at)}
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
