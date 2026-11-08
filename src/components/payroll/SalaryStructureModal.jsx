import React, { useState, useEffect, useMemo } from 'react';
import {
  WalletCards,
  X,
  Check,
  AlertCircle,
  DollarSign,
  TrendingUp,
  Percent,
  Calendar,
  User,
  Building2,
  Briefcase,
  HelpCircle,
} from 'lucide-react';
import { useEmployees } from '../../context/EmployeeContext.jsx';
import { useOrganization } from '../../context/OrganizationContext.jsx';
import { usePayroll } from '../../context/PayrollContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import {
  calculateSalaryStructureTotals,
  validateSalaryStructure,
  formatCurrency,
} from '../../utils/payrollCalculations.js';

export default function SalaryStructureModal({
  isOpen,
  onClose,
  structure = null, // null for add, object for edit
}) {
  const { employees } = useEmployees();
  const { companyProfile } = useOrganization();
  const { salaryStructures, addSalaryStructure, updateSalaryStructure } = usePayroll();
  const { showToast } = useToast();

  const isEdit = Boolean(structure);

  const [formData, setFormData] = useState({
    employeeId: '',
    employeeName: '',
    department: '',
    designation: '',
    basicSalary: '',
    houseAllowance: '',
    transportAllowance: '',
    medicalAllowance: '',
    otherAllowances: '',
    bonus: '',
    additionalEarnings: '',
    providentFund: '',
    incomeTax: '',
    otherDeductions: '',
    effectiveFrom: new Date().toISOString().split('T')[0],
    salaryFrequency: 'Monthly',
    status: 'Active',
  });

  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync form state when editing or opening
  useEffect(() => {
    if (structure) {
      setFormData({
        employeeId: structure.employeeId || '',
        employeeName: structure.employeeName || '',
        department: structure.department || '',
        designation: structure.designation || '',
        basicSalary: structure.basicSalary !== undefined ? String(structure.basicSalary) : '',
        houseAllowance: structure.houseAllowance ? String(structure.houseAllowance) : '',
        transportAllowance: structure.transportAllowance ? String(structure.transportAllowance) : '',
        medicalAllowance: structure.medicalAllowance ? String(structure.medicalAllowance) : '',
        otherAllowances: structure.otherAllowances ? String(structure.otherAllowances) : '',
        bonus: structure.bonus ? String(structure.bonus) : '',
        additionalEarnings: structure.additionalEarnings ? String(structure.additionalEarnings) : '',
        providentFund: structure.providentFund ? String(structure.providentFund) : '',
        incomeTax: structure.incomeTax ? String(structure.incomeTax) : '',
        otherDeductions: structure.otherDeductions ? String(structure.otherDeductions) : '',
        effectiveFrom: structure.effectiveFrom || new Date().toISOString().split('T')[0],
        salaryFrequency: structure.salaryFrequency || 'Monthly',
        status: structure.status || 'Active',
      });
      setFormErrors({});
    } else {
      // Default to first employee without structure if available
      const configuredIds = new Set(
        salaryStructures.filter((s) => s.status === 'Active').map((s) => s.employeeId.toUpperCase())
      );
      const firstUnconfigured = employees.find(
        (e) => e.status === 'Active' && !configuredIds.has(e.employeeId.toUpperCase())
      );
      const targetEmp = firstUnconfigured || (employees.length > 0 ? employees[0] : null);

      setFormData({
        employeeId: targetEmp ? targetEmp.employeeId : '',
        employeeName: targetEmp ? targetEmp.fullName : '',
        department: targetEmp ? targetEmp.department || 'General' : '',
        designation: targetEmp ? targetEmp.designation || 'Staff' : '',
        basicSalary: '',
        houseAllowance: '',
        transportAllowance: '',
        medicalAllowance: '',
        otherAllowances: '',
        bonus: '',
        additionalEarnings: '',
        providentFund: '',
        incomeTax: '',
        otherDeductions: '',
        effectiveFrom: new Date().toISOString().split('T')[0],
        salaryFrequency: 'Monthly',
        status: 'Active',
      });
      setFormErrors({});
    }
  }, [structure, isOpen, employees, salaryStructures]);

  // Handle employee dropdown selection
  const handleEmployeeChange = (e) => {
    const selectedId = e.target.value;
    const selectedEmp = employees.find((emp) => emp.employeeId === selectedId);
    if (selectedEmp) {
      setFormData((prev) => ({
        ...prev,
        employeeId: selectedEmp.employeeId,
        employeeName: selectedEmp.fullName,
        department: selectedEmp.department || 'General',
        designation: selectedEmp.designation || 'Staff',
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        employeeId: selectedId,
      }));
    }
  };

  // Real-time calculation
  const totals = useMemo(() => {
    return calculateSalaryStructureTotals(formData);
  }, [formData]);

  const currencySetting = companyProfile?.currency || null;

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormErrors({});

    const validation = validateSalaryStructure(
      formData,
      salaryStructures,
      structure ? structure.id : null
    );

    if (!validation.isValid) {
      setFormErrors(validation.errors);
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEdit) {
        const res = updateSalaryStructure(structure.id, formData);
        if (res.success) {
          showToast({
            type: 'success',
            title: 'Salary Structure Updated',
            message: `Compensation structure for ${formData.employeeName} (${formData.employeeId}) has been updated.`,
          });
          onClose();
        } else {
          setFormErrors({ form: res.error || 'Failed to update salary structure.' });
        }
      } else {
        const res = addSalaryStructure(formData);
        if (res.success) {
          showToast({
            type: 'success',
            title: 'Salary Structure Created',
            message: `Compensation structure for ${formData.employeeName} (${formData.employeeId}) has been created with Gross Salary ${formatCurrency(totals.grossSalary, currencySetting).formatted}.`,
          });
          onClose();
        } else {
          setFormErrors({ form: res.error || 'Failed to create salary structure.' });
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <WalletCards className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isEdit ? 'Edit Salary Structure' : 'Configure Salary Structure'}
              </h3>
              <p className="text-xs text-slate-500">
                Itemize earnings, allowances, statutory withholdings, and schedule
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 max-h-[82vh] overflow-y-auto space-y-6">
          {formErrors.form && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{formErrors.form}</span>
            </div>
          )}

          {/* Section 1: Employee Assignment */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
              <User className="w-4 h-4 text-indigo-600" />
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                1. Employee Information
              </h4>
            </div>

            {employees.length === 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                No employees found in the directory. Please add employees in Employee Management before creating salary structures.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Employee <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.employeeId}
                    onChange={handleEmployeeChange}
                    disabled={isEdit}
                    className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-white text-slate-900 disabled:bg-slate-50 disabled:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select Employee</option>
                    {employees.map((emp) => (
                      <option key={emp.employeeId} value={emp.employeeId}>
                        {emp.fullName} ({emp.employeeId}) — {emp.department}
                      </option>
                    ))}
                  </select>
                  {formErrors.employeeId && (
                    <p className="text-[11px] text-rose-600 mt-1">{formErrors.employeeId}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Department & Designation
                  </label>
                  <div className="text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 truncate">
                    {formData.department || '—'} &middot; {formData.designation || '—'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Compensation & Earnings */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                2. Compensation & Earnings
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Basic Salary <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs font-mono">
                    {currencySetting?.symbol || ''}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.basicSalary}
                    onChange={(e) => setFormData({ ...formData, basicSalary: e.target.value })}
                    className={`w-full text-xs rounded-xl border p-2.5 pl-8 font-mono bg-white text-slate-900 focus:outline-hidden focus:ring-2 ${
                      formErrors.basicSalary
                        ? 'border-rose-300 focus:ring-rose-500'
                        : 'border-slate-200 focus:ring-indigo-500'
                    }`}
                  />
                </div>
                {formErrors.basicSalary && (
                  <p className="text-[11px] text-rose-600 mt-1">{formErrors.basicSalary}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  House Allowance
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs font-mono">
                    {currencySetting?.symbol || ''}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.houseAllowance}
                    onChange={(e) => setFormData({ ...formData, houseAllowance: e.target.value })}
                    className="w-full text-xs rounded-xl border border-slate-200 p-2.5 pl-8 font-mono bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Transport Allowance
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs font-mono">
                    {currencySetting?.symbol || ''}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.transportAllowance}
                    onChange={(e) => setFormData({ ...formData, transportAllowance: e.target.value })}
                    className="w-full text-xs rounded-xl border border-slate-200 p-2.5 pl-8 font-mono bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Medical Allowance
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs font-mono">
                    {currencySetting?.symbol || ''}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.medicalAllowance}
                    onChange={(e) => setFormData({ ...formData, medicalAllowance: e.target.value })}
                    className="w-full text-xs rounded-xl border border-slate-200 p-2.5 pl-8 font-mono bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Other Allowances
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs font-mono">
                    {currencySetting?.symbol || ''}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.otherAllowances}
                    onChange={(e) => setFormData({ ...formData, otherAllowances: e.target.value })}
                    className="w-full text-xs rounded-xl border border-slate-200 p-2.5 pl-8 font-mono bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bonus / Incentives (Optional)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs font-mono">
                    {currencySetting?.symbol || ''}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.bonus}
                    onChange={(e) => setFormData({ ...formData, bonus: e.target.value })}
                    className="w-full text-xs rounded-xl border border-slate-200 p-2.5 pl-8 font-mono bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Deductions */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
              <Percent className="w-4 h-4 text-rose-600" />
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                3. Itemized Deductions
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Provident Fund / Pension
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs font-mono">
                    {currencySetting?.symbol || ''}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.providentFund}
                    onChange={(e) => setFormData({ ...formData, providentFund: e.target.value })}
                    className="w-full text-xs rounded-xl border border-slate-200 p-2.5 pl-8 font-mono bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Income Tax Withholding
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs font-mono">
                    {currencySetting?.symbol || ''}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.incomeTax}
                    onChange={(e) => setFormData({ ...formData, incomeTax: e.target.value })}
                    className="w-full text-xs rounded-xl border border-slate-200 p-2.5 pl-8 font-mono bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Other Deductions
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs font-mono">
                    {currencySetting?.symbol || ''}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.otherDeductions}
                    onChange={(e) => setFormData({ ...formData, otherDeductions: e.target.value })}
                    className="w-full text-xs rounded-xl border border-slate-200 p-2.5 pl-8 font-mono bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {formErrors.totalDeductions && (
              <p className="text-[11px] text-rose-600">{formErrors.totalDeductions}</p>
            )}
          </div>

          {/* Section 4: Configuration & Effective Dates */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                4. Policy Schedule & Status
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Effective From <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.effectiveFrom}
                  onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })}
                  className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Salary Frequency
                </label>
                <select
                  value={formData.salaryFrequency}
                  onChange={(e) => setFormData({ ...formData, salaryFrequency: e.target.value })}
                  className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Monthly">Monthly</option>
                  <option value="Bi-weekly">Bi-weekly</option>
                  <option value="Weekly">Weekly</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {/* Real-time Calculation Summary Card */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span>Real-Time Calculation Summary</span>
              {!currencySetting && (
                <span className="text-[10px] text-amber-600 font-normal">
                  (Currency not configured)
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] font-semibold text-slate-400 uppercase block">Gross Pay</span>
                <span className="text-xs sm:text-sm font-bold font-mono text-slate-900">
                  {formatCurrency(totals.grossSalary, currencySetting).formatted}
                </span>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] font-semibold text-slate-400 uppercase block">Deductions</span>
                <span className="text-xs sm:text-sm font-bold font-mono text-rose-600">
                  - {formatCurrency(totals.totalDeductions, currencySetting).formatted}
                </span>
              </div>
              <div className="p-2.5 bg-indigo-50/70 rounded-lg border border-indigo-100">
                <span className="text-[10px] font-semibold text-indigo-700 uppercase block">Net Pay</span>
                <span className="text-xs sm:text-sm font-bold font-mono text-indigo-700">
                  {formatCurrency(totals.netSalary, currencySetting).formatted}
                </span>
              </div>
            </div>

            {totals.isDeductionExceedingGross && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Total deductions exceed gross salary. Net salary cannot be negative.</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || totals.isDeductionExceedingGross}
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{isEdit ? 'Save Changes' : 'Create Salary Structure'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
