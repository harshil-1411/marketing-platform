import {
  ChatBubbleLeftIcon,
  CheckCircleIcon,
  EyeIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { PageHeader } from '@/components/layout/page-header';

interface MetricCard {
  label: string;
  value: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

const metrics: MetricCard[] = [
  { label: 'Messages Sent', value: '—', icon: ChatBubbleLeftIcon },
  { label: 'Delivered', value: '—', icon: CheckCircleIcon },
  { label: 'Read', value: '—', icon: EyeIcon },
  { label: 'Failed', value: '—', icon: ExclamationTriangleIcon },
];

export function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Track delivery, read rates, and engagement"
      />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                {metric.label}
              </p>
              <metric.icon className="h-5 w-5 text-gray-400" />
            </div>
            <p className="mt-2 text-3xl font-bold text-gray-900">{metric.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">Campaign Performance</h2>
        <p className="mt-2 text-sm text-gray-500">
          Analytics charts will appear here once campaigns have been executed.
        </p>
      </div>
    </div>
  );
}
