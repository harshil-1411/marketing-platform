import {
  MegaphoneIcon,
  UsersIcon,
  ChatBubbleLeftIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/16/solid';
import { PageHeader } from '@/components/layout/page-header';
import { cn } from '@/utils/cn';

interface KpiCard {
  label: string;
  value: string;
  trend: string;
  trendUp: boolean;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

const kpis: KpiCard[] = [
  { label: 'Active Campaigns', value: '—', trend: '—', trendUp: true, icon: MegaphoneIcon },
  { label: 'Total Customers', value: '—', trend: '—', trendUp: true, icon: UsersIcon },
  { label: 'Messages Sent', value: '—', trend: '—', trendUp: true, icon: ChatBubbleLeftIcon },
  { label: 'Delivery Rate', value: '—', trend: '—', trendUp: true, icon: CheckCircleIcon },
];

export function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Overview of your marketing performance"
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                {kpi.label}
              </p>
              <kpi.icon className="h-5 w-5 text-gray-400" />
            </div>
            <p className="mt-2 text-3xl font-bold text-gray-900">{kpi.value}</p>
            <p
              className={cn(
                'mt-1 flex items-center gap-1 text-xs',
                kpi.trendUp ? 'text-green-600' : 'text-red-600',
              )}
            >
              {kpi.trendUp ? (
                <ArrowUpIcon className="h-3 w-3" />
              ) : (
                <ArrowDownIcon className="h-3 w-3" />
              )}
              {kpi.trend}
            </p>
          </div>
        ))}
      </div>

      {/* Recent campaigns placeholder */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">Recent Campaigns</h2>
        <p className="mt-2 text-sm text-gray-500">
          Campaign data will appear here once you create your first campaign.
        </p>
      </div>
    </div>
  );
}
