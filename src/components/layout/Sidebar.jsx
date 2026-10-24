import React from 'react';
import { NavLink } from 'react-router-dom';
import { NAVIGATION_CONFIG } from '../../config/navigation.js';
import { useRole } from '../../context/RoleContext.jsx';
import { useCommunication } from '../../context/CommunicationContext.jsx';
import BrandLogo from '../common/BrandLogo.jsx';
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  X,
} from 'lucide-react';

export default function Sidebar({
  isCollapsed,
  setIsCollapsed,
  mobileOpen,
  setMobileOpen,
}) {
  const { currentRole } = useRole();
  const { pendingRequestCount } = useCommunication();
  const navSections = NAVIGATION_CONFIG[currentRole] || NAVIGATION_CONFIG.ADMIN;

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100 shrink-0">
        <NavLink
          to="/dashboard"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-3 group focus:outline-none"
        >
          <BrandLogo
            size={isCollapsed ? 'small' : 'medium'}
            className="rounded-lg group-hover:opacity-90 transition-opacity"
          />
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-base tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors">
                HCM Lite
              </span>
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">
                Workforce Cloud
              </span>
            </div>
          )}
        </NavLink>

        {/* Mobile close button */}
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          aria-label="Close navigation drawer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {navSections.map((section, sIdx) => (
          <div key={sIdx} className="space-y-1">
            {!isCollapsed && (
              <div className="px-3 pb-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                {section.title}
              </div>
            )}
            <nav className="space-y-0.5" aria-label={section.title}>
              {section.items.map((item) => {
                const Icon = item.icon;
                const badgeCount = item.pendingBadge ? pendingRequestCount : 0;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    title={isCollapsed ? `${item.label}${badgeCount ? `, ${badgeCount} pending` : ''}` : undefined}
                    className={({ isActive }) =>
                      `relative flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-all group ${
                        isActive
                          ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-xs'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      } ${isCollapsed ? 'justify-center px-2' : ''}`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon
                          className={`w-4 h-4 shrink-0 transition-colors ${
                            isActive
                              ? 'text-indigo-600'
                              : 'text-slate-400 group-hover:text-slate-600'
                          }`}
                        />
                        {!isCollapsed && (
                          <span className="truncate flex-1">{item.label}</span>
                        )}
                        {!isCollapsed && item.isAi && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded">
                            <Sparkles className="w-2.5 h-2.5" />
                            AI
                          </span>
                        )}
                        {badgeCount > 0 && (
                          <span className={`${isCollapsed ? 'absolute right-0 top-0' : 'ml-auto'} inline-flex min-w-5 items-center justify-center rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white`}>
                            {badgeCount > 99 ? '99+' : badgeCount}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Footer / Desktop Collapse Toggle */}
      <div className="p-3 border-t border-slate-100 shrink-0 bg-slate-50/50">
        {!isCollapsed && (
          <div className="mb-2 px-2 text-[11px] text-slate-400">
            HCM Lite v1.0 &middot; Phase 1 Foundation
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`hidden md:flex items-center gap-2 w-full p-2 text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors ${
            isCollapsed ? 'justify-center' : 'justify-between'
          }`}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {!isCollapsed && <span>Collapse Sidebar</span>}
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-slate-400" />
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside
        className={`hidden md:block shrink-0 transition-all duration-200 z-20 ${
          isCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        <div className={`fixed top-0 bottom-0 ${isCollapsed ? 'w-16' : 'w-64'} transition-all duration-200`}>
          {sidebarContent}
        </div>
      </aside>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 md:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Mobile Sliding Drawer */}
      <aside
        className={`fixed top-0 bottom-0 left-0 w-72 bg-white z-50 md:hidden shadow-2xl transition-transform duration-200 ease-out transform ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Mobile Navigation"
      >
        {sidebarContent}
      </aside>
    </>
  );
}
