import React, { useState, useRef, useEffect } from 'react';
import { Search, X, ArrowRight, FileText, Users, Clock, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SearchInput({ className = '' }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  // Quick module search items for easy navigation
  const searchableModules = [
    { title: 'Dashboard Overview', path: '/dashboard', category: 'Navigation', icon: FileText },
    { title: 'Employee Directory', path: '/employees', category: 'People', icon: Users },
    { title: 'Attendance Log', path: '/attendance', category: 'Time', icon: Clock },
    { title: 'Leave Management', path: '/leaves', category: 'Time', icon: FileText },
    { title: 'Payroll & Compensation', path: '/payroll', category: 'Finance', icon: FileText },
    { title: 'AI Assistant', path: '/ai-assistant', category: 'Intelligence', icon: FileText },
    { title: 'Audit Trail & Compliance', path: '/audit-log', category: 'Security', icon: Shield },
    { title: 'Company Settings', path: '/settings', category: 'Settings', icon: FileText },
  ];

  const filtered = query.trim()
    ? searchableModules.filter((m) =>
        m.title.toLowerCase().includes(query.toLowerCase()) ||
        m.category.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (path) => {
    navigate(path);
    setQuery('');
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative flex items-center">
        <Search className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search modules, pages, or policies..."
          className="w-full pl-9 pr-8 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition-all"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 rounded"
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {isOpen && query.trim().length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden py-1 max-h-80 overflow-y-auto">
          <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100">
            Matching Modules ({filtered.length})
          </div>
          {filtered.length > 0 ? (
            filtered.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  onClick={() => handleSelect(item.path)}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors group"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 shrink-0" />
                    <span className="font-medium truncate">{item.title}</span>
                    <span className="text-xs text-slate-400 shrink-0">· {item.category}</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition-transform group-hover:translate-x-0.5 shrink-0" />
                </button>
              );
            })
          ) : (
            <div className="px-4 py-6 text-center text-xs text-slate-500">
              No modules matching &ldquo;{query}&rdquo;
            </div>
          )}
        </div>
      )}
    </div>
  );
}
