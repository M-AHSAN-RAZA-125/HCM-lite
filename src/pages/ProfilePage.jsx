import React from 'react';
import { User, Mail, Shield, Building, Phone, Calendar, Key, CheckCircle2 } from 'lucide-react';
import PageHeader from '../components/common/PageHeader.jsx';
import { useRole } from '../context/RoleContext.jsx';

export default function ProfilePage() {
  const { currentUser, currentRole } = useRole();

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Profile & Credentials"
        subtitle="View and update your personal employee records, job title, and authentication settings."
        breadcrumbs={[{ label: 'Profile' }]}
      />

      {/* Profile Header Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white font-bold text-xl flex items-center justify-center shadow-sm">
            {currentUser.initials}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">{currentUser.name}</h2>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                {currentUser.badge}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{currentUser.department}</p>
            <div className="flex items-center gap-3 text-xs text-slate-400 mt-2">
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                {currentUser.email}
              </span>
              <span>&middot;</span>
              <span className="font-mono">ID: EMP-0094</span>
            </div>
          </div>
        </div>

        <div className="text-right self-stretch sm:self-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
          <span className="text-[11px] text-slate-400 block">System Access Level</span>
          <span className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
            {currentRole} Role
          </span>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Employment Information */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Building className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-semibold text-slate-900">Employment Details</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Department</span>
              <span className="font-medium text-slate-800">{currentUser.department}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Employment Type</span>
              <span className="font-medium text-slate-800">Full-Time Regular</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Work Location</span>
              <span className="font-medium text-slate-800">San Francisco HQ / Hybrid</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Reporting Manager</span>
              <span className="font-medium text-slate-800">Sarah Jenkins (VP People)</span>
            </div>
          </div>
        </div>

        {/* Security & Authentication */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Key className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-semibold text-slate-900">Security & Credentials</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Authentication Mode</span>
              <span className="font-medium text-slate-800">Preview SSO / Local Token</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Multi-Factor Auth (MFA)</span>
              <span className="font-medium text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Enforced
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Active Sessions</span>
              <span className="font-mono text-slate-800">1 session (AI Studio Web)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Last Sign-in</span>
              <span className="text-slate-800">Today at 10:45 AM</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
