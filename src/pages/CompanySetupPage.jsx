import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Layers, ArrowLeft, Shield } from 'lucide-react';
import FormProgress from '../components/setup/FormProgress.jsx';
import CompanyDetailsForm from '../components/setup/CompanyDetailsForm.jsx';
import AdminAccountForm from '../components/setup/AdminAccountForm.jsx';
import SetupReview from '../components/setup/SetupReview.jsx';
import { useOrganization } from '../context/OrganizationContext.jsx';

const SETUP_STEPS = [
  { step: 1, title: 'Company Profile' },
  { step: 2, title: 'Admin Account' },
  { step: 3, title: 'Review & Launch' },
];

export default function CompanySetupPage() {
  const { companyProfile, updateCompanyProfile } = useOrganization();
  const [currentStep, setCurrentStep] = useState(1);

  // In-memory wizard state for non-sensitive data, pre-filled if available
  const [companyData, setCompanyData] = useState({
    companyName: companyProfile.companyName || '',
    companyEmail: companyProfile.companyEmail || '',
    companyPhone: companyProfile.companyPhone || '',
    industry: companyProfile.industry || 'Information Technology',
    website: companyProfile.website || '',
  });

  // Password is only kept in component state while user is on the form, never stored in localStorage
  const [adminData, setAdminData] = useState({
    adminName: '',
    adminEmail: '',
    password: '',
    confirmPassword: '',
  });

  const handleStep1Next = (data) => {
    setCompanyData(data);
    updateCompanyProfile(data);
    setCurrentStep(2);
  };

  const handleStep2Next = (data) => {
    setAdminData(data);
    setCurrentStep(3);
  };

  const handleStep2Back = () => {
    setCurrentStep(1);
  };

  const handleStep3Back = () => {
    setCurrentStep(2);
  };

  const handleEditStep = (stepNumber) => {
    if (stepNumber >= 1 && stepNumber <= 3) {
      setCurrentStep(stepNumber);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between font-sans">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 py-4 px-4 sm:px-8">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2.5 focus:outline-none">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-xs">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-slate-900 block leading-tight">
                HCM Lite
              </span>
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest block leading-none">
                First-Run Setup Wizard
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-500 hidden sm:inline">
              Already have an active company?
            </span>
            <Link
              to="/login"
              className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-1"
            >
              <span>Sign In</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 py-8 sm:py-12 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Progress Tracker */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs">
            <FormProgress currentStep={currentStep} steps={SETUP_STEPS} />
          </div>

          {/* Active Step Form Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
            {currentStep === 1 && (
              <CompanyDetailsForm
                initialData={companyData}
                onNext={handleStep1Next}
              />
            )}

            {currentStep === 2 && (
              <AdminAccountForm
                initialData={adminData}
                onNext={handleStep2Next}
                onBack={handleStep2Back}
              />
            )}

            {currentStep === 3 && (
              <SetupReview
                companyData={companyData}
                adminData={adminData}
                onEditStep={handleEditStep}
                onBack={handleStep3Back}
              />
            )}
          </div>

          {/* Quick return link */}
          <div className="flex items-center justify-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Login</span>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 px-6 border-t border-slate-200 bg-white text-center text-xs text-slate-400">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>HCM Lite &mdash; Enterprise Human Capital Management</span>
          <span className="font-mono text-[11px]">Phase 2 &middot; First-Run Setup Engine</span>
        </div>
      </footer>
    </div>
  );
}
