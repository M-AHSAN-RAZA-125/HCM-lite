/**
 * Attendance Calculations and Formatting Utilities
 *
 * Provides reusable logic for working hours calculation, grace period evaluation,
 * status derivation based on organization office rules, and date formatting.
 *
 * NOTE: These frontend calculation helpers provide realistic interactive demo logic.
 * Production attendance calculation, overtime accrual, and GPS geofence validation
 * must be verified and authoritatively recorded by server-side APIs.
 */

/**
 * Converts a time string ("HH:MM" or "HH:MM:SS") to minutes from midnight
 * @param {string} timeStr 
 * @returns {number|null}
 */
export function timeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return null;
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes)) return null;
  return hours * 60 + minutes;
}

/**
 * Converts minutes from midnight to "HH:MM" formatted string
 * @param {number} totalMinutes 
 * @returns {string}
 */
export function minutesToTime(totalMinutes) {
  if (totalMinutes === null || totalMinutes === undefined || isNaN(totalMinutes)) return '--:--';
  const hrs = Math.floor(totalMinutes / 60) % 24;
  const mins = Math.floor(totalMinutes % 60);
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Calculates working duration between two timestamps
 * @param {string} checkInStr 
 * @param {string} checkOutStr 
 * @returns {{ minutes: number, formatted: string } | null}
 */
export function calculateWorkingDuration(checkInStr, checkOutStr) {
  const inMins = timeToMinutes(checkInStr);
  const outMins = timeToMinutes(checkOutStr);

  if (inMins === null || outMins === null) return null;

  let diff = outMins - inMins;
  // If shift spans midnight
  if (diff < 0) {
    diff += 24 * 60;
  }

  const hours = Math.floor(diff / 60);
  const mins = diff % 60;

  let formatted = '';
  if (hours > 0) {
    formatted += `${hours} hr${hours > 1 ? 's' : ''}`;
  }
  if (mins > 0 || hours === 0) {
    if (formatted) formatted += ' ';
    formatted += `${mins} min${mins !== 1 ? 's' : ''}`;
  }

  return {
    minutes: diff,
    hoursDecimal: Number((diff / 60).toFixed(2)),
    formatted,
  };
}

/**
 * Computes attendance status based on check-in/out and organization office rules
 * @param {Object} params
 * @param {string} params.checkInTime
 * @param {string|null} params.checkOutTime
 * @param {Object} [params.officeRules]
 * @returns {'Present'|'Late'|'Half Day'|'Incomplete'|'Absent'|'On Leave'}
 */
export function determineAttendanceStatus({ checkInTime, checkOutTime, officeRules }) {
  if (!checkInTime) {
    return 'Absent';
  }

  const startTime = officeRules?.startTime || '09:00';
  const graceMinutes = parseInt(officeRules?.gracePeriod ?? 15, 10);
  const inMinutes = timeToMinutes(checkInTime);
  const startMinutes = timeToMinutes(startTime);

  const isLate = startMinutes !== null && inMinutes !== null && inMinutes > (startMinutes + graceMinutes);

  // If check-out is missing
  if (!checkOutTime) {
    // If check-in happened, mark as Present or Late
    return isLate ? 'Late' : 'Present';
  }

  // If both check-in and check-out exist
  const duration = calculateWorkingDuration(checkInTime, checkOutTime);
  if (duration) {
    // Less than 4 hours is considered Half Day threshold (unless configured otherwise)
    if (duration.minutes < 240) {
      return 'Half Day';
    }
  }

  return isLate ? 'Late' : 'Present';
}

/**
 * Checks if a given date string (YYYY-MM-DD) falls on a configured working day
 * @param {string} dateStr 
 * @param {string[]} workingDaysList 
 * @returns {boolean}
 */
export function isWorkingDay(dateStr, workingDaysList = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']) {
  if (!dateStr) return false;
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    return workingDaysList.includes(dayName);
  } catch {
    return true;
  }
}

/**
 * Returns current local date in YYYY-MM-DD format
 * @returns {string}
 */
export function getTodayDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns current local time in HH:MM:SS format
 * @returns {string}
 */
export function getCurrentTimeString() {
  const d = new Date();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

/**
 * Format a 24-hr time string ("09:15:00") into 12-hr format ("9:15 AM")
 * @param {string} timeStr 
 * @returns {string}
 */
export function formatTime12h(timeStr) {
  if (!timeStr) return '--:--';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours}:${minutes} ${ampm}`;
}

/**
 * Formats a date string (YYYY-MM-DD) into readable text ("Fri, Oct 24, 2026")
 * @param {string} dateStr 
 * @param {boolean} [includeWeekday=true]
 * @returns {string}
 */
export function formatDateDisplay(dateStr, includeWeekday = true) {
  if (!dateStr) return '—';
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const options = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...(includeWeekday ? { weekday: 'short' } : {}),
    };
    return date.toLocaleDateString('en-US', options);
  } catch {
    return dateStr;
  }
}
