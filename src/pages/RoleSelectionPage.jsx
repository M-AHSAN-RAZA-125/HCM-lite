import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BriefcaseBusiness, Building2, ShieldCheck } from 'lucide-react';
import BrandLogo from '../components/common/BrandLogo.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const roles = [
  {
    key: 'employee',
    label: 'Employee',
    description: 'Access your attendance, leave requests, profile, and payslips.',
    icon: BriefcaseBusiness,
  },
  {
    key: 'hr',
    label: 'HR',
    description: 'Manage people operations, employee records, and workforce workflows.',
    icon: Building2,
  },
  {
    key: 'admin',
    label: 'Admin',
    description: 'Configure the organization and administer HCM Lite access.',
    icon: ShieldCheck,
  },
];

export default function RoleSelectionPage() {
  const navigate = useNavigate();
  const { authNotice } = useAuth();

  return (
    <main className="min-h-screen bg-[#F8FAFC] px-4 py-12 flex items-center justify-center">
      <section className="w-full max-w-5xl">
        <div className="text-center">
          <BrandLogo size="large" className="mx-auto mb-5" />
          <h1 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
            Welcome to HCM Lite
          </h1>
          <p className="mt-3 text-sm sm:text-base text-slate-500">
            Choose your account type to continue.
          </p>
        </div>

        {authNotice && (
          <p role="status" className="mx-auto mt-6 max-w-xl rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-900">
            {authNotice}
          </p>
        )}

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {roles.map(({ key, label, description, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => navigate(`/auth/${key}`)}
              className="group min-h-56 rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition-all hover:-translate-y-1 hover:border-indigo-300 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-indigo-100"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition-colors group-hover:bg-indigo-600 group-hover:text-white">
                <Icon className="h-6 w-6" aria-hidden="true" />
              </span>
              <span className="mt-5 flex items-center justify-between text-lg font-semibold text-slate-900">
                {label}
                <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-indigo-600" />
              </span>
              <span className="mt-2 block text-sm leading-relaxed text-slate-500">{description}</span>
            </button>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-slate-400">
          Your selection only chooses the sign-in route. Your account role is verified by the server.
        </p>
      </section>
    </main>
  );
}
