import { PageHeader } from '@/components/layout/page-header';

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your account and platform settings"
      />

      <div className="mx-auto max-w-2xl space-y-6">
        {/* Profile */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">Profile</h2>
          <p className="mt-1 text-sm text-gray-500">
            Profile settings will be available here.
          </p>
        </div>

        {/* WhatsApp Configuration */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">WhatsApp Configuration</h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage your WhatsApp Business Account settings and phone number.
          </p>
        </div>

        {/* API Keys */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">API Keys</h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage API keys for programmatic access.
          </p>
        </div>
      </div>
    </div>
  );
}
