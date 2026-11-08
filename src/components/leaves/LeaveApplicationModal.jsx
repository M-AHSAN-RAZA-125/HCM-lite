import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  Clock,
  User,
  AlertCircle,
  CheckCircle2,
  FileText,
  Upload,
  X,
  HelpCircle,
  Building2,
  CalendarCheck,
  Info,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useOrganization } from '../../context/OrganizationContext.jsx';
import { useEmployees } from '../../context/EmployeeContext.jsx';
import { useRole } from '../../context/RoleContext.jsx';
import { useLeave } from '../../context/LeaveContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import {
  calculateWorkingDays,
  hasOverlappingLeave,
  calculateEmployeeLeaveBalances,
  getTodayDateString,
  formatLeaveDate,
} from '../../utils/leaveCalculations.js';

export default function LeaveApplicationModal({
  isOpen = true,
  onClose,
  isPageMode = false,
}) {
  const navigate = useNavigate();
  const { activeLeaveTypes, officeRules, activeHolidays } = useOrganization();
  const { employees } = useEmployees();
  const { isEmployee, currentUser, isHr, isAdmin } = useRole();
  const { applyLeave, leaveRequests } = useLeave();
  const { showToast } = useToast();

  // Find active employee for current session
  const defaultEmployee = useMemo(() => {
    if (isEmployee) {
      const match = employees.find(
        (e) =>
          e.employeeId.toUpperCase() === 'EMP-0094' ||
          e.fullName.toLowerCase() === currentUser.name.toLowerCase()
      );
      if (match) return match;
      return {
        id: 'EMP-0094',
        employeeId: 'EMP-0094',
        fullName: currentUser.name || 'Alex Rivera',
        department: currentUser.department || 'Engineering',
      };
    }
    return employees.length > 0 ? employees[0] : null;
  }, [isEmployee, employees, currentUser]);

  const [selectedEmployeeId, setSelectedEmployeeId] = useState(
    defaultEmployee ? defaultEmployee.employeeId : ''
  );
  const [selectedLeaveTypeId, setSelectedLeaveTypeId] = useState(
    activeLeaveTypes.length > 0 ? activeLeaveTypes[0].id : ''
  );
  const [startDate, setStartDate] = useState(getTodayDateString());
  const [endDate, setEndDate] = useState(getTodayDateString());
  const [reason, setReason] = useState('');
  const [supportingDoc, setSupportingDoc] = useState(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync selected employee if default changes
  useEffect(() => {
    if (defaultEmployee && !selectedEmployeeId) {
      setSelectedEmployeeId(defaultEmployee.employeeId);
    }
  }, [defaultEmployee, selectedEmployeeId]);

  // Sync selected leave type if active leave types load
  useEffect(() => {
    if (activeLeaveTypes.length > 0 && !selectedLeaveTypeId) {
      setSelectedLeaveTypeId(activeLeaveTypes[0].id);
    }
  }, [activeLeaveTypes, selectedLeaveTypeId]);

  // Active target employee object
  const currentTargetEmployee = useMemo(() => {
    if (isEmployee) return defaultEmployee;
    const found = employees.find(
      (e) => e.employeeId.toUpperCase() === (selectedEmployeeId || '').toUpperCase()
    );
    if (found) return found;
    return defaultEmployee;
  }, [isEmployee, selectedEmployeeId, employees, defaultEmployee]);

  // Selected leave type object
  const currentLeaveType = useMemo(() => {
    return activeLeaveTypes.find((lt) => lt.id === selectedLeaveTypeId) || null;
  }, [activeLeaveTypes, selectedLeaveTypeId]);

  // Dynamic calculation of requested working days
  const calculation = useMemo(() => {
    return calculateWorkingDays({
      startDate,
      endDate,
      workingDays: officeRules?.workingDays,
      weeklyOffDays: officeRules?.weeklyOffDays,
      holidays: activeHolidays,
    });
  }, [startDate, endDate, officeRules, activeHolidays]);

  // Dynamic balance check for target employee
  const balanceInfo = useMemo(() => {
    if (!currentTargetEmployee || !currentLeaveType) return null;
    const balances = calculateEmployeeLeaveBalances(
      currentTargetEmployee.employeeId,
      [currentLeaveType],
      leaveRequests
    );
    return balances[0] || null;
  }, [currentTargetEmployee, currentLeaveType, leaveRequests]);

  // Real-time overlap check
  const overlapInfo = useMemo(() => {
    if (!currentTargetEmployee?.employeeId || !startDate || !endDate) {
      return { hasOverlap: false };
    }
    return hasOverlappingLeave(
      currentTargetEmployee.employeeId,
      startDate,
      endDate,
      leaveRequests
    );
  }, [currentTargetEmployee, startDate, endDate, leaveRequests]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!currentTargetEmployee) {
      setError('Please select or specify a valid employee record.');
      return;
    }
    if (!currentLeaveType) {
      setError('Please configure and select a valid leave policy.');
      return;
    }
    if (!startDate || !endDate) {
      setError('Please provide valid start and end dates.');
      return;
    }
    if (startDate > endDate) {
      setError('End date cannot precede the start date.');
      return;
    }
    const permitsRetrospective = Boolean(
      currentLeaveType?.allowRetrospective || officeRules?.allowRetrospective
    );
    if (startDate < getTodayDateString() && !permitsRetrospective) {
      setError(`Start date cannot be in the past (${formatLeaveDate(startDate)}). Retrospective requests are not permitted by organization policy.`);
      return;
    }
    if (calculation.workingDays <= 0) {
      setError('The selected dates contain 0 working days (weekends or public holidays only).');
      return;
    }
    if (overlapInfo.hasOverlap) {
      const c = overlapInfo.conflictingRequest;
      setError(`Cannot apply: An active request already spans these dates (${c.leaveTypeName} from ${c.startDate} to ${c.endDate}).`);
      return;
    }
    if (!reason || !reason.trim()) {
      setError('Please enter a reason or notes for your leave application.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = applyLeave({
        employeeId: currentTargetEmployee.employeeId,
        employeeName: currentTargetEmployee.fullName,
        department: currentTargetEmployee.department || 'General',
        leaveTypeId: currentLeaveType.id,
        leaveTypeName: currentLeaveType.name,
        startDate,
        endDate,
        reason: reason.trim(),
        supportingDocName: supportingDoc ? supportingDoc.name : null,
        appliedBy: currentUser.name,
      });

      if (res.success) {
        showToast({
          type: 'success',
          title: 'Leave Application Submitted',
          message: `Application ${res.request.id} for ${res.request.requestedDays} working day(s) has been submitted for approval.`,
        });
        if (onClose) onClose();
        navigate(isEmployee ? '/leaves/my-requests' : '/leaves');
      } else {
        setError(res.error || 'Failed to submit leave request.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSupportingDoc({
        name: file.name,
        size: `${(file.size / 1024).toFixed(1)} KB`,
      });
    }
  };

  // If there are no leave types configured in organization
  const noLeaveTypes = activeLeaveTypes.length === 0;

  const content = (
    <div className="space-y-6">
      {noLeaveTypes && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h5 className="font-bold">No Leave Types Configured</h5>
            <p className="text-amber-800 leading-relaxed">
              Your organization has not yet configured active leave types (such as Paid Time Off, Sick Leave, or Casual Leave).
            </p>
            {isAdmin || isHr ? (
              <Link
                to="/organization"
                className="inline-block mt-2 font-semibold text-indigo-700 hover:text-indigo-900 underline"
              >
                Configure Leave Policies in Organization Setup &rarr;
              </Link>
            ) : (
              <p className="text-amber-700">Please contact HR or your system administrator to setup leave policies.</p>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Employee Selection */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Employee Member <span className="text-rose-500">*</span>
          </label>
          {isEmployee ? (
            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px]">
                  {currentTargetEmployee?.fullName?.[0] || 'A'}
                </div>
                <div>
                  <span className="font-semibold text-slate-900">{currentTargetEmployee?.fullName}</span>
                  <span className="text-slate-500 text-[11px] block font-mono">
                    {currentTargetEmployee?.employeeId} &middot; {currentTargetEmployee?.department}
                  </span>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                Self (Logged In)
              </span>
            </div>
          ) : employees.length > 0 ? (
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              {employees.map((emp) => (
                <option key={emp.employeeId} value={emp.employeeId}>
                  {emp.fullName} ({emp.employeeId}) — {emp.department}
                </option>
              ))}
            </select>
          ) : (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
              <span className="font-semibold">Alex Rivera (EMP-0094)</span> &middot; Software Engineering (Default Session Member)
            </div>
          )}
        </div>

        {/* Leave Category & Balance Overview */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Leave Category <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {activeLeaveTypes.map((lt) => {
              const isSelected = selectedLeaveTypeId === lt.id;
              return (
                <button
                  type="button"
                  key={lt.id}
                  onClick={() => setSelectedLeaveTypeId(lt.id)}
                  className={`p-3 text-left rounded-xl border transition-all ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/70 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">{lt.name}</span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        lt.isPaid
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {lt.isPaid ? 'Paid' : 'Unpaid'}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    {lt.annualQuota ? (
                      <span>Annual Quota: {lt.annualQuota} days</span>
                    ) : (
                      <span className="text-amber-700">Quota not configured</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Balance notification card */}
          {balanceInfo && (
            <div className="mt-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-600">
                Available balance for <strong>{balanceInfo.leaveTypeName}</strong>:
              </span>
              <span className="font-mono font-bold text-indigo-700">
                {balanceInfo.isConfigured
                  ? `${balanceInfo.remainingDays} days remaining (of ${balanceInfo.annualQuota})`
                  : 'Policy Quota Unassigned'}
              </span>
            </div>
          )}
        </div>

        {/* Date Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Start Date <span className="text-rose-500">*</span>
              </label>
              {Boolean(currentLeaveType?.allowRetrospective || officeRules?.allowRetrospective) ? (
                <span className="text-[10px] text-emerald-600 font-medium">Retrospective Allowed</span>
              ) : (
                <span className="text-[10px] text-slate-400">Future / Today only</span>
              )}
            </div>
            <input
              type="date"
              value={startDate}
              min={
                Boolean(currentLeaveType?.allowRetrospective || officeRules?.allowRetrospective)
                  ? undefined
                  : getTodayDateString()
              }
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
            {startDate < getTodayDateString() &&
              !Boolean(currentLeaveType?.allowRetrospective || officeRules?.allowRetrospective) && (
                <p className="text-[11px] text-rose-600 mt-1">
                  Retrospective leave is not enabled in company policy.
                </p>
              )}
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                End Date <span className="text-rose-500">*</span>
              </label>
            </div>
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Real-time Calculation & Policy Summary Card */}
        <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600 font-medium">Working Days to Deduct:</span>
            <span className="font-mono font-bold text-sm text-indigo-700">
              {calculation.workingDays} working {calculation.workingDays === 1 ? 'day' : 'days'}
            </span>
          </div>

          <div className="text-[11px] text-slate-500 space-y-1 pt-1 border-t border-indigo-200/50">
            <div className="flex items-center justify-between">
              <span>Total span:</span>
              <span className="font-mono font-medium">{calculation.totalCalendarDays} calendar day(s)</span>
            </div>
            {calculation.weekendDates.length > 0 && (
              <div className="flex items-center justify-between text-slate-500">
                <span>Weekly off days excluded:</span>
                <span className="font-mono">{calculation.weekendDates.length} day(s)</span>
              </div>
            )}
            {calculation.holidayNames.length > 0 && (
              <div className="flex items-center justify-between text-emerald-700 font-medium">
                <span>Public holidays excluded:</span>
                <span className="font-mono">{calculation.holidayNames.join(', ')}</span>
              </div>
            )}
          </div>

          {/* Overlap Alert */}
          {overlapInfo.hasOverlap && (
            <div className="mt-2 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                Schedule conflict: Employee already has active leave for these dates ({overlapInfo.conflictingRequest.leaveTypeName}).
              </span>
            </div>
          )}

          {/* Insufficient Balance Alert */}
          {balanceInfo?.isConfigured &&
            balanceInfo.remainingDays !== null &&
            calculation.workingDays > balanceInfo.remainingDays && (
              <div className="mt-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Quota alert: Requested days ({calculation.workingDays}) exceed available balance ({balanceInfo.remainingDays} remaining).
                </span>
              </div>
            )}
        </div>

        {/* Reason / Handover Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Reason for Leave <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Briefly state the purpose of time off and any coverage or handover notes..."
            className="w-full text-xs rounded-xl border border-slate-200 p-3 bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Supporting Document (Optional) */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Supporting Document (Optional)
          </label>
          <div className="flex items-center gap-3">
            <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors shadow-xs">
              <Upload className="w-3.5 h-3.5 text-indigo-600" />
              <span>Choose Document</span>
              <input
                type="file"
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg,.docx"
                onChange={handleFileChange}
              />
            </label>
            {supportingDoc && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 text-xs text-slate-700 font-mono">
                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                <span>{supportingDoc.name}</span>
                <span className="text-slate-400">({supportingDoc.size})</span>
                <button
                  type="button"
                  onClick={() => setSupportingDoc(null)}
                  className="text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Accepts medical certificates, travel itineraries, or clearance notes (PDF, JPG, PNG).
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={() => {
              if (onClose) onClose();
              else navigate('/leaves');
            }}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || noLeaveTypes || overlapInfo.hasOverlap}
            className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs transition-colors flex items-center gap-2"
          >
            <CalendarCheck className="w-4 h-4" />
            <span>Submit Application</span>
          </button>
        </div>
      </form>
    </div>
  );

  if (isPageMode) {
    return (
      <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs">
        <div className="mb-6 pb-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Submit Leave Application</h2>
          <p className="text-xs text-slate-500 mt-1">
            Working days are calculated automatically based on your organization's work week schedule and active holidays.
          </p>
        </div>
        {content}
      </div>
    );
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Request Leave</h3>
              <p className="text-xs text-slate-400">
                HCM Lite Automated Working-Days Calculation
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
        <div className="p-6 max-h-[80vh] overflow-y-auto">{content}</div>
      </div>
    </div>
  );
}
