import React, { useState, useRef, useEffect } from 'react';
import {
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  Camera,
  Save,
  RotateCcw,
  Shield,
  CheckCircle2,
  Info,
} from 'lucide-react';
import FormField from '../common/FormField.jsx';
import { useOrganization } from '../../context/OrganizationContext.jsx';
import { useRole } from '../../context/RoleContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { INDUSTRY_OPTIONS } from '../setup/CompanyDetailsForm.jsx';

export default function CompanyProfileSection() {
  const { companyProfile, updateCompanyProfile } = useOrganization();
  const { isAdmin } = useRole();
  const { showToast } = useToast();
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    companyName: '',
    companyEmail: '',
    companyPhone: '',
    industry: 'Information Technology',
    website: '',
    address: '',
    city: '',
    country: 'United States',
    logoUrl: null,
  });

  const [logoPreview, setLogoPreview] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (companyProfile) {
      setFormData({
        companyName: companyProfile.companyName || '',
        companyEmail: companyProfile.companyEmail || '',
        companyPhone: companyProfile.companyPhone || '',
        industry: companyProfile.industry || 'Information Technology',
        website: companyProfile.website || '',
        address: companyProfile.address || '',
        city: companyProfile.city || '',
        country: companyProfile.country || 'United States',
        logoUrl: companyProfile.logoUrl || null,
      });
      setLogoPreview(companyProfile.logoUrl || null);
    }
  }, [companyProfile]);

  const validate = () => {
    const errs = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const urlPattern = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:\d+)?(\/.*)?$/;

    if (!formData.companyName.trim()) {
      errs.companyName = 'Company name is required.';
    }

    if (!formData.companyEmail.trim()) {
      errs.companyEmail = 'Company email is required.';
    } else if (!emailRegex.test(formData.companyEmail.trim())) {
      errs.companyEmail = 'Please enter a valid company email address.';
    }

    if (formData.website.trim() && !urlPattern.test(formData.website.trim())) {
      errs.website = 'Please enter a valid website URL (e.g. https://example.com).';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setErrors((prev) => ({ ...prev, logo: 'Logo image must be smaller than 2MB.' }));
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result;
        setLogoPreview(dataUrl);
        setFormData((prev) => ({ ...prev, logoUrl: dataUrl }));
        setErrors((prev) => ({ ...prev, logo: undefined }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleReset = () => {
    if (companyProfile) {
      setFormData({
        companyName: companyProfile.companyName || '',
        companyEmail: companyProfile.companyEmail || '',
        companyPhone: companyProfile.companyPhone || '',
        industry: companyProfile.industry || 'Information Technology',
        website: companyProfile.website || '',
        address: companyProfile.address || '',
        city: companyProfile.city || '',
        country: companyProfile.country || 'United States',
        logoUrl: companyProfile.logoUrl || null,
      });
      setLogoPreview(companyProfile.logoUrl || null);
    }
    setErrors({});
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isAdmin) {
      showToast({
        type: 'info',
        title: 'Permission Notice',
        message: 'Only Administrator accounts can update corporate legal profile settings.',
      });
      return;
    }

    if (validate()) {
      updateCompanyProfile(formData);
      showToast({
        type: 'success',
        title: 'Company Profile Saved',
        message: 'Corporate profile details have been saved for the current session.',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900">
            Company Profile
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Legal identity, branding assets, and corporate communication channels.
          </p>
        </div>

        {!isAdmin && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-xs">
            <Shield className="w-3.5 h-3.5 text-amber-600" />
            <span>Admin-only write access</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {/* Brand Logo Row */}
        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
            Brand Logo & Mark
          </h3>

          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-xs relative">
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Company Logo"
                  className="w-full h-full object-contain p-2"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-400">
                  <Building2 className="w-8 h-8 stroke-1 text-slate-300" />
                  <span className="text-[10px] font-mono mt-1">No Logo</span>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/svg+xml, image/webp"
                onChange={handleLogoUpload}
                disabled={!isAdmin}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={!isAdmin}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-xs transition-colors disabled:opacity-40 flex items-center gap-1.5"
              >
                <Camera className="w-3.5 h-3.5 text-slate-500" />
                <span>{logoPreview ? 'Change Logo' : 'Upload Corporate Logo'}</span>
              </button>
              <p className="text-[11px] text-slate-400">
                Recommended: Square or landscape transparent PNG/SVG (Max 2MB)
              </p>
              {errors.logo && (
                <p className="text-xs text-red-600 font-medium">{errors.logo}</p>
              )}
            </div>
          </div>
        </div>

        {/* Legal & Contact Information */}
        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
            Legal & Primary Contact Details
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              id="companyName"
              label="Legal Company Name"
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
                  disabled={!isAdmin}
                  placeholder="e.g. Acme Global Technologies Inc."
                  className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white disabled:bg-slate-100 disabled:text-slate-500 transition-all"
                />
              </div>
            </FormField>

            <FormField
              id="companyEmail"
              label="Official Contact Email"
              required
              error={errors.companyEmail}
            >
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                <input
                  id="companyEmail"
                  type="email"
                  value={formData.companyEmail}
                  onChange={(e) => handleChange('companyEmail', e.target.value)}
                  disabled={!isAdmin}
                  placeholder="contact@company.internal"
                  className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white disabled:bg-slate-100 disabled:text-slate-500 transition-all"
                />
              </div>
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField
              id="companyPhone"
              label="Corporate Phone"
              error={errors.companyPhone}
            >
              <div className="relative flex items-center">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                <input
                  id="companyPhone"
                  type="tel"
                  value={formData.companyPhone}
                  onChange={(e) => handleChange('companyPhone', e.target.value)}
                  disabled={!isAdmin}
                  placeholder="+1 (555) 019-2834"
                  className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white disabled:bg-slate-100 disabled:text-slate-500 transition-all"
                />
              </div>
            </FormField>

            <FormField
              id="industry"
              label="Industry Sector"
            >
              <select
                id="industry"
                value={formData.industry}
                onChange={(e) => handleChange('industry', e.target.value)}
                disabled={!isAdmin}
                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white disabled:bg-slate-100 disabled:text-slate-500 transition-all"
              >
                {INDUSTRY_OPTIONS.map((ind) => (
                  <option key={ind} value={ind}>
                    {ind}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField
              id="website"
              label="Website URL"
              error={errors.website}
            >
              <div className="relative flex items-center">
                <Globe className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                <input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => handleChange('website', e.target.value)}
                  disabled={!isAdmin}
                  placeholder="https://company.internal"
                  className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white disabled:bg-slate-100 disabled:text-slate-500 transition-all"
                />
              </div>
            </FormField>
          </div>
        </div>

        {/* Headquarters Address */}
        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
            Headquarters Location
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <FormField
                id="address"
                label="Street Address"
              >
                <div className="relative flex items-center">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                  <input
                    id="address"
                    type="text"
                    value={formData.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    disabled={!isAdmin}
                    placeholder="100 Innovation Way, Suite 400"
                    className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white disabled:bg-slate-100 disabled:text-slate-500 transition-all"
                  />
                </div>
              </FormField>
            </div>

            <FormField
              id="city"
              label="City"
            >
              <input
                id="city"
                type="text"
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
                disabled={!isAdmin}
                placeholder="San Francisco"
                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white disabled:bg-slate-100 disabled:text-slate-500 transition-all"
              />
            </FormField>
          </div>

          <div className="sm:w-1/3">
            <FormField
              id="country"
              label="Country"
            >
              <input
                id="country"
                type="text"
                value={formData.country}
                onChange={(e) => handleChange('country', e.target.value)}
                disabled={!isAdmin}
                placeholder="United States"
                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white disabled:bg-slate-100 disabled:text-slate-500 transition-all"
              />
            </FormField>
          </div>
        </div>

        {/* Action Buttons */}
        {isAdmin && (
          <div className="pt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Reset Changes</span>
            </button>

            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            >
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
