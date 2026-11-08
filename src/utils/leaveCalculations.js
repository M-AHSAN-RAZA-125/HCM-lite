/**
 * Utility functions for HCM Lite Leave Management calculations.
 * Strict enterprise rules: working days exclude weekly off days and active company holidays.
 */

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Parses YYYY-MM-DD into a local Date object without UTC timezone shifting.
 */
export function parseLocalDate(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return new Date(dateStr);
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  return new Date(year, month, day);
}

/**
 * Formats a Date object to YYYY-MM-DD string.
 */
export function formatToDateString(date) {
  if (!date || isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns today's date in YYYY-MM-DD format.
 */
export function getTodayDateString() {
  return formatToDateString(new Date());
}

/**
 * Human-friendly date display (e.g. "Oct 24, 2026")
 */
export function formatLeaveDate(dateStr) {
  if (!dateStr) return '—';
  const d = parseLocalDate(dateStr);
  if (!d || isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Human-friendly date range display (e.g. "Oct 24 - Oct 28, 2026")
 */
export function formatLeaveRange(startDate, endDate) {
  if (!startDate) return '—';
  if (!endDate || startDate === endDate) return formatLeaveDate(startDate);
  const s = parseLocalDate(startDate);
  const e = parseLocalDate(endDate);
  if (!s || !e || isNaN(s.getTime()) || isNaN(e.getTime())) {
    return `${startDate} - ${endDate}`;
  }

  if (s.getFullYear() === e.getFullYear()) {
    if (s.getMonth() === e.getMonth()) {
      return `${s.toLocaleDateString('en-US', { month: 'short' })} ${s.getDate()} – ${e.getDate()}, ${s.getFullYear()}`;
    }
    return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }
  return `${formatLeaveDate(startDate)} – ${formatLeaveDate(endDate)}`;
}

/**
 * Computes working days between startDate and endDate inclusive,
 * subtracting weekly off days and configured active holidays.
 */
export function calculateWorkingDays({
  startDate,
  endDate,
  workingDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  weeklyOffDays = ['Saturday', 'Sunday'],
  holidays = [],
}) {
  if (!startDate || !endDate) {
    return {
      workingDays: 0,
      totalCalendarDays: 0,
      holidayDates: [],
      weekendDates: [],
      holidayNames: [],
    };
  }

  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);

  if (start > end) {
    return {
      workingDays: 0,
      totalCalendarDays: 0,
      holidayDates: [],
      weekendDates: [],
      holidayNames: [],
    };
  }

  // Build active holiday date lookup
  const activeHolidayMap = new Map();
  if (Array.isArray(holidays)) {
    holidays.forEach((h) => {
      if (h.status === 'Active' && h.date) {
        activeHolidayMap.set(h.date, h.name || 'Company Holiday');
      }
    });
  }

  let current = new Date(start.getTime());
  let count = 0;
  let totalCalendarDays = 0;
  const holidayDates = [];
  const holidayNames = [];
  const weekendDates = [];

  while (current <= end) {
    totalCalendarDays += 1;
    const dateStr = formatToDateString(current);
    const dayOfWeek = DAY_NAMES[current.getDay()];

    const isWeeklyOff =
      weeklyOffDays.includes(dayOfWeek) || !workingDays.includes(dayOfWeek);

    if (isWeeklyOff) {
      weekendDates.push(dateStr);
    } else if (activeHolidayMap.has(dateStr)) {
      holidayDates.push(dateStr);
      holidayNames.push(`${dateStr} (${activeHolidayMap.get(dateStr)})`);
    } else {
      count += 1;
    }

    current.setDate(current.getDate() + 1);
  }

  return {
    workingDays: count,
    totalCalendarDays,
    holidayDates,
    weekendDates,
    holidayNames,
  };
}

/**
 * Checks if a requested leave range overlaps with any existing Pending or Approved request for the employee.
 */
export function hasOverlappingLeave(
  employeeId,
  startDate,
  endDate,
  existingRequests = [],
  excludeRequestId = null
) {
  if (!employeeId || !startDate || !endDate) {
    return { hasOverlap: false, conflictingRequest: null };
  }

  const cleanEmpId = employeeId.trim().toUpperCase();

  const conflicting = existingRequests.find((req) => {
    if (excludeRequestId && req.id === excludeRequestId) return false;
    if (req.employeeId.toUpperCase() !== cleanEmpId) return false;
    // Overlap only applies to active requests (Pending or Approved)
    if (req.status !== 'Pending' && req.status !== 'Approved') return false;

    // Check date interval overlap: s1 <= e2 && e1 >= s2
    return startDate <= req.endDate && endDate >= req.startDate;
  });

  return {
    hasOverlap: Boolean(conflicting),
    conflictingRequest: conflicting || null,
  };
}

/**
 * Calculates leave balance summary for an employee across configured leave types.
 */
export function calculateEmployeeLeaveBalances(
  employeeId,
  leaveTypes = [],
  leaveRequests = []
) {
  if (!employeeId) return [];

  const cleanEmpId = employeeId.trim().toUpperCase();
  const empRequests = leaveRequests.filter(
    (r) => r.employeeId.toUpperCase() === cleanEmpId
  );

  return leaveTypes.map((lt) => {
    const rawQuota = lt.annualQuota;
    const isConfigured =
      rawQuota !== null &&
      rawQuota !== undefined &&
      rawQuota !== '' &&
      !isNaN(Number(rawQuota)) &&
      Number(rawQuota) > 0;

    const annualQuota = isConfigured ? Number(rawQuota) : null;

    // Approved days
    const approvedDays = empRequests
      .filter((r) => r.leaveTypeId === lt.id && r.status === 'Approved')
      .reduce((sum, r) => sum + (Number(r.requestedDays) || 0), 0);

    // Pending days
    const pendingDays = empRequests
      .filter((r) => r.leaveTypeId === lt.id && r.status === 'Pending')
      .reduce((sum, r) => sum + (Number(r.requestedDays) || 0), 0);

    // Remaining days
    const remainingDays = isConfigured ? Math.max(0, annualQuota - approvedDays) : null;

    return {
      leaveTypeId: lt.id,
      leaveTypeName: lt.name,
      isPaid: Boolean(lt.isPaid),
      annualQuota,
      isConfigured,
      approvedDays,
      pendingDays,
      remainingDays,
      allowCarryForward: Boolean(lt.allowCarryForward),
      maxCarryForwardDays: lt.maxCarryForwardDays || 0,
      requiresApproval: lt.requiresApproval !== false,
      status: lt.status || 'Active',
    };
  });
}

/**
 * Evaluates whether an employee is currently on approved leave on a given date string.
 * Strictly checks: status === 'Approved' AND startDate <= dateStr AND dateStr <= endDate.
 */
export function isEmployeeOnLeaveOnDate(employeeId, dateStr, leaveRequests = []) {
  if (!employeeId || !dateStr) return false;
  const cleanId = employeeId.trim().toUpperCase();

  return leaveRequests.some(
    (r) =>
      r.employeeId.toUpperCase() === cleanId &&
      r.status === 'Approved' &&
      r.startDate <= dateStr &&
      dateStr <= r.endDate
  );
}

/**
 * Returns all unique employees currently on approved leave on a specific date.
 */
export function getEmployeesOnLeaveOnDate(dateStr, leaveRequests = []) {
  if (!dateStr) return [];

  const activeLeaves = leaveRequests.filter(
    (r) =>
      r.status === 'Approved' &&
      r.startDate <= dateStr &&
      dateStr <= r.endDate
  );

  const seenIds = new Set();
  const list = [];

  activeLeaves.forEach((leave) => {
    if (!seenIds.has(leave.employeeId)) {
      seenIds.add(leave.employeeId);
      list.push(leave);
    }
  });

  return list;
}
