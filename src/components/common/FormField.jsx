import React from 'react';

export default function FormField({
  id,
  label,
  error,
  hint,
  required,
  children,
  className = '',
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-medium text-slate-700 select-none"
        >
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}

      {children}

      {error && (
        <p className="text-xs text-red-600 flex items-center gap-1 mt-1 font-medium" role="alert">
          {error}
        </p>
      )}

      {hint && !error && (
        <p className="text-[11px] text-slate-400 mt-1">
          {hint}
        </p>
      )}
    </div>
  );
}
