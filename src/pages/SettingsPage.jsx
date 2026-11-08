import React, { useState } from 'react';
import { Settings, Save, Shield, Bell, Building, Check } from 'lucide-react';
import PageHeader from '../components/common/PageHeader.jsx';
import { useRole } from '../context/RoleContext.jsx';

export default function SettingsPage() {
  const { currentRole } = useRole();
  const [companyName, setCompanyName] = useState('Acme Corporation');
  const [timezone, setTimezone] = useState('UTC-5 (Eastern Time)');
  const [workWeek, setWorkWeek] = useState('Monday - Friday');
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="System & Company Settings"
        subtitle="Manage global organizational parameters, work schedule defaults, and notification triggers."
        breadcrumbs={[{ label: 'Settings' }]}
      />

      <form onSubmit={handleSave} className="space-y-6">
        {/* General Settings */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
            <Building className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm sm:text-base font-semibold text-slate-900">
              Company Profile & Regional Defaults
            </h2>
          </div>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Organization Legal Name
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Primary Operational Timezone
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white"
              >
                <option>UTC-5 (Eastern Time)</option>
                <option>UTC-8 (Pacific Time)</option>
                <option>UTC+0 (London, GMT)</option>
                <option>UTC+1 (Central European Time)</option>
                <option>UTC+5:30 (India Standard Time)</option>
                <option>UTC+8 (Singapore, Beijing)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Default Work Week Schedule
              </label>
              <select
                value={workWeek}
                onChange={(e) => setWorkWeek(e.target.value)}
                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white"
              >
                <option>Monday - Friday (40 hrs/wk)</option>
                <option>Monday - Saturday (48 hrs/wk)</option>
                <option>Sunday - Thursday (Middle East Standard)</option>
                <option>Custom 4-Day Work Week (32 hrs/wk)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Base Currency
              </label>
              <input
                type="text"
                disabled
                value="USD ($) - Configurable in Phase 2"
                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-100 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Notification preferences */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
            <Bell className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm sm:text-base font-semibold text-slate-900">
              Notification & Digest Rules
            </h2>
          </div>

          <div className="mt-5 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={(e) => setEmailAlerts(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs text-slate-700">
                Send daily email digests of attendance anomalies and pending leave requests
              </span>
            </label>
          </div>
        </div>

        {/* Save button */}
        <div className="flex items-center justify-between pt-2">
          {savedSuccess ? (
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
              <Check className="w-3.5 h-3.5" />
              Settings updated locally for preview session
            </div>
          ) : (
            <div className="text-xs text-slate-400">
              Settings persist in local preview state
            </div>
          )}

          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-xs transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Save Preferences</span>
          </button>
        </div>
      </form>
    </div>
  );
}
