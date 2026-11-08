import React, { useState } from 'react';
import {
  Building2,
  Clock,
  Briefcase,
  Layers,
  CalendarCheck,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/common/PageHeader.jsx';
import CompanyProfileSection from '../components/organization/CompanyProfileSection.jsx';
import OfficeRulesSection from '../components/organization/OfficeRulesSection.jsx';
import DepartmentsSection from '../components/organization/DepartmentsSection.jsx';
import DesignationsSection from '../components/organization/DesignationsSection.jsx';
import LeavePoliciesSection from '../components/organization/LeavePoliciesSection.jsx';
import HolidaysSection from '../components/organization/HolidaysSection.jsx';
import HrAccountsSection from '../components/organization/HrAccountsSection.jsx';
import { useOrganization } from '../context/OrganizationContext.jsx';
import { useRole } from '../context/RoleContext.jsx';

export default function OrganizationPage() {
  const { companyProfile, departments, designations, leaveTypes, holidays } = useOrganization();
  const { currentRole, isAdmin, isHr } = useRole();

  const [activeSection, setActiveSection] = useState('profile');

  const SECTIONS = [
    {
      id: 'profile',
      label: 'Company Profile',
      icon: Building2,
      badge: companyProfile.isConfigured ? 'Configured' : 'Incomplete',
      badgeColor: companyProfile.isConfigured ? 'emerald' : 'amber',
    },
    {
      id: 'office',
      label: 'Office & Attendance Rules',
      icon: Clock,
      badge: null,
    },
    {
      id: 'departments',
      label: 'Departments',
      icon: Layers,
      count: departments.length,
    },
    {
      id: 'designations',
      label: 'Designations',
      icon: Briefcase,
      count: designations.length,
    },
    {
      id: 'leaves',
      label: 'Leave Types & Policies',
      icon: CalendarCheck,
      count: leaveTypes.length,
    },
    {
      id: 'holidays',
      label: 'Holidays',
      icon: Calendar,
      count: holidays.length,
    },
    {
      id: 'hr_accounts',
      label: 'HR Accounts',
      icon: ShieldCheck,
      badge: null,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Title & Breadcrumb Header */}
      <PageHeader
        title="Organization Settings"
        subtitle="Configure your company, workforce structure, and HR policies."
        breadcrumbs={[{ label: 'Organization' }]}
      />

      {/* Top Company Status Overview Banner */}
      <div className="p-4 sm:p-5 bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 shadow-xs">
            {companyProfile.logoUrl ? (
              <img
                src={companyProfile.logoUrl}
                alt="Logo"
                className="w-full h-full object-contain p-1 rounded-xl"
              />
            ) : (
              <Building2 className="w-6 h-6 text-indigo-600" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                {companyProfile.companyName || 'Unconfigured Organization'}
              </h2>
              {companyProfile.isConfigured ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Profile Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  <AlertCircle className="w-3 h-3 text-amber-600" />
                  Setup Incomplete
                </span>
              )}
            </div>

            <p className="text-xs text-slate-500 mt-0.5">
              {companyProfile.isConfigured
                ? `${companyProfile.industry || 'Enterprise'} · ${companyProfile.city || 'Headquarters'} · ${companyProfile.companyEmail || ''}`
                : 'Company legal profile is currently uninitialized. Configure parameters below or run the First-Run Setup Wizard.'}
            </p>
          </div>
        </div>

        {!companyProfile.isConfigured && (
          <Link
            to="/setup"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100/70 border border-indigo-200 rounded-xl transition-colors shrink-0"
          >
            <span>Launch First-Run Wizard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* Main Settings Layout: Left Navigation + Right Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left Section Navigation (Adapts to horizontal scroll on mobile) */}
        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl shadow-xs p-2 lg:p-3 sticky top-20">
          <div className="hidden lg:block px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Settings Menu
          </div>

          <nav
            className="flex lg:flex-col gap-1 overflow-x-auto pb-1 lg:pb-0 select-none"
            aria-label="Organization settings sections"
          >
            {SECTIONS.map((sec) => {
              const Icon = sec.icon;
              const isActive = activeSection === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => setActiveSection(sec.id)}
                  className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all text-left whitespace-nowrap shrink-0 lg:shrink ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive ? 'text-indigo-600' : 'text-slate-400'
                      }`}
                    />
                    <span>{sec.label}</span>
                  </div>

                  {sec.count !== undefined && (
                    <span
                      className={`font-mono text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${
                        isActive
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {sec.count}
                    </span>
                  )}

                  {sec.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        sec.badgeColor === 'emerald'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {sec.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right Content Area */}
        <div className="lg:col-span-3">
          {activeSection === 'profile' && <CompanyProfileSection />}
          {activeSection === 'office' && <OfficeRulesSection />}
          {activeSection === 'departments' && <DepartmentsSection />}
          {activeSection === 'designations' && <DesignationsSection />}
          {activeSection === 'leaves' && <LeavePoliciesSection />}
          {activeSection === 'holidays' && <HolidaysSection />}
          {activeSection === 'hr_accounts' && <HrAccountsSection />}
        </div>
      </div>
    </div>
  );
}
