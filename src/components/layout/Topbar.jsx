import React from 'react';
import { Menu } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import SearchInput from '../common/SearchInput.jsx';
import NotificationButton from '../common/NotificationButton.jsx';
import ProfileMenu from '../common/ProfileMenu.jsx';

export default function Topbar({ setMobileOpen }) {
  const location = useLocation();

  // Map route to friendly title / breadcrumb
  const getPageInfo = (pathname) => {
    switch (pathname) {
      case '/dashboard':
        return { section: 'Overview', title: 'Dashboard' };
      case '/organization':
        return { section: 'Structure', title: 'Organization' };
      case '/employees':
        return { section: 'People', title: 'Employee Directory' };
      case '/attendance':
        return { section: 'Time', title: 'Attendance' };
      case '/leaves':
        return { section: 'Time', title: 'Leave Management' };
      case '/payroll':
        return { section: 'Finance', title: 'Payroll & Compensation' };
      case '/analytics':
        return { section: 'Reports', title: 'Workforce Analytics' };
      case '/ai-assistant':
        return { section: 'Intelligence', title: 'AI Assistant' };
      case '/announcements':
        return { section: 'Communication', title: 'Announcements' };
      case '/audit-log':
        return { section: 'Compliance', title: 'Audit Trail' };
      case '/settings':
        return { section: 'Configuration', title: 'Settings' };
      case '/profile':
        return { section: 'Account', title: 'My Profile' };
      default:
        return { section: 'System', title: 'HCM Lite' };
    }
  };

  const pageInfo = getPageInfo(location.pathname);

  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-10 px-4 sm:px-6 flex items-center justify-between gap-4">
      {/* Left zone: Mobile toggle & Breadcrumb/Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={() => setMobileOpen(true)}
          className="md:hidden p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors focus:outline-none"
          aria-label="Open mobile navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 truncate">
          <span className="text-xs text-slate-400 hidden sm:inline">
            {pageInfo.section}
          </span>
          <span className="text-slate-300 hidden sm:inline" aria-hidden="true">
            /
          </span>
          <h2 className="text-sm sm:text-base font-semibold text-slate-900 truncate">
            {pageInfo.title}
          </h2>
        </div>
      </div>

      {/* Center zone: Search Input */}
      <div className="hidden lg:block w-72 xl:w-96">
        <SearchInput />
      </div>

      {/* Right zone: Actions, Notifications & Profile */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <div className="lg:hidden">
          <SearchInput className="w-36 sm:w-48" />
        </div>

        <NotificationButton />

        <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" aria-hidden="true" />

        <ProfileMenu />
      </div>
    </header>
  );
}
