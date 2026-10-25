import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDashboardData } from './dashboardData.js';

test('employee dashboard aggregates only the supplied personal attendance', () => {
  const response = buildDashboardData({
    user: { role: 'EMPLOYEE' },
    attendance: [
      { dayKey: '2026-02-09', checkInAt: new Date('2026-02-09T09:00:00Z') },
      { dayKey: '2026-02-10', checkInAt: new Date('2026-02-10T09:00:00Z') },
    ],
    today: '2026-02-10',
    days: 7,
  });

  assert.deepEqual(response.summary, {
    attendanceDays: 2,
    checkedInToday: true,
    lastCheckInAt: '2026-02-10T09:00:00.000Z',
  });
  assert.equal(response.scope, 'self');
  assert.equal(response.attendanceTrend.length, 7);
  assert.equal(response.attendanceTrend.at(-1).attendanceCount, 1);
  assert.equal('departmentHeadcount' in response, false);
});

test('HR and Admin dashboards aggregate only active employee and attendance data', () => {
  const response = buildDashboardData({
    user: { role: 'HR' },
    employees: [
      { department: 'People' },
      { department: 'Engineering' },
      { department: 'People' },
    ],
    attendance: [{ dayKey: '2026-02-10' }],
    requestCounts: { pending: 2, approved: 5, rejected: 1 },
    today: '2026-02-10',
    days: 7,
  });

  assert.deepEqual(response.summary, {
    activeEmployees: 3,
    pendingRequests: 2,
    approvedRequests: 5,
    rejectedRequests: 1,
    checkInsToday: 1,
    departments: 2,
  });
  assert.deepEqual(response.departmentHeadcount, [
    { department: 'People', count: 2 },
    { department: 'Engineering', count: 1 },
  ]);
  assert.equal(response.scope, 'organization');
});
