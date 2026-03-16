import { Outlet } from 'react-router-dom';
import { Sidebar } from './sidebar';
import { TopBar } from './topbar';

export function DashboardLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />

        <main className="flex-1 overflow-y-auto">
          <div className="px-6 py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
