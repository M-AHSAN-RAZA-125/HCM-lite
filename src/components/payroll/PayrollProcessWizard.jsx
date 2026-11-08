import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Users,
  Calculator,
  FileCheck,
  Save,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  DollarSign,
  ShieldAlert,
  Info,
  ChevronRight,
  Eye,
} from 'lucide-react';
import { useEmployees } from '../../context/EmployeeContext.jsx';
import { usePayroll } from '../../context/PayrollContext.jsx';
import { useOrganization } from '../../context/OrganizationContext.jsx';
import { useRole } from '../../context/RoleContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import {
  MONTH_NAMES,
  calculateMonthlyPayroll,
  formatCurrency,
} from '../../utils/payrollCalculations.js';
import PayrollStatusBadge from './PayrollStatusBadge.jsx';

export default function PayrollProcessWizard({ onComplete, onCancel }) {
  const { employees } = useEmployees();
  const { salaryStructures, payrollRuns, savePayrollDraft } = usePayroll();
  const { companyProfile } = useOrganization();
  const { currentRole, isHr, isAdmin } = useRole();
  const { showToast } = useToast();

  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1-12
  const currentYear = now.getFullYear();

  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [calculatedRun, setCalculatedRun] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedEmployeePreview, setSelectedEmployeePreview] = useState(null);

  const currencySetting = companyProfile?.currency || null;

  // Check if run already exists for this period
  const existingPeriodRun = useMemo(() => {
    return (
      payrollRuns.find(
        (r) => r.month === Number(selectedMonth) && r.year === Number(selectedYear)
      ) || null
    );
  }, [payrollRuns, selectedMonth, selectedYear]);

  // Pre-calculate reviewable employees for Step 2
  const previewCalculation = useMemo(() => {
    return calculateMonthlyPayroll({
      periodMonth: Number(selectedMonth),
      periodYear: Number(selectedYear),
      salaryStructures,
      employees,
    });
  }, [selectedMonth, selectedYear, salaryStructures, employees]);

  // Handle Calculate button click (Step 3)
  const handleCalculate = () => {
    setIsCalculating(true);
    setTimeout(() => {
      const run = calculateMonthlyPayroll({
        periodMonth: Number(selectedMonth),
        periodYear: Number(selectedYear),
        salaryStructures,
        employees,
      });
      setCalculatedRun(run);
      setIsCalculating(false);
      setCurrentStep(4);
    }, 400);
  };

  // Handle Save Draft (Step 5)
  const handleSaveDraft = () => {
    if (!calculatedRun) return;

    if (calculatedRun.items.length === 0) {
      showToast({
        type: 'error',
        title: 'Empty Payroll Run',
        message: 'Cannot save draft with 0 included employees. Configure salary structures first.',
      });
      return;
    }

    setIsSaving(true);
    try {
      const res = savePayrollDraft({
        periodMonth: calculatedRun.periodMonth,
        periodYear: calculatedRun.periodYear,
        periodLabel: calculatedRun.periodLabel,
        items: calculatedRun.items,
        excludedEmployees: calculatedRun.excludedEmployees,
        totalGross: calculatedRun.totalGross,
        totalDeductions: calculatedRun.totalDeductions,
        totalNet: calculatedRun.totalNet,
        createdByRole: currentRole,
      });

      if (res.success) {
        showToast({
          type: 'success',
          title: res.isUpdated ? 'Payroll Draft Updated' : 'Payroll Draft Saved',
          message: `Payroll draft ${res.payrollRun.id} for ${calculatedRun.periodLabel} saved in current session.`,
        });
        if (onComplete) onComplete(res.payrollRun);
      } else {
        showToast({
          type: 'error',
          title: 'Save Failed',
          message: res.error || 'Could not save payroll draft.',
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const STEPS = [
    { number: 1, title: 'Select Period', icon: Calendar },
    { number: 2, title: 'Review Staff', icon: Users },
    { number: 3, title: 'Calculate', icon: Calculator },
    { number: 4, title: 'Review Payroll', icon: FileCheck },
    { number: 5, title: 'Save Draft', icon: Save },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
      {/* Wizard Progress Steps Bar */}
      <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center justify-between max-w-4xl mx-auto overflow-x-auto gap-2">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isCompleted = currentStep > step.number;
            const isCurrent = currentStep === step.number;

            return (
              <React.Fragment key={step.number}>
                <div className="flex items-center gap-2 shrink-0">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                      isCompleted
                        ? 'bg-emerald-600 text-white'
                        : isCurrent
                        ? 'bg-indigo-600 text-white ring-4 ring-indigo-100'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : step.number}
                  </div>
                  <span
                    className={`text-xs font-semibold hidden sm:inline ${
                      isCurrent ? 'text-indigo-600' : isCompleted ? 'text-slate-900' : 'text-slate-400'
                    }`}
                  >
                    {step.title}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 min-w-4 ${
                      isCompleted ? 'bg-emerald-500' : 'bg-slate-200'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Main Step Content */}
      <div className="p-6 sm:p-8 min-h-[380px]">
        {/* STEP 1: Select Period */}
        {currentStep === 1 && (
          <div className="max-w-xl mx-auto space-y-6">
            <div className="text-center space-y-1">
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                Step 1: Select Payroll Period
              </h3>
              <p className="text-xs text-slate-500">
                Choose the calendar month and year to process compensation for active workforce.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Payroll Month
                  </label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="w-full text-xs rounded-xl border border-slate-200 p-3 bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    {MONTH_NAMES.map((name, i) => (
                      <option key={i + 1} value={i + 1}>
                        {name} ({String(i + 1).padStart(2, '0')})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Payroll Year
                  </label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="w-full text-xs rounded-xl border border-slate-200 p-3 bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    {[2024, 2025, 2026, 2027].map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-600">Selected Cycle:</span>
                <span className="font-bold text-indigo-700 text-sm">
                  {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
                </span>
              </div>

              {existingPeriodRun && (
                <div
                  className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                    existingPeriodRun.status === 'Locked'
                      ? 'bg-slate-100 border-slate-300 text-slate-700'
                      : existingPeriodRun.status === 'Finalized'
                      ? 'bg-amber-50 border-amber-200 text-amber-800'
                      : 'bg-indigo-50 border-indigo-200 text-indigo-800'
                  }`}
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">
                      Existing Run: {existingPeriodRun.id} ({existingPeriodRun.status})
                    </span>
                    <span className="text-[11px] block mt-0.5">
                      {existingPeriodRun.status === 'Locked'
                        ? 'This period is locked and cannot be recalculated or modified.'
                        : existingPeriodRun.status === 'Finalized'
                        ? 'This period is already finalized. Recalculation is restricted to protect audit records.'
                        : 'A draft already exists for this period. Proceeding will allow reviewing and updating the draft.'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                disabled={existingPeriodRun && existingPeriodRun.status === 'Locked'}
                className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs transition-colors flex items-center gap-2"
              >
                <span>Continue to Staff Review</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Review Staff */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Step 2: Review Employees ({previewCalculation.periodLabel})
                </h3>
                <p className="text-xs text-slate-500">
                  Verify workforce members eligible for payroll calculation based on active salary structures.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg font-semibold">
                  {previewCalculation.items.length} Included
                </span>
                {previewCalculation.excludedEmployees.length > 0 && (
                  <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg font-semibold">
                    {previewCalculation.excludedEmployees.length} Excluded
                  </span>
                )}
              </div>
            </div>

            {/* Excluded Employees Warning Card */}
            {previewCalculation.excludedEmployees.length > 0 && (
              <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-900 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-800">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    {previewCalculation.excludedEmployees.length} Employee(s) Excluded from this Payroll Run
                  </span>
                </div>
                <p className="text-amber-800 leading-relaxed">
                  Employees without a valid, active salary structure are strictly excluded from calculations until their compensation is configured.
                </p>
                <div className="divide-y divide-amber-200/60 pt-1">
                  {previewCalculation.excludedEmployees.map((ex) => (
                    <div key={ex.employeeId} className="py-1.5 flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-amber-950">
                        {ex.employeeName} ({ex.employeeId}) &middot; {ex.department}
                      </span>
                      <span className="italic text-amber-700">{ex.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Eligible Employees Table */}
            {previewCalculation.items.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <Users className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-900">No Eligible Employees Found</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  None of your active employees have an active salary structure assigned. Please configure salary structures in the Salary Structures section.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Employee</th>
                      <th className="p-3">Department</th>
                      <th className="p-3 text-right">Basic</th>
                      <th className="p-3 text-right">Allowances</th>
                      <th className="p-3 text-right">Gross</th>
                      <th className="p-3 text-right">Deductions</th>
                      <th className="p-3 text-right">Net Pay</th>
                      <th className="p-3 text-center">Review Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewCalculation.items.map((item) => (
                      <tr key={item.employeeId} className="hover:bg-slate-50/60">
                        <td className="p-3">
                          <span className="font-bold text-slate-900 block">{item.employeeName}</span>
                          <span className="text-[11px] font-mono text-slate-400">{item.employeeId}</span>
                        </td>
                        <td className="p-3 text-slate-600">{item.department}</td>
                        <td className="p-3 text-right font-mono">
                          {formatCurrency(item.basicSalary, currencySetting).formatted}
                        </td>
                        <td className="p-3 text-right font-mono text-slate-600">
                          {formatCurrency(item.totalAllowances, currencySetting).formatted}
                        </td>
                        <td className="p-3 text-right font-mono font-semibold text-slate-900">
                          {formatCurrency(item.grossSalary, currencySetting).formatted}
                        </td>
                        <td className="p-3 text-right font-mono text-rose-600">
                          - {formatCurrency(item.totalDeductions, currencySetting).formatted}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-indigo-700">
                          {formatCurrency(item.netSalary, currencySetting).formatted}
                        </td>
                        <td className="p-3 text-center">
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            {item.reviewStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                disabled={previewCalculation.items.length === 0}
                className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs transition-colors flex items-center gap-2"
              >
                <span>Continue to Calculate</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Calculate Payroll */}
        {currentStep === 3 && (
          <div className="max-w-xl mx-auto space-y-6">
            <div className="text-center space-y-1">
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                Step 3: Run Payroll Calculation
              </h3>
              <p className="text-xs text-slate-500">
                Execute automated calculation using active salary structures and verified policy rules.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-5">
              <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-200">
                <span className="text-slate-600">Cycle:</span>
                <span className="font-bold text-slate-900 font-mono text-sm">
                  {previewCalculation.periodLabel}
                </span>
              </div>

              {/* Policy Disclosure Note */}
              <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-100 text-indigo-900 text-xs space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-indigo-950">
                  <Info className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>Configured Payroll Logic Policy</span>
                </div>
                <p className="text-indigo-800 leading-relaxed text-[11px]">
                  Payroll is calculated strictly using explicitly configured salary structures (Basic Salary + Allowances - Itemized Deductions). Unpaid leave deductions, attendance penalties, or unconfigured tax rates are not applied unless explicit policies are enabled.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-center text-xs">
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Active Employees</span>
                  <span className="text-sm font-bold text-slate-900">{previewCalculation.items.length} Included</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Excluded Staff</span>
                  <span className="text-sm font-bold text-slate-900">{previewCalculation.excludedEmployees.length} Excluded</span>
                </div>
              </div>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={handleCalculate}
                  disabled={isCalculating || previewCalculation.items.length === 0}
                  className="w-full sm:w-auto px-8 py-3 text-xs sm:text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 mx-auto"
                >
                  <Calculator className="w-4 h-4" />
                  <span>{isCalculating ? 'Computing Payroll...' : 'Calculate Payroll'}</span>
                </button>
              </div>

              <p className="text-[10px] text-center text-slate-400">
                Frontend calculation preview for current session. Real payment disbursement occurs via connected banking rail.
              </p>
            </div>

            <div className="flex items-center justify-between pt-4">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Review Payroll Results */}
        {currentStep === 4 && calculatedRun && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Step 4: Review Calculated Payroll ({calculatedRun.periodLabel})
                </h3>
                <p className="text-xs text-slate-500">
                  Inspect itemized employee earnings and deductions before saving draft.
                </p>
              </div>
              <div className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full self-start sm:self-auto">
                Frontend Calculation Preview
              </div>
            </div>

            {/* Financial Totals Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[10px] font-semibold text-slate-400 uppercase block">Total Gross Salary</span>
                <span className="text-base font-bold font-mono text-slate-900 mt-0.5 block">
                  {formatCurrency(calculatedRun.totalGross, currencySetting).formatted}
                </span>
                <span className="text-[10px] text-slate-500 mt-1 block">Pre-tax compensation</span>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[10px] font-semibold text-slate-400 uppercase block">Total Deductions</span>
                <span className="text-base font-bold font-mono text-rose-600 mt-0.5 block">
                  - {formatCurrency(calculatedRun.totalDeductions, currencySetting).formatted}
                </span>
                <span className="text-[10px] text-slate-500 mt-1 block">Statutory & voluntary</span>
              </div>

              <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-xl">
                <span className="text-[10px] font-semibold text-indigo-700 uppercase block">Total Net Salary</span>
                <span className="text-base font-bold font-mono text-indigo-700 mt-0.5 block">
                  {formatCurrency(calculatedRun.totalNet, currencySetting).formatted}
                </span>
                <span className="text-[10px] text-indigo-600 mt-1 block">Net take-home liability</span>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[10px] font-semibold text-slate-400 uppercase block">Staff Included</span>
                <span className="text-base font-bold font-mono text-slate-900 mt-0.5 block">
                  {calculatedRun.employeesCount}
                </span>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  {calculatedRun.excludedEmployees.length} excluded
                </span>
              </div>
            </div>

            {/* Detailed Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Employee</th>
                    <th className="p-3 text-right">Basic</th>
                    <th className="p-3 text-right">Allowances</th>
                    <th className="p-3 text-right">Gross</th>
                    <th className="p-3 text-right">Deductions</th>
                    <th className="p-3 text-right">Net Take-Home</th>
                    <th className="p-3 text-center">Itemized Breakdown</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {calculatedRun.items.map((item) => (
                    <tr key={item.employeeId} className="hover:bg-slate-50/60">
                      <td className="p-3">
                        <span className="font-bold text-slate-900 block">{item.employeeName}</span>
                        <span className="text-[11px] font-mono text-slate-400">
                          {item.employeeId} &middot; {item.department}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono">
                        {formatCurrency(item.basicSalary, currencySetting).formatted}
                      </td>
                      <td className="p-3 text-right font-mono text-slate-600">
                        {formatCurrency(item.totalAllowances, currencySetting).formatted}
                      </td>
                      <td className="p-3 text-right font-mono font-semibold text-slate-900">
                        {formatCurrency(item.grossSalary, currencySetting).formatted}
                      </td>
                      <td className="p-3 text-right font-mono text-rose-600">
                        - {formatCurrency(item.totalDeductions, currencySetting).formatted}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-indigo-700">
                        {formatCurrency(item.netSalary, currencySetting).formatted}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedEmployeePreview(item)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors inline-flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Re-Calculate</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(5)}
                className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors flex items-center gap-2"
              >
                <span>Proceed to Save Draft</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: Save as Draft */}
        {currentStep === 5 && calculatedRun && (
          <div className="max-w-xl mx-auto space-y-6">
            <div className="text-center space-y-1">
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                Step 5: Save Payroll Draft
              </h3>
              <p className="text-xs text-slate-500">
                Prepare calculation snapshot into shared state for administrative review and finalization.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
              <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Payroll Period:</span>
                  <span className="font-bold text-slate-900">{calculatedRun.periodLabel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Workforce Included:</span>
                  <span className="font-bold text-slate-900 font-mono">{calculatedRun.employeesCount} Employees</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Net Payout:</span>
                  <span className="font-bold text-indigo-700 font-mono text-sm">
                    {formatCurrency(calculatedRun.totalNet, currencySetting).formatted}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Prepared By:</span>
                  <span className="font-semibold text-slate-700 uppercase">{currentRole}</span>
                </div>
              </div>

              <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
                <span className="font-bold block">Draft State Notice:</span>
                <p className="text-amber-800 leading-relaxed text-[11px]">
                  Saving as Draft records this run into shared session storage. Drafts do not generate downloadable employee payslips until an Administrator reviews and finalizes the period.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={isSaving}
                  className="w-full py-3 text-xs sm:text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Saving Draft...' : 'Confirm & Save Payroll Draft'}</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4">
              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Review</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Employee Breakdown Inspection Modal */}
      {selectedEmployeePreview && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">{selectedEmployeePreview.employeeName}</h3>
                <p className="text-xs text-slate-500 font-mono">
                  {selectedEmployeePreview.employeeId} &middot; {selectedEmployeePreview.department}
                </p>
              </div>
              <button
                onClick={() => setSelectedEmployeePreview(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                &times;
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-3 gap-2 text-center">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">Gross</span>
                  <span className="font-bold font-mono text-slate-900">
                    {formatCurrency(selectedEmployeePreview.grossSalary, currencySetting).formatted}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">Deductions</span>
                  <span className="font-bold font-mono text-rose-600">
                    - {formatCurrency(selectedEmployeePreview.totalDeductions, currencySetting).formatted}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-indigo-600 uppercase block">Net Pay</span>
                  <span className="font-bold font-mono text-indigo-700">
                    {formatCurrency(selectedEmployeePreview.netSalary, currencySetting).formatted}
                  </span>
                </div>
              </div>

              <div>
                <h5 className="font-bold text-slate-900 mb-2">Itemized Earnings</h5>
                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100">
                  <div className="flex justify-between p-2">
                    <span>Basic Salary</span>
                    <span className="font-mono font-semibold">
                      {formatCurrency(selectedEmployeePreview.basicSalary, currencySetting).formatted}
                    </span>
                  </div>
                  <div className="flex justify-between p-2">
                    <span>House Allowance</span>
                    <span className="font-mono">
                      {formatCurrency(selectedEmployeePreview.allowances.house || 0, currencySetting).formatted}
                    </span>
                  </div>
                  <div className="flex justify-between p-2">
                    <span>Transport Allowance</span>
                    <span className="font-mono">
                      {formatCurrency(selectedEmployeePreview.allowances.transport || 0, currencySetting).formatted}
                    </span>
                  </div>
                  <div className="flex justify-between p-2">
                    <span>Medical Allowance</span>
                    <span className="font-mono">
                      {formatCurrency(selectedEmployeePreview.allowances.medical || 0, currencySetting).formatted}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h5 className="font-bold text-slate-900 mb-2">Itemized Deductions</h5>
                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100">
                  <div className="flex justify-between p-2">
                    <span>Provident Fund</span>
                    <span className="font-mono text-rose-600">
                      {formatCurrency(selectedEmployeePreview.deductions.providentFund || 0, currencySetting).formatted}
                    </span>
                  </div>
                  <div className="flex justify-between p-2">
                    <span>Income Tax</span>
                    <span className="font-mono text-rose-600">
                      {formatCurrency(selectedEmployeePreview.deductions.incomeTax || 0, currencySetting).formatted}
                    </span>
                  </div>
                  <div className="flex justify-between p-2">
                    <span>Other Deductions</span>
                    <span className="font-mono text-rose-600">
                      {formatCurrency(selectedEmployeePreview.deductions.other || 0, currencySetting).formatted}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 text-right">
              <button
                type="button"
                onClick={() => setSelectedEmployeePreview(null)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
