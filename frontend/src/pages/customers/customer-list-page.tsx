import { useSearchParams } from 'react-router-dom';
import { UsersIcon } from '@heroicons/react/24/outline';
import { useCustomers } from '@/hooks/use-customers';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { TableSkeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/utils/format-date';
import { formatNumber } from '@/utils/format-number';

export function CustomerListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('search') ?? undefined;
  const cursor = searchParams.get('cursor') ?? undefined;

  const { data, isLoading, isError, error, refetch } = useCustomers({
    search,
    cursor,
    limit: 25,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="Manage your customer database"
      />

      {/* Search */}
      <div>
        <input
          type="text"
          placeholder="Search by name or phone..."
          defaultValue={search}
          onChange={(e) => {
            const val = e.target.value;
            const params = new URLSearchParams();
            if (val) params.set('search', val);
            setSearchParams(params);
          }}
          className="block w-full max-w-sm rounded-lg border border-gray-300 text-sm shadow-sm focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-0"
        />
      </div>

      {isLoading && <TableSkeleton rows={5} />}
      {isError && <ErrorState error={error} onRetry={refetch} />}
      {data && data.data.length === 0 && (
        <EmptyState
          icon={UsersIcon}
          title="No customers found"
          description={
            search
              ? 'No customers match your search. Try a different query.'
              : 'Customers will appear here once they are imported or created.'
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
                  Phone
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Tags
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Visits
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Last Visit
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {data.data.map((customer) => (
                <tr key={customer.id} className="transition-colors hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">{customer.name}</p>
                    {customer.email && (
                      <p className="text-xs text-gray-500">{customer.email}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {customer.phone}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {customer.tags.map((tag) => (
                        <Badge key={tag} variant="gray">{tag}</Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-900">
                    {formatNumber(customer.total_visits)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                    {formatDate(customer.last_visit)}
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
