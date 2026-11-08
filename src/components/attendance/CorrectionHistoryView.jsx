import React, { useState } from 'react';
import { ShieldCheck, Search, History, Clock, Calendar, User, ArrowRight, FileText } from 'lucide-react';
import EmptyState from '../common/EmptyState.jsx';
import AttendanceStatusBadge from './AttendanceStatusBadge.jsx';
import { formatTime12h, formatDateDisplay } from '../../utils/attendanceCalculations.js';

export default function CorrectionHistoryView({ correctionHistory = [] }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredHistory = correctionHistory.filter((item) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      (item.employeeName || '').toLowerCase().includes(q) ||
      (item.employeeId || '').toLowerCase().includes(q) ||
      (item.reason || '').toLowerCase().includes(q) ||
      (item.date || '').includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 border border-slate-200 rounded-xl shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by employee name, ID, date, or reason..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
          />
        </div>

        <div className="text-xs text-slate-500">
          Showing <strong className="font-semibold text-slate-800">{filteredHistory.length}</strong> of{' '}
          <strong className="font-semibold text-slate-800">{correctionHistory.length}</strong> logged correction(s)
        </div>
      </div>

      {/* Content */}
      {correctionHistory.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-xs">
          <EmptyState
            icon={ShieldCheck}
            title="No Attendance Corrections Recorded"
            description="When authorized HR Managers or Administrators adjust attendance timestamps, all previous values and justification reasons are preserved here for full audit traceability."
            phaseBadge="Audit Log &middot; 0 Events"
          />
        </div>
      ) : filteredHistory.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-500">
          No correction records matched your search filter.
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Employee</th>
                  <th className="py-3 px-4 font-semibold">Attendance Date</th>
                  <th className="py-3 px-4 font-semibold">Original Values</th>
                  <th className="py-3 px-4 font-semibold">Corrected Values</th>
                  <th className="py-3 px-4 font-semibold">Reason & Notes</th>
                  <th className="py-3 px-4 font-semibold text-right">Modified By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredHistory.map((corr) => (
                  <tr key={corr.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Employee */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-900">{corr.employeeName}</div>
                      <div className="text-[11px] font-mono text-slate-400">{corr.employeeId}</div>
                    </td>

                    {/* Date */}
                    <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-700">
                      {formatDateDisplay(corr.date)}
                    </td>

                    {/* Original values */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-500">
                        <span>In: {formatTime12h(corr.originalCheckIn)}</span>
                        <span>&middot;</span>
                        <span>Out: {corr.originalCheckOut ? formatTime12h(corr.originalCheckOut) : 'None'}</span>
                      </div>
                      <div className="mt-0.5">
                        <span className="text-[10px] text-slate-400">
                          Status: <strong className="text-slate-600">{corr.originalStatus}</strong>
                        </span>
                      </div>
                    </td>

                    {/* Corrected values */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold text-indigo-700">
                        <span>In: {formatTime12h(corr.correctedCheckIn)}</span>
                        <span>&middot;</span>
                        <span>Out: {corr.correctedCheckOut ? formatTime12h(corr.correctedCheckOut) : 'None'}</span>
                      </div>
                      <div className="mt-0.5">
                        <AttendanceStatusBadge status={corr.correctedStatus} />
                      </div>
                    </td>

                    {/* Reason */}
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-medium text-slate-900 line-clamp-1">{corr.reason}</div>
                      {corr.notes && (
                        <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{corr.notes}</div>
                      )}
                    </td>

                    {/* Modified by */}
                    <td className="py-3 px-4 whitespace-nowrap text-right">
                      <div className="text-xs font-medium text-slate-700">{corr.correctedBy}</div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(corr.correctedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
