import React, { useState } from 'react';
import { User, Mail, ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react';
import FormField from '../common/FormField.jsx';
import PasswordInput from '../common/PasswordInput.jsx';

export default function AdminAccountForm({ initialData, onNext, onBack }) {
  const [formData, setFormData] = useState({
    adminName: initialData.adminName || '',
    adminEmail: initialData.adminEmail || '',
    password: initialData.password || '',
    confirmPassword: initialData.confirmPassword || '',
  });

  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};

    if (!formData.adminName.trim()) {
      newErrors.adminName = 'Admin full name is required.';
    }

    if (!formData.adminEmail.trim()) {
      newErrors.adminEmail = 'Admin email is required.';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.adminEmail.trim())) {
        newErrors.adminEmail = 'Please enter a valid email address.';
      }
    }

    if (!formData.password) {
      newErrors.password = 'Password is required.';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters.';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirmation password is required.';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
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
          Primary Administrator Account
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Create the initial Super Administrator account to manage users, configure policies, and access all HCM modules.
        </p>
      </div>

      <div className="space-y-4">
        {/* Full Name */}
        <FormField
          id="adminName"
          label="Administrator Full Name"
          required
          error={errors.adminName}
        >
          <div className="relative flex items-center">
            <User className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              id="adminName"
              type="text"
              value={formData.adminName}
              onChange={(e) => handleChange('adminName', e.target.value)}
              placeholder="e.g. Sarah Jenkins"
              className={`w-full pl-9 pr-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:bg-white transition-all ${
                errors.adminName
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                  : 'border-slate-200 focus:border-indigo-600 focus:ring-indigo-500/20'
              }`}
            />
          </div>
        </FormField>

        {/* Email */}
        <FormField
          id="adminEmail"
          label="Administrator Work Email"
          required
          error={errors.adminEmail}
          hint="This email will be used to log in to the workspace"
        >
          <div className="relative flex items-center">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              id="adminEmail"
              type="email"
              value={formData.adminEmail}
              onChange={(e) => handleChange('adminEmail', e.target.value)}
              placeholder="sarah.jenkins@company.com"
              className={`w-full pl-9 pr-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:bg-white transition-all ${
                errors.adminEmail
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                  : 'border-slate-200 focus:border-indigo-600 focus:ring-indigo-500/20'
              }`}
            />
          </div>
        </FormField>

        {/* Passwords */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            id="password"
            label="Security Password"
            required
            error={errors.password}
            hint="Minimum 8 characters"
          >
            <PasswordInput
              id="password"
              name="password"
              value={formData.password}
              onChange={(e) => handleChange('password', e.target.value)}
              error={!!errors.password}
              autoComplete="new-password"
            />
          </FormField>

          <FormField
            id="confirmPassword"
            label="Confirm Password"
            required
            error={errors.confirmPassword}
          >
            <PasswordInput
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={(e) => handleChange('confirmPassword', e.target.value)}
              error={!!errors.confirmPassword}
              autoComplete="new-password"
            />
          </FormField>
        </div>
      </div>

      <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl flex items-start gap-2.5 text-xs text-indigo-900">
        <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
        <span>
          This account will hold root permissions. Additional HR managers and department heads can be assigned fine-grained roles after setup.
        </span>
      </div>

      <div className="pt-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors focus:outline-none"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <button
          type="submit"
          className="flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
        >
          <span>Review Details</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
}
