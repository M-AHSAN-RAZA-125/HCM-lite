import React from 'react';
import {
  WalletCards,
  X,
  Download,
  Lock,
  CheckCircle2,
  Clock,
  Users,
  Shield,
  FileSpreadsheet,
} from 'lucide-react';
import { useOrganization } from '../../context/OrganizationContext.jsx';
import { useRole } from '../../context/RoleContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import {
  formatCurrency,
  exportPayrollRunToCSV,
  downloadCSV,
} from '../../utils/payrollCalculations.js';
import PayrollStatusBadge from './PayrollStatusBadge.jsx';

export default function PayrollRunDetailsModal({
  isOpen,
  onClose,
  payrollRun,
  onFinalizeClick,
  onLockClick,
}) {
  const { companyProfile } = useOrganization();
  const { isAdmin } = useRole();
  const { showToast } = useToast();

  const currencySetting = companyProfile?.currency || null;

  if (!isOpen || !payrollRun) return null;

  const handleExportCSV = () => {
    const csvData = exportPayrollRunToCSV(payrollRun, currencySetting?.code || 'USD');
    if (!csvData) {
      showToast({
        type: 'error',
        title: 'Export Failed',
        message: 'No line items available to export.',
      });
      return;
    }
    const filename = `Payroll_${payrollRun.year}_${String(payrollRun.month).padStart(2, '0')}_${payrollRun.id}.csv`;
    downloadCSV(csvData, filename);
    showToast({
      type: 'success',
      title: 'CSV Export Generated',
      message: `Downloaded ${filename} successfully.`,
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <WalletCards className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Payroll Run: {payrollRun.periodLabel}
                </h3>
                <PayrollStatusBadge status={payrollRun.status} size="xs" />
              </div>
              <p className="text-xs text-slate-500 font-mono">
                Run ID: {payrollRun.id} &middot; Created by {payrollRun.createdByRole} on{' '}
                {new Date(payrollRun.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              title="Download CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] font-semibold text-slate-400 uppercase block">Total Gross</span>
              <span className="text-sm font-bold font-mono text-slate-900 block mt-0.5">
                {formatCurrency(payrollRun.totalGross, currencySetting).formatted}
              </span>
            </div>
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] font-semibold text-slate-400 uppercase block">Total Deductions</span>
              <span className="text-sm font-bold font-mono text-rose-600 block mt-0.5">
                - {formatCurrency(payrollRun.totalDeductions, currencySetting).formatted}
              </span>
            </div>
            <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-xl">
              <span className="text-[10px] font-semibold text-indigo-700 uppercase block">Total Net Payout</span>
              <span className="text-sm font-bold font-mono text-indigo-700 block mt-0.5">
                {formatCurrency(payrollRun.totalNet, currencySetting).formatted}
              </span>
            </div>
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] font-semibold text-slate-400 uppercase block">Included Workforce</span>
              <span className="text-sm font-bold font-mono text-slate-900 block mt-0.5">
                {payrollRun.employeesCount} Staff
              </span>
            </div>
          </div>

          {/* Audit Trail Row */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-slate-400">Created: </span>
              <span className="font-semibold text-slate-800">
                {new Date(payrollRun.createdAt).toLocaleString()} ({payrollRun.createdByRole})
              </span>
            </div>
            {payrollRun.finalizedAt && (
              <div>
                <span className="text-slate-400">Finalized: </span>
                <span className="font-semibold text-emerald-700">
                  {new Date(payrollRun.finalizedAt).toLocaleString()} ({payrollRun.finalizedByRole})
                </span>
              </div>
            )}
            {payrollRun.lockedAt && (
              <div>
                <span className="text-slate-400">Locked: </span>
                <span className="font-semibold text-slate-800">
                  {new Date(payrollRun.lockedAt).toLocaleString()} ({payrollRun.lockedByRole})
                </span>
              </div>
            )}
          </div>

          {/* Employee Line Items Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Employee Compensation Line Items
            </h4>
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Employee</th>
                    <th className="p-2.5">Department</th>
                    <th className="p-2.5 text-right">Basic</th>
                    <th className="p-2.5 text-right">Allowances</th>
                    <th className="p-2.5 text-right">Gross</th>
                    <th className="p-2.5 text-right">Deductions</th>
                    <th className="p-2.5 text-right">Net Take-Home</th>
                    <th className="p-2.5 font-mono text-center">Payslip ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payrollRun.items.map((item) => (
                    <tr key={item.employeeId} className="hover:bg-slate-50/60">
                      <td className="p-2.5">
                        <span className="font-bold text-slate-900 block">{item.employeeName}</span>
                        <span className="text-[11px] font-mono text-slate-400">{item.employeeId}</span>
                      </td>
                      <td className="p-2.5 text-slate-600">{item.department}</td>
                      <td className="p-2.5 text-right font-mono">
                        {formatCurrency(item.basicSalary, currencySetting).formatted}
                      </td>
                      <td className="p-2.5 text-right font-mono text-slate-600">
                        {formatCurrency(item.totalAllowances, currencySetting).formatted}
                      </td>
                      <td className="p-2.5 text-right font-mono font-semibold text-slate-900">
                        {formatCurrency(item.grossSalary, currencySetting).formatted}
                      </td>
                      <td className="p-2.5 text-right font-mono text-rose-600">
                        - {formatCurrency(item.totalDeductions, currencySetting).formatted}
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-indigo-700">
                        {formatCurrency(item.netSalary, currencySetting).formatted}
                      </td>
                      <td className="p-2.5 font-mono text-[10px] text-center text-slate-500">
                        {item.payslipId}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Excluded Staff if any */}
          {payrollRun.excludedEmployees && payrollRun.excludedEmployees.length > 0 && (
            <div className="space-y-1 text-xs">
              <span className="font-bold text-amber-800">Excluded Employees ({payrollRun.excludedEmployees.length}):</span>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 space-y-1">
                {payrollRun.excludedEmployees.map((ex) => (
                  <div key={ex.employeeId} className="flex justify-between text-[11px]">
                    <span className="font-semibold">{ex.employeeName} ({ex.employeeId})</span>
                    <span className="italic text-amber-700">{ex.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {payrollRun.status === 'Draft' && isAdmin && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onFinalizeClick) onFinalizeClick(payrollRun);
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Finalize Payroll</span>
              </button>
            )}

            {payrollRun.status === 'Finalized' && isAdmin && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onLockClick) onLockClick(payrollRun);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-800 bg-slate-200 hover:bg-slate-300 rounded-xl transition-colors flex items-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Lock Period</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
