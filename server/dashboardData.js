const DAY_MS = 24 * 60 * 60 * 1000;

export function buildDashboardData({ user, employees = [], attendance = [], requestCounts = {}, today, days }) {
  const trend = Array.from({ length: days }, (_, index) => {
    const date = new Date(Date.parse(`${today}T00:00:00.000Z`) - (days - index - 1) * DAY_MS);
    const dayKey = date.toISOString().slice(0, 10);
    return {
      day: dayKey,
      attendanceCount: attendance.filter((record) => record.dayKey === dayKey).length,
    };
  });

  if (user.role === 'EMPLOYEE') {
    const todayAttendance = attendance.find((record) => record.dayKey === today);
    const lastAttendance = attendance.reduce((latest, record) => {
      if (!latest || record.checkInAt > latest.checkInAt) return record;
      return latest;
    }, null);

    return {
      role: user.role,
      scope: 'self',
      days,
      summary: {
        attendanceDays: new Set(attendance.map((record) => record.dayKey)).size,
        checkedInToday: Boolean(todayAttendance),
        lastCheckInAt: lastAttendance?.checkInAt?.toISOString() || null,
      },
      attendanceTrend: trend,
    };
  }

  const departments = new Map();
  for (const employee of employees) {
    const department = employee.department?.trim() || 'Unassigned';
    departments.set(department, (departments.get(department) || 0) + 1);
  }

  return {
    role: user.role,
    scope: 'organization',
    days,
    summary: {
      activeEmployees: employees.length,
      pendingRequests: requestCounts.pending || 0,
      approvedRequests: requestCounts.approved || 0,
      rejectedRequests: requestCounts.rejected || 0,
      checkInsToday: attendance.filter((record) => record.dayKey === today).length,
      departments: departments.size,
    },
    attendanceTrend: trend,
    departmentHeadcount: Array.from(departments, ([department, count]) => ({ department, count }))
      .sort((left, right) => right.count - left.count || left.department.localeCompare(right.department)),
  };
}
