import React from 'react';
import { AlertTriangle, UserX, X } from 'lucide-react';

export default function DeactivateConfirmModal({
  isOpen,
  employee,
  onClose,
  onConfirm,
}) {
  if (!isOpen || !employee) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="deactivate-modal-title"
    >
      <div
        className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mb-4">
          <UserX className="w-6 h-6" />
        </div>

        <h3 id="deactivate-modal-title" className="text-base sm:text-lg font-bold text-slate-900">
          Deactivate Employee
        </h3>

        <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
          Are you sure you want to deactivate <strong className="text-slate-900 font-semibold">{employee.fullName}</strong> ({employee.employeeId})?
        </p>

        <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1">
          <p className="font-medium text-slate-800">What happens when deactivated:</p>
          <ul className="list-disc list-inside space-y-0.5 text-slate-500 pl-1">
            <li>The employee status will be set to <span className="font-semibold text-slate-700">Inactive</span>.</li>
            <li>Historical attendance, payroll, and profile records are preserved.</li>
            <li>The employee record is <strong className="font-medium text-slate-700">not deleted</strong> and can be reactivated by HR anytime.</li>
          </ul>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors focus:outline-none"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm(employee.id);
              onClose();
            }}
            className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 rounded-xl shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/30"
          >
            Confirm Deactivation
          </button>
        </div>
      </div>
    </div>
  );
}
