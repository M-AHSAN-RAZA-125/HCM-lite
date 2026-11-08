import React from 'react';
import {
  WalletCards,
  X,
  Edit2,
  Calendar,
  User,
  Building2,
  TrendingUp,
  Percent,
} from 'lucide-react';
import { useOrganization } from '../../context/OrganizationContext.jsx';
import { formatCurrency } from '../../utils/payrollCalculations.js';
import PayrollStatusBadge from './PayrollStatusBadge.jsx';

export default function SalaryStructureDetailsModal({
  isOpen,
  onClose,
  structure,
  onEdit,
  canEdit = false,
}) {
  const { companyProfile } = useOrganization();
  const currencySetting = companyProfile?.currency || null;

  if (!isOpen || !structure) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <WalletCards className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">{structure.employeeName}</h3>
                <PayrollStatusBadge status={structure.status} size="xs" />
              </div>
              <p className="text-xs text-slate-500 font-mono">
                {structure.employeeId} &middot; {structure.department} &middot; {structure.designation}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Summary Box */}
          <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center">
            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase block">Gross Salary</span>
              <span className="text-sm font-bold font-mono text-slate-900">
                {formatCurrency(structure.grossSalary, currencySetting).formatted}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase block">Total Deductions</span>
              <span className="text-sm font-bold font-mono text-rose-600">
                - {formatCurrency(structure.totalDeductions, currencySetting).formatted}
              </span>
            </div>
            <div className="bg-white rounded-xl p-1 border border-indigo-100 shadow-2xs">
              <span className="text-[10px] font-semibold text-indigo-700 uppercase block">Net Take-Home</span>
              <span className="text-sm font-bold font-mono text-indigo-700">
                {formatCurrency(structure.netSalary, currencySetting).formatted}
              </span>
            </div>
          </div>

          {/* Itemized Earnings */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>Earnings & Allowances</span>
            </h4>
            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 text-xs">
              <div className="flex justify-between p-2.5">
                <span className="text-slate-600">Basic Salary</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatCurrency(structure.basicSalary, currencySetting).formatted}
                </span>
              </div>
              <div className="flex justify-between p-2.5">
                <span className="text-slate-600">House Allowance</span>
                <span className="font-mono text-slate-800">
                  {formatCurrency(structure.houseAllowance || 0, currencySetting).formatted}
                </span>
              </div>
              <div className="flex justify-between p-2.5">
                <span className="text-slate-600">Transport Allowance</span>
                <span className="font-mono text-slate-800">
                  {formatCurrency(structure.transportAllowance || 0, currencySetting).formatted}
                </span>
              </div>
              <div className="flex justify-between p-2.5">
                <span className="text-slate-600">Medical Allowance</span>
                <span className="font-mono text-slate-800">
                  {formatCurrency(structure.medicalAllowance || 0, currencySetting).formatted}
                </span>
              </div>
              {Number(structure.otherAllowances) > 0 && (
                <div className="flex justify-between p-2.5">
                  <span className="text-slate-600">Other Allowances</span>
                  <span className="font-mono text-slate-800">
                    {formatCurrency(structure.otherAllowances, currencySetting).formatted}
                  </span>
                </div>
              )}
              {Number(structure.bonus) > 0 && (
                <div className="flex justify-between p-2.5">
                  <span className="text-slate-600">Bonus / Incentive</span>
                  <span className="font-mono text-slate-800">
                    {formatCurrency(structure.bonus, currencySetting).formatted}
                  </span>
                </div>
              )}
              {Number(structure.additionalEarnings) > 0 && (
                <div className="flex justify-between p-2.5">
                  <span className="text-slate-600">Additional Earnings</span>
                  <span className="font-mono text-slate-800">
                    {formatCurrency(structure.additionalEarnings, currencySetting).formatted}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Itemized Deductions */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Percent className="w-4 h-4 text-rose-600" />
              <span>Deductions & Withholdings</span>
            </h4>
            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 text-xs">
              <div className="flex justify-between p-2.5">
                <span className="text-slate-600">Provident Fund / Pension</span>
                <span className="font-mono text-rose-700">
                  {formatCurrency(structure.providentFund || 0, currencySetting).formatted}
                </span>
              </div>
              <div className="flex justify-between p-2.5">
                <span className="text-slate-600">Income Tax</span>
                <span className="font-mono text-rose-700">
                  {formatCurrency(structure.incomeTax || 0, currencySetting).formatted}
                </span>
              </div>
              {Number(structure.otherDeductions) > 0 && (
                <div className="flex justify-between p-2.5">
                  <span className="text-slate-600">Other Deductions</span>
                  <span className="font-mono text-rose-700">
                    {formatCurrency(structure.otherDeductions, currencySetting).formatted}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Schedule Metadata */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 space-y-1">
            <div className="flex justify-between">
              <span>Salary Frequency:</span>
              <span className="font-semibold text-slate-800">{structure.salaryFrequency}</span>
            </div>
            <div className="flex justify-between">
              <span>Effective Date:</span>
              <span className="font-semibold text-slate-800">{structure.effectiveFrom}</span>
            </div>
            <div className="flex justify-between">
              <span>Structure ID:</span>
              <span className="font-mono font-semibold text-slate-800">{structure.id}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          {canEdit && (
            <button
              onClick={() => {
                onClose();
                if (onEdit) onEdit(structure);
              }}
              className="px-4 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit Structure</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
