import { BellIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '@/store/auth-store';

export function TopBar() {
  const user = useAuthStore((s) => s.user);

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6">
      <div />

      <div className="flex items-center gap-4">
        <button
          type="button"
          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2"
          aria-label="View notifications"
        >
          <BellIcon className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-600">
            {user?.name?.charAt(0).toUpperCase() ?? 'U'}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-900">
              {user?.name ?? 'User'}
            </p>
            <p className="text-xs text-gray-500">{user?.email ?? ''}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
