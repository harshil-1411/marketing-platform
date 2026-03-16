import { PageHeader } from '@/components/layout/page-header';

interface PlaceholderPageProps {
  title: string;
  description?: string;
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} />
      <div className="rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
        <p className="text-sm text-gray-500">
          This page will be implemented in a future phase.
        </p>
      </div>
    </div>
  );
}
