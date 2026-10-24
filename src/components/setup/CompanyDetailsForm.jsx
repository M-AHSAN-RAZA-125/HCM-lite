import React, { useState } from 'react';
import { Building2, Mail, Phone, Globe, Briefcase, ArrowRight } from 'lucide-react';
import FormField from '../common/FormField.jsx';

export const INDUSTRY_OPTIONS = [
  'Information Technology',
  'Education',
  'Healthcare',
  'Retail',
  'Manufacturing',
  'Finance',
  'Other',
];

export default function CompanyDetailsForm({ initialData, onNext }) {
  const [formData, setFormData] = useState({
    companyName: initialData.companyName || '',
    companyEmail: initialData.companyEmail || '',
    companyPhone: initialData.companyPhone || '',
    industry: initialData.industry || 'Information Technology',
    website: initialData.website || '',
  });

  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!formData.companyName.trim()) {
      newErrors.companyName = 'Company name is required.';
    }

    if (!formData.companyEmail.trim()) {
      newErrors.companyEmail = 'Company email is required.';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.companyEmail.trim())) {
        newErrors.companyEmail = 'Please enter a valid email address.';
      }
    }

    if (formData.website.trim()) {
      // Optional, but if provided, validate basic URL structure
      const urlPattern = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:\d+)?(\/.*)?$/;
      if (!urlPattern.test(formData.website.trim())) {
        newErrors.website = 'Please enter a valid website URL (e.g. example.com).';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onNext(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div>
        <h2 className="text-base sm:text-lg font-semibold text-slate-900">
          Organization Profile
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Tell us about your organization to initialize company settings and workspace defaults.
        </p>
      </div>

      <div className="space-y-4">
        {/* Company Name */}
        <FormField
          id="companyName"
          label="Company Legal Name"
          required
          error={errors.companyName}
        >
          <div className="relative flex items-center">
            <Building2 className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              id="companyName"
              type="text"
              value={formData.companyName}
              onChange={(e) => handleChange('companyName', e.target.value)}
              placeholder="e.g. Apex Technologies Inc."
              className={`w-full pl-9 pr-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:bg-white transition-all ${
                errors.companyName
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                  : 'border-slate-200 focus:border-indigo-600 focus:ring-indigo-500/20'
              }`}
            />
          </div>
        </FormField>

        {/* Company Email & Phone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            id="companyEmail"
            label="Corporate Contact Email"
            required
            error={errors.companyEmail}
            hint="For administrative notices and billing"
          >
            <div className="relative flex items-center">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                id="companyEmail"
                type="email"
                value={formData.companyEmail}
                onChange={(e) => handleChange('companyEmail', e.target.value)}
                placeholder="hr@company.com"
                className={`w-full pl-9 pr-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:bg-white transition-all ${
                  errors.companyEmail
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                    : 'border-slate-200 focus:border-indigo-600 focus:ring-indigo-500/20'
                }`}
              />
            </div>
          </FormField>

          <FormField
            id="companyPhone"
            label="Headquarters Phone"
            hint="Optional company line"
          >
            <div className="relative flex items-center">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                id="companyPhone"
                type="tel"
                value={formData.companyPhone}
                onChange={(e) => handleChange('companyPhone', e.target.value)}
                placeholder="+1 (555) 019-2834"
                className="w-full pl-9 pr-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition-all"
              />
            </div>
          </FormField>
        </div>

        {/* Industry & Website */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            id="industry"
            label="Industry Sector"
            required
          >
            <div className="relative flex items-center">
              <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <select
                id="industry"
                value={formData.industry}
                onChange={(e) => handleChange('industry', e.target.value)}
                className="w-full pl-9 pr-8 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition-all"
              >
                {INDUSTRY_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </FormField>

          <FormField
            id="website"
            label="Company Website"
            hint="Optional domain URL"
            error={errors.website}
          >
            <div className="relative flex items-center">
              <Globe className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                id="website"
                type="text"
                value={formData.website}
                onChange={(e) => handleChange('website', e.target.value)}
                placeholder="https://company.com"
                className={`w-full pl-9 pr-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:bg-white transition-all ${
                  errors.website
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                    : 'border-slate-200 focus:border-indigo-600 focus:ring-indigo-500/20'
                }`}
              />
            </div>
          </FormField>
        </div>
      </div>

      <div className="pt-4 flex justify-end">
        <button
          type="submit"
          className="flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
        >
          <span>Continue to Admin Setup</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
}
