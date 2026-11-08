import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  User,
  Mail,
  Phone,
  Calendar,
  Building2,
  Briefcase,
  Key,
  Upload,
  Camera,
  Shield,
  AlertCircle,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import FormField from '../common/FormField.jsx';
import PasswordInput from '../common/PasswordInput.jsx';
import { useRole } from '../../context/RoleContext.jsx';
import { useEmployees } from '../../context/EmployeeContext.jsx';
import { useOrganization } from '../../context/OrganizationContext.jsx';

export const DEPARTMENTS = [
  'Engineering',
  'Product',
  'Human Resources',
  'Marketing',
  'Sales',
  'Operations',
  'Finance',
  'Legal',
];

export const EMPLOYMENT_TYPES = [
  'Full-Time',
  'Part-Time',
  'Contract',
  'Intern',
];

export const EMPLOYMENT_STATUSES = [
  'Active',
  'Inactive',
  'On Leave',
];

export const GENDER_OPTIONS = [
  'Prefer not to say',
  'Female',
  'Male',
  'Non-Binary',
];

export default function EmployeeFormModal({
  isOpen,
  mode = 'add', // 'add' | 'edit'
  initialData = null,
  onClose,
  onSave,
}) {
  const { isEmployee } = useRole();
  const { isEmployeeIdTaken, isEmailTaken } = useEmployees();
  const { activeDepartments, activeDesignations } = useOrganization();
  const fileInputRef = useRef(null);

  const configuredDeptNames = activeDepartments.map((d) => d.name);
  const baseDeptOptions = configuredDeptNames.length > 0 ? configuredDeptNames : DEPARTMENTS;
  const finalDeptOptions =
    mode === 'edit' && initialData?.department && !baseDeptOptions.includes(initialData.department)
      ? [initialData.department, ...baseDeptOptions]
      : baseDeptOptions;

  const matchingDesignations = activeDesignations
    .filter(
      (des) =>
        (des.departmentName || '').trim().toLowerCase() === (formData?.department || '').trim().toLowerCase()
    )
    .map((des) => des.name);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: 'Prefer not to say',
    address: '',
    city: '',
    photoUrl: null,
    employeeId: '',
    department: 'Engineering',
    designation: '',
    joiningDate: new Date().toISOString().split('T')[0],
    employmentType: 'Full-Time',
    status: 'Active',
    reportingManager: '',
    createAccount: false,
    loginEmail: '',
    tempPassword: '',
    confirmPassword: '',
    accountStatus: 'Enabled',
  });

  const [errors, setErrors] = useState({});
  const [photoPreview, setPhotoPreview] = useState(null);

  // Sync initialData when modal opens or initialData changes
  useEffect(() => {
    if (initialData && mode === 'edit') {
      setFormData({
        firstName: initialData.firstName || '',
        lastName: initialData.lastName || '',
        email: initialData.email || '',
        phone: initialData.phone || '',
        dateOfBirth: initialData.dateOfBirth || '',
        gender: initialData.gender || 'Prefer not to say',
        address: initialData.address || '',
        city: initialData.city || '',
        photoUrl: initialData.photoUrl || null,
        employeeId: initialData.employeeId || initialData.id || '',
        department: initialData.department || 'Engineering',
        designation: initialData.designation || '',
        joiningDate: initialData.joiningDate || new Date().toISOString().split('T')[0],
        employmentType: initialData.employmentType || 'Full-Time',
        status: initialData.status || 'Active',
        reportingManager: initialData.reportingManager || '',
        createAccount: initialData.accountCreated || false,
        loginEmail: initialData.email || '',
        tempPassword: '',
        confirmPassword: '',
        accountStatus: initialData.accountStatus || 'Enabled',
      });
      setPhotoPreview(initialData.photoUrl || null);
    } else {
      // Default clean values for 'add'
      const generatedId = `EMP-${Math.floor(100 + Math.random() * 900)}`;
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        dateOfBirth: '',
        gender: 'Prefer not to say',
        address: '',
        city: '',
        photoUrl: null,
        employeeId: generatedId,
        department: 'Engineering',
        designation: '',
        joiningDate: new Date().toISOString().split('T')[0],
        employmentType: 'Full-Time',
        status: 'Active',
        reportingManager: '',
        createAccount: false,
        loginEmail: '',
        tempPassword: '',
        confirmPassword: '',
        accountStatus: 'Enabled',
      });
      setPhotoPreview(null);
    }
    setErrors({});
  }, [initialData, mode, isOpen]);

  if (!isOpen) return null;

  // When current user role is EMPLOYEE, restrict editing to only phone and address
  const isEmployeeRestricted = isEmployee && mode === 'edit';

  const validate = () => {
    const errs = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // In restricted employee mode, only phone/address can be edited
    if (isEmployeeRestricted) {
      setErrors(errs);
      return true;
    }

    if (!formData.firstName.trim()) {
      errs.firstName = 'First name is required.';
    }

    if (!formData.lastName.trim()) {
      errs.lastName = 'Last name is required.';
    }

    if (!formData.email.trim()) {
      errs.email = 'Email address is required.';
    } else if (!emailRegex.test(formData.email.trim())) {
      errs.email = 'Please enter a valid email address.';
    } else if (isEmailTaken(formData.email.trim(), initialData?.id)) {
      errs.email = 'Email is already assigned to another employee.';
    }

    if (!formData.employeeId.trim()) {
      errs.employeeId = 'Employee ID is required.';
    } else if (isEmployeeIdTaken(formData.employeeId.trim(), initialData?.id)) {
      errs.employeeId = 'Employee ID is already in use.';
    }

    if (!formData.designation.trim()) {
      errs.designation = 'Designation/title is required.';
    }

    if (!formData.joiningDate) {
      errs.joiningDate = 'Joining date is required.';
    }

    // Account creation fields validation
    if (formData.createAccount && mode === 'add') {
      if (formData.tempPassword && formData.tempPassword.length < 8) {
        errs.tempPassword = 'Password must be at least 8 characters.';
      }
      if (formData.tempPassword && formData.tempPassword !== formData.confirmPassword) {
        errs.confirmPassword = 'Passwords do not match.';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (field, value) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === 'email' && !prev.loginEmail) {
        updated.loginEmail = value;
      }
      return updated;
    });

    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setErrors((prev) => ({ ...prev, photo: 'Image size should be under 2MB.' }));
        return;
      }
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const dataUrl = uploadEvent.target?.result;
        setPhotoPreview(dataUrl);
        setFormData((prev) => ({ ...prev, photoUrl: dataUrl }));
        setErrors((prev) => ({ ...prev, photo: undefined }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSave(formData);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="employee-modal-title"
    >
      <div
        className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full my-auto shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70 shrink-0">
          <div>
            <h2 id="employee-modal-title" className="text-base sm:text-lg font-bold text-slate-900">
              {mode === 'edit' ? `Edit Employee Record` : 'Add New Employee'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {mode === 'edit'
                ? `Update employee profile and organizational metadata.`
                : 'Enrolls an employee into the current session directory.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition-colors focus:outline-none"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6" noValidate>
          {isEmployeeRestricted && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
              <Shield className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block">Employee Self-Service Mode:</strong>
                <span>You can update your personal contact phone number and residential address. Official designation, compensation, and department changes must be submitted to HR.</span>
              </div>
            </div>
          )}

          {/* Section A: Personal Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <User className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                A. Personal Information
              </h3>
            </div>

            {/* Photo upload row */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 relative group">
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Employee preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="font-mono text-xs font-semibold text-slate-400">
                    {formData.firstName ? formData.firstName.charAt(0) : 'Photo'}
                  </span>
                )}
              </div>

              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handlePhotoSelect}
                  className="hidden"
                  disabled={isEmployeeRestricted}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isEmployeeRestricted}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Camera className="w-3.5 h-3.5 text-slate-500" />
                  <span>{photoPreview ? 'Change Photo' : 'Upload Photo'}</span>
                </button>
                <span className="text-[11px] text-slate-400 block mt-1">
                  JPG, PNG or WEBP (Max 2MB)
                </span>
                {errors.photo && (
                  <p className="text-xs text-red-600 mt-1">{errors.photo}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                id="firstName"
                label="First Name"
                required
                error={errors.firstName}
              >
                <input
                  id="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => handleChange('firstName', e.target.value)}
                  disabled={isEmployeeRestricted}
                  placeholder="e.g. Jane"
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition-all disabled:bg-slate-100 disabled:text-slate-500"
                />
              </FormField>

              <FormField
                id="lastName"
                label="Last Name"
                required
                error={errors.lastName}
              >
                <input
                  id="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleChange('lastName', e.target.value)}
                  disabled={isEmployeeRestricted}
                  placeholder="e.g. Doe"
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition-all disabled:bg-slate-100 disabled:text-slate-500"
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                id="email"
                label="Corporate Email Address"
                required
                error={errors.email}
              >
                <div className="relative flex items-center">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                  <input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    disabled={isEmployeeRestricted}
                    placeholder="jane.doe@company.internal"
                    className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition-all disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </div>
              </FormField>

              <FormField
                id="phone"
                label="Phone Number"
                error={errors.phone}
              >
                <div className="relative flex items-center">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                  <input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="+1 (555) 123-4567"
                    className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition-all"
                  />
                </div>
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                id="dateOfBirth"
                label="Date of Birth"
              >
                <input
                  id="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                  disabled={isEmployeeRestricted}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition-all disabled:bg-slate-100 disabled:text-slate-500"
                />
              </FormField>

              <FormField
                id="gender"
                label="Gender Identity"
              >
                <select
                  id="gender"
                  value={formData.gender}
                  onChange={(e) => handleChange('gender', e.target.value)}
                  disabled={isEmployeeRestricted}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition-all disabled:bg-slate-100 disabled:text-slate-500"
                >
                  {GENDER_OPTIONS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <FormField
                  id="address"
                  label="Residential Address"
                >
                  <input
                    id="address"
                    type="text"
                    value={formData.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    placeholder="123 Market Street, Apt 4B"
                    className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition-all"
                  />
                </FormField>
              </div>

              <FormField
                id="city"
                label="City / Metro"
              >
                <input
                  id="city"
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  disabled={isEmployeeRestricted}
                  placeholder="San Francisco"
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition-all disabled:bg-slate-100 disabled:text-slate-500"
                />
              </FormField>
            </div>
          </div>

          {/* Section B: Employment Information */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Briefcase className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                B. Employment Information
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField
                id="employeeId"
                label="Employee ID"
                required
                error={errors.employeeId}
              >
                <input
                  id="employeeId"
                  type="text"
                  value={formData.employeeId}
                  onChange={(e) => handleChange('employeeId', e.target.value.toUpperCase())}
                  disabled={mode === 'edit' || isEmployeeRestricted}
                  placeholder="EMP-101"
                  className="w-full px-3.5 py-2 text-xs sm:text-sm font-mono bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition-all disabled:bg-slate-100 disabled:text-slate-500"
                />
              </FormField>

              <FormField
                id="department"
                label="Department"
                required
              >
                <select
                  id="department"
                  value={formData.department}
                  onChange={(e) => handleChange('department', e.target.value)}
                  disabled={isEmployeeRestricted}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition-all disabled:bg-slate-100 disabled:text-slate-500"
                >
                  {finalDeptOptions.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField
                id="designation"
                label="Designation / Role"
                required
                error={errors.designation}
                hint={matchingDesignations.length > 0 ? `${matchingDesignations.length} titles in ${formData.department}` : undefined}
              >
                <div className="relative">
                  <input
                    id="designation"
                    type="text"
                    list="designations-list"
                    value={formData.designation}
                    onChange={(e) => handleChange('designation', e.target.value)}
                    disabled={isEmployeeRestricted}
                    placeholder="e.g. Lead Engineer"
                    className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition-all disabled:bg-slate-100 disabled:text-slate-500"
                  />
                  {matchingDesignations.length > 0 && (
                    <datalist id="designations-list">
                      {matchingDesignations.map((title) => (
                        <option key={title} value={title} />
                      ))}
                    </datalist>
                  )}
                </div>
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField
                id="joiningDate"
                label="Joining Date"
                required
                error={errors.joiningDate}
              >
                <input
                  id="joiningDate"
                  type="date"
                  value={formData.joiningDate}
                  onChange={(e) => handleChange('joiningDate', e.target.value)}
                  disabled={isEmployeeRestricted}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition-all disabled:bg-slate-100 disabled:text-slate-500"
                />
              </FormField>

              <FormField
                id="employmentType"
                label="Employment Type"
              >
                <select
                  id="employmentType"
                  value={formData.employmentType}
                  onChange={(e) => handleChange('employmentType', e.target.value)}
                  disabled={isEmployeeRestricted}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition-all disabled:bg-slate-100 disabled:text-slate-500"
                >
                  {EMPLOYMENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField
                id="status"
                label="Employment Status"
              >
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  disabled={isEmployeeRestricted}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition-all disabled:bg-slate-100 disabled:text-slate-500"
                >
                  {EMPLOYMENT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            <FormField
              id="reportingManager"
              label="Reporting Manager"
              hint="Supervisor or Team Lead"
            >
              <input
                id="reportingManager"
                type="text"
                value={formData.reportingManager}
                onChange={(e) => handleChange('reportingManager', e.target.value)}
                disabled={isEmployeeRestricted}
                placeholder="e.g. Sarah Jenkins (VP Engineering)"
                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition-all disabled:bg-slate-100 disabled:text-slate-500"
              />
            </FormField>
          </div>

          {/* Section C: Account Information (only for HR / Add mode) */}
          {!isEmployeeRestricted && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Key className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  C. Account Information
                </h3>
              </div>

              <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-3">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.createAccount}
                    onChange={(e) => handleChange('createAccount', e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-semibold text-slate-800">
                    Create Employee Login Account (Self-Service Portal)
                  </span>
                </label>

                {formData.createAccount && (
                  <div className="space-y-3 pt-2">
                    <div className="p-2.5 bg-indigo-50/60 border border-indigo-100 rounded-lg text-[11px] text-indigo-900 leading-relaxed">
                      <strong>Frontend Notice:</strong> Account credential records will be dispatched to the identity provider once backend authentication is connected. Temporary passwords are strictly ephemeral and not saved to browser storage.
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <FormField
                        id="loginEmail"
                        label="Login Email"
                        hint="Defaults to corporate email"
                      >
                        <input
                          id="loginEmail"
                          type="email"
                          value={formData.loginEmail || formData.email}
                          onChange={(e) => handleChange('loginEmail', e.target.value)}
                          className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900"
                        />
                      </FormField>

                      <FormField
                        id="accountStatus"
                        label="Account Status"
                      >
                        <select
                          id="accountStatus"
                          value={formData.accountStatus}
                          onChange={(e) => handleChange('accountStatus', e.target.value)}
                          className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900"
                        >
                          <option value="Enabled">Enabled</option>
                          <option value="Disabled">Disabled</option>
                        </select>
                      </FormField>
                    </div>

                    {mode === 'add' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <FormField
                          id="tempPassword"
                          label="Temporary Password"
                          error={errors.tempPassword}
                          hint="At least 8 characters"
                        >
                          <PasswordInput
                            id="tempPassword"
                            name="tempPassword"
                            value={formData.tempPassword}
                            onChange={(e) => handleChange('tempPassword', e.target.value)}
                            error={!!errors.tempPassword}
                            placeholder="Min 8 characters"
                            autoComplete="new-password"
                          />
                        </FormField>

                        <FormField
                          id="confirmPassword"
                          label="Confirm Password"
                          error={errors.confirmPassword}
                        >
                          <PasswordInput
                            id="confirmPassword"
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={(e) => handleChange('confirmPassword', e.target.value)}
                            error={!!errors.confirmPassword}
                            placeholder="Match password"
                            autoComplete="new-password"
                          />
                        </FormField>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors focus:outline-none"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            >
              {mode === 'edit' ? 'Update Employee' : 'Save Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
