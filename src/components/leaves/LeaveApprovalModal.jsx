import React, { useState } from 'react';
import { CheckCircle2, XCircle, AlertCircle, X, ShieldCheck } from 'lucide-react';
import { formatLeaveRange } from '../../utils/leaveCalculations.js';

export default function LeaveApprovalModal({
  isOpen,
  onClose,
  request,
  mode = 'approve', // 'approve' | 'reject'
  onConfirm,
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !request) return null;

  const isApprove = mode === 'approve';

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!isApprove && (!reason || !reason.trim())) {
      setError('Please provide a specific justification or explanation for rejecting this leave application.');
      return;
    }

    setIsSubmitting(true);
    try {
      onConfirm({
        requestId: request.id,
        reason: reason.trim(),
        mode,
      });
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
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isApprove ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
              }`}
            >
              {isApprove ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <XCircle className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isApprove ? 'Approve Leave Request' : 'Reject Leave Request'}
              </h3>
              <p className="text-xs text-slate-500">
                Application reference: <span className="font-mono font-semibold">{request.id}</span>
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

        {/* Request Brief */}
        <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Employee:</span>
            <span className="font-semibold text-slate-800">
              {request.employeeName} ({request.employeeId}) &middot; {request.department}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Leave Category:</span>
            <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
              {request.leaveTypeName}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Duration & Dates:</span>
            <span className="font-semibold text-slate-800">
              {formatLeaveRange(request.startDate, request.endDate)} ({request.requestedDays} working {request.requestedDays === 1 ? 'day' : 'days'})
            </span>
          </div>
          {request.reason && (
            <div className="text-xs pt-1 border-t border-slate-200/60">
              <span className="text-slate-500 block mb-0.5">Stated reason:</span>
              <p className="text-slate-700 italic bg-white p-2 rounded-lg border border-slate-200">
                "{request.reason}"
              </p>
            </div>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {isApprove ? 'Reviewer Notes (Optional)' : 'Rejection Reason (Required)'}{' '}
              {!isApprove && <span className="text-rose-600">*</span>}
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError('');
              }}
              placeholder={
                isApprove
                  ? 'Add any operational instructions, handover notes, or approval remarks...'
                  : 'Specify the reason for rejection (e.g. key deliverable deadline, insufficient balance, blackout dates)...'
              }
              className={`w-full text-xs rounded-xl border p-3 focus:outline-hidden focus:ring-2 transition-all ${
                error
                  ? 'border-rose-300 focus:ring-rose-500 focus:border-rose-500'
                  : 'border-slate-200 focus:ring-indigo-500 focus:border-indigo-500'
              }`}
            />
            <p className="text-[11px] text-slate-400 mt-1">
              {isApprove
                ? 'This note will be recorded in the application audit log.'
                : 'The rejection reason is required and will be permanently recorded in the leave history.'}
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-5 py-2 text-xs font-semibold text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5 ${
                isApprove
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              {isApprove ? (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Confirm Approval</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4" />
                  <span>Confirm Rejection</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
