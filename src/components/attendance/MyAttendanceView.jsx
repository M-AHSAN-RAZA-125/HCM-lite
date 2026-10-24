import React, { useState, useMemo } from 'react';
import {
  Clock,
  Play,
  Square,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Filter,
  ArrowRight,
  Shield,
  MapPin,
  Camera,
  History,
  Timer,
  Info,
} from 'lucide-react';
import StatCard from '../common/StatCard.jsx';
import EmptyState from '../common/EmptyState.jsx';
import AttendanceStatusBadge from './AttendanceStatusBadge.jsx';
import AttendanceTimeline from './AttendanceTimeline.jsx';
import VerificationPanel from './VerificationPanel.jsx';
import { useAttendance } from '../../context/AttendanceContext.jsx';
import { useOrganization } from '../../context/OrganizationContext.jsx';
import { useRole } from '../../context/RoleContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import {
  getFaceVerificationStatus,
  requestCameraAccess,
  captureFrameFromVideo,
  verifyFace,
} from '../../services/faceVerification.js';
import {
  getTodayDateString,
  getCurrentTimeString,
  formatTime12h,
  formatDateDisplay,
  isWorkingDay,
} from '../../utils/attendanceCalculations.js';

export default function MyAttendanceView({ targetEmployeeId = null, targetEmployeeName = null }) {
  const { officeRules } = useOrganization();
  const { currentRole, currentUser, isEmployee } = useRole();
  const {
    records,
    checkIn,
    checkOut,
    getTodayRecordForEmployee,
    getRecordsForEmployee,
  } = useAttendance();
  const { showToast } = useToast();
  const faceStatus = getFaceVerificationStatus();
  const [faceCheckingIn, setFaceCheckingIn] = useState(false);

  // Identify active employee for check-in:
  // If targetEmployeeId is provided, use that; otherwise use logged-in demo user or EMP-0094
  const activeEmployeeId =
    targetEmployeeId ||
    (isEmployee ? 'EMP-0094' : currentRole === 'HR' ? 'EMP-0012' : 'EMP-0001');

  const activeEmployeeName =
    targetEmployeeName ||
    (isEmployee ? currentUser.name || 'Alex Rivera' : currentUser.name || 'Current User');

  const activeDepartment =
    isEmployee ? currentUser.department || 'Software Engineering' : currentUser.department || 'Operations';

  const todayDate = getTodayDateString();
  const todayRecord = getTodayRecordForEmployee(activeEmployeeId, todayDate);

  // Verification simulation state
  const [locationVerified, setLocationVerified] = useState(false);
  const [cameraVerified, setCameraVerified] = useState(false);

  // History filtering
  const [historyFilter, setHistoryFilter] = useState('CURRENT_MONTH'); // 'CURRENT_MONTH' | 'PREV_MONTH' | 'ALL' | 'CUSTOM'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Check if today is a scheduled work day
  const isTodayWorkDay = isWorkingDay(todayDate, officeRules?.workingDays);

  // Employee's personal records
  const personalRecords = useMemo(() => {
    return getRecordsForEmployee(activeEmployeeId);
  }, [records, activeEmployeeId]);

  // Filtered personal records
  const filteredHistory = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed

    return personalRecords.filter((rec) => {
      if (!rec.date) return false;
      const [rYear, rMonth] = rec.date.split('-').map(Number);
      const recMonth0 = rMonth - 1;

      if (historyFilter === 'CURRENT_MONTH') {
        return rYear === currentYear && recMonth0 === currentMonth;
      }
      if (historyFilter === 'PREV_MONTH') {
        const prevMonthDate = new Date(currentYear, currentMonth - 1, 1);
        return (
          rYear === prevMonthDate.getFullYear() &&
          recMonth0 === prevMonthDate.getMonth()
        );
      }
      if (historyFilter === 'CUSTOM') {
        if (customStartDate && rec.date < customStartDate) return false;
        if (customEndDate && rec.date > customEndDate) return false;
        return true;
      }
      return true; // 'ALL'
    });
  }, [personalRecords, historyFilter, customStartDate, customEndDate]);

  // Summary counts derived only from actual records
  const historySummary = useMemo(() => {
    let daysAttended = 0;
    let lateArrivals = 0;
    let totalMinutes = 0;

    filteredHistory.forEach((rec) => {
      if (rec.checkIn) {
        daysAttended += 1;
      }
      if (rec.status === 'Late') {
        lateArrivals += 1;
      }
      if (rec.workingMinutes) {
        totalMinutes += rec.workingMinutes;
      }
    });

    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    const formattedHours =
      totalMinutes > 0 ? `${hours}h ${mins}m` : '0h 00m';

    return {
      daysAttended,
      lateArrivals,
      totalHours: formattedHours,
      totalMinutes,
    };
  }, [filteredHistory]);

  const handleFaceVerificationForAttendance = async (mode) => {
    if (!faceStatus.configured) {
      showToast({
        type: 'warning',
        title: 'Face verification unavailable',
        message:
          'Face-based attendance is disabled until a secure provider is configured. Please use the standard check-in/check-out flow.',
      });
      return;
    }

    setFaceCheckingIn(true);

    try {
      const stream = await requestCameraAccess();
      const video = document.createElement('video');
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      await video.play();

      const imageDataUrl = captureFrameFromVideo(video);
      stream.getTracks().forEach((track) => track.stop());

      const result = await verifyFace({
        userId: activeEmployeeId,
        userRole: currentRole,
        operation: mode,
        imageDataUrl,
      });

      if (!result.success) {
        showToast({
          type: 'error',
          title: mode === 'check-in' ? 'Face check-in failed' : 'Face check-out failed',
          message: result.error,
        });
        return;
      }

      setLocationVerified(true);
      setCameraVerified(true);

      if (mode === 'check-in') {
        handleCheckIn(true);
      } else {
        handleCheckOut(true);
      }
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Camera access blocked',
        message:
          error instanceof Error
            ? error.message
            : 'Camera access was denied. Please allow camera permission or use the standard attendance flow.',
      });
    } finally {
      setFaceCheckingIn(false);
    }
  };

  const handleCheckIn = (faceVerified = false) => {
    const res = checkIn({
      employeeId: activeEmployeeId,
      employeeName: activeEmployeeName,
      department: activeDepartment,
      date: todayDate,
      time: getCurrentTimeString(),
      locationVerified,
      cameraVerified: faceVerified || cameraVerified,
    });

    if (res.success) {
      showToast({
        type: 'success',
        title: faceVerified ? 'Face check-in approved' : 'Clocked In Successfully',
        message: `Registered check-in at ${res.record.checkIn} (${res.record.status}).`,
      });
    } else {
      showToast({
        type: 'error',
        title: 'Check-In Blocked',
        message: res.error || 'Failed to record check-in.',
      });
    }
  };

  const handleCheckOut = (faceVerified = false) => {
    const res = checkOut({
      employeeId: activeEmployeeId,
      date: todayDate,
      time: getCurrentTimeString(),
    });

    if (res.success) {
      showToast({
        type: 'info',
        title: faceVerified ? 'Face check-out approved' : 'Clocked Out Successfully',
        message: `Registered check-out at ${res.record.checkOut}. Total duration: ${res.record.workingHours}.`,
      });
    } else {
      showToast({
        type: 'error',
        title: 'Check-Out Blocked',
        message: res.error || 'Failed to record check-out.',
      });
    }
  };

  const hasCheckedIn = Boolean(todayRecord?.checkIn);
  const hasCheckedOut = Boolean(todayRecord?.checkOut);

  return (
    <div className="space-y-6">
      {/* Demo Identity Notice */}
      <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-2.5">
          <Shield className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-indigo-950">
              Active Member Profile: {activeEmployeeName}
            </span>
            <span className="text-slate-600 block text-[11px] mt-0.5">
              Employee ID: <strong className="font-mono text-slate-800">{activeEmployeeId}</strong> &middot;{' '}
              {activeDepartment} &middot; Role: {currentRole}
            </span>
          </div>
        </div>

        <div className="text-[11px] text-slate-500 font-mono shrink-0">
          Browser Demo Time &middot; Session Storage
        </div>
      </div>

      {/* Main Clock-In / Clock-Out Action Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Today's Work Status
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mt-1">
              {formatDateDisplay(todayDate, true)}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isTodayWorkDay
                ? `Standard scheduled work day (${officeRules?.startTime || '09:00'} – ${officeRules?.endTime || '18:00'})`
                : 'Scheduled Weekly Off / Weekend'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {todayRecord ? (
              <div className="flex flex-col items-end">
                <span className="text-[11px] text-slate-400 uppercase tracking-wider font-medium mb-1">
                  Current Status
                </span>
                <AttendanceStatusBadge status={todayRecord.status} />
              </div>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                Not Checked In
              </span>
            )}
          </div>
        </div>

        {/* Action Controls & Timestamps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Check-In Card */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-3">
            <div>
              <span className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider">
                Check-In Timestamp
              </span>
              <div className="text-xl font-bold font-mono text-slate-900 mt-1">
                {hasCheckedIn ? formatTime12h(todayRecord.checkIn) : '—'}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {hasCheckedIn
                  ? `Recorded via ${todayRecord.source === 'hr_manual_entry' ? 'HR Entry' : 'Self-service'}`
                  : 'Requires clock-in action'}
              </p>
            </div>

            <div className="space-y-2">
              <button
                onClick={handleCheckIn}
                disabled={hasCheckedIn}
                className="w-full py-2.5 px-3 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-40 disabled:pointer-events-none transition-colors flex items-center justify-center gap-2 shadow-xs"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{hasCheckedIn ? 'Checked In' : 'Clock In Now'}</span>
              </button>

              <button
                onClick={() => handleFaceVerificationForAttendance('check-in')}
                disabled={hasCheckedIn || faceCheckingIn}
                className="w-full py-2.5 px-3 rounded-lg text-xs font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 active:bg-violet-200 disabled:opacity-40 disabled:pointer-events-none transition-colors flex items-center justify-center gap-2 border border-violet-200"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{faceCheckingIn ? 'Verifying...' : 'Check In with Face'}</span>
              </button>
            </div>
          </div>

          {/* Check-Out Card */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-3">
            <div>
              <span className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider">
                Check-Out Timestamp
              </span>
              <div className="text-xl font-bold font-mono text-slate-900 mt-1">
                {hasCheckedOut ? formatTime12h(todayRecord.checkOut) : '—'}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {hasCheckedOut
                  ? 'Shift completed for today'
                  : hasCheckedIn
                  ? 'Available when ending shift'
                  : 'Check in first'}
              </p>
            </div>

            <div className="space-y-2">
              <button
                onClick={handleCheckOut}
                disabled={!hasCheckedIn || hasCheckedOut}
                className="w-full py-2.5 px-3 rounded-lg text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 disabled:opacity-40 disabled:pointer-events-none transition-colors flex items-center justify-center gap-2 shadow-xs"
              >
                <Square className="w-3.5 h-3.5" />
                <span>{hasCheckedOut ? 'Checked Out' : 'Clock Out Now'}</span>
              </button>

              <button
                onClick={() => handleFaceVerificationForAttendance('check-out')}
                disabled={!hasCheckedIn || hasCheckedOut || faceCheckingIn}
                className="w-full py-2.5 px-3 rounded-lg text-xs font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 active:bg-violet-200 disabled:opacity-40 disabled:pointer-events-none transition-colors flex items-center justify-center gap-2 border border-violet-200"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{faceCheckingIn ? 'Verifying...' : 'Check Out with Face'}</span>
              </button>
            </div>
          </div>

          {/* Working Duration Card */}
          <div className="p-4 rounded-xl border border-slate-200 bg-indigo-50/40 flex flex-col justify-between space-y-3">
            <div>
              <span className="text-[11px] font-semibold uppercase text-indigo-700 tracking-wider">
                Recorded Duration
              </span>
              <div className="text-xl font-bold font-mono text-indigo-950 mt-1">
                {hasCheckedOut && todayRecord?.workingHours
                  ? todayRecord.workingHours
                  : hasCheckedIn
                  ? 'Shift in progress'
                  : '0h 00m'}
              </div>
              <p className="text-[11px] text-indigo-600/80 mt-0.5">
                {hasCheckedOut
                  ? 'Calculated from check-in & check-out'
                  : hasCheckedIn
                  ? 'Final duration logs at clock out'
                  : 'Awaiting shift initialization'}
              </p>
            </div>

            <div className="py-2 px-3 rounded-lg bg-white border border-indigo-100 text-[11px] text-slate-600 flex items-center justify-between">
              <span className="font-medium">Shift Target:</span>
              <span className="font-mono text-slate-800">8 hrs 00 mins</span>
            </div>
          </div>
        </div>

        {/* Today's Timeline Component */}
        <AttendanceTimeline
          todayRecord={todayRecord}
          officeRules={officeRules}
        />

        {/* Optional Verification Panel */}
        <VerificationPanel
          locationVerified={locationVerified}
          setLocationVerified={setLocationVerified}
          cameraVerified={cameraVerified}
          setCameraVerified={setCameraVerified}
        />
      </div>

      {/* Personal Attendance History Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-600" />
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                My Attendance History
              </h3>
              <p className="text-xs text-slate-500">
                Review your personal check-in logs, punctuality, and recorded work durations.
              </p>
            </div>
          </div>

          {/* Filter options */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setHistoryFilter('CURRENT_MONTH')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                historyFilter === 'CURRENT_MONTH'
                  ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => setHistoryFilter('PREV_MONTH')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                historyFilter === 'PREV_MONTH'
                  ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Previous Month
            </button>
            <button
              onClick={() => setHistoryFilter('ALL')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                historyFilter === 'ALL'
                  ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              All Records
            </button>
          </div>
        </div>

        {/* History Summary derived strictly from actual records */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60">
            <span className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider">
              Days Attended
            </span>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
              {historySummary.daysAttended}
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Based on actual session records
            </span>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60">
            <span className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider">
              Late Arrivals
            </span>
            <div className="text-2xl font-bold font-mono text-amber-600 mt-1">
              {historySummary.lateArrivals}
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Checked in after office start + grace
            </span>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60">
            <span className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider">
              Total Recorded Hours
            </span>
            <div className="text-2xl font-bold font-mono text-indigo-700 mt-1">
              {historySummary.totalHours}
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Cumulative completed shifts
            </span>
          </div>
        </div>

        {/* Personal Records Table */}
        {personalRecords.length === 0 ? (
          <div className="p-6 border border-slate-200 rounded-xl bg-slate-50/30">
            <EmptyState
              icon={Clock}
              title="No Attendance History Recorded"
              description="You have not clocked in for any shifts yet in this browser session. Click 'Clock In Now' above to record your attendance for today."
              actionText={!hasCheckedIn ? 'Clock In Now' : undefined}
              onAction={handleCheckIn}
              phaseBadge="Personal Log &middot; 0 Entries"
            />
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
            No attendance records found for the selected time filter.
          </div>
        ) : (
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Date</th>
                    <th className="py-3 px-4 font-semibold">Check-In</th>
                    <th className="py-3 px-4 font-semibold">Check-Out</th>
                    <th className="py-3 px-4 font-semibold">Working Duration</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHistory.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-800 whitespace-nowrap">
                        {formatDateDisplay(rec.date)}
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-slate-700 whitespace-nowrap">
                        {formatTime12h(rec.checkIn)}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                        {rec.checkOut ? formatTime12h(rec.checkOut) : '—'}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700 whitespace-nowrap">
                        {rec.workingHours || 'In Progress'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <AttendanceStatusBadge status={rec.status} />
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-right">
                        <span className="text-[10px] text-slate-400">
                          {rec.locationVerified ? 'GPS Verified' : 'Browser Session'}
                        </span>
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
  );
}
