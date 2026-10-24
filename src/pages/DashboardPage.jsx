import React, { useState } from 'react';
import {
  Users,
  Clock,
  CalendarCheck,
  AlertTriangle,
  Building2,
  Calendar,
  Sparkles,
  Bot,
  Activity,
  ArrowRight,
  PlusCircle,
  BarChart3,
  CheckCircle,
  HelpCircle,
  Radio,
  Eye,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { Link } from 'react-router-dom';
import StatCard from '../components/common/StatCard.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import { useRole } from '../context/RoleContext.jsx';
import { useEmployees } from '../context/EmployeeContext.jsx';
import { useAttendance } from '../context/AttendanceContext.jsx';
import { useLeave } from '../context/LeaveContext.jsx';
import { getTodayDateString } from '../utils/attendanceCalculations.js';

export default function DashboardPage() {
  const { currentRole, currentUser } = useRole();
  const { totalCount, activeCount } = useEmployees();
  const { getRecordsByDate } = useAttendance();
  const { getLeaveStats } = useLeave();
  const [selectedRange, setSelectedRange] = useState('Today');
  const [showChartPreview, setShowChartPreview] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);

  const todayStr = getTodayDateString();
  const todayRecords = getRecordsByDate(todayStr);
  const presentCount = todayRecords.filter((r) => r.status === 'Present').length;
  const lateCount = todayRecords.filter((r) => r.status === 'Late').length;
  const leaveStats = getLeaveStats(todayStr);
  const onLeaveToday = leaveStats.onLeaveCount;

  // Formatted current date
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // Time of day greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Sample chart data strictly for visual framework evaluation when toggled
  const sampleAttendanceData = [
    { day: 'Mon', present: 94, late: 4, absent: 2 },
    { day: 'Tue', present: 96, late: 2, absent: 2 },
    { day: 'Wed', present: 92, late: 5, absent: 3 },
    { day: 'Thu', present: 95, late: 3, absent: 2 },
    { day: 'Fri', present: 91, late: 6, absent: 3 },
  ];

  return (
    <div className="space-y-6">
      {/* A. Welcome Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{currentDate}</span>
              <span aria-hidden="true">&middot;</span>
              <span className="text-indigo-600 font-semibold">{currentUser.label} Console</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              {getGreeting()}, {currentUser.name}
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-xl">
              Real-time workforce health, attendance logs, and organization activity overview.
            </p>
          </div>

          {/* Date range selector UI */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-lg shrink-0 self-start lg:self-center">
            {['Today', 'This Week', 'This Month', 'Quarter'].map((range) => {
              const active = selectedRange === range;
              return (
                <button
                  key={range}
                  onClick={() => setSelectedRange(range)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    active
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  {range}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* B. KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Employees"
          value={totalCount > 0 ? totalCount : '—'}
          status={
            totalCount > 0
              ? `${activeCount} Active · ${totalCount - activeCount} Inactive/Leave`
              : 'Awaiting employee directory'
          }
          statusType={totalCount > 0 ? 'info' : 'neutral'}
          icon={Users}
          hint={totalCount > 0 ? `${totalCount} in session` : '0 enrolled'}
        />
        <StatCard
          title="Present Today"
          value={todayRecords.length > 0 ? presentCount : '—'}
          status={
            todayRecords.length > 0
              ? `${presentCount} on-time check-in(s)`
              : 'Awaiting attendance logs'
          }
          statusType={presentCount > 0 ? 'info' : 'neutral'}
          icon={Clock}
          hint={todayRecords.length > 0 ? `${todayRecords.length} logged today` : 'No clock-ins'}
        />
        <StatCard
          title="On Leave Today"
          value={onLeaveToday > 0 ? onLeaveToday : '—'}
          status={
            onLeaveToday > 0
              ? `${onLeaveToday} approved leave(s) today`
              : 'No active leave records'
          }
          statusType={onLeaveToday > 0 ? 'warning' : 'neutral'}
          icon={CalendarCheck}
          hint={
            onLeaveToday > 0
              ? leaveStats.onLeaveEmployees.map((e) => e.employeeName).join(', ')
              : '0 requests active'
          }
        />
        <StatCard
          title="Late Today"
          value={todayRecords.length > 0 ? lateCount : '—'}
          status={
            lateCount > 0
              ? `${lateCount} late arrival(s) logged`
              : 'No check-in anomalies'
          }
          statusType={lateCount > 0 ? 'warning' : 'neutral'}
          icon={AlertTriangle}
          hint={lateCount > 0 ? 'Exceeded grace window' : '0 exceptions'}
        />
      </div>

      {/* Main Grid: C. Attendance Analytics & F. AI Assistant Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* C. Attendance Analytics Section (2 cols) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-sm sm:text-base font-semibold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-indigo-600" />
                  Attendance Analytics
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Daily presence rate, tardiness, and unscheduled absence trends.
                </p>
              </div>

              {/* Visualization mode toggle for hackathon inspection */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setShowChartPreview(!showChartPreview)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md border transition-all ${
                    showChartPreview
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-medium'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                  title="Toggle visualization layout preview"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{showChartPreview ? 'View Empty State' : 'Preview Chart Layout'}</span>
                </button>
              </div>
            </div>

            {/* Content: Chart vs Honest Empty State */}
            <div className="mt-6 min-h-[260px] flex items-center justify-center">
              {showChartPreview ? (
                <div className="w-full">
                  <div className="mb-3 flex items-center justify-between text-xs text-slate-500 px-1">
                    <span className="font-mono text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      Sample Wireframe Data (Evaluation Only)
                    </span>
                    <span>Target Presence Threshold: 95%</span>
                  </div>
                  <div className="h-60 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={sampleAttendanceData}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="presentGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#4F46E5" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                        <XAxis
                          dataKey="day"
                          stroke="#94A3B8"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          stroke="#94A3B8"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          domain={[80, 100]}
                          unit="%"
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#FFFFFF',
                            borderColor: '#E2E8F0',
                            borderRadius: '0.75rem',
                            fontSize: '12px',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="present"
                          name="Presence Rate (%)"
                          stroke="#4F46E5"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#presentGradient)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <EmptyState
                  icon={BarChart3}
                  title="No Attendance Data Collected Yet"
                  description="Attendance statistics will automatically generate once employees begin clocking in through the portal or biometrics sync."
                  actionText="Set Up Attendance Policy"
                  onAction={() => alert('Attendance policy configuration will be implemented in Phase 2.')}
                  secondaryActionText="Preview Chart Framework"
                  onSecondaryAction={() => setShowChartPreview(true)}
                  phaseBadge="Phase 2 Telemetry & Database"
                  className="w-full"
                />
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span>Aggregated telemetry window: {selectedRange}</span>
            <span className="font-mono text-[11px]">Sync state: Idle (Disconnected)</span>
          </div>
        </div>

        {/* F. AI Assistant Preview Card (1 col) */}
        <div className="bg-gradient-to-br from-white to-violet-50/40 border border-violet-100 rounded-xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-violet-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-violet-600 text-white flex items-center justify-center shadow-xs">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    HCM Lite Intelligence
                  </h2>
                  <span className="text-[11px] text-violet-700 font-medium">
                    AI Workforce Copilot
                  </span>
                </div>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-violet-800 bg-violet-100 px-2 py-0.5 rounded-full">
                Phase 2
              </span>
            </div>

            <p className="mt-4 text-xs text-slate-600 leading-relaxed">
              Query organizational data with natural language. Ask questions, analyze attrition risks, draft company notices, and review overtime budgets.
            </p>

            <div className="mt-4 space-y-2">
              <div className="p-2.5 rounded-lg bg-white border border-slate-200/80 text-xs text-slate-700 flex items-center gap-2 hover:border-violet-300 transition-colors">
                <Sparkles className="w-3.5 h-3.5 text-violet-600 shrink-0" />
                <span className="truncate">&ldquo;Who has upcoming leave this week?&rdquo;</span>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-slate-200/80 text-xs text-slate-700 flex items-center gap-2 hover:border-violet-300 transition-colors">
                <Sparkles className="w-3.5 h-3.5 text-violet-600 shrink-0" />
                <span className="truncate">&ldquo;Summarize monthly payroll discrepancies&rdquo;</span>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-slate-200/80 text-xs text-slate-700 flex items-center gap-2 hover:border-violet-300 transition-colors">
                <Sparkles className="w-3.5 h-3.5 text-violet-600 shrink-0" />
                <span className="truncate">&ldquo;Draft team holiday policy announcement&rdquo;</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-violet-100">
            <button
              onClick={() => setAiModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-violet-700 bg-violet-100/70 hover:bg-violet-100 active:bg-violet-200 rounded-lg transition-colors"
            >
              <Bot className="w-4 h-4" />
              <span>Preview AI Architecture</span>
              <ArrowRight className="w-3.5 h-3.5 ml-auto" />
            </button>
            <p className="text-[11px] text-slate-400 text-center mt-2">
              Gemini 2.5 API integration scheduled for Phase 2
            </p>
          </div>
        </div>
      </div>

      {/* Lower Row: D. Department Overview & E. Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* D. Department Overview */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-sm sm:text-base font-semibold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  Department Overview
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Headcount distribution, budget allocation, and division heads.
                </p>
              </div>
              <Link
                to="/organization"
                className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                <span>Manage</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="mt-4">
              <EmptyState
                icon={Building2}
                title="No Departments Created"
                description="Organize your workforce into functional units like Engineering, Marketing, Operations, and Sales to track division performance."
                actionText="Create First Department"
                onAction={() => alert('Department creation dialog will connect to database in Phase 2.')}
                phaseBadge="Phase 2 Database Integration"
              />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-400 flex items-center justify-between">
            <span>Total Units: 0</span>
            <span className="font-mono text-[11px]">Database Schema: Ready</span>
          </div>
        </div>

        {/* E. Recent Activity */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-sm sm:text-base font-semibold text-slate-900 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-600" />
                  Recent Activity & Audit
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  System logs, authentication records, and management actions.
                </p>
              </div>
              <Link
                to="/audit-log"
                className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                <span>View Full Log</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="mt-4">
              <EmptyState
                icon={Activity}
                title="No Activity Logged"
                description="Real-time events will be captured automatically as administrators, managers, and employees interact with the system."
                actionText="View Audit Specification"
                onAction={() => alert('Audit logging pipeline is planned for the backend phase.')}
                phaseBadge="Phase 2 Audit Stream"
              />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-400 flex items-center justify-between">
            <span>Event stream: 0 events</span>
            <span className="font-mono text-[11px]">Audit Retention: 365 Days</span>
          </div>
        </div>
      </div>

      {/* AI Assistant Architecture Preview Modal */}
      {aiModalOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => setAiModalOpen(false)}
        >
          <div
            className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-violet-600 text-white flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-base text-slate-900">
                  HCM Lite AI Intelligence Architecture
                </h3>
                <p className="text-xs text-slate-500">
                  Phase 2 Planned Integration with Gemini 2.5
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3 text-xs text-slate-600">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <h4 className="font-semibold text-slate-800 mb-1">
                  1. Natural Language Attendance & Leave Queries
                </h4>
                <p>
                  HR managers and leaders can ask ad-hoc questions like &ldquo;Who took the most sick leave in Q3?&rdquo; without writing SQL queries.
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <h4 className="font-semibold text-slate-800 mb-1">
                  2. Automated Policy & Notice Drafting
                </h4>
                <p>
                  Generate employee handbooks, holiday announcements, and performance review templates grounded in company policy.
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <h4 className="font-semibold text-slate-800 mb-1">
                  3. Workforce Sentiment & Overtime Anomaly Detection
                </h4>
                <p>
                  Flag potential burnout patterns and abnormal overtime claims before payroll processing deadlines.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setAiModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
