import React, { useState, useMemo } from 'react';
import {
  WalletCards,
  AlertCircle,
  Building2,
  CalendarCheck,
  CheckCircle2,
  Clock,
  ExternalLink,
  Search,
  User,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useOrganization } from '../../context/OrganizationContext.jsx';
import { useEmployees } from '../../context/EmployeeContext.jsx';
import { useRole } from '../../context/RoleContext.jsx';
import { useLeave } from '../../context/LeaveContext.jsx';
import { calculateEmployeeLeaveBalances } from '../../utils/leaveCalculations.js';

export default function LeaveBalancesView() {
  const { activeLeaveTypes } = useOrganization();
  const { employees } = useEmployees();
  const { isEmployee, currentUser, isHr, isAdmin } = useRole();
  const { leaveRequests } = useLeave();

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

  const [selectedEmpId, setSelectedEmpId] = useState(
    defaultEmployee ? defaultEmployee.employeeId : ''
  );
  const [searchEmployee, setSearchEmployee] = useState('');

  // Selected employee for balance calculation
  const currentTarget = useMemo(() => {
    if (isEmployee) return defaultEmployee;
    if (!selectedEmpId) return defaultEmployee;
    return (
      employees.find(
        (e) => e.employeeId.toUpperCase() === selectedEmpId.toUpperCase()
      ) || defaultEmployee
    );
  }, [isEmployee, selectedEmpId, employees, defaultEmployee]);

  // Calculated balances for current target employee
  const targetBalances = useMemo(() => {
    if (!currentTarget?.employeeId) return [];
    return calculateEmployeeLeaveBalances(
      currentTarget.employeeId,
      activeLeaveTypes,
      leaveRequests
    );
  }, [currentTarget, activeLeaveTypes, leaveRequests]);

  // If no leave types configured at all in Organization
  if (activeLeaveTypes.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-xs text-center">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 mx-auto flex items-center justify-center mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900">No Leave Types Configured</h3>
        <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
          Annual leave quotas and entitlement policies have not been setup in Organization Settings yet.
        </p>
        {(isHr || isAdmin) && (
          <Link
            to="/organization"
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors"
          >
            <Building2 className="w-4 h-4" />
            <span>Configure Leave Types in Organization Settings</span>
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Target Member Selector for HR/Admin */}
      {!isEmployee && employees.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-slate-900">Employee Leave Balances</h4>
            <p className="text-xs text-slate-500">
              Select an employee to inspect individual annual entitlement quotas, approved deductions, and pending holds.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">Member:</span>
            <select
              value={selectedEmpId}
              onChange={(e) => setSelectedEmpId(e.target.value)}
              className="text-xs rounded-xl border border-slate-200 px-3 py-2 bg-white text-slate-800 font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              {employees.map((emp) => (
                <option key={emp.employeeId} value={emp.employeeId}>
                  {emp.fullName} ({emp.employeeId}) &middot; {emp.department}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Target Employee Identity Header */}
      {currentTarget && (
        <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">
              {currentTarget.fullName?.[0] || 'E'}
            </div>
            <div>
              <span className="text-sm font-bold text-slate-900 block">{currentTarget.fullName}</span>
              <span className="text-xs text-slate-500 font-mono">
                {currentTarget.employeeId} &middot; {currentTarget.department}
              </span>
            </div>
          </div>
          <div className="text-xs text-indigo-700 bg-white px-3 py-1.5 rounded-xl border border-indigo-100 shadow-xs">
            Viewing {isEmployee ? 'your active session balances' : 'employee quota allocation'}
          </div>
        </div>
      )}

      {/* Balances Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {targetBalances.map((b) => {
          const hasQuota = b.isConfigured;
          const percentageUsed = hasQuota
            ? Math.min(100, Math.round((b.approvedDays / b.annualQuota) * 100))
            : 0;

          return (
            <div
              key={b.leaveTypeId}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">{b.leaveTypeName}</span>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      b.isPaid
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {b.isPaid ? 'Paid Leave' : 'Unpaid Leave'}
                  </span>
                </div>

                {/* Quota Numbers */}
                <div className="mt-4">
                  {hasQuota ? (
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-extrabold text-slate-900 font-mono">
                          {b.remainingDays}
                        </span>
                        <span className="text-xs font-semibold text-slate-400">
                          / {b.annualQuota} days remaining
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
                        <div
                          className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                          style={{ width: `${percentageUsed}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1.5 font-medium">
                        <span>{percentageUsed}% utilized</span>
                        <span>{b.approvedDays} days approved</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                        <span>Not Configured</span>
                      </div>
                      <p className="text-[11px] text-amber-700 mt-1">
                        No annual quota has been configured for this policy.
                      </p>
                      {(isHr || isAdmin) && (
                        <Link
                          to="/organization"
                          className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 hover:text-indigo-900"
                        >
                          <span>Set Quota in Settings</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Metrics */}
              <div className="mt-5 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[11px] text-slate-400 block">Pending Requests</span>
                  <span className="font-semibold text-amber-700 font-mono">
                    {b.pendingDays} {b.pendingDays === 1 ? 'day' : 'days'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Approval Required</span>
                  <span className="font-semibold text-slate-700">
                    {b.requiresApproval ? 'Yes (Manager/HR)' : 'Auto-approved'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Table across all Leave Types */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-slate-900">Policy Quota Breakdown</h4>
            <p className="text-xs text-slate-500">
              Detailed allowance, approved deductions, and remaining entitlements.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4 font-semibold">Policy Name</th>
                <th className="py-3 px-4 font-semibold">Classification</th>
                <th className="py-3 px-4 font-semibold">Annual Quota</th>
                <th className="py-3 px-4 font-semibold">Approved (Used)</th>
                <th className="py-3 px-4 font-semibold">Pending Approval</th>
                <th className="py-3 px-4 font-semibold">Available Balance</th>
                <th className="py-3 px-4 font-semibold">Carry Forward</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {targetBalances.map((b) => (
                <tr key={b.leaveTypeId} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-900">{b.leaveTypeName}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        b.isPaid
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {b.isPaid ? 'Paid' : 'Unpaid'}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono">
                    {b.isConfigured ? (
                      <span className="font-semibold text-slate-800">{b.annualQuota} days</span>
                    ) : (
                      <span className="text-amber-700 font-medium">Not configured</span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                    {b.approvedDays} days
                  </td>
                  <td className="py-3 px-4 font-mono font-semibold text-amber-700">
                    {b.pendingDays} days
                  </td>
                  <td className="py-3 px-4 font-mono">
                    {b.isConfigured ? (
                      <span className="font-bold text-indigo-700">{b.remainingDays} days</span>
                    ) : (
                      <span className="text-slate-400 italic">Balance unavailable</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {b.allowCarryForward
                      ? `Allowed (max ${b.maxCarryForwardDays} days)`
                      : 'Lapses at year-end'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
