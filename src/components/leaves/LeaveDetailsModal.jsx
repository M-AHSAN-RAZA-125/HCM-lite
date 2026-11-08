import React from 'react';
import {
  X,
  Calendar,
  Clock,
  User,
  Building2,
  FileText,
  Paperclip,
  CheckCircle2,
  XCircle,
  Ban,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import LeaveStatusBadge from './LeaveStatusBadge.jsx';
import { formatLeaveRange, formatLeaveDate } from '../../utils/leaveCalculations.js';

export default function LeaveDetailsModal({
  isOpen,
  onClose,
  request,
  onApprove,
  onReject,
  onCancel,
  canReview = false,
  canCancel = false,
}) {
  if (!isOpen || !request) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Leave Application Details</h3>
                <LeaveStatusBadge status={request.status} />
              </div>
              <p className="text-xs text-slate-400 font-mono">
                ID: {request.id} &middot; Applied on {formatLeaveDate(request.appliedAt?.split('T')[0])}
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

        {/* Modal Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Employee Card */}
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                {request.employeeName
                  ? request.employeeName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()
                  : 'EM'}
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">{request.employeeName}</h4>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                  <span className="font-mono">{request.employeeId}</span>
                  <span>&middot;</span>
                  <span>{request.department}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Leave Info Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Leave Category</span>
              <div className="font-bold text-slate-900 mt-1 text-sm">{request.leaveTypeName}</div>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Working Days Requested</span>
              <div className="font-bold text-indigo-700 mt-1 text-sm font-mono">
                {request.requestedDays} {request.requestedDays === 1 ? 'day' : 'days'}
              </div>
            </div>
          </div>

          {/* Schedule Period */}
          <div className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-xl space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase block">Schedule Window</span>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span>{formatLeaveDate(request.startDate)}</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span>{formatLeaveDate(request.endDate)}</span>
              </div>
            </div>
            {request.holidayDates && request.holidayDates.length > 0 && (
              <p className="text-[11px] text-emerald-700 pt-1 mt-1 border-t border-slate-200/60">
                Note: Includes {request.holidayDates.length} company holiday(s) which were automatically excluded from working days.
              </p>
            )}
          </div>

          {/* Reason */}
          <div>
            <span className="text-xs font-semibold text-slate-700 block mb-1">Reason / Handover Notes</span>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
              {request.reason || 'No detailed reason provided.'}
            </div>
          </div>

          {/* Supporting Document */}
          {request.supportingDocName && (
            <div>
              <span className="text-xs font-semibold text-slate-700 block mb-1">Supporting Document</span>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div className="flex items-center gap-2 text-slate-700">
                  <Paperclip className="w-4 h-4 text-indigo-600" />
                  <span className="font-mono font-medium">{request.supportingDocName}</span>
                </div>
                <span className="text-[11px] text-indigo-600 font-semibold bg-white px-2 py-0.5 rounded border border-indigo-100">
                  Attached File
                </span>
              </div>
            </div>
          )}

          {/* Review Decision Banner (if approved/rejected) */}
          {request.status === 'Approved' && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Approved by {request.reviewedBy || 'HR Manager'}</span>
              </div>
              <p className="text-[11px] text-emerald-800">
                Decision recorded on {request.reviewedAt ? new Date(request.reviewedAt).toLocaleString() : 'Recent'}.
              </p>
              {request.reviewerComment && (
                <p className="text-xs text-emerald-900 mt-2 bg-white/80 p-2 rounded-lg border border-emerald-200 italic">
                  "{request.reviewerComment}"
                </p>
              )}
            </div>
          )}

          {request.status === 'Rejected' && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-rose-900">
                <XCircle className="w-4 h-4 text-rose-600" />
                <span>Rejected by {request.reviewedBy || 'HR Manager'}</span>
              </div>
              <p className="text-[11px] text-rose-800">
                Decision recorded on {request.reviewedAt ? new Date(request.reviewedAt).toLocaleString() : 'Recent'}.
              </p>
              <div className="mt-2 bg-white/90 p-2.5 rounded-lg border border-rose-200 text-xs">
                <span className="font-semibold text-rose-900 block mb-0.5">Mandatory Rejection Reason:</span>
                <p className="text-rose-800">{request.rejectionReason || request.reviewerComment || 'Operational requirements'}</p>
              </div>
            </div>
          )}

          {request.status === 'Cancelled' && (
            <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <Ban className="w-4 h-4 text-slate-500" />
                <span>Application Cancelled</span>
              </div>
              <p className="text-[11px] text-slate-600">
                Cancelled on {request.cancelledAt ? new Date(request.cancelledAt).toLocaleString() : 'Recent'} by {request.cancelledBy || 'Employee'}.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div>
            {request.status === 'Pending' && canCancel && (
              <button
                type="button"
                onClick={() => {
                  onCancel(request.id);
                  onClose();
                }}
                className="text-xs font-semibold text-rose-600 hover:text-rose-800 transition-colors"
              >
                Withdraw Request
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 rounded-xl transition-colors"
            >
              Close
            </button>

            {request.status === 'Pending' && canReview && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onReject(request);
                    onClose();
                  }}
                  className="px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors"
                >
                  Reject
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onApprove(request);
                    onClose();
                  }}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors"
                >
                  Approve Leave
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
