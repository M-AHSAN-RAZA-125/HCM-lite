import React, { useState } from 'react';
import {
  ShieldAlert,
  X,
  CheckCircle2,
  Lock,
  AlertTriangle,
  Building2,
} from 'lucide-react';
import { useOrganization } from '../../context/OrganizationContext.jsx';
import { useRole } from '../../context/RoleContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { formatCurrency } from '../../utils/payrollCalculations.js';

export default function PayrollFinalizeModal({
  isOpen,
  onClose,
  payrollRun,
  onFinalize,
}) {
  const { companyProfile } = useOrganization();
  const { isAdmin } = useRole();
  const { showToast } = useToast();

  const [hasConfirmedCheckbox, setHasConfirmedCheckbox] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currencySetting = companyProfile?.currency || null;

  if (!isOpen || !payrollRun) return null;

  const handleConfirm = () => {
    if (!isAdmin) {
      showToast({
        type: 'error',
        title: 'Unauthorized Action',
        message: 'Only Administrators are authorized to finalize payroll runs.',
      });
      return;
    }

    if (!hasConfirmedCheckbox) {
      return;
    }

    setIsSubmitting(true);
    try {
      onFinalize(payrollRun.id);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Finalize Payroll Run</h3>
              <p className="text-xs text-slate-500 font-mono">
                {payrollRun.id} &middot; {payrollRun.periodLabel}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          <p className="text-xs text-slate-600 leading-relaxed">
            You are about to authorize and finalize the payroll calculation for{' '}
            <strong className="text-slate-900">{payrollRun.periodLabel}</strong>. Once finalized, the payroll run becomes locked against normal editing, and employee payslips become visible for download.
          </p>

          {/* Audit Metrics */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Payroll Cycle:</span>
              <span className="font-bold text-slate-900">{payrollRun.periodLabel}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Workforce Included:</span>
              <span className="font-mono font-bold text-slate-900">{payrollRun.employeesCount} Staff</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Total Gross Compensation:</span>
              <span className="font-mono font-bold text-slate-900">
                {formatCurrency(payrollRun.totalGross, currencySetting).formatted}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Total Deductions:</span>
              <span className="font-mono font-bold text-rose-600">
                - {formatCurrency(payrollRun.totalDeductions, currencySetting).formatted}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm">
              <span className="font-bold text-slate-900">Total Net Disbursement:</span>
              <span className="font-mono font-bold text-indigo-700">
                {formatCurrency(payrollRun.totalNet, currencySetting).formatted}
              </span>
            </div>
          </div>

          {/* Caution Note */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-amber-950">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Administrative Authorization</span>
            </div>
            <p className="text-amber-800 text-[11px] leading-relaxed">
              This action records the current user's role and timestamp into the payroll audit log. In this frontend stage, calculations are stored in session state and no actual bank transfer is triggered.
            </p>
          </div>

          {/* Mandatory Checkbox */}
          <label className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-slate-50 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={hasConfirmedCheckbox}
              onChange={(e) => setHasConfirmedCheckbox(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-xs text-slate-700">
              I have audited all included line items and confirm authorization to finalize payroll for{' '}
              <strong>{payrollRun.periodLabel}</strong>.
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!hasConfirmedCheckbox || isSubmitting}
            className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Confirm & Finalize</span>
          </button>
        </div>
      </div>
    </div>
  );
}
