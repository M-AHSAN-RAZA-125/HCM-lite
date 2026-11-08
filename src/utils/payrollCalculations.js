/**
 * Pure calculation and validation utilities for Payroll Management
 */

export const MONTH_NAMES = [
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

export const CURRENCY_OPTIONS = [
  { code: 'USD', symbol: '$', name: 'US Dollar (USD)' },
  { code: 'EUR', symbol: '€', name: 'Euro (EUR)' },
  { code: 'GBP', symbol: '£', name: 'British Pound (GBP)' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar (CAD)' },
  { code: 'AUD', symbol: 'AU$', name: 'Australian Dollar (AUD)' },
  { code: 'PKR', symbol: 'Rs', name: 'Pakistani Rupee (PKR)' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee (INR)' },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham (AED)' },
  { code: 'SAR', symbol: 'SAR', name: 'Saudi Riyal (SAR)' },
  { code: 'SGD', symbol: 'SG$', name: 'Singapore Dollar (SGD)' },
];

/**
 * Format currency amount with configured currency symbol/code.
 * If currency is not configured, formats with plain comma separation
 * and returns metadata indicating currency is unconfigured.
 */
export function formatCurrency(amount, currencySetting = null) {
  const num = Number(amount) || 0;
  const formattedNum = num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (!currencySetting || !currencySetting.code) {
    return {
      formatted: formattedNum,
      display: formattedNum,
      hasCurrency: false,
      symbol: '',
      code: '',
    };
  }

  const symbol = currencySetting.symbol || currencySetting.code;
  return {
    formatted: `${symbol} ${formattedNum}`,
    display: `${symbol} ${formattedNum}`,
    hasCurrency: true,
    symbol,
    code: currencySetting.code,
  };
}

/**
 * Calculate totals for a salary structure
 */
export function calculateSalaryStructureTotals(data = {}) {
  const basicSalary = Math.max(0, Number(data.basicSalary) || 0);
  const houseAllowance = Math.max(0, Number(data.houseAllowance) || 0);
  const transportAllowance = Math.max(0, Number(data.transportAllowance) || 0);
  const medicalAllowance = Math.max(0, Number(data.medicalAllowance) || 0);
  const otherAllowances = Math.max(0, Number(data.otherAllowances) || 0);
  const bonus = Math.max(0, Number(data.bonus) || 0);
  const additionalEarnings = Math.max(0, Number(data.additionalEarnings) || 0);

  const totalAllowances = houseAllowance + transportAllowance + medicalAllowance + otherAllowances;
  const totalEarnings = totalAllowances + bonus + additionalEarnings;
  const grossSalary = basicSalary + totalEarnings;

  const providentFund = Math.max(0, Number(data.providentFund) || 0);
  const incomeTax = Math.max(0, Number(data.incomeTax) || 0);
  const otherDeductions = Math.max(0, Number(data.otherDeductions) || 0);

  const totalDeductions = providentFund + incomeTax + otherDeductions;
  const netSalary = Math.max(0, grossSalary - totalDeductions);

  return {
    basicSalary,
    houseAllowance,
    transportAllowance,
    medicalAllowance,
    otherAllowances,
    totalAllowances,
    bonus,
    additionalEarnings,
    totalEarnings,
    grossSalary,
    providentFund,
    incomeTax,
    otherDeductions,
    totalDeductions,
    netSalary,
    isDeductionExceedingGross: totalDeductions > grossSalary,
  };
}

/**
 * Validate salary structure form inputs
 */
export function validateSalaryStructure(formData, existingStructures = [], currentId = null) {
  const errors = {};

  if (!formData.employeeId) {
    errors.employeeId = 'Employee selection is required.';
  }

  if (formData.basicSalary === '' || formData.basicSalary === null || isNaN(Number(formData.basicSalary))) {
    errors.basicSalary = 'Basic salary is required.';
  } else if (Number(formData.basicSalary) < 0) {
    errors.basicSalary = 'Basic salary cannot be negative.';
  }

  const checkNonNegative = (val, fieldName, label) => {
    if (val !== '' && val !== null && val !== undefined) {
      if (isNaN(Number(val)) || Number(val) < 0) {
        errors[fieldName] = `${label} cannot be negative.`;
      }
    }
  };

  checkNonNegative(formData.houseAllowance, 'houseAllowance', 'House Allowance');
  checkNonNegative(formData.transportAllowance, 'transportAllowance', 'Transport Allowance');
  checkNonNegative(formData.medicalAllowance, 'medicalAllowance', 'Medical Allowance');
  checkNonNegative(formData.otherAllowances, 'otherAllowances', 'Other Allowances');
  checkNonNegative(formData.bonus, 'bonus', 'Bonus');
  checkNonNegative(formData.additionalEarnings, 'additionalEarnings', 'Additional Earnings');

  checkNonNegative(formData.providentFund, 'providentFund', 'Provident Fund');
  checkNonNegative(formData.incomeTax, 'incomeTax', 'Income Tax');
  checkNonNegative(formData.otherDeductions, 'otherDeductions', 'Other Deductions');

  if (!formData.effectiveFrom) {
    errors.effectiveFrom = 'Effective from date is required.';
  }

  // Check deduction vs gross
  const totals = calculateSalaryStructureTotals(formData);
  if (totals.totalDeductions > totals.grossSalary) {
    errors.totalDeductions = 'Total deductions cannot exceed Gross Salary.';
  }

  // Conflict check: only one active structure for an employee at a time
  if (formData.status === 'Active' && formData.employeeId) {
    const conflict = existingStructures.find(
      (s) =>
        s.id !== currentId &&
        s.employeeId.toUpperCase() === formData.employeeId.toUpperCase() &&
        s.status === 'Active'
    );
    if (conflict) {
      errors.employeeId = `Employee already has an active salary structure (${conflict.id}). Deactivate or edit it first.`;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    totals,
  };
}

/**
 * Calculate a monthly payroll run from actual active salary structures
 */
export function calculateMonthlyPayroll({
  periodMonth,
  periodYear,
  salaryStructures = [],
  employees = [],
  attendanceRecords = [],
  leaveRequests = [],
}) {
  const includedItems = [];
  const excludedEmployees = [];

  // Map active employees
  const activeEmployees = employees.filter((e) => e.status === 'Active');

  // Filter active salary structures
  const activeStructures = salaryStructures.filter((s) => s.status === 'Active');
  const structureByEmployeeId = new Map();
  activeStructures.forEach((s) => {
    structureByEmployeeId.set(s.employeeId.toUpperCase(), s);
  });

  activeEmployees.forEach((emp) => {
    const empIdUpper = emp.employeeId.toUpperCase();
    const structure = structureByEmployeeId.get(empIdUpper);

    if (!structure) {
      excludedEmployees.push({
        employeeId: emp.employeeId,
        employeeName: emp.fullName,
        department: emp.department || 'General',
        designation: emp.designation || 'Staff',
        reason: 'No active salary structure configured',
      });
      return;
    }

    // Verify effective date
    const periodStartDate = `${periodYear}-${String(periodMonth).padStart(2, '0')}-01`;
    if (structure.effectiveFrom > periodStartDate) {
      excludedEmployees.push({
        employeeId: emp.employeeId,
        employeeName: emp.fullName,
        department: emp.department || 'General',
        designation: emp.designation || 'Staff',
        reason: `Salary structure effective date (${structure.effectiveFrom}) is after period start (${periodStartDate})`,
      });
      return;
    }

    // Calculate line items for this employee
    const totals = calculateSalaryStructureTotals(structure);

    includedItems.push({
      employeeId: emp.employeeId,
      employeeName: emp.fullName,
      department: emp.department || structure.department || 'General',
      designation: emp.designation || structure.designation || 'Staff',
      structureId: structure.id,
      basicSalary: totals.basicSalary,
      allowances: {
        house: totals.houseAllowance,
        transport: totals.transportAllowance,
        medical: totals.medicalAllowance,
        other: totals.otherAllowances,
      },
      totalAllowances: totals.totalAllowances,
      bonus: totals.bonus,
      additionalEarnings: totals.additionalEarnings,
      totalEarnings: totals.totalEarnings,
      grossSalary: totals.grossSalary,
      deductions: {
        providentFund: totals.providentFund,
        incomeTax: totals.incomeTax,
        other: totals.otherDeductions,
      },
      totalDeductions: totals.totalDeductions,
      netSalary: totals.netSalary,
      payslipId: `PS-${periodYear}${String(periodMonth).padStart(2, '0')}-${emp.employeeId.replace(/[^a-zA-Z0-9]/g, '')}`,
      reviewStatus: totals.isDeductionExceedingGross ? 'Warning: High Deductions' : 'Ready',
    });
  });

  // Calculate run totals
  let totalGross = 0;
  let totalDeductions = 0;
  let totalNet = 0;

  includedItems.forEach((item) => {
    totalGross += item.grossSalary;
    totalDeductions += item.totalDeductions;
    totalNet += item.netSalary;
  });

  return {
    periodMonth,
    periodYear,
    periodLabel: `${MONTH_NAMES[periodMonth - 1]} ${periodYear}`,
    items: includedItems,
    excludedEmployees,
    employeesCount: includedItems.length,
    totalGross,
    totalDeductions,
    totalNet,
    hasCriticalErrors: includedItems.some((item) => item.totalDeductions > item.grossSalary),
  };
}

/**
 * Generate a unique payroll run ID
 */
export function generatePayrollRunId(year, month) {
  const monthPadded = String(month).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `PAY-${year}${monthPadded}-${rand}`;
}

/**
 * Export a payroll run to CSV string
 */
export function exportPayrollRunToCSV(payrollRun, currencyCode = 'USD') {
  if (!payrollRun || !payrollRun.items || payrollRun.items.length === 0) {
    return null;
  }

  const headers = [
    'Employee ID',
    'Employee Name',
    'Department',
    'Designation',
    'Basic Salary',
    'House Allowance',
    'Transport Allowance',
    'Medical Allowance',
    'Other Allowances',
    'Bonus',
    'Gross Salary',
    'Provident Fund',
    'Income Tax',
    'Other Deductions',
    'Total Deductions',
    'Net Salary',
    'Currency',
    'Period',
    'Payroll Run ID',
    'Status',
  ];

  const rows = payrollRun.items.map((item) => [
    `"${item.employeeId}"`,
    `"${item.employeeName.replace(/"/g, '""')}"`,
    `"${(item.department || '').replace(/"/g, '""')}"`,
    `"${(item.designation || '').replace(/"/g, '""')}"`,
    item.basicSalary.toFixed(2),
    (item.allowances.house || 0).toFixed(2),
    (item.allowances.transport || 0).toFixed(2),
    (item.allowances.medical || 0).toFixed(2),
    (item.allowances.other || 0).toFixed(2),
    (item.bonus || 0).toFixed(2),
    item.grossSalary.toFixed(2),
    (item.deductions.providentFund || 0).toFixed(2),
    (item.deductions.incomeTax || 0).toFixed(2),
    (item.deductions.other || 0).toFixed(2),
    item.totalDeductions.toFixed(2),
    item.netSalary.toFixed(2),
    `"${currencyCode || 'UNCONFIGURED'}"`,
    `"${payrollRun.periodLabel}"`,
    `"${payrollRun.id}"`,
    `"${payrollRun.status}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  return csvContent;
}

/**
 * Download a CSV file in browser
 */
export function downloadCSV(content, filename) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
