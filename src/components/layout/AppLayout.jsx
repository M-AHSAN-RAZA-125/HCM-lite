import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';
import DevRoleSelector from '../common/DevRoleSelector.jsx';

export default function AppLayout() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      {/* Development-Only Role Preview Selector */}
      <DevRoleSelector />

      {/* Main App Container */}
      <div className="flex-1 flex w-full">
        {/* Navigation Sidebar */}
        <Sidebar
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
        />

        {/* Content Column */}
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar setMobileOpen={setMobileOpen} />

          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            <Outlet />
          </main>

          <footer className="py-4 px-6 border-t border-slate-200/80 bg-white text-center text-xs text-slate-400">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 max-w-7xl mx-auto">
              <span>HCM Lite &mdash; AI-assisted Human Capital Management</span>
              <span className="font-mono text-[11px]">Phase 1 Frontend Foundation &middot; Production Ready Architecture</span>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
