import React, { useState } from 'react';
import {
  Building2,
  Mail,
  Phone,
  Globe,
  Briefcase,
  User,
  ShieldCheck,
  Edit2,
  ArrowLeft,
  CheckCircle2,
  Database,
  ArrowRight,
  Info,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SetupReview({
  companyData,
  adminData,
  onEditStep,
  onBack,
}) {
  const [submitting, setSubmitting] = useState(false);
  const [showDevNotice, setShowDevNotice] = useState(false);
  const navigate = useNavigate();

  const handleCreateWorkspace = () => {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setShowDevNotice(true);
    }, 800);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base sm:text-lg font-semibold text-slate-900">
          Review & Confirmation
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Review your organization parameters and administrator details before provisioning the workspace.
        </p>
      </div>

      {/* Review Cards Grid */}
      <div className="space-y-4">
        {/* Company Summary Card */}
        <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 sm:p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 mb-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs sm:text-sm font-semibold text-slate-900">
                Organization Details
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onEditStep(1)}
              className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
            >
              <Edit2 className="w-3 h-3" />
              <span>Edit</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Company Name</span>
              <span className="font-semibold text-slate-800">{companyData.companyName || '—'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Corporate Email</span>
              <span className="font-medium text-slate-800">{companyData.companyEmail || '—'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Industry</span>
              <span className="font-medium text-slate-800">{companyData.industry || '—'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Phone</span>
              <span className="font-medium text-slate-800">{companyData.companyPhone || 'Not provided'}</span>
            </div>
            <div className="sm:col-span-2">
              <span className="text-slate-400 block text-[11px]">Website</span>
              <span className="font-medium text-slate-800">{companyData.website || 'Not provided'}</span>
            </div>
          </div>
        </div>

        {/* Admin Account Summary Card */}
        <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 sm:p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 mb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs sm:text-sm font-semibold text-slate-900">
                Primary Administrator
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onEditStep(2)}
              className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
            >
              <Edit2 className="w-3 h-3" />
              <span>Edit</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Full Name</span>
              <span className="font-semibold text-slate-800">{adminData.adminName || '—'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Login Email</span>
              <span className="font-medium text-slate-800">{adminData.adminEmail || '—'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Assigned Role</span>
              <span className="font-medium text-indigo-700">Root Administrator (SuperAdmin)</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Password Security</span>
              <span className="font-mono text-slate-600">Configured (8+ characters)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="pt-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={submitting}
          className="flex items-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors focus:outline-none"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <button
          type="button"
          onClick={handleCreateWorkspace}
          disabled={submitting}
          className="flex items-center gap-2 px-6 py-2.5 text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-60 rounded-xl shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
        >
          {submitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Validating configuration...</span>
            </>
          ) : (
            <>
              <span>Create Company Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      {/* Informative Development Notice Modal */}
      {showDevNotice && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mb-4">
              <Database className="w-6 h-6" />
            </div>

            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              Company Setup Validated (Phase 2 Preview)
            </h3>

            <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
              All company details and the administrator profile for <strong>{companyData.companyName}</strong> have been verified on the client.
            </p>

            <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 space-y-1.5">
              <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                <Info className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Backend Integration Notice</span>
              </div>
              <p>
                Persisting company schemas and creating administrative records in a relational database or cloud datastore will be connected during the backend integration phase.
              </p>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="flex-1 py-2.5 px-4 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors text-center"
              >
                Explore Workspace Dashboard
              </button>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="py-2.5 px-4 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors text-center"
              >
                Go to Login
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
