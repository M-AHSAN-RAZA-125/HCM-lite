/**
 * HCM Lite Payroll Rules (Section 3 & 6 of Challenge Brief)
 * Gross = 1.5 * basic (HRA 40%, Medical 10%)
 * Per day = gross / working days in month
 * Deductions = (absentDays + unpaidLeaveDays + (0.5 * halfDays)) * perDayRate
 * Annual Tax on (gross * 12):
 *   0 - 600k: 0%
 *   600k - 1.2M: 5% on excess over 600k
 *   1.2M - 2.4M: 30k + 15% on excess over 1.2M
 *   2.4M - 3.6M: 210k + 25% on excess over 2.4M
 *   > 3.6M: 510k + 35% on excess over 3.6M
 * Monthly Tax = Annual Tax / 12
 * Net Pay = Gross - Deductions - Monthly Tax
 */

export function calculateSalaryStructure(basic) {
  const basicNum = Number(basic) || 0;
  const hra = Math.round(basicNum * 0.4);
  const medical = Math.round(basicNum * 0.1);
  const gross = Math.round(basicNum * 1.5);
  return { basic: basicNum, hra, medical, gross };
}

export function calculateAnnualTax(annualGross) {
  const g = Number(annualGross) || 0;
  if (g <= 600000) return 0;
  if (g <= 1200000) return Math.round((g - 600000) * 0.05);
  if (g <= 2400000) return Math.round(30000 + (g - 1200000) * 0.15);
  if (g <= 3600000) return Math.round(210000 + (g - 2400000) * 0.25);
  return Math.round(510000 + (g - 3600000) * 0.35);
}

export function calculateMonthlyTax(monthlyGross) {
  const annualGross = (Number(monthlyGross) || 0) * 12;
  const annualTax = calculateAnnualTax(annualGross);
  return Math.round(annualTax / 12);
}

export function computeEmployeePayrollRecord(employee, monthStr, attendanceRecords = [], approvedLeaves = [], workingDaysInMonth = 22) {
  const basic = employee?.salary?.basic || 0;
  const { hra, medical, gross } = calculateSalaryStructure(basic);

  const perDayRate = workingDaysInMonth > 0 ? gross / workingDaysInMonth : 0;

  // Count attendance status for this employee in this month
  const empAttendance = attendanceRecords.filter(
    (a) => a.employeeId === employee.employeeId && a.date.startsWith(monthStr)
  );

  let presentCount = 0;
  let halfDayCount = 0;
  let lateCount = 0;

  for (const record of empAttendance) {
    if (record.status === 'Present') presentCount += 1;
    else if (record.status === 'Late') {
      presentCount += 1;
      lateCount += 1;
    } else if (record.status === 'Half Day') {
      halfDayCount += 1;
    }
  }

  // Count unpaid approved leaves in this month
  const empUnpaidLeaves = approvedLeaves.filter(
    (l) => l.employeeId === employee.employeeId &&
           l.leaveType?.toLowerCase() === 'unpaid' &&
           (l.startDate.startsWith(monthStr) || l.endDate.startsWith(monthStr))
  );
  const unpaidDays = empUnpaidLeaves.reduce((sum, l) => sum + (l.workingDays || 1), 0);

  // Absent days: expected working days minus present minus half days minus leaves
  const recordedDays = presentCount + halfDayCount;
  // Late penalty rule (+10 bonus points in Section 8): 3 lates = 0.5 day
  const latePenaltyHalfDays = Math.floor(lateCount / 3);

  const effectiveHalfDays = halfDayCount + latePenaltyHalfDays;
  const absentDays = Math.max(0, workingDaysInMonth - recordedDays - unpaidDays);

  const deductionDays = absentDays + unpaidDays + (0.5 * effectiveHalfDays);
  const deductions = Math.min(gross, Math.round(deductionDays * perDayRate));

  const monthlyTax = calculateMonthlyTax(gross);
  const netPay = Math.max(0, Math.round(gross - deductions - monthlyTax));

  return {
    employeeId: employee.employeeId,
    name: employee.fullName,
    department: employee.department || 'General',
    designation: employee.designation || 'Staff',
    basic,
    hra,
    medical,
    gross,
    workingDaysInMonth,
    presentDays: presentCount,
    halfDays: effectiveHalfDays,
    absentDays,
    unpaidDays,
    deductions,
    tax: monthlyTax,
    netPay,
  };
}
