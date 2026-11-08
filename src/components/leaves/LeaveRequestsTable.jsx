import React, { useState, useMemo } from 'react';
import {
  CalendarCheck,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Eye,
  Ban,
  Building2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Paperclip,
} from 'lucide-react';
import LeaveStatusBadge from './LeaveStatusBadge.jsx';
import EmptyState from '../common/EmptyState.jsx';
import { formatLeaveRange, formatLeaveDate } from '../../utils/leaveCalculations.js';
import { useOrganization } from '../../context/OrganizationContext.jsx';
import { useRole } from '../../context/RoleContext.jsx';

export default function LeaveRequestsTable({
  requests = [],
  onViewDetails,
  onApprove,
  onReject,
  onCancel,
  canReview = false,
  emptyTitle = 'No Leave Records on File',
  emptyDescription = 'There are currently no leave applications matching your criteria.',
  onApplyClick,
}) {
  const { activeDepartments, activeLeaveTypes } = useOrganization();
  const { isEmployee, currentUser } = useRole();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [leaveTypeFilter, setLeaveTypeFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Filter requests
  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      // Status filter
      if (statusFilter !== 'ALL' && req.status !== statusFilter) return false;

      // Department filter
      if (deptFilter !== 'ALL' && req.department !== deptFilter) return false;

      // Leave type filter
      if (leaveTypeFilter !== 'ALL' && req.leaveTypeId !== leaveTypeFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = req.employeeName?.toLowerCase().includes(q);
        const matchesId = req.employeeId?.toLowerCase().includes(q);
        const matchesType = req.leaveTypeName?.toLowerCase().includes(q);
        const matchesReason = req.reason?.toLowerCase().includes(q);
        const matchesReqId = req.id?.toLowerCase().includes(q);
        if (!matchesName && !matchesId && !matchesType && !matchesReason && !matchesReqId) {
          return false;
        }
      }

      return true;
    });
  }, [requests, statusFilter, deptFilter, leaveTypeFilter, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredRequests.length / pageSize) || 1;
  const paginatedRequests = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRequests.slice(start, start + pageSize);
  }, [filteredRequests, currentPage, pageSize]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setDeptFilter('ALL');
    setLeaveTypeFilter('ALL');
    setCurrentPage(1);
  };

  const hasActiveFilters =
    searchQuery || statusFilter !== 'ALL' || deptFilter !== 'ALL' || leaveTypeFilter !== 'ALL';

  if (requests.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <EmptyState
          icon={CalendarCheck}
          title={emptyTitle}
          description={emptyDescription}
          actionText={onApplyClick ? 'Apply for Leave' : undefined}
          onAction={onApplyClick}
          phaseBadge="Leave Management Hub"
        />
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
      {/* Controls Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by employee name, ID, category, reason..."
            className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs rounded-xl border border-slate-200 px-3 py-2 bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="Pending">Pending Approval</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          {/* Department Filter */}
          {activeDepartments.length > 0 && (
            <select
              value={deptFilter}
              onChange={(e) => {
                setDeptFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="text-xs rounded-xl border border-slate-200 px-3 py-2 bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
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
              onChange={(e) => {
                setLeaveTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="text-xs rounded-xl border border-slate-200 px-3 py-2 bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Categories</option>
              {activeLeaveTypes.map((lt) => (
                <option key={lt.id} value={lt.id}>
                  {lt.name}
                </option>
              ))}
            </select>
          )}

          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {paginatedRequests.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-xs text-slate-500">No leave requests match the current search filters.</p>
          <button
            onClick={handleClearFilters}
            className="mt-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4 font-semibold">Employee</th>
                <th className="py-3 px-4 font-semibold">Category</th>
                <th className="py-3 px-4 font-semibold">Schedule & Days</th>
                <th className="py-3 px-4 font-semibold">Reason</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Submitted</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedRequests.map((req) => {
                const isOwner =
                  isEmployee &&
                  (req.employeeId === 'EMP-0094' ||
                    req.employeeName.toLowerCase() === currentUser.name.toLowerCase());

                return (
                  <tr key={req.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Employee */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                          {req.employeeName
                            ? req.employeeName
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .slice(0, 2)
                                .toUpperCase()
                            : 'EM'}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-900 block">{req.employeeName}</span>
                          <span className="text-slate-400 text-[11px] font-mono">
                            {req.employeeId} &middot; {req.department}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-semibold text-slate-800 block">{req.leaveTypeName}</span>
                      <span className="text-[10px] text-slate-400 font-mono">Ref: {req.id}</span>
                    </td>

                    {/* Schedule & Days */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-medium text-slate-900">
                        {formatLeaveRange(req.startDate, req.endDate)}
                      </div>
                      <div className="text-[11px] text-indigo-700 font-semibold font-mono">
                        {req.requestedDays} working {req.requestedDays === 1 ? 'day' : 'days'}
                      </div>
                    </td>

                    {/* Reason */}
                    <td className="py-3.5 px-4 max-w-[200px]">
                      <div className="truncate text-slate-600" title={req.reason}>
                        {req.reason}
                      </div>
                      {req.supportingDocName && (
                        <div className="flex items-center gap-1 text-[10px] text-indigo-600 mt-0.5">
                          <Paperclip className="w-3 h-3" />
                          <span className="truncate">{req.supportingDocName}</span>
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <LeaveStatusBadge status={req.status} />
                    </td>

                    {/* Submitted */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 text-[11px]">
                      {formatLeaveDate(req.appliedAt?.split('T')[0])}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onViewDetails(req)}
                          title="View Details"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Review buttons for HR/Admin on pending requests */}
                        {req.status === 'Pending' && canReview && (
                          <>
                            <button
                              type="button"
                              onClick={() => onApprove(req)}
                              title="Approve Request"
                              className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onReject(req)}
                              title="Reject Request"
                              className="p-1.5 rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}

                        {/* Cancel button for owner or HR */}
                        {req.status === 'Pending' && (isOwner || canReview) && onCancel && (
                          <button
                            type="button"
                            onClick={() => onCancel(req.id)}
                            title="Cancel Application"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Footer */}
      {filteredRequests.length > pageSize && (
        <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing {(currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, filteredRequests.length)} of {filteredRequests.length}{' '}
            requests
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-medium text-slate-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
