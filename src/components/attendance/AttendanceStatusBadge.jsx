import React from 'react';

export default function AttendanceStatusBadge({ status = 'Present', className = '' }) {
  const getBadgeStyle = () => {
    switch (status) {
      case 'Present':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Late':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Half Day':
        return 'bg-violet-50 text-violet-700 border-violet-200';
      case 'Absent':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'On Leave':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'Incomplete':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  const getDotStyle = () => {
    switch (status) {
      case 'Present':
        return 'bg-emerald-500';
      case 'Late':
        return 'bg-amber-500';
      case 'Half Day':
        return 'bg-violet-500';
      case 'Absent':
        return 'bg-red-500';
      case 'On Leave':
        return 'bg-sky-500';
      case 'Incomplete':
        return 'bg-slate-400';
      default:
        return 'bg-slate-400';
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getBadgeStyle()} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${getDotStyle()}`} aria-hidden="true" />
      <span>{status}</span>
    </span>
  );
}
