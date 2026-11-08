import React from 'react';
import { Megaphone, Plus, Bell, Pin } from 'lucide-react';
import PageHeader from '../components/common/PageHeader.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import { useRole } from '../context/RoleContext.jsx';

export default function AnnouncementsPage() {
  const { isEmployee } = useRole();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Company Announcements"
        subtitle="Broadcast company-wide bulletins, policy updates, holiday notices, and emergency alerts."
        breadcrumbs={[{ label: 'Announcements' }]}
      >
        {!isEmployee && (
          <button
            onClick={() => alert('Publish Announcement dialog will connect in Phase 2.')}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Publish Notice</span>
          </button>
        )}
      </PageHeader>

      {/* Pinned system note */}
      <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 flex gap-3">
        <Pin className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
        <div className="text-xs">
          <span className="font-semibold text-indigo-950 block">
            Welcome to HCM Lite &middot; Phase 1 Platform Deployment
          </span>
          <p className="text-slate-600 mt-1 leading-relaxed">
            The foundation shell and role-based frontend navigation are live. Company bulletins published by HR and Leadership will appear in this unified feed with read receipts and push notifications.
          </p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <EmptyState
          icon={Megaphone}
          title="No Company Notices Published"
          description={
            isEmployee
              ? 'No general announcements have been posted by your organization yet. Check back later for updates from HR and executive management.'
              : 'Keep your workforce aligned by publishing your first company bulletin or policy update.'
          }
          actionText={!isEmployee ? 'Create Announcement' : undefined}
          onAction={() => alert('Announcement creation form is planned for Phase 2.')}
          phaseBadge="Phase 2 Communication Bus"
        />
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 mb-2">
          <span>Announcements API Schema</span>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          Ready for endpoints: <code className="text-indigo-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">GET /api/v1/announcements</code>, <code className="text-indigo-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">POST /api/v1/announcements</code>, <code className="text-indigo-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">PATCH /api/v1/announcements/:id/pin</code>.
        </p>
      </div>
    </div>
  );
}
