import { lazy, Suspense, type ReactNode } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { TableSkeleton } from '@/components/ui/skeleton';

// Auth
const LoginPage = lazy(() =>
  import('@/pages/auth/login-page').then((m) => ({ default: m.LoginPage })),
);

// Dashboard
const DashboardPage = lazy(() =>
  import('@/pages/dashboard/dashboard-page').then((m) => ({ default: m.DashboardPage })),
);

// Campaigns
const CampaignListPage = lazy(() =>
  import('@/pages/campaigns/campaign-list-page').then((m) => ({ default: m.CampaignListPage })),
);
const CampaignCreatePage = lazy(() =>
  import('@/pages/campaigns/campaign-create-page').then((m) => ({ default: m.CampaignCreatePage })),
);
const CampaignDetailPage = lazy(() =>
  import('@/pages/campaigns/campaign-detail-page').then((m) => ({ default: m.CampaignDetailPage })),
);

// Templates
const TemplateListPage = lazy(() =>
  import('@/pages/templates/template-list-page').then((m) => ({ default: m.TemplateListPage })),
);
const TemplateCreatePage = lazy(() =>
  import('@/pages/templates/template-create-page').then((m) => ({ default: m.TemplateCreatePage })),
);
const TemplateDetailPage = lazy(() =>
  import('@/pages/templates/template-detail-page').then((m) => ({ default: m.TemplateDetailPage })),
);

// Segments
const SegmentListPage = lazy(() =>
  import('@/pages/segments/segment-list-page').then((m) => ({ default: m.SegmentListPage })),
);
const SegmentCreatePage = lazy(() =>
  import('@/pages/segments/segment-create-page').then((m) => ({ default: m.SegmentCreatePage })),
);

// Customers
const CustomerListPage = lazy(() =>
  import('@/pages/customers/customer-list-page').then((m) => ({ default: m.CustomerListPage })),
);

// Analytics
const AnalyticsPage = lazy(() =>
  import('@/pages/analytics/analytics-page').then((m) => ({ default: m.AnalyticsPage })),
);

// Settings
const SettingsPage = lazy(() =>
  import('@/pages/settings/settings-page').then((m) => ({ default: m.SettingsPage })),
);

// Admin
const AdminDashboardPage = lazy(() =>
  import('@/pages/admin/admin-dashboard-page').then((m) => ({ default: m.AdminDashboardPage })),
);
const AdminTenantsPage = lazy(() =>
  import('@/pages/admin/admin-tenants-page').then((m) => ({ default: m.AdminTenantsPage })),
);

// Placeholder for future pages
const PlaceholderPage = lazy(() =>
  import('@/pages/placeholder-page').then((m) => ({ default: m.PlaceholderPage })),
);

function PageLoader() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
      <TableSkeleton rows={5} />
    </div>
  );
}

function Lazy({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

export function App() {
  return (
    <Routes>
      {/* Redirect root to dashboard */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Protected tenant dashboard — persistent layout shell */}
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<Lazy><DashboardPage /></Lazy>} />

          {/* Campaigns */}
          <Route path="/campaigns" element={<Lazy><CampaignListPage /></Lazy>} />
          <Route path="/campaigns/new" element={<Lazy><CampaignCreatePage /></Lazy>} />
          <Route path="/campaigns/:id" element={<Lazy><CampaignDetailPage /></Lazy>} />

          {/* Templates */}
          <Route path="/templates" element={<Lazy><TemplateListPage /></Lazy>} />
          <Route path="/templates/new" element={<Lazy><TemplateCreatePage /></Lazy>} />
          <Route path="/templates/:id" element={<Lazy><TemplateDetailPage /></Lazy>} />

          {/* Segments */}
          <Route path="/segments" element={<Lazy><SegmentListPage /></Lazy>} />
          <Route path="/segments/new" element={<Lazy><SegmentCreatePage /></Lazy>} />

          {/* Customers */}
          <Route path="/customers" element={<Lazy><CustomerListPage /></Lazy>} />

          {/* Analytics */}
          <Route path="/analytics" element={<Lazy><AnalyticsPage /></Lazy>} />

          {/* Settings */}
          <Route path="/settings" element={<Lazy><SettingsPage /></Lazy>} />
        </Route>
      </Route>

      {/* Protected super admin — same layout, different nav */}
      <Route element={<ProtectedRoute />}>
        <Route path="/admin" element={<DashboardLayout />}>
          <Route path="dashboard" element={<Lazy><AdminDashboardPage /></Lazy>} />
          <Route path="tenants" element={<Lazy><AdminTenantsPage /></Lazy>} />
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
        </Route>
      </Route>

      {/* Login — no layout shell, no auth required */}
      <Route path="/login" element={<Lazy><LoginPage /></Lazy>} />
      <Route
        path="/forgot-password"
        element={
          <Lazy>
            <PlaceholderPage
              title="Forgot Password"
              description="Reset your password"
            />
          </Lazy>
        }
      />

      {/* 404 */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
