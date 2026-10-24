import React from 'react';

export default function StatCard({
  title,
  value = '—',
  status = 'Awaiting company data',
  icon: Icon,
  hint,
  statusType = 'neutral', // 'neutral' | 'info' | 'warning'
  action,
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-all shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            {title}
          </span>
          <div className="mt-2 text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 font-mono tabular-nums">
            {value}
          </div>
        </div>
        {Icon && (
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-indigo-600 shrink-0">
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-slate-500">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              statusType === 'warning'
                ? 'bg-amber-500'
                : statusType === 'info'
                ? 'bg-indigo-500'
                : 'bg-slate-300'
            }`}
            aria-hidden="true"
          />
          <span className="text-slate-600">{status}</span>
        </div>
        {hint && (
          <span className="text-[11px] text-slate-400 font-mono">
            {hint}
          </span>
        )}
        {action && <div>{action}</div>}
      </div>
    </div>
  );
}
