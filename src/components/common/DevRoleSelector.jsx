import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useRole } from '../../context/RoleContext.jsx';
import { ShieldAlert, Users, ChevronDown, ChevronUp, Eye, LogIn, Sparkles } from 'lucide-react';

export default function DevRoleSelector() {
  const { currentRole, setRole, currentUser } = useRole();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const roles = [
    { id: 'ADMIN', label: 'Admin', desc: 'All 11 modules & company controls' },
    { id: 'HR', label: 'HR Manager', desc: '8 operational modules & workforce' },
    { id: 'EMPLOYEE', label: 'Employee', desc: '7 self-service workspace views' },
  ];

  return (
    <aside
      aria-label="Development preview role selector"
      className="bg-amber-50/90 border-b border-amber-200/80 px-4 py-2 transition-all"
    >
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-200/70 text-amber-900 font-semibold uppercase tracking-wider text-[10px]">
            <ShieldAlert className="w-3 h-3 text-amber-800" />
            DEV PREVIEW MODE
          </div>
          <span className="text-amber-900/80 hidden sm:inline">
            Role-Based Access Control Preview &mdash; Switching roles dynamically updates navigation and permissions.
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick links to new Phase 2 views */}
          <div className="hidden lg:flex items-center gap-1.5 mr-1 border-r border-amber-200 pr-2">
            <Link
              to="/login"
              className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-900 hover:text-indigo-700 bg-white/70 hover:bg-white px-2 py-1 rounded border border-amber-200 transition-colors"
            >
              <LogIn className="w-3 h-3" />
              <span>Login Screen</span>
            </Link>
            <Link
              to="/setup"
              className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-900 hover:text-indigo-700 bg-white/70 hover:bg-white px-2 py-1 rounded border border-amber-200 transition-colors"
            >
              <Sparkles className="w-3 h-3 text-violet-600" />
              <span>Setup Wizard</span>
            </Link>
          </div>

          <span className="text-[11px] font-medium text-amber-800 hidden md:inline">
            Active: <strong className="font-semibold text-amber-950">{currentUser.label}</strong>
          </span>

          <div className="inline-flex rounded-lg bg-white/90 p-0.5 border border-amber-300/70 shadow-xs">
            {roles.map((r) => {
              const active = currentRole === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => setRole(r.id)}
                  title={r.desc}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                    active
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-amber-100/50'
                  }`}
                >
                  {r.label}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 text-amber-700 hover:text-amber-900 rounded md:hidden"
            aria-label="Toggle role selector details"
          >
            {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="max-w-7xl mx-auto mt-1 sm:hidden text-[11px] text-amber-800/90 border-t border-amber-200/60 pt-1">
          Switch role to preview sidebar navigation and views for Admin, HR, or Employee.
        </div>
      )}
    </aside>
  );
}
