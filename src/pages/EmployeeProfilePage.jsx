import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Building2,
  Briefcase,
  UserCheck,
  Edit,
  Clock,
  CalendarCheck,
  WalletCards,
  Shield,
  User,
  AlertCircle,
  Key,
} from 'lucide-react';
import { useEmployees } from '../context/EmployeeContext.jsx';
import { useRole } from '../context/RoleContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import EmployeeStatusBadge from '../components/employees/EmployeeStatusBadge.jsx';
import EmployeeFormModal from '../components/employees/EmployeeFormModal.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import AttendanceStatusBadge from '../components/attendance/AttendanceStatusBadge.jsx';
import LeaveStatusBadge from '../components/leaves/LeaveStatusBadge.jsx';
import { useAttendance } from '../context/AttendanceContext.jsx';
import { useLeave } from '../context/LeaveContext.jsx';
import { formatTime12h, formatDateDisplay } from '../utils/attendanceCalculations.js';
import { formatLeaveRange, formatLeaveDate } from '../utils/leaveCalculations.js';

export default function EmployeeProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getEmployeeById, updateEmployee } = useEmployees();
  const { currentRole, isHr, isAdmin, isEmployee, currentUser } = useRole();
  const { getRecordsForEmployee } = useAttendance();
  const { getRequestsForEmployee } = useLeave();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('overview');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const employee = getEmployeeById(id);

  // If employee not found in current application state
  if (!employee) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-6 bg-white border border-slate-200 rounded-2xl shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 mb-4">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Employee Record Not Found</h2>
        <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-md">
          No employee matching identifier <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">{id}</code> was found in the current application state.
        </p>
        <Link
          to="/employees"
          className="mt-5 inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Directory</span>
        </Link>
      </div>
    );
  }

  // Permission logic: HR can edit anyone; Employee can only edit if it's their own profile
  const canEdit = isHr || (isEmployee && (currentUser.name.toLowerCase() === employee.fullName.toLowerCase() || employee.employeeId === 'EMP-0094'));

  const handleSaveEdit = (updatedData) => {
    const res = updateEmployee(employee.id, updatedData);
    if (res.success) {
      showToast({
        type: 'success',
        title: 'Employee Updated',
        message: `${res.employee.fullName} (${res.employee.employeeId}) has been updated in the current session.`,
      });
    } else {
      showToast({
        type: 'error',
        title: 'Update Failed',
        message: res.error || 'Failed to update employee.',
      });
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'personal', label: 'Personal Information' },
    { id: 'employment', label: 'Employment Details' },
    { id: 'attendance', label: 'Attendance' },
    { id: 'leaves', label: 'Leave History' },
    { id: 'payroll', label: 'Payroll' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Navigation Back */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => navigate('/employees')}
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Employees</span>
        </button>

        {canEdit && (
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
          >
            <Edit className="w-3.5 h-3.5" />
            <span>Edit Profile</span>
          </button>
        )}
      </div>

      {/* Profile Header Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-indigo-600 text-white font-bold text-xl sm:text-2xl flex items-center justify-center overflow-hidden shrink-0 shadow-sm border border-slate-100">
              {employee.photoUrl ? (
                <img
                  src={employee.photoUrl}
                  alt={employee.fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>
                  {employee.firstName ? employee.firstName.charAt(0) : ''}
                  {employee.lastName ? employee.lastName.charAt(0) : ''}
                </span>
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                  {employee.fullName}
                </h1>
                <EmployeeStatusBadge status={employee.status} />
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                <span className="font-semibold text-slate-700">{employee.designation || 'Staff'}</span>
                <span>&middot;</span>
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  {employee.department || 'General'}
                </span>
                <span>&middot;</span>
                <span className="font-mono text-slate-600 font-medium">{employee.employeeId}</span>
              </div>
            </div>
          </div>

          <div className="text-left sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 w-full sm:w-auto">
            <span className="text-[11px] text-slate-400 block uppercase tracking-wider">Employment Type</span>
            <span className="text-xs font-semibold text-slate-800">
              {employee.employmentType || 'Full-Time'}
            </span>
            <span className="text-[11px] text-slate-400 block mt-1">
              Joined {employee.joiningDate || 'Recently'}
            </span>
          </div>
        </div>

        {/* Tab navigation bar */}
        <div className="mt-6 border-t border-slate-100 pt-4 flex items-center gap-2 overflow-x-auto pb-1">
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-indigo-50 text-indigo-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Panels */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Contact info card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Mail className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Contact Information
              </h3>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Corporate Email</span>
                <span className="font-medium text-slate-800">{employee.email || '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Phone Number</span>
                <span className="font-medium text-slate-800">{employee.phone || 'Not provided'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">City / Region</span>
                <span className="font-medium text-slate-800">{employee.city || 'Not provided'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Residential Address</span>
                <span className="font-medium text-slate-800">{employee.address || 'Not provided'}</span>
              </div>
            </div>
          </div>

          {/* Employment details card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Briefcase className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Employment Summary
              </h3>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Department</span>
                <span className="font-semibold text-slate-800">{employee.department}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Designation</span>
                <span className="font-medium text-slate-800">{employee.designation}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Reporting Manager</span>
                <span className="font-medium text-slate-800">{employee.reportingManager || 'Not assigned'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Joining Date</span>
                <span className="font-mono text-slate-800">{employee.joiningDate}</span>
              </div>
            </div>
          </div>

          {/* Account status card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Key className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Account & Access Status
              </h3>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Portal Login Account</span>
                <span className="font-medium text-slate-800">
                  {employee.accountCreated ? 'Created' : 'Not configured'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Account Status</span>
                <span className="font-medium text-emerald-600">
                  {employee.accountStatus || 'Enabled'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Authentication Mode</span>
                <span className="text-slate-600">Client-Session Preview</span>
              </div>
            </div>
          </div>

          {/* Session data notice */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 pb-2 text-xs font-semibold text-slate-700">
                <Shield className="w-4 h-4 text-indigo-600" />
                <span>Employee 360 &middot; Data Scope</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                This record is currently maintained within your shared frontend React application state. Changes made during this session stay synchronized with the directory and dashboard.
              </p>
            </div>
            <span className="text-[11px] font-mono text-slate-400 mt-4">
              State Key: {employee.id} &middot; Phase 3 Backend Ready
            </span>
          </div>
        </div>
      )}

      {activeTab === 'personal' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 pb-3 border-b border-slate-100">
            Personal & Demographic Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-400 block text-[11px]">First Name</span>
              <span className="font-semibold text-slate-800 text-sm mt-0.5 block">{employee.firstName}</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-400 block text-[11px]">Last Name</span>
              <span className="font-semibold text-slate-800 text-sm mt-0.5 block">{employee.lastName}</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-400 block text-[11px]">Date of Birth</span>
              <span className="font-mono text-slate-800 mt-0.5 block">{employee.dateOfBirth || 'Not provided'}</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-400 block text-[11px]">Gender</span>
              <span className="text-slate-800 mt-0.5 block">{employee.gender || 'Prefer not to say'}</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 sm:col-span-2">
              <span className="text-slate-400 block text-[11px]">Residential Address</span>
              <span className="text-slate-800 mt-0.5 block">{employee.address ? `${employee.address}, ${employee.city}` : 'Not provided'}</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'employment' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 pb-3 border-b border-slate-100">
            Official Organization & Placement Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-400 block text-[11px]">Employee ID</span>
              <span className="font-mono font-bold text-slate-900 text-sm mt-0.5 block">{employee.employeeId}</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-400 block text-[11px]">Department</span>
              <span className="font-semibold text-slate-800 mt-0.5 block">{employee.department}</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-400 block text-[11px]">Designation</span>
              <span className="font-semibold text-slate-800 mt-0.5 block">{employee.designation}</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-400 block text-[11px]">Employment Type</span>
              <span className="font-medium text-slate-800 mt-0.5 block">{employee.employmentType || 'Full-Time'}</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-400 block text-[11px]">Employment Status</span>
              <div className="mt-1">
                <EmployeeStatusBadge status={employee.status} />
              </div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-400 block text-[11px]">Joining Date</span>
              <span className="font-mono text-slate-800 mt-0.5 block">{employee.joiningDate}</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'attendance' && (() => {
        const isSelf = isEmployee && (currentUser.name.toLowerCase() === employee.fullName.toLowerCase() || employee.employeeId === 'EMP-0094');
        const canViewAttendance = !isEmployee || isSelf;

        if (!canViewAttendance) {
          return (
            <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-xs text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 mx-auto flex items-center justify-center">
                <Shield className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-slate-800">Privacy Restriction Notice</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Employees are only authorized to view their own private attendance records. You cannot inspect or modify clock-in logs for other organization team members.
              </p>
            </div>
          );
        }

        const empRecords = getRecordsForEmployee(employee.employeeId);

        if (empRecords.length === 0) {
          return (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
              <EmptyState
                icon={Clock}
                title={`No Attendance Logs for ${employee.fullName}`}
                description="Clock-in timestamps, working durations, and attendance status will populate here once shifts are recorded."
                actionText={isHr || isAdmin ? 'Record Attendance' : isSelf ? 'Clock In Now' : undefined}
                onAction={() => navigate(isSelf ? '/attendance/my-attendance' : '/attendance')}
                phaseBadge="Attendance Logs &middot; 0 Entries"
              />
            </div>
          );
        }

        let totalMins = 0;
        let lateCount = 0;
        empRecords.forEach((r) => {
          if (r.workingMinutes) totalMins += r.workingMinutes;
          if (r.status === 'Late') lateCount += 1;
        });
        const hours = Math.floor(totalMins / 60);
        const mins = totalMins % 60;
        const totalDurationStr = totalMins > 0 ? `${hours}h ${mins}m` : '0h 00m';

        return (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h4 className="text-sm font-semibold text-slate-900">Attendance Log & Shift History</h4>
                <p className="text-xs text-slate-500">
                  Actual recorded sessions for {employee.fullName} ({employee.employeeId}).
                </p>
              </div>
              <button
                onClick={() => navigate('/attendance')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                Go to Attendance Hub &rarr;
              </button>
            </div>

            {/* Mini Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg">
                <span className="text-[11px] uppercase font-semibold text-slate-400">Total Shifts Logged</span>
                <div className="text-xl font-bold font-mono text-slate-900 mt-0.5">{empRecords.length}</div>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg">
                <span className="text-[11px] uppercase font-semibold text-slate-400">Late Arrivals</span>
                <div className="text-xl font-bold font-mono text-amber-600 mt-0.5">{lateCount}</div>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg">
                <span className="text-[11px] uppercase font-semibold text-slate-400">Total Recorded Hours</span>
                <div className="text-xl font-bold font-mono text-indigo-700 mt-0.5">{totalDurationStr}</div>
              </div>
            </div>

            {/* Records table */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Date</th>
                      <th className="py-2.5 px-3 font-semibold">Check-In</th>
                      <th className="py-2.5 px-3 font-semibold">Check-Out</th>
                      <th className="py-2.5 px-3 font-semibold">Duration</th>
                      <th className="py-2.5 px-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {empRecords.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-3 font-medium text-slate-800 whitespace-nowrap">
                          {formatDateDisplay(r.date)}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-700 whitespace-nowrap">
                          {formatTime12h(r.checkIn)}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                          {r.checkOut ? formatTime12h(r.checkOut) : '—'}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-700 whitespace-nowrap">
                          {r.workingHours || 'In Progress'}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <AttendanceStatusBadge status={r.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {activeTab === 'leaves' && (() => {
        const empLeaves = getRequestsForEmployee(employee.employeeId);
        if (empLeaves.length === 0) {
          return (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
              <EmptyState
                icon={CalendarCheck}
                title={`No Leave Records for ${employee.fullName}`}
                description="Leave applications, paid time-off history, and sick day balances will display here when submitted by the employee or approved by HR."
                actionText="Request Leave on Behalf"
                onAction={() => navigate('/leaves/apply')}
                phaseBadge="Leave Management Hub"
              />
            </div>
          );
        }

        return (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h4 className="text-sm font-semibold text-slate-900">Leave History & Applications</h4>
                <p className="text-xs text-slate-500">
                  Total of {empLeaves.length} record(s) on file for {employee.fullName}.
                </p>
              </div>
              <button
                onClick={() => navigate('/leaves')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                Go to Leave Hub &rarr;
              </button>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Category</th>
                      <th className="py-2.5 px-3 font-semibold">Date Range</th>
                      <th className="py-2.5 px-3 font-semibold">Working Days</th>
                      <th className="py-2.5 px-3 font-semibold">Reason</th>
                      <th className="py-2.5 px-3 font-semibold">Status</th>
                      <th className="py-2.5 px-3 font-semibold">Review / Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {empLeaves.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-slate-800">{l.leaveTypeName}</td>
                        <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                          {formatLeaveRange(l.startDate, l.endDate)}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-indigo-700 whitespace-nowrap">
                          {l.requestedDays} {l.requestedDays === 1 ? 'day' : 'days'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 max-w-[200px] truncate" title={l.reason}>
                          {l.reason}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <LeaveStatusBadge status={l.status} size="xs" />
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                          {l.status === 'Approved'
                            ? `Approved by ${l.reviewedBy || 'HR'}`
                            : l.status === 'Rejected'
                            ? `Rejected: ${l.rejectionReason || l.reviewerComment || 'Operational conflict'}`
                            : 'Awaiting HR decision'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {activeTab === 'payroll' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <EmptyState
            icon={WalletCards}
            title="No Payslips Generated"
            description="Monthly salary breakdowns, tax withholdings, and gross compensation slips will appear here after payroll execution runs."
            actionText="View Payroll Engine"
            onAction={() => navigate('/payroll')}
            phaseBadge="Payroll Compensation Engine Ready"
          />
        </div>
      )}

      {/* Edit Employee Modal */}
      <EmployeeFormModal
        isOpen={isEditModalOpen}
        mode="edit"
        initialData={employee}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveEdit}
      />
    </div>
  );
}
