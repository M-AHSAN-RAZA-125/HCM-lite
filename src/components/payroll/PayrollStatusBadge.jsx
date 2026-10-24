import React from 'react';
import { Lock, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

export default function PayrollStatusBadge({ status, size = 'sm' }) {
  const normalized = (status || 'Draft').toLowerCase();

  const configs = {
    draft: {
      label: 'Draft',
      icon: Clock,
      className: 'bg-amber-50 text-amber-800 border-amber-200 border-dashed',
    },
    finalized: {
      label: 'Finalized',
      icon: CheckCircle2,
      className: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    },
    locked: {
      label: 'Locked',
      icon: Lock,
      className: 'bg-slate-100 text-slate-800 border-slate-300 font-semibold',
    },
    active: {
      label: 'Active',
      icon: CheckCircle2,
      className: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    },
    inactive: {
      label: 'Inactive',
      icon: AlertCircle,
      className: 'bg-slate-100 text-slate-600 border-slate-200',
    },
    unprocessed: {
      label: 'Unprocessed',
      icon: Clock,
      className: 'bg-slate-50 text-slate-500 border-slate-200',
    },
  };

  const config = configs[normalized] || configs.draft;
  const Icon = config.icon;

  const sizeClasses = size === 'xs' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${sizeClasses} ${config.className}`}
    >
      <Icon className={size === 'xs' ? 'w-3 h-3 shrink-0' : 'w-3.5 h-3.5 shrink-0'} />
      <span>{config.label}</span>
    </span>
  );
}
