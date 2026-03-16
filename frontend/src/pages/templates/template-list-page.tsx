import { useSearchParams, Link } from 'react-router-dom';
import { PlusIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { useTemplates } from '@/hooks/use-templates';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { TableSkeleton } from '@/components/ui/skeleton';
import { TemplateStatusBadge } from '@/components/templates/template-status-badge';
import { formatDate } from '@/utils/format-date';
import type { TemplateStatus } from '@/types/template';

const STATUS_FILTERS: { label: string; value: TemplateStatus | '' }[] = [
  { label: 'All', value: '' },
  { label: 'Draft', value: 'draft' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
];

export function TemplateListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = (searchParams.get('status') as TemplateStatus) || undefined;

  const { data, isLoading, isError, error, refetch } = useTemplates({
    status: statusFilter,
    limit: 25,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Templates"
        description="Manage your WhatsApp message templates"
        actions={
          <Link to="/templates/new">
            <Button leftIcon={<PlusIcon className="h-4 w-4" />}>
              Create Template
            </Button>
          </Link>
        }
      />

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

      {isLoading && <TableSkeleton rows={5} />}
      {isError && <ErrorState error={error} onRetry={refetch} />}
      {data && data.data.length === 0 && (
        <EmptyState
          icon={DocumentTextIcon}
          title="No templates yet"
          description="Create a message template to use in your campaigns."
          action={
            <Link to="/templates/new">
              <Button leftIcon={<PlusIcon className="h-4 w-4" />}>
                Create Template
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
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Language
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {data.data.map((template) => (
                <tr key={template.id} className="transition-colors hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      to={`/templates/${template.id}`}
                      className="text-sm font-medium text-gray-900 hover:text-green-700"
                    >
                      {template.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm capitalize text-gray-600">
                    {template.category}
                  </td>
                  <td className="px-4 py-3">
                    <TemplateStatusBadge status={template.status} />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 uppercase">
                    {template.language}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                    {formatDate(template.created_at)}
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
