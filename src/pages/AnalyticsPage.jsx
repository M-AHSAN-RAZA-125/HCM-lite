import React, { useState } from 'react';
import { BarChart3, TrendingUp, Users, PieChart as PieIcon, Eye } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import PageHeader from '../components/common/PageHeader.jsx';
import EmptyState from '../components/common/EmptyState.jsx';

export default function AnalyticsPage() {
  const [showPreview, setShowPreview] = useState(false);

  const sampleDepartmentData = [
    { department: 'Engineering', count: 32 },
    { department: 'Product', count: 12 },
    { department: 'Operations', count: 18 },
    { department: 'Sales', count: 24 },
    { department: 'Marketing', count: 10 },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workforce Analytics & Reporting"
        subtitle="In-depth headcount growth, retention rates, department allocations, and labor cost ratios."
        breadcrumbs={[{ label: 'Analytics' }]}
      >
        <button
          onClick={() => setShowPreview(!showPreview)}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-all ${
            showPreview
              ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>{showPreview ? 'View Empty State' : 'Preview Sample Visualizer'}</span>
        </button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500 uppercase">Headcount Growth</span>
          <div className="text-2xl font-bold text-slate-900 mt-1 font-mono tabular-nums">—</div>
          <span className="text-xs text-slate-400 mt-2 block">No historical records</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500 uppercase">Annualized Attrition</span>
          <div className="text-2xl font-bold text-slate-900 mt-1 font-mono tabular-nums">—</div>
          <span className="text-xs text-slate-400 mt-2 block">No exit records</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500 uppercase">Average Tenure</span>
          <div className="text-2xl font-bold text-slate-900 mt-1 font-mono tabular-nums">—</div>
          <span className="text-xs text-slate-400 mt-2 block">Awaiting start dates</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500 uppercase">Avg Cost Per Hire</span>
          <div className="text-2xl font-bold text-slate-900 mt-1 font-mono tabular-nums">—</div>
          <span className="text-xs text-slate-400 mt-2 block">Recruiting data pending</span>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
          <h2 className="text-sm sm:text-base font-semibold text-slate-900">
            Headcount by Department Distribution
          </h2>
          <span className="text-xs text-slate-400 font-mono">Aggregation: Organization Wide</span>
        </div>

        {showPreview ? (
          <div>
            <div className="mb-3 text-xs text-amber-800 bg-amber-50 border border-amber-200 p-2 rounded-lg">
              Preview Mode: Rendering Recharts BarChart container with sample layout data. Real data will render when department rosters exist.
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sampleDepartmentData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="department" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#E2E8F0',
                      borderRadius: '0.75rem',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="count" fill="#4F46E5" radius={[6, 6, 0, 0]} name="Employees" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={BarChart3}
            title="Analytics Engine Awaiting Roster Data"
            description="Visual dashboards and talent turnover charts will automatically generate once departments and employees are configured."
            actionText="Preview Chart Engine"
            onAction={() => setShowPreview(true)}
            phaseBadge="Phase 2 Data Warehouse"
          />
        )}
      </div>
    </div>
  );
}
