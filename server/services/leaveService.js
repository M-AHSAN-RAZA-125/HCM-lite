/**
 * HCM Lite Leave Rules (Section 3 & 5 of Challenge Brief)
 * - Working days only (skips weekends and public holidays)
 * - Quotas: Annual 14, Sick 8, Casual 10, Unpaid unlimited
 * - Overlap or over-balance returns 422 Unprocessable Entity
 */

export function isWeekend(dateStr, weeklyOffDays = ['Saturday', 'Sunday']) {
  const date = new Date(dateStr);
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
  return weeklyOffDays.includes(dayName);
}

export function isHoliday(dateStr, holidays = []) {
  return holidays.some((h) => h.date === dateStr);
}

export function calculateWorkingDays(startDateStr, endDateStr, weeklyOffDays = ['Saturday', 'Sunday'], holidays = []) {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
    return 0;
  }

  let count = 0;
  const current = new Date(start);

  while (current <= end) {
    const yyyy = current.getFullYear();
    const mm = String(current.getMonth() + 1).padStart(2, '0');
    const dd = String(current.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    if (!isWeekend(dateStr, weeklyOffDays) && !isHoliday(dateStr, holidays)) {
      count += 1;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

export function checkLeaveOverlap(existingLeaves, employeeId, startDate, endDate, excludeLeaveId = null) {
  const newStart = new Date(startDate);
  const newEnd = new Date(endDate);

  return existingLeaves.some((leave) => {
    if (leave.employeeId !== employeeId) return false;
    if (leave.status === 'Rejected') return false;
    if (excludeLeaveId && leave.id === excludeLeaveId) return false;

    const existingStart = new Date(leave.startDate);
    const existingEnd = new Date(leave.endDate);

    // Overlap condition
    return newStart <= existingEnd && newEnd >= existingStart;
  });
}

export function getLeaveBalances(employeeId, allLeaves = [], leaveTypes = []) {
  // Default quotas
  const quotaMap = {
    Annual: 14,
    Sick: 8,
    Casual: 10,
    Unpaid: 9999,
  };

  for (const lt of leaveTypes) {
    quotaMap[lt.name] = Number(lt.quota) || 0;
  }

  // Count approved days
  const usedMap = {
    Annual: 0,
    Sick: 0,
    Casual: 0,
    Unpaid: 0,
  };

  const empApprovedLeaves = allLeaves.filter(
    (l) => l.employeeId === employeeId && l.status === 'Approved'
  );

  for (const l of empApprovedLeaves) {
    const type = l.leaveType || 'Annual';
    usedMap[type] = (usedMap[type] || 0) + (l.workingDays || 1);
  }

  return {
    annual: { quota: quotaMap.Annual || 14, used: usedMap.Annual || 0, balance: Math.max(0, (quotaMap.Annual || 14) - (usedMap.Annual || 0)) },
    sick: { quota: quotaMap.Sick || 8, used: usedMap.Sick || 0, balance: Math.max(0, (quotaMap.Sick || 8) - (usedMap.Sick || 0)) },
    casual: { quota: quotaMap.Casual || 10, used: usedMap.Casual || 0, balance: Math.max(0, (quotaMap.Casual || 10) - (usedMap.Casual || 0)) },
    unpaid: { quota: 'Unlimited', used: usedMap.Unpaid || 0, balance: 'Unlimited' },
  };
}
