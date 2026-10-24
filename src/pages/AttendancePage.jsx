import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  Clock,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Users,
  Search,
  Download,
  Filter,
  Plus,
  Play,
  Square,
  Shield,
  History,
  FileSpreadsheet,
  AlertCircle,
  Building2,
  ChevronRight,
  Info,
  CalendarCheck,
  UserCheck,
  UserX,
} from 'lucide-react';
import PageHeader from '../components/common/PageHeader.jsx';
import StatCard from '../components/common/StatCard.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import AttendanceStatusBadge from '../components/attendance/AttendanceStatusBadge.jsx';
import AttendanceTimeline from '../components/attendance/AttendanceTimeline.jsx';
import VerificationPanel from '../components/attendance/VerificationPanel.jsx';
import AttendanceRecordsTable from '../components/attendance/AttendanceRecordsTable.jsx';
import MyAttendanceView from '../components/attendance/MyAttendanceView.jsx';
import AttendanceCorrectionModal from '../components/attendance/AttendanceCorrectionModal.jsx';
import ManualAttendanceModal from '../components/attendance/ManualAttendanceModal.jsx';
import CorrectionHistoryView from '../components/attendance/CorrectionHistoryView.jsx';

import { useAttendance } from '../context/AttendanceContext.jsx';
import { useEmployees } from '../context/EmployeeContext.jsx';
import { useOrganization } from '../context/OrganizationContext.jsx';
import { useRole } from '../context/RoleContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useLeave } from '../context/LeaveContext.jsx';

import {
  getTodayDateString,
  getCurrentTimeString,
  formatDateDisplay,
  formatTime12h,
  isWorkingDay,
  timeToMinutes,
} from '../utils/attendanceCalculations.js';

export default function AttendancePage() {
  const location = useLocation();
  const navigate = useNavigate();

  const { officeRules } = useOrganization();
  const { employees, activeCount: activeEmployeeCount } = useEmployees();
  const { currentRole, currentUser, isAdmin, isHr, isEmployee } = useRole();
  const {
    records,
    correctionHistory,
    addManualRecord,
    correctAttendance,
    getRecordsByDate,
  } = useAttendance();
  const { showToast } = useToast();

  // Selected date for overview dashboard (defaults to today's local date)
  const todayDateStr = getTodayDateString();
  const [selectedDate, setSelectedDate] = useState(todayDateStr);

  // Quick search across overview
  const [overviewSearch, setOverviewSearch] = useState('');

  // Active tab selection
  // Sync tab with route: '/attendance/records' -> 'records', '/attendance/my-attendance' -> 'my-attendance'
  const initialTab = useMemo(() => {
    if (location.pathname.includes('/my-attendance') || isEmployee) {
      return 'my-attendance';
    }
    if (location.pathname.includes('/records')) {
      return 'records';
    }
    return 'overview';
  }, [location.pathname, isEmployee]);

  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    if (location.pathname.includes('/my-attendance') || isEmployee) {
      setActiveTab('my-attendance');
    } else if (location.pathname.includes('/records')) {
      setActiveTab('records');
    }
  }, [location.pathname, isEmployee]);

  // Modals state
  const [correctingRecord, setCorrectingRecord] = useState(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  // Office rules configuration check
  const isRulesConfigured = Boolean(officeRules?.startTime && officeRules?.endTime);

  // Records for selected date
  const dateRecords = useMemo(() => {
    return getRecordsByDate(selectedDate);
  }, [records, selectedDate, getRecordsByDate]);

  const { leaveRequests } = useLeave();

  // Approved leave records for selectedDate
  const approvedLeavesForDate = useMemo(() => {
    return (leaveRequests || []).filter(
      (r) =>
        r.status === 'Approved' &&
        r.startDate <= selectedDate &&
        selectedDate <= r.endDate
    );
  }, [leaveRequests, selectedDate]);

  // Daily Summary counts calculated only from actual application state
  const dailySummary = useMemo(() => {
    let present = 0;
    let late = 0;
    let onLeave = 0;
    let halfDay = 0;

    dateRecords.forEach((rec) => {
      if (rec.status === 'Present') present += 1;
      else if (rec.status === 'Late') late += 1;
      else if (rec.status === 'On Leave') onLeave += 1;
      else if (rec.status === 'Half Day') halfDay += 1;
    });

    // Add approved leaves that don't already have an explicit "On Leave" attendance log
    const recordedOnLeaveEmpIds = new Set(
      dateRecords
        .filter((r) => r.status === 'On Leave')
        .map((r) => r.employeeId.toUpperCase())
    );
    const approvedLeaveEmpIds = new Set(
      approvedLeavesForDate.map((r) => r.employeeId.toUpperCase())
    );

    approvedLeavesForDate.forEach((r) => {
      if (!recordedOnLeaveEmpIds.has(r.employeeId.toUpperCase())) {
        onLeave += 1;
      }
    });

    // Absent count calculation logic:
    // Only classify an active employee as absent when:
    // 1) The date is a configured working day
    // 2) The office rules exist
    // 3) Either:
    //    a) It's a past date (or today after office start + grace period) and employee has no record and is not on approved leave
    //    b) Explicit attendance record with status 'Absent' exists
    let absent = 0;

    const isDateWorkDay = isWorkingDay(selectedDate, officeRules?.workingDays);

    if (isDateWorkDay && isRulesConfigured && employees.length > 0) {
      const isPastDate = selectedDate < todayDateStr;
      const isToday = selectedDate === todayDateStr;

      let shouldCountAbsence = isPastDate;

      if (isToday) {
        // If today, check if office start time + grace period has elapsed
        const currentMins = timeToMinutes(getCurrentTimeString());
        const startMins = timeToMinutes(officeRules.startTime || '09:00');
        const grace = parseInt(officeRules.gracePeriod ?? 15, 10);
        if (currentMins !== null && startMins !== null && currentMins > (startMins + grace)) {
          shouldCountAbsence = true;
        }
      }

      if (shouldCountAbsence) {
        const recordedEmployeeIds = new Set(dateRecords.map((r) => r.employeeId.toUpperCase()));
        employees.forEach((emp) => {
          const empIdUpper = emp.employeeId.toUpperCase();
          if (
            emp.status === 'Active' &&
            !recordedEmployeeIds.has(empIdUpper) &&
            !approvedLeaveEmpIds.has(empIdUpper)
          ) {
            absent += 1;
          }
        });
      }
    }

    // Add any explicit 'Absent' records in dateRecords
    dateRecords.forEach((rec) => {
      if (rec.status === 'Absent') {
        absent += 1;
      }
    });

    return {
      present,
      late,
      absent,
      onLeave,
      halfDay,
      totalLogged: dateRecords.length,
    };
  }, [
    dateRecords,
    selectedDate,
    todayDateStr,
    employees,
    officeRules,
    isRulesConfigured,
    approvedLeavesForDate,
  ]);

  // Handle Save Correction
  const handleSaveCorrection = (correctionData) => {
    const res = correctAttendance(correctionData);
    if (res.success) {
      showToast({
        type: 'success',
        title: 'Attendance Corrected',
        message: `Updated attendance record for ${res.record.employeeName}. Recorded in audit history (temporary session state).`,
      });
      setCorrectingRecord(null);
    } else {
      showToast({
        type: 'error',
        title: 'Correction Failed',
        message: res.error || 'Failed to apply attendance correction.',
      });
    }
  };

  // Handle Save Manual Record
  const handleSaveManualRecord = (recordData) => {
    const res = addManualRecord(recordData);
    if (res.success) {
      showToast({
        type: 'success',
        title: 'Attendance Recorded',
        message: `Successfully logged attendance for ${res.record.employeeName} on ${formatDateDisplay(res.record.date)}.`,
      });
      setIsManualModalOpen(false);
    } else {
      showToast({
        type: 'error',
        title: 'Could Not Record Attendance',
        message: res.error || 'Failed to save attendance record.',
      });
    }
  };

  // CSV Export for Overview
  const handleExportDaily = () => {
    if (dateRecords.length === 0) {
      showToast({
        type: 'error',
        title: 'No Records To Export',
        message: `No attendance records exist for ${formatDateDisplay(selectedDate)}.`,
      });
      return;
    }

    const headers = [
      'Employee Name',
      'Employee ID',
      'Department',
      'Date',
      'Check-In',
      'Check-Out',
      'Working Duration',
      'Attendance Status',
    ];

    const escape = (val) => `"${(val || '').toString().replace(/"/g, '""')}"`;
    const rows = dateRecords.map((r) =>
      [
        escape(r.employeeName),
        escape(r.employeeId),
        escape(r.department),
        escape(r.date),
        escape(r.checkIn || ''),
        escape(r.checkOut || ''),
        escape(r.workingHours || ''),
        escape(r.status),
      ].join(',')
    );

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `hcm_attendance_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast({
      type: 'info',
      title: 'Daily Attendance Exported',
      message: `Downloaded CSV with ${dateRecords.length} record(s) for ${formatDateDisplay(selectedDate)}.`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={isEmployee ? 'My Attendance & Work Logs' : 'Attendance Management'}
        subtitle={
          isEmployee
            ? 'Track your daily shift hours, record clock-in timestamps, and view personal attendance history.'
            : 'Monitor workforce attendance, review working hours, and manage shift check-in activity.'
        }
        breadcrumbs={[
          { label: 'Attendance', path: '/attendance' },
          ...(activeTab === 'records'
            ? [{ label: 'Workforce Records' }]
            : activeTab === 'my-attendance'
            ? [{ label: 'My Attendance' }]
            : activeTab === 'history'
            ? [{ label: 'Correction History' }]
            : [{ label: 'Daily Overview' }]),
        ]}
      >
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quick Date Picker for Overview */}
          {!isEmployee && activeTab === 'overview' && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg shadow-xs text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-xs bg-transparent text-slate-800 font-medium focus:outline-none"
                title="Select attendance date"
              />
            </div>
          )}

          {/* Export Button */}
          {!isEmployee && activeTab === 'overview' && (
            <button
              onClick={handleExportDaily}
              disabled={dateRecords.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 border border-slate-200 rounded-lg shadow-xs transition-colors"
              title={dateRecords.length === 0 ? 'No attendance records to export' : 'Export attendance for selected date'}
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Export Attendance</span>
            </button>
          )}

          {/* Record Attendance Button (HR / Admin) */}
          {!isEmployee && (
            <button
              onClick={() => setIsManualModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Record Attendance</span>
            </button>
          )}
        </div>
      </PageHeader>

      {/* Office Rules Configuration Warning (if not configured) */}
      {!isRulesConfigured && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start justify-between gap-3 text-xs text-amber-900">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold block mb-0.5">
                Attendance Shift Rules Need Configuration
              </strong>
              <p className="text-amber-800 leading-relaxed">
                Default shift hours (09:00 - 18:00) and 15-minute grace period are being applied as fallback demonstration values. Configure your company's official office start time, grace window, and weekly off days in Organization Settings.
              </p>
            </div>
          </div>
          <Link
            to="/organization"
            className="shrink-0 px-3 py-1.5 font-semibold text-indigo-700 bg-white hover:bg-amber-100 border border-amber-300 rounded-lg transition-colors flex items-center gap-1"
          >
            <span>Configure Rules</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Navigation Tabs Bar */}
      <div className="border-b border-slate-200 bg-white rounded-xl shadow-xs p-1 flex items-center gap-1 overflow-x-auto">
        {!isEmployee && (
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-xs'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Daily Overview</span>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded-full font-mono">
              {dateRecords.length}
            </span>
          </button>
        )}

        {!isEmployee && (
          <button
            onClick={() => setActiveTab('records')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'records'
                ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-xs'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            <span>Workforce Records</span>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded-full font-mono">
              {records.length}
            </span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('my-attendance')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'my-attendance'
              ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-xs'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <Play className="w-3.5 h-3.5" />
          <span>My Attendance & Self-Checkin</span>
          {isEmployee && (
            <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.2 rounded-full font-semibold">
              Self-Service
            </span>
          )}
        </button>

        {!isEmployee && (
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'history'
                ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-xs'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Correction Audit History</span>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded-full font-mono">
              {correctionHistory.length}
            </span>
          </button>
        )}
      </div>

      {/* Role Notice Banner for Employee Role */}
      {isEmployee && (
        <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-start gap-3">
          <Shield className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <div className="text-xs text-indigo-950">
            <strong className="font-semibold block mb-0.5">Employee Attendance Self-Service</strong>
            <p className="text-slate-600 leading-relaxed">
              As an employee, you can clock in and out for your daily shift and view your personal attendance timeline and history. Organization-wide records, manual entries, and compliance corrections are reserved for HR Managers and Administrators.
            </p>
          </div>
        </div>
      )}

      {/* TAB 1: DAILY OVERVIEW (Admin / HR) */}
      {!isEmployee && activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Present"
              value={dailySummary.present}
              status={`${dailySummary.present} on-time check-in(s)`}
              statusType={dailySummary.present > 0 ? 'info' : 'neutral'}
              icon={UserCheck}
              hint={formatDateDisplay(selectedDate, false)}
            />

            <StatCard
              title="Late Arrivals"
              value={dailySummary.late}
              status={
                dailySummary.late > 0
                  ? 'Exceeded office grace window'
                  : 'Zero tardiness recorded'
              }
              statusType={dailySummary.late > 0 ? 'warning' : 'neutral'}
              icon={Clock}
              hint={`Grace: ${officeRules?.gracePeriod ?? 15}m`}
            />

            <StatCard
              title="Absent"
              value={dailySummary.absent}
              status={
                dailySummary.absent > 0
                  ? 'Unrecorded on working day'
                  : 'No unexcused absences'
              }
              statusType={dailySummary.absent > 0 ? 'warning' : 'neutral'}
              icon={UserX}
              hint="Calculated rule"
            />

            <StatCard
              title="On Leave"
              value={dailySummary.onLeave}
              status={
                dailySummary.onLeave > 0
                  ? 'Approved leave records'
                  : 'No scheduled leaves'
              }
              statusType="neutral"
              icon={Calendar}
              hint="Session records"
            />
          </div>

          {/* Quick Filter Bar for Selected Date Overview */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Daily Workforce Activity: {formatDateDisplay(selectedDate, true)}
                </h3>
                <p className="text-xs text-slate-500">
                  Real-time clock-in logs and status breakdown for the selected calendar date.
                </p>
              </div>

              <div className="relative max-w-xs w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={overviewSearch}
                  onChange={(e) => setOverviewSearch(e.target.value)}
                  placeholder="Filter today's roster..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                />
              </div>
            </div>

            {/* Records Content for Selected Date */}
            {dateRecords.length === 0 ? (
              <div className="py-8 px-4 text-center">
                <EmptyState
                  icon={Clock}
                  title={`No Attendance Events on ${formatDateDisplay(selectedDate)}`}
                  description={
                    employees.length === 0
                      ? 'No employees exist in the organization directory yet. Add employees first to begin tracking attendance.'
                      : 'No employee has clocked in or received an attendance entry for this date yet. Check-ins will appear here as team members clock in.'
                  }
                  actionText={!isEmployee ? 'Record Attendance Manually' : undefined}
                  onAction={() => setIsManualModalOpen(true)}
                  phaseBadge={`Selected Date: ${selectedDate} &middot; 0 Records`}
                />
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-3 px-4 font-semibold">Employee</th>
                        <th className="py-3 px-4 font-semibold">Employee ID</th>
                        <th className="py-3 px-4 font-semibold">Department</th>
                        <th className="py-3 px-4 font-semibold">Check-In</th>
                        <th className="py-3 px-4 font-semibold">Check-Out</th>
                        <th className="py-3 px-4 font-semibold">Working Hours</th>
                        <th className="py-3 px-4 font-semibold">Status</th>
                        <th className="py-3 px-4 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {dateRecords
                        .filter((r) => {
                          if (!overviewSearch.trim()) return true;
                          const q = overviewSearch.toLowerCase();
                          return (
                            (r.employeeName || '').toLowerCase().includes(q) ||
                            (r.employeeId || '').toLowerCase().includes(q) ||
                            (r.department || '').toLowerCase().includes(q)
                          );
                        })
                        .map((rec) => (
                          <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                              {rec.employeeName}
                            </td>
                            <td className="py-3 px-4 font-mono font-medium text-slate-700 whitespace-nowrap">
                              {rec.employeeId}
                            </td>
                            <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                              {rec.department}
                            </td>
                            <td className="py-3 px-4 font-mono font-medium text-slate-800 whitespace-nowrap">
                              {formatTime12h(rec.checkIn)}
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                              {rec.checkOut ? formatTime12h(rec.checkOut) : '—'}
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-700 whitespace-nowrap">
                              {rec.workingHours || (rec.checkIn ? 'In Progress' : '—')}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <AttendanceStatusBadge status={rec.status} />
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap text-right">
                              <button
                                onClick={() => setCorrectingRecord(rec)}
                                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                              >
                                Edit
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: WORKFORCE RECORDS TABLE (Admin / HR) */}
      {!isEmployee && activeTab === 'records' && (
        <AttendanceRecordsTable
          onOpenCorrectionModal={(rec) => setCorrectingRecord(rec)}
          onOpenManualModal={() => setIsManualModalOpen(true)}
        />
      )}

      {/* TAB 3: MY ATTENDANCE SELF-SERVICE (Employee / HR / Admin) */}
      {activeTab === 'my-attendance' && (
        <MyAttendanceView />
      )}

      {/* TAB 4: CORRECTION AUDIT HISTORY (Admin / HR) */}
      {!isEmployee && activeTab === 'history' && (
        <CorrectionHistoryView correctionHistory={correctionHistory} />
      )}

      {/* Correction Modal */}
      <AttendanceCorrectionModal
        isOpen={!!correctingRecord}
        record={correctingRecord}
        onClose={() => setCorrectingRecord(null)}
        onSaveCorrection={handleSaveCorrection}
        currentUserRole={`${currentUser.name} (${currentRole})`}
      />

      {/* Manual Attendance Entry Modal */}
      <ManualAttendanceModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onSave={handleSaveManualRecord}
        currentUserRole={`${currentUser.name} (${currentRole})`}
      />
    </div>
  );
}
