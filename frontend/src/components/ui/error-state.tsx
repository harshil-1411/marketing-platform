import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { cn } from '@/utils/cn';

interface ErrorStateProps {
  error: Error | null;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({ error, onRetry, className }: ErrorStateProps) {
  const message = error?.message ?? 'An unexpected error occurred. Please try again.';

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 p-8 text-center',
        className,
      )}
      role="alert"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
        <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
      </div>
      <p className="mt-3 text-sm font-medium text-red-800">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 rounded-lg bg-red-100 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-200"
        >
          Retry
        </button>
      )}
    </div>
  );
}
