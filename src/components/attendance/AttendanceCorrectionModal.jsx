import React, { useState, useEffect } from 'react';
import {
  X,
  Edit2,
  AlertTriangle,
  Clock,
  Calendar,
  User,
  Shield,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import FormField from '../common/FormField.jsx';
import { formatTime12h, formatDateDisplay, timeToMinutes } from '../../utils/attendanceCalculations.js';

export default function AttendanceCorrectionModal({
  isOpen,
  record,
  onClose,
  onSaveCorrection,
  currentUserRole = 'HR Manager',
}) {
  const [correctedCheckIn, setCorrectedCheckIn] = useState('');
  const [correctedCheckOut, setCorrectedCheckOut] = useState('');
  const [correctedStatus, setCorrectedStatus] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState({});
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  useEffect(() => {
    if (record) {
      setCorrectedCheckIn(record.checkIn ? record.checkIn.substring(0, 5) : '09:00');
      setCorrectedCheckOut(record.checkOut ? record.checkOut.substring(0, 5) : '');
      setCorrectedStatus(record.status || 'Present');
      setReason('');
      setNotes('');
      setErrors({});
      setShowConfirmDialog(false);
    }
  }, [record, isOpen]);

  if (!isOpen || !record) return null;

  const validate = () => {
    const newErrors = {};
    if (!correctedCheckIn) {
      newErrors.correctedCheckIn = 'Corrected check-in time is required.';
    }

    if (correctedCheckIn && correctedCheckOut) {
      const inMins = timeToMinutes(correctedCheckIn);
      const outMins = timeToMinutes(correctedCheckOut);
      if (inMins !== null && outMins !== null && outMins <= inMins) {
        newErrors.correctedCheckOut = 'Check-out time must be after check-in time.';
      }
    }

    if (!reason.trim()) {
      newErrors.reason = 'A formal correction reason is required for compliance audit logs.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleProceedToConfirm = (e) => {
    e.preventDefault();
    if (validate()) {
      setShowConfirmDialog(true);
    }
  };

  const handleFinalConfirm = () => {
    onSaveCorrection({
      attendanceId: record.id,
      correctedCheckIn: correctedCheckIn.length === 5 ? `${correctedCheckIn}:00` : correctedCheckIn,
      correctedCheckOut: correctedCheckOut
        ? correctedCheckOut.length === 5
          ? `${correctedCheckOut}:00`
          : correctedCheckOut
        : null,
      correctedStatus: correctedStatus || null,
      reason: reason.trim(),
      notes: notes.trim(),
      correctedBy: currentUserRole,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden transform transition-all">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600">
                <Edit2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  {showConfirmDialog ? 'Confirm Attendance Correction' : 'Correct Attendance Record'}
                </h3>
                <p className="text-xs text-slate-500">
                  {showConfirmDialog
                    ? 'Review changes before committing to session audit log'
                    : 'HR administrative adjustment with audit preservation'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form or Confirmation Step */}
          {!showConfirmDialog ? (
            <form onSubmit={handleProceedToConfirm} className="p-6 space-y-4">
              {/* Employee Summary Chip */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-slate-900 block">{record.employeeName}</span>
                  <span className="text-slate-500 font-mono text-[11px]">
                    ID: {record.employeeId} &middot; {record.department}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-medium text-slate-700 block">
                    {formatDateDisplay(record.date)}
                  </span>
                  <span className="text-slate-400 text-[11px]">
                    Original Status: <strong className="text-slate-600">{record.status}</strong>
                  </span>
                </div>
              </div>

              {/* Original Values Display */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-amber-50/40 border border-amber-200/60 rounded-xl text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px]">Recorded Check-In</span>
                  <strong className="text-slate-800 font-mono">
                    {record.checkIn ? formatTime12h(record.checkIn) : '—'}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Recorded Check-Out</span>
                  <strong className="text-slate-800 font-mono">
                    {record.checkOut ? formatTime12h(record.checkOut) : '—'}
                  </strong>
                </div>
              </div>

              {/* Time Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  label="Corrected Check-In"
                  required
                  error={errors.correctedCheckIn}
                  hint="Shift start timestamp"
                >
                  <input
                    type="time"
                    value={correctedCheckIn}
                    onChange={(e) => setCorrectedCheckIn(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                  />
                </FormField>

                <FormField
                  label="Corrected Check-Out"
                  error={errors.correctedCheckOut}
                  hint="Shift completion timestamp (optional)"
                >
                  <input
                    type="time"
                    value={correctedCheckOut}
                    onChange={(e) => setCorrectedCheckOut(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                  />
                </FormField>
              </div>

              {/* Status Override */}
              <FormField
                label="Attendance Status Override"
                hint="Auto-calculated if unchanged"
              >
                <select
                  value={correctedStatus}
                  onChange={(e) => setCorrectedStatus(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                >
                  <option value="Present">Present</option>
                  <option value="Late">Late</option>
                  <option value="Half Day">Half Day</option>
                  <option value="On Leave">On Leave</option>
                  <option value="Absent">Absent</option>
                </select>
              </FormField>

              {/* Reason (Required) */}
              <FormField
                label="Correction Reason"
                required
                error={errors.reason}
                hint="State why this correction is being applied"
              >
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all mb-1"
                >
                  <option value="">Select a reason...</option>
                  <option value="Biometric scanner hardware outage">Biometric scanner hardware outage</option>
                  <option value="Verified offsite customer meeting">Verified offsite customer meeting</option>
                  <option value="Employee forgot to clock in / out">Employee forgot to clock in / out</option>
                  <option value="Network connectivity error during check-in">Network connectivity error during check-in</option>
                  <option value="Manager approved schedule adjustment">Manager approved schedule adjustment</option>
                  <option value="Other administrative adjustment">Other administrative adjustment</option>
                </select>
              </FormField>

              {/* Notes */}
              <FormField
                label="Auditor Notes"
                hint="Additional context preserved in history audit"
              >
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional details or manager approval ticket number..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                />
              </FormField>

              {/* Architecture notice */}
              <div className="flex items-start gap-2 p-3 rounded-lg bg-indigo-50/60 border border-indigo-100 text-indigo-900 text-[11px] leading-relaxed">
                <Shield className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <p>
                  Original records are never permanently erased. Corrections append to the session audit trail with timestamps, original parameters, and the editor's role.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
                >
                  Review Correction
                </button>
              </div>
            </form>
          ) : (
            /* Confirmation Step */
            <div className="p-6 space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 space-y-1">
                  <span className="font-semibold block">Confirm Attendance Override</span>
                  <p className="text-amber-800 leading-relaxed">
                    You are applying an official correction to the attendance record for{' '}
                    <strong className="font-semibold text-slate-900">{record.employeeName}</strong> on{' '}
                    <strong className="font-semibold text-slate-900">{formatDateDisplay(record.date)}</strong>.
                  </p>
                </div>
              </div>

              {/* Comparison table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px]">
                    <tr>
                      <th className="p-2.5 font-medium">Field</th>
                      <th className="p-2.5 font-medium">Original Value</th>
                      <th className="p-2.5 font-medium text-indigo-600">Corrected Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="p-2.5 text-slate-500 font-medium">Check-In</td>
                      <td className="p-2.5 font-mono text-slate-600">
                        {record.checkIn ? formatTime12h(record.checkIn) : '—'}
                      </td>
                      <td className="p-2.5 font-mono font-semibold text-indigo-700">
                        {formatTime12h(correctedCheckIn)}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2.5 text-slate-500 font-medium">Check-Out</td>
                      <td className="p-2.5 font-mono text-slate-600">
                        {record.checkOut ? formatTime12h(record.checkOut) : '—'}
                      </td>
                      <td className="p-2.5 font-mono font-semibold text-indigo-700">
                        {correctedCheckOut ? formatTime12h(correctedCheckOut) : '—'}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2.5 text-slate-500 font-medium">Status</td>
                      <td className="p-2.5 text-slate-600">{record.status}</td>
                      <td className="p-2.5 font-semibold text-indigo-700">{correctedStatus}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 text-slate-500 font-medium">Reason</td>
                      <td className="p-2.5 text-slate-400 italic">Initial entry</td>
                      <td className="p-2.5 font-medium text-slate-800">{reason}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg text-[11px] text-slate-500">
                <span className="font-semibold text-slate-700">Auditor:</span> {currentUserRole} &middot;{' '}
                <span className="font-semibold text-slate-700">Session:</span> Changes saved to browser state.
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowConfirmDialog(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors"
                >
                  Back to Edit
                </button>
                <button
                  type="button"
                  onClick={handleFinalConfirm}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Apply Correction</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
