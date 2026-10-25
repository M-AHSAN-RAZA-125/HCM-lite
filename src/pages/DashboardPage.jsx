import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  Building2,
  Calendar,
  Clock,
  Users,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Link } from 'react-router-dom';
import StatCard from '../components/common/StatCard.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { apiUrl } from '../services/apiUrl.js';

function formatDay(day) {
  return new Date(`${day}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [days, setDays] = useState(7);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    async function loadDashboard() {
      setLoading(true);
      setError('');
      try {
        const response = await fetch(apiUrl(`/api/v1/dashboard?days=${days}`), {
          credentials: 'include',
          signal: controller.signal,
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.message || 'Dashboard data could not be loaded.');
        if (!payload.dashboard || payload.dashboard.role !== user?.role) {
          throw new Error('The dashboard returned data for an unexpected account role.');
        }
        setDashboard(payload.dashboard);
      } catch (loadError) {
        if (loadError.name !== 'AbortError') {
          setDashboard(null);
          setError(loadError.message || 'Dashboard data could not be loaded.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    loadDashboard();
    return () => controller.abort();
  }, [days, user?.role]);

  const isEmployee = user?.role === 'EMPLOYEE';
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? 'Good morning' : greetingHour < 18 ? 'Good afternoon' : 'Good evening';
  const summary = dashboard?.summary;
  const chartHasData = dashboard?.attendanceTrend?.some((item) => item.attendanceCount > 0);

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-500">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <span>{today}</span>
              <span aria-hidden="true">&middot;</span>
              <span className="font-semibold text-indigo-600">{user?.role === 'ADMIN' ? 'Administrator' : user?.role === 'HR' ? 'HR' : 'Employee'} Dashboard</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              {greeting}, {user?.fullName?.trim() || 'Name not set'}
            </h1>
            <p className="mt-1 max-w-xl text-xs text-slate-500 sm:text-sm">
              {isEmployee
                ? 'Your dashboard shows attendance records associated with your account.'
                : 'Workforce totals and attendance are calculated from your organization’s active MongoDB records.'}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1 rounded-lg bg-slate-100 p-1">
            {[7, 30].map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setDays(range)}
                aria-pressed={days === range}
                className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                  days === range
                    ? 'bg-white font-semibold text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
                }`}
              >
                {range} days
              </button>
            ))}
          </div>
        </div>
      </section>

      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Dashboard unavailable</p>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      )}

      {loading && !dashboard ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500" role="status">
          Loading your dashboard…
        </div>
      ) : dashboard && (
        <>
          {isEmployee ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatCard
                title={`Attendance Days · ${days}d`}
                value={summary.attendanceDays}
                status="Days with a recorded check-in"
                statusType="info"
                icon={Calendar}
              />
              <StatCard
                title="Today's Attendance"
                value={summary.checkedInToday ? 'Recorded' : '—'}
                status={summary.checkedInToday ? 'Check-in record found today' : 'No check-in record today'}
                statusType={summary.checkedInToday ? 'info' : 'neutral'}
                icon={Clock}
              />
              <StatCard
                title="Last Check-In"
                value={summary.lastCheckInAt
                  ? new Date(summary.lastCheckInAt).toLocaleDateString()
                  : '—'}
                status={summary.lastCheckInAt
                  ? new Date(summary.lastCheckInAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
                  : 'No recorded check-ins'}
                statusType={summary.lastCheckInAt ? 'info' : 'neutral'}
                icon={Clock}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Active Employees"
                value={summary.activeEmployees}
                status="Active and approved employee accounts"
                statusType="info"
                icon={Users}
              />
              <StatCard
                title="Pending Requests"
                value={summary.pendingRequests}
                status={summary.pendingRequests ? 'Awaiting HR/Admin review' : 'No pending employee requests'}
                statusType={summary.pendingRequests ? 'warning' : 'neutral'}
                icon={Users}
                action={summary.pendingRequests > 0 ? <Link className="font-semibold text-indigo-600 hover:text-indigo-700" to="/employee-approvals">Review</Link> : null}
              />
              <StatCard
                title="Check-Ins Today"
                value={summary.checkInsToday}
                status="Recorded today (UTC)"
                statusType={summary.checkInsToday ? 'info' : 'neutral'}
                icon={Clock}
              />
              <StatCard
                title="Departments"
                value={summary.departments}
                status="Distinct active-employee department values"
                statusType="info"
                icon={Building2}
              />
            </div>
          )}

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
            <div className="flex flex-col justify-between gap-2 border-b border-slate-100 pb-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 sm:text-base">
                  <BarChart3 className="h-4 w-4 text-indigo-600" />
                  {isEmployee ? 'My Attendance Check-Ins' : 'Attendance Check-Ins'}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Actual check-in records for the last {days} days. This chart does not infer absences or lateness.
                </p>
              </div>
              <span className="text-xs text-slate-400">Dates use UTC</span>
            </div>
            {chartHasData ? (
              <div className="mt-5 h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dashboard.attendanceTrend} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="attendanceGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#F1F5F9" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="day" tickFormatter={formatDay} stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} minTickGap={24} />
                    <YAxis allowDecimals={false} stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip
                      labelFormatter={(day) => formatDay(day)}
                      formatter={(value) => [value, 'Check-ins']}
                      contentStyle={{ backgroundColor: '#fff', borderColor: '#E2E8F0', borderRadius: '0.75rem', fontSize: '12px' }}
                    />
                    <Area type="monotone" dataKey="attendanceCount" name="Check-ins" stroke="#4F46E5" strokeWidth={2} fill="url(#attendanceGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="py-12 text-center">
                <BarChart3 className="mx-auto h-8 w-8 text-slate-300" />
                <h3 className="mt-3 text-sm font-semibold text-slate-800">No attendance records in this period</h3>
                <p className="mt-1 text-xs text-slate-500">Recorded check-ins will appear here when available.</p>
              </div>
            )}
          </section>

          {!isEmployee && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 sm:text-base">
                    <Building2 className="h-4 w-4 text-indigo-600" />
                    Active Headcount by Department
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">Based on department values on active employee accounts.</p>
                </div>
                {dashboard.departmentHeadcount.length ? (
                  <ul className="mt-3 divide-y divide-slate-100">
                    {dashboard.departmentHeadcount.map(({ department, count }) => (
                      <li key={department} className="flex items-center justify-between gap-3 py-3 text-sm">
                        <span className="truncate text-slate-700">{department}</span>
                        <span className="font-semibold tabular-nums text-slate-900">{count}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="py-10 text-center text-sm text-slate-500">No active employee records are available.</p>
                )}
              </section>

              <section className="rounded-xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
                <h2 className="text-sm font-semibold text-slate-900">Metrics not yet tracked</h2>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  Leave balances, payroll, scheduled workdays, lateness, and absence rates are not backed by MongoDB records in this version, so they are intentionally not estimated here.
                </p>
                {user?.role === 'ADMIN' && (
                  <Link to="/audit-log" className="mt-4 inline-flex text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                    View audit log
                  </Link>
                )}
              </section>
            </div>
          )}
        </>
      )}
    </div>
  );
}
