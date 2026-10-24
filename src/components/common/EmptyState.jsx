import React from 'react';

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionText,
  onAction,
  secondaryActionText,
  onSecondaryAction,
  className = '',
  phaseBadge = 'Phase 2 Database Integration',
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 lg:p-12 border border-dashed border-slate-200 rounded-xl bg-slate-50/50 ${className}`}
    >
      {Icon && (
        <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center text-slate-500 mb-4">
          <Icon className="w-6 h-6 text-slate-400" />
        </div>
      )}
      
      <h3 className="text-sm sm:text-base font-semibold text-slate-900 max-w-md">
        {title}
      </h3>
      
      <p className="mt-1.5 text-xs sm:text-sm text-slate-500 max-w-md leading-relaxed">
        {description}
      </p>

      {phaseBadge && (
        <div className="mt-3 text-[11px] text-slate-400 font-mono">
          Status: {phaseBadge}
        </div>
      )}

      {(actionText || secondaryActionText) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          {actionText && (
            <button
              onClick={onAction}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/30 whitespace-nowrap"
            >
              {actionText}
            </button>
          )}
          {secondaryActionText && (
            <button
              onClick={onSecondaryAction}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-200 rounded-lg shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400/20 whitespace-nowrap"
            >
              {secondaryActionText}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
