import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Download,
  Calendar,
  X,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Clock,
  ArrowUpDown,
  Building2,
  UserCheck,
  Plus,
} from 'lucide-react';
import EmptyState from '../common/EmptyState.jsx';
import AttendanceStatusBadge from './AttendanceStatusBadge.jsx';
import { useAttendance } from '../../context/AttendanceContext.jsx';
import { useEmployees } from '../../context/EmployeeContext.jsx';
import { useOrganization } from '../../context/OrganizationContext.jsx';
import { useRole } from '../../context/RoleContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import {
  formatTime12h,
  formatDateDisplay,
  getTodayDateString,
} from '../../utils/attendanceCalculations.js';

export default function AttendanceRecordsTable({
  onOpenCorrectionModal,
  onOpenManualModal,
}) {
  const { records } = useAttendance();
  const { employees } = useEmployees();
  const { departments } = useOrganization();
  const { isAdmin, isHr, isEmployee } = useRole();
  const { showToast } = useToast();

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Sorting
  const [sortField, setSortField] = useState('date'); // 'date' | 'employeeName' | 'checkIn'
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc' | 'desc'

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Available departments derived from actual employees and active org departments
  const availableDepartments = useMemo(() => {
    const set = new Set();
    if (departments && departments.length > 0) {
      departments.filter((d) => d.status === 'Active').forEach((d) => set.add(d.name));
    }
    employees.forEach((e) => {
      if (e.department) set.add(e.department);
    });
    records.forEach((r) => {
      if (r.department) set.add(r.department);
    });
    return Array.from(set).sort();
  }, [departments, employees, records]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      // Search by employee name or ID
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesName = (rec.employeeName || '').toLowerCase().includes(query);
        const matchesId = (rec.employeeId || '').toLowerCase().includes(query);
        if (!matchesName && !matchesId) return false;
      }

      // Department filter
      if (selectedDepartment !== 'ALL' && rec.department !== selectedDepartment) {
        return false;
      }

      // Status filter
      if (selectedStatus !== 'ALL' && rec.status !== selectedStatus) {
        return false;
      }

      // Date range filter
      if (startDate && rec.date < startDate) return false;
      if (endDate && rec.date > endDate) return false;

      return true;
    });
  }, [records, searchTerm, selectedDepartment, selectedStatus, startDate, endDate]);

  // Sorted records
  const sortedRecords = useMemo(() => {
    return [...filteredRecords].sort((a, b) => {
      let valA = a[sortField] || '';
      let valB = b[sortField] || '';

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredRecords, sortField, sortDirection]);

  // Paginated records
  const totalPages = Math.ceil(sortedRecords.length / pageSize) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedRecords.slice(start, start + pageSize);
  }, [sortedRecords, currentPage, pageSize]);

  const hasActiveFilters =
    searchTerm.trim().length > 0 ||
    selectedDepartment !== 'ALL' ||
    selectedStatus !== 'ALL' ||
    Boolean(startDate) ||
    Boolean(endDate);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedDepartment('ALL');
    setSelectedStatus('ALL');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  const handleSortToggle = (field) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // CSV Export Handler
  const handleExportCSV = () => {
    if (sortedRecords.length === 0) {
      showToast({
        type: 'error',
        title: 'Export Blocked',
        message: 'There are no attendance records to export under the current filter.',
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

    const csvRows = [headers.join(',')];

    sortedRecords.forEach((r) => {
      const escape = (val) => `"${(val || '').toString().replace(/"/g, '""')}"`;
      const row = [
        escape(r.employeeName),
        escape(r.employeeId),
        escape(r.department),
        escape(r.date),
        escape(r.checkIn || ''),
        escape(r.checkOut || ''),
        escape(r.workingHours || ''),
        escape(r.status),
      ];
      csvRows.push(row.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `hcm_lite_attendance_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast({
      type: 'info',
      title: 'CSV File Downloaded',
      message: `Exported ${sortedRecords.length} actual attendance record(s) to CSV (browser-generated file).`,
    });
  };

  return (
    <div className="space-y-4">
      {/* Top Filter & Action Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Field */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by employee name or ID..."
              className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Action buttons (Export / Add Record) */}
          <div className="flex items-center gap-2">
            {!isEmployee && onOpenManualModal && (
              <button
                onClick={onOpenManualModal}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Record Attendance</span>
              </button>
            )}

            {!isEmployee && (
              <button
                onClick={handleExportCSV}
                disabled={records.length === 0}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 border border-slate-200 rounded-lg shadow-xs transition-colors"
                title={records.length === 0 ? 'No attendance records to export' : 'Export attendance records'}
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Export CSV</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          {/* Department Filter */}
          <select
            value={selectedDepartment}
            onChange={(e) => {
              setSelectedDepartment(e.target.value);
              setCurrentPage(1);
            }}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
          >
            <option value="ALL">All Departments</option>
            {availableDepartments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
          >
            <option value="ALL">All Statuses</option>
            <option value="Present">Present</option>
            <option value="Late">Late</option>
            <option value="Half Day">Half Day</option>
            <option value="Absent">Absent</option>
            <option value="On Leave">On Leave</option>
            <option value="Incomplete">Incomplete</option>
          </select>

          {/* Date range inputs */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="text-[11px]">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
            <span className="text-[11px]">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors ml-auto"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>

        {/* Results Counter */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
          <div>
            Showing <strong className="font-semibold text-slate-800">{sortedRecords.length}</strong> of{' '}
            <strong className="font-semibold text-slate-800">{records.length}</strong> total record(s)
            {hasActiveFilters && <span className="text-amber-700 ml-1.5 font-medium">(Filtered)</span>}
          </div>
          <div className="font-mono text-[11px] text-slate-400">
            Real Session Records Only
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {records.length === 0 ? (
          <div className="p-8 sm:p-12 text-center space-y-3">
            <EmptyState
              icon={Clock}
              title="No Attendance Records Found"
              description="No attendance events have been recorded yet. Records will automatically appear once employees check in via self-service or when authorized HR managers enter attendance information."
              actionText={!isEmployee && onOpenManualModal ? 'Record First Attendance' : undefined}
              onAction={onOpenManualModal}
              phaseBadge="Live Session Data &middot; 0 Records"
            />
          </div>
        ) : sortedRecords.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <Clock className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs sm:text-sm font-semibold text-slate-700">No matching attendance records</p>
            <p className="text-xs text-slate-400">Try adjusting your date range or clearing filters.</p>
            <button
              onClick={clearFilters}
              className="mt-2 px-3 py-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 rounded-lg"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                <tr>
                  <th
                    onClick={() => handleSortToggle('employeeName')}
                    className="py-3 px-4 font-semibold cursor-pointer hover:text-slate-800 select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Employee Name</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3 px-4 font-semibold">Employee ID</th>
                  <th className="py-3 px-4 font-semibold">Department</th>
                  <th
                    onClick={() => handleSortToggle('date')}
                    className="py-3 px-4 font-semibold cursor-pointer hover:text-slate-800 select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Date</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3 px-4 font-semibold">Check-In</th>
                  <th className="py-3 px-4 font-semibold">Check-Out</th>
                  <th className="py-3 px-4 font-semibold">Working Hours</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors group">
                    {/* Employee Name */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {rec.employeeName}
                      </div>
                      {rec.isCorrected && (
                        <span className="text-[10px] text-amber-600 font-medium">
                          (Corrected by {rec.lastCorrectedBy || 'HR'})
                        </span>
                      )}
                    </td>

                    {/* Employee ID */}
                    <td className="py-3 px-4 whitespace-nowrap font-mono font-medium text-slate-700">
                      {rec.employeeId}
                    </td>

                    {/* Department */}
                    <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                      {rec.department}
                    </td>

                    {/* Date */}
                    <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-700">
                      {formatDateDisplay(rec.date)}
                    </td>

                    {/* Check-In */}
                    <td className="py-3 px-4 whitespace-nowrap font-mono font-medium text-slate-800">
                      {rec.checkIn ? formatTime12h(rec.checkIn) : '—'}
                    </td>

                    {/* Check-Out */}
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-600">
                      {rec.checkOut ? formatTime12h(rec.checkOut) : '—'}
                    </td>

                    {/* Working Hours */}
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-700">
                      {rec.workingHours || (rec.checkIn ? 'In Progress' : '—')}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <AttendanceStatusBadge status={rec.status} />
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 whitespace-nowrap text-right">
                      {!isEmployee ? (
                        <button
                          onClick={() => onOpenCorrectionModal(rec)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-lg transition-colors"
                          title="Correct Attendance Record"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400">View Only</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {sortedRecords.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              Showing{' '}
              <span className="font-semibold text-slate-700 font-mono">
                {(currentPage - 1) * pageSize + 1}
              </span>{' '}
              to{' '}
              <span className="font-semibold text-slate-700 font-mono">
                {Math.min(currentPage * pageSize, sortedRecords.length)}
              </span>{' '}
              of{' '}
              <span className="font-semibold text-slate-700 font-mono">
                {sortedRecords.length}
              </span>{' '}
              records
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1 px-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                      currentPage === pageNum
                        ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
