import { BuildingStorefrontIcon } from '@heroicons/react/24/outline';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/ui/empty-state';

export function AdminTenantsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Tenants"
        description="Manage all registered salon tenants"
      />

      <EmptyState
        icon={BuildingStorefrontIcon}
        title="No tenants yet"
        description="Tenants will appear here once they are provisioned."
      />
    </div>
  );
}
