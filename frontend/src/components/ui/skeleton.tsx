import { cn } from '@/utils/cn';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse rounded bg-gray-200', className)}
      aria-hidden="true"
    />
  );
}

interface TableSkeletonProps {
  rows?: number;
}

export function TableSkeleton({ rows = 5 }: TableSkeletonProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="divide-y divide-gray-200">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-4 py-3 animate-pulse"
          >
            <div className="h-4 w-48 rounded bg-gray-200" />
            <div className="h-5 w-20 rounded-full bg-gray-100" />
            <div className="ml-auto h-4 w-24 rounded bg-gray-100" />
          </div>
        ))}
      </div>
    </div>
  );
}

interface CardSkeletonProps {
  count?: number;
}

export function CardSkeleton({ count = 4 }: CardSkeletonProps) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm animate-pulse"
        >
          <div className="h-4 w-32 rounded bg-gray-200" />
          <div className="mt-3 h-8 w-20 rounded bg-gray-100" />
          <div className="mt-2 h-3 w-24 rounded bg-gray-100" />
        </div>
      ))}
    </div>
  );
}
