import React, { useState } from 'react';
import { ShieldCheck, Filter, Download, Lock, Key, AlertTriangle } from 'lucide-react';
import PageHeader from '../components/common/PageHeader.jsx';
import EmptyState from '../components/common/EmptyState.jsx';

export default function AuditLogPage() {
  const [filterType, setFilterType] = useState('ALL');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log & Security Compliance"
        subtitle="Immutable audit trail of administrator actions, privilege escalations, logins, and payroll changes."
        breadcrumbs={[{ label: 'Audit Log' }]}
      >
        <button
          onClick={() => alert('Exporting audit logs will be supported via secure CSV/JSON download in Phase 2.')}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-xs transition-colors"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          <span>Export Audit Log</span>
        </button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500 uppercase">Logged Events (24h)</span>
          <div className="text-2xl font-bold text-slate-900 mt-1 font-mono tabular-nums">0</div>
          <span className="text-xs text-slate-400 mt-2 block">No events recorded</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500 uppercase">Privileged Operations</span>
          <div className="text-2xl font-bold text-slate-900 mt-1 font-mono tabular-nums">0</div>
          <span className="text-xs text-slate-400 mt-2 block">Zero admin mutations</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500 uppercase">Security Flags</span>
          <div className="text-2xl font-bold text-slate-900 mt-1 font-mono tabular-nums">0</div>
          <span className="text-xs text-slate-400 mt-2 block">No anomalies detected</span>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <EmptyState
          icon={ShieldCheck}
          title="No Audit Records Generated"
          description="The system's immutable audit logging pipeline is awaiting backend integration. All critical actions including role changes, compensation edits, and authentication events will record cryptographically here."
          actionText="Inspect Audit Retention Policy"
          onAction={() => alert('Audit policies are preserved for 365 days under SOC2/ISO 27001 guidelines.')}
          phaseBadge="Phase 2 Immutable Event Stream"
        />
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 mb-2">
          <span>Security Audit Trail Blueprint</span>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          Ready for endpoints: <code className="text-indigo-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">GET /api/v1/audit/logs</code>, <code className="text-indigo-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">POST /api/v1/audit/export</code>.
        </p>
      </div>
    </div>
  );
}
