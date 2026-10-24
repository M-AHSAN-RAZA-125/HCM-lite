import React, { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';

export default function PasswordInput({
  id,
  name,
  value,
  onChange,
  onBlur,
  placeholder = '••••••••',
  error = false,
  required = false,
  autoComplete = 'current-password',
  className = '',
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className={`relative flex items-center ${className}`}>
      <Lock className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
      <input
        id={id}
        name={name}
        type={showPassword ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        className={`w-full pl-9 pr-10 py-2.5 text-xs sm:text-sm bg-slate-50 border rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:bg-white transition-all ${
          error
            ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
            : 'border-slate-200 focus:border-indigo-600 focus:ring-indigo-500/20'
        }`}
      />
      <button
        type="button"
        onClick={() => setShowPassword((prev) => !prev)}
        className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        aria-label={showPassword ? 'Hide password' : 'Show password'}
      >
        {showPassword ? (
          <EyeOff className="w-4 h-4" />
        ) : (
          <Eye className="w-4 h-4" />
        )}
      </button>
    </div>
  );
}
