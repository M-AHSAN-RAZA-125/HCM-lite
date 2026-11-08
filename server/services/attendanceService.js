/**
 * HCM Lite Attendance Business Rules (Section 3 & 4 of Challenge Brief)
 * Office start: 09:00
 * Grace period: 15 mins (Late after 09:15)
 * Half day: Under 5 hours worked
 * Duplicate check-in on same day: 409 Conflict
 */

export function parseTimeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

export function formatMinutesToTime(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function evaluateAttendanceStatus(checkInTime, checkOutTime, rules = {}) {
  const startMinutes = parseTimeToMinutes(rules.startTime || '09:00');
  const gracePeriod = Number(rules.gracePeriod || 15);
  const lateCutoff = startMinutes + gracePeriod; // 09:15 = 555 mins

  const checkInMinutes = parseTimeToMinutes(checkInTime);
  const isLate = checkInMinutes > lateCutoff;

  if (!checkOutTime) {
    return isLate ? 'Late' : 'Present';
  }

  const checkOutMinutes = parseTimeToMinutes(checkOutTime);
  const durationHours = Math.max(0, (checkOutMinutes - checkInMinutes) / 60);

  const halfDayThreshold = Number(rules.halfDayHours || 5);
  if (durationHours < halfDayThreshold) {
    return 'Half Day';
  }

  return isLate ? 'Late' : 'Present';
}

// Haversine distance in meters (for geolocation check)
export function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}
