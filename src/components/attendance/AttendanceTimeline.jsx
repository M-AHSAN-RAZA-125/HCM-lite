import React from 'react';
import { Clock, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck, Play, Square } from 'lucide-react';
import { formatTime12h, timeToMinutes } from '../../utils/attendanceCalculations.js';

export default function AttendanceTimeline({
  todayRecord,
  officeRules,
}) {
  const startTime = officeRules?.startTime || '09:00';
  const endTime = officeRules?.endTime || '18:00';
  const graceMinutes = parseInt(officeRules?.gracePeriod ?? 15, 10);

  const checkIn = todayRecord?.checkIn;
  const checkOut = todayRecord?.checkOut;
  const status = todayRecord?.status;

  const startMins = timeToMinutes(startTime);
  const inMins = checkIn ? timeToMinutes(checkIn) : null;
  const isLate = inMins !== null && startMins !== null && inMins > (startMins + graceMinutes);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-600" />
          <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
            Today's Attendance Timeline
          </h4>
        </div>
        <span className="text-[11px] text-slate-500 font-mono">
          Shift: {formatTime12h(startTime)} – {formatTime12h(endTime)} ({graceMinutes}m grace)
        </span>
      </div>

      {/* Timeline track */}
      <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
        {/* Step 1: Shift Scheduled */}
        <div className="relative flex items-start gap-3">
          <div className="absolute -left-6 top-0.5 w-6 h-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-slate-500 shadow-xs ring-2 ring-slate-200">
            <Clock className="w-3 h-3" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-800">Shift Started</span>
              <span className="text-xs font-mono text-slate-500">{formatTime12h(startTime)}</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Standard office start time. Grace period allowed until{' '}
              <strong className="text-slate-600 font-medium">
                {formatTime12h(
                  (() => {
                    const total = (startMins || 540) + graceMinutes;
                    const h = Math.floor(total / 60) % 24;
                    const m = total % 60;
                    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                  })()
                )}
              </strong>
              .
            </p>
          </div>
        </div>

        {/* Step 2: Check-In */}
        <div className="relative flex items-start gap-3">
          <div
            className={`absolute -left-6 top-0.5 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center shadow-xs ring-2 ${
              checkIn
                ? isLate
                  ? 'bg-amber-500 text-white ring-amber-200'
                  : 'bg-emerald-500 text-white ring-emerald-200'
                : 'bg-slate-200 text-slate-400 ring-slate-100'
            }`}
          >
            {checkIn ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Play className="w-2.5 h-2.5" />}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-800">Check-In</span>
                {checkIn && (
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      isLate
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    {isLate ? 'Late Arrival' : 'On Time'}
                  </span>
                )}
              </div>
              <span className="text-xs font-mono font-semibold text-slate-900">
                {checkIn ? formatTime12h(checkIn) : 'Pending'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {checkIn
                ? `Clock-in registered at ${checkIn}. Browser session timestamp.`
                : 'Waiting for employee clock-in action for today.'}
            </p>
          </div>
        </div>

        {/* Step 3: Check-Out */}
        <div className="relative flex items-start gap-3">
          <div
            className={`absolute -left-6 top-0.5 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center shadow-xs ring-2 ${
              checkOut
                ? 'bg-indigo-600 text-white ring-indigo-200'
                : checkIn
                ? 'bg-amber-100 text-amber-700 ring-amber-200 animate-pulse'
                : 'bg-slate-200 text-slate-400 ring-slate-100'
            }`}
          >
            {checkOut ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Square className="w-2.5 h-2.5" />}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-800">Check-Out</span>
                {checkOut && todayRecord?.workingHours && (
                  <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                    Duration: {todayRecord.workingHours}
                  </span>
                )}
                {!checkOut && checkIn && (
                  <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                    Shift In Progress
                  </span>
                )}
              </div>
              <span className="text-xs font-mono font-semibold text-slate-900">
                {checkOut ? formatTime12h(checkOut) : 'Shift Active'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {checkOut
                ? `Clock-out registered at ${checkOut}. Total duration computed.`
                : checkIn
                ? 'Clock out available when ending your work day.'
                : 'Check-out becomes active after you check in.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
