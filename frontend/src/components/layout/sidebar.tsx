import { NavLink, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  MegaphoneIcon,
  DocumentTextIcon,
  FunnelIcon,
  UsersIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/utils/cn';
import { useLogout } from '@/hooks/use-auth';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Campaigns', href: '/campaigns', icon: MegaphoneIcon },
  { name: 'Templates', href: '/templates', icon: DocumentTextIcon },
  { name: 'Segments', href: '/segments', icon: FunnelIcon },
  { name: 'Customers', href: '/customers', icon: UsersIcon },
  { name: 'Analytics', href: '/analytics', icon: ChartBarIcon },
];

const secondaryNav: NavItem[] = [
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
];

export function Sidebar() {
  const location = useLocation();
  const { mutate: logout } = useLogout();

  return (
    <div className="flex h-full w-64 shrink-0 flex-col border-r border-gray-200 bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-gray-200 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-600">
          <span className="text-sm font-bold text-white">M</span>
        </div>
        <span className="text-sm font-semibold text-gray-900">
          Marketing Platform
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname.startsWith(item.href);
            return (
              <li key={item.name}>
                <NavLink
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'border-l-2 border-green-600 bg-green-50 text-green-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                  )}
                >
                  <item.icon
                    className={cn(
                      'h-5 w-5 shrink-0',
                      isActive ? 'text-green-600' : 'text-gray-400',
                    )}
                  />
                  {item.name}
                </NavLink>
              </li>
            );
          })}
        </ul>

        <div className="mt-6 border-t border-gray-200 pt-4">
          <ul className="space-y-1">
            {secondaryNav.map((item) => {
              const isActive = location.pathname.startsWith(item.href);
              return (
                <li key={item.name}>
                  <NavLink
                    to={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'border-l-2 border-green-600 bg-green-50 text-green-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                    )}
                  >
                    <item.icon
                      className={cn(
                        'h-5 w-5 shrink-0',
                        isActive ? 'text-green-600' : 'text-gray-400',
                      )}
                    />
                    {item.name}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      {/* Sign out — pinned to bottom */}
      <div className="border-t border-gray-200 p-3">
        <button
          onClick={() => logout()}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
        >
          <ArrowRightOnRectangleIcon className="h-5 w-5 text-gray-400" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
