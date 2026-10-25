import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import AppLayout from '../components/layout/AppLayout.jsx';
import RoleSelectionPage from '../pages/RoleSelectionPage.jsx';
import AuthenticationPage from '../pages/AuthenticationPage.jsx';
import CompanySetupPage from '../pages/CompanySetupPage.jsx';
import DashboardPage from '../pages/DashboardPage.jsx';
import OrganizationPage from '../pages/OrganizationPage.jsx';
import EmployeesPage from '../pages/EmployeesPage.jsx';
import EmployeeProfilePage from '../pages/EmployeeProfilePage.jsx';
import AttendancePage from '../pages/AttendancePage.jsx';
import LeavesPage from '../pages/LeavesPage.jsx';
import PayrollPage from '../pages/PayrollPage.jsx';
import AnalyticsPage from '../pages/AnalyticsPage.jsx';
import AiAssistantPage from '../pages/AiAssistantPage.jsx';
import AnnouncementsPage from '../pages/AnnouncementsPage.jsx';
import AuditLogPage from '../pages/AuditLogPage.jsx';
import SettingsPage from '../pages/SettingsPage.jsx';
import ProfilePage from '../pages/ProfilePage.jsx';
import NotFoundPage from '../pages/NotFoundPage.jsx';
import EmployeeApprovalRequestsPage from '../pages/EmployeeApprovalRequestsPage.jsx';

function AdminRoute({ children }) {
  const { user } = useAuth();
  return user?.role === 'ADMIN' ? children : <Navigate to="/dashboard" replace />;
}

function HrAdminRoute({ children }) {
  const { user } = useAuth();
  return ['ADMIN', 'HR'].includes(user?.role) ? children : <Navigate to="/dashboard" replace />;
}

function ProtectedRoute({ children }) {
  const { user, loading, authError, refreshSession } = useAuth();
  if (loading) {
    return (
      <div className="p-8 text-center text-sm text-slate-500" role="status" aria-live="polite">
        Verifying your session...
      </div>
    );
  }
  if (authError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <section className="max-w-md rounded-2xl border border-amber-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900">Session verification unavailable</h1>
          <p className="mt-2 text-sm text-slate-600">{authError}</p>
          <button
            type="button"
            onClick={() => refreshSession()}
            disabled={loading}
            aria-busy={loading}
            className="mt-5 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            {loading ? 'Verifying…' : 'Try again'}
          </button>
        </section>
      </main>
    );
  }
  return user ? children : <Navigate to="/login" replace />;
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* Unauthenticated / Setup Entry Routes */}
      <Route path="/login" element={<RoleSelectionPage />} />
      <Route path="/auth/:role" element={<AuthenticationPage />} />
      <Route path="/setup" element={<CompanySetupPage />} />

      {/* Authenticated Workspace Shell */}
      <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="organization" element={<HrAdminRoute><OrganizationPage /></HrAdminRoute>} />
        <Route path="employees" element={<HrAdminRoute><EmployeesPage /></HrAdminRoute>} />
        <Route path="employees/:id" element={<HrAdminRoute><EmployeeProfilePage /></HrAdminRoute>} />
        <Route path="employee-approvals" element={<HrAdminRoute><EmployeeApprovalRequestsPage /></HrAdminRoute>} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="attendance/records" element={<AttendancePage />} />
        <Route path="attendance/my-attendance" element={<AttendancePage />} />
        <Route path="leaves" element={<LeavesPage />} />
        <Route path="leaves/apply" element={<LeavesPage />} />
        <Route path="leaves/my-requests" element={<LeavesPage />} />
        <Route path="leaves/approvals" element={<LeavesPage />} />
        <Route path="leaves/calendar" element={<LeavesPage />} />
        <Route path="leaves/balances" element={<LeavesPage />} />
        <Route path="payroll" element={<PayrollPage />} />
        <Route path="payroll/salary-structures" element={<PayrollPage />} />
        <Route path="payroll/process" element={<PayrollPage />} />
        <Route path="payroll/history" element={<PayrollPage />} />
        <Route path="payroll/payslips" element={<PayrollPage />} />
        <Route path="analytics" element={<HrAdminRoute><AnalyticsPage /></HrAdminRoute>} />
        <Route path="ai-assistant" element={<AiAssistantPage />} />
        <Route path="announcements" element={<AnnouncementsPage />} />
        <Route path="audit-log" element={<AdminRoute><AuditLogPage /></AdminRoute>} />
        <Route path="settings" element={<AdminRoute><SettingsPage /></AdminRoute>} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
