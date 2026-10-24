import React, { useState, useMemo } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
  Users,
  Building2,
  CalendarCheck,
  Sparkles,
  Info,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { useLeave } from '../../context/LeaveContext.jsx';
import { useOrganization } from '../../context/OrganizationContext.jsx';
import { useRole } from '../../context/RoleContext.jsx';
import {
  parseLocalDate,
  formatToDateString,
  getTodayDateString,
  formatLeaveDate,
} from '../../utils/leaveCalculations.js';
import LeaveDetailsModal from './LeaveDetailsModal.jsx';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function LeaveCalendarView() {
  const { leaveRequests } = useLeave();
  const { activeHolidays, activeDepartments, activeLeaveTypes, officeRules } = useOrganization();
  const { isEmployee, currentUser, isAdmin, isHr } = useRole();

  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [leaveTypeFilter, setLeaveTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'Approved' | 'Pending'
  const [selectedRequest, setSelectedRequest] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const todayStr = getTodayDateString();

  // Filter leaves based on selected criteria
  const filteredLeaves = useMemo(() => {
    return leaveRequests.filter((req) => {
      // Only include Approved and Pending on calendar
      if (req.status !== 'Approved' && req.status !== 'Pending') return false;
      if (statusFilter !== 'ALL' && req.status !== statusFilter) return false;
      if (deptFilter !== 'ALL' && req.department !== deptFilter) return false;
      if (leaveTypeFilter !== 'ALL' && req.leaveTypeId !== leaveTypeFilter) return false;
      return true;
    });
  }, [leaveRequests, statusFilter, deptFilter, leaveTypeFilter]);

  // Calendar matrix calculation
  const calendarCells = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells = [];

    // Previous month trailing days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevDate = new Date(year, month - 1, dayNum);
      const dateStr = formatToDateString(prevDate);
      cells.push({
        dateStr,
        dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
      });
    }

    // Current month days
    for (let dayNum = 1; dayNum <= daysInCurrentMonth; dayNum++) {
      const thisDate = new Date(year, month, dayNum);
      const dateStr = formatToDateString(thisDate);
      cells.push({
        dateStr,
        dayNum,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
      });
    }

    // Next month leading days (fill up to 35 or 42 cells)
    const totalCurrentCells = cells.length;
    const targetTotal = totalCurrentCells <= 35 ? 35 : 42;
    const remaining = targetTotal - totalCurrentCells;
    for (let dayNum = 1; dayNum <= remaining; dayNum++) {
      const nextDate = new Date(year, month + 1, dayNum);
      const dateStr = formatToDateString(nextDate);
      cells.push({
        dateStr,
        dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
      });
    }

    return cells;
  }, [year, month, todayStr]);

  // Holiday map
  const holidayMap = useMemo(() => {
    const map = new Map();
    activeHolidays.forEach((h) => {
      if (h.date) {
        map.set(h.date, h);
      }
    });
    return map;
  }, [activeHolidays]);

  // Summary counts for current month
  const monthStats = useMemo(() => {
    const monthStart = formatToDateString(new Date(year, month, 1));
    const monthEnd = formatToDateString(new Date(year, month + 1, 0));
    const monthLeaves = leaveRequests.filter(
      (r) => r.startDate <= monthEnd && r.endDate >= monthStart
    );
    const approved = monthLeaves.filter((r) => r.status === 'Approved').length;
    const pending = monthLeaves.filter((r) => r.status === 'Pending').length;
    return { approved, pending };
  }, [leaveRequests, year, month]);

  // Helper to format employee name respecting employee privacy
  const getDisplayName = (leave) => {
    const isCurrentUser =
      leave.employeeId?.toUpperCase() === 'EMP-0094' ||
      leave.employeeName?.toLowerCase() === currentUser?.name?.toLowerCase();

    if (isCurrentUser) {
      return `${leave.employeeName} (You)`;
    }
    if (isEmployee) {
      return `Colleague · ${leave.department || 'Team'}`;
    }
    return leave.employeeName;
  };

  return (
    <div className="space-y-5">
      {/* Calendar Controls Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Month Navigation */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-1 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-white rounded-lg transition-colors"
            >
              Today
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <h3 className="text-base sm:text-lg font-bold text-slate-900">
            {MONTH_NAMES[month]} {year}
          </h3>

          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs text-indigo-700 font-semibold bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full">
              {monthStats.approved} Approved
            </span>
            {monthStats.pending > 0 && (
              <span className="text-xs text-amber-700 font-semibold bg-amber-50 border border-amber-100 px-2.5 py-0.5 rounded-full">
                {monthStats.pending} Pending
              </span>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs rounded-xl border border-slate-200 px-3 py-2 bg-white text-slate-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="Approved">Approved Only</option>
            <option value="Pending">Pending Only</option>
          </select>

          {/* Department Filter */}
          {activeDepartments.length > 0 && (
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="text-xs rounded-xl border border-slate-200 px-3 py-2 bg-white text-slate-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Departments</option>
              {activeDepartments.map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          )}

          {/* Leave Type Filter */}
          {activeLeaveTypes.length > 0 && (
            <select
              value={leaveTypeFilter}
              onChange={(e) => setLeaveTypeFilter(e.target.value)}
              className="text-xs rounded-xl border border-slate-200 px-3 py-2 bg-white text-slate-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Categories</option>
              {activeLeaveTypes.map((lt) => (
                <option key={lt.id} value={lt.id}>
                  {lt.name}
                </option>
              ))}
            </select>
          )}

          {(statusFilter !== 'ALL' || deptFilter !== 'ALL' || leaveTypeFilter !== 'ALL') && (
            <button
              onClick={() => {
                setStatusFilter('ALL');
                setDeptFilter('ALL');
                setLeaveTypeFilter('ALL');
              }}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Calendar Grid Card */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {/* Weekday Header */}
        <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200 text-center text-xs font-semibold text-slate-500 py-3">
          {WEEKDAYS.map((day) => (
            <div key={day} className="tracking-wider uppercase text-[11px]">
              {day}
            </div>
          ))}
        </div>

        {/* Month Day Cells */}
        <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 border-b border-slate-100">
          {calendarCells.map((cell) => {
            const holiday = holidayMap.get(cell.dateStr);

            // Find leaves spanning this date
            const dayLeaves = filteredLeaves.filter(
              (r) => r.startDate <= cell.dateStr && cell.dateStr <= r.endDate
            );

            return (
              <div
                key={cell.dateStr}
                className={`min-h-[105px] sm:min-h-[120px] p-1.5 sm:p-2 flex flex-col justify-between transition-colors ${
                  cell.isCurrentMonth ? 'bg-white' : 'bg-slate-50/50 text-slate-400'
                } ${cell.isToday ? 'ring-2 ring-indigo-500 ring-inset bg-indigo-50/20' : ''}`}
              >
                {/* Day Header */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-xs font-semibold rounded-md px-1.5 py-0.5 ${
                      cell.isToday
                        ? 'bg-indigo-600 text-white font-bold'
                        : cell.isCurrentMonth
                        ? 'text-slate-700'
                        : 'text-slate-400'
                    }`}
                  >
                    {cell.dayNum}
                  </span>

                  {holiday && (
                    <span
                      title={holiday.name}
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 truncate max-w-[65px]"
                    >
                      {holiday.name}
                    </span>
                  )}
                </div>

                {/* Leaves list for this date */}
                <div className="space-y-1 flex-1 overflow-y-auto max-h-[80px]">
                  {dayLeaves.map((leave) => {
                    const isApproved = leave.status === 'Approved';
                    return (
                      <button
                        key={leave.id}
                        onClick={() => setSelectedRequest(leave)}
                        className={`w-full text-left px-1.5 py-1 rounded transition-colors block text-[10px] leading-tight ${
                          isApproved
                            ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200'
                            : 'bg-amber-50/80 hover:bg-amber-100 text-amber-900 border border-dashed border-amber-300'
                        }`}
                      >
                        <div className="font-bold truncate flex items-center justify-between gap-1">
                          <span className="truncate">{getDisplayName(leave)}</span>
                          {!isApproved && (
                            <span className="shrink-0 text-[8px] uppercase tracking-wider text-amber-700 font-semibold">
                              Pending
                            </span>
                          )}
                        </div>
                        <div
                          className={`text-[9px] truncate ${
                            isApproved ? 'text-indigo-600' : 'text-amber-700'
                          }`}
                        >
                          {leave.leaveTypeName}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="p-3.5 bg-slate-50/70 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-indigo-50 border border-indigo-200" />
              <span>Approved Leave</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-50 border border-dashed border-amber-300" />
              <span>Pending Approval</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300" />
              <span>Company Holiday</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded border-2 border-indigo-600" />
              <span>Today</span>
            </div>
          </div>
          <div className="text-[11px] text-slate-400">
            Click any entry to view complete application details and coverage notes.
          </div>
        </div>
      </div>

      {/* Details Modal */}
      <LeaveDetailsModal
        isOpen={Boolean(selectedRequest)}
        onClose={() => setSelectedRequest(null)}
        request={selectedRequest}
        canReview={isAdmin || isHr}
      />
    </div>
  );
}
