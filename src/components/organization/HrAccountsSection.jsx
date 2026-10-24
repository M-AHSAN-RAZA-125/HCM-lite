import React, { useState } from 'react';
import {
  ShieldCheck,
  Plus,
  Search,
  Edit2,
  Power,
  Mail,
  Phone,
  Building2,
  Lock,
  X,
  AlertCircle,
  Info,
} from 'lucide-react';
import FormField from '../common/FormField.jsx';
import EmptyState from '../common/EmptyState.jsx';
import { useOrganization } from '../../context/OrganizationContext.jsx';
import { useRole } from '../../context/RoleContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';

export default function HrAccountsSection() {
  const { hrAccounts, activeDepartments, addHrAccount, updateHrAccount, toggleHrAccountStatus } = useOrganization();
  const { isAdmin } = useRole();
  const { showToast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [modalMode, setModalMode] = useState(null); // 'add' | 'edit'
  const [activeAccount, setActiveAccount] = useState(null);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    department: '',
    status: 'Active',
  });
  const [formErrors, setFormErrors] = useState({});

  const filteredAccounts = hrAccounts.filter((acc) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      acc.fullName.toLowerCase().includes(q) ||
      acc.email.toLowerCase().includes(q) ||
      (acc.department || '').toLowerCase().includes(q)
    );
  });

  const openAddModal = () => {
    setFormData({
      fullName: '',
      email: '',
      phone: '',
      department: '',
      status: 'Active',
    });
    setFormErrors({});
    setModalMode('add');
  };

  const openEditModal = (acc) => {
    setActiveAccount(acc);
    setFormData({
      fullName: acc.fullName,
      email: acc.email,
      phone: acc.phone || '',
      department: acc.department || '',
      status: acc.status || 'Active',
    });
    setFormErrors({});
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode(null);
    setActiveAccount(null);
    setFormErrors({});
  };

  const validateForm = () => {
    const errs = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!formData.fullName.trim()) {
      errs.fullName = 'Full name is required.';
    }

    if (!formData.email.trim()) {
      errs.email = 'Corporate work email is required.';
    } else if (!emailRegex.test(formData.email.trim())) {
      errs.email = 'Please enter a valid email address.';
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (modalMode === 'add') {
      const res = addHrAccount(formData);
      if (res.success) {
        showToast({
          type: 'success',
          title: 'HR Account Configured',
          message: `HR access role configured for ${res.hrAccount.fullName}. (Frontend preview mode).`,
        });
        closeModal();
      } else {
        setFormErrors({ email: res.error });
      }
    } else if (modalMode === 'edit') {
      const res = updateHrAccount(activeAccount.id, formData);
      if (res.success) {
        showToast({
          type: 'success',
          title: 'HR Account Updated',
          message: `Details updated for ${res.hrAccount.fullName}.`,
        });
        closeModal();
      } else {
        setFormErrors({ email: res.error });
      }
    }
  };

  const handleToggleStatus = (acc) => {
    toggleHrAccountStatus(acc.id);
    showToast({
      type: acc.status === 'Active' ? 'info' : 'success',
      title: `Account ${acc.status === 'Active' ? 'Deactivated' : 'Activated'}`,
      message: `${acc.fullName} access status set to ${acc.status === 'Active' ? 'Inactive' : 'Active'}.`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900">
            HR Access & Administrative Accounts
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure delegated Human Resources management personnel and operational access tiers.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-xs transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Configure HR Account</span>
          </button>
        )}
      </div>

      {/* Development Transparency Banner */}
      <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-3">
        <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="font-semibold block">Frontend Account Configuration Preview:</strong>
          <p className="text-amber-800 leading-relaxed">
            This module configures the HR user roster within the client application state. Real credential issuance, automated email invitation dispatches, and role-based authentication will be executed by the backend authorization service in future phases. No passwords are stored in browser storage.
          </p>
        </div>
      </div>

      {hrAccounts.length === 0 ? (
        <div className="p-8 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <EmptyState
            icon={ShieldCheck}
            title="No Delegated HR Accounts Configured"
            description="Configure delegated HR Managers and People Operations team members who can manage employee rosters, attendance, leaves, and payroll."
            actionText={isAdmin ? 'Configure First HR Account' : undefined}
            onAction={openAddModal}
            phaseBadge="Shared Session State &middot; 0 HR Personnel"
          />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Search bar & summary */}
          <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search HR accounts by name or email..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white"
              />
            </div>

            <div className="text-xs text-slate-500">
              Total HR Personnel: <strong className="font-semibold text-slate-800 font-mono">{hrAccounts.length}</strong>{' '}
              ({hrAccounts.filter((a) => a.status === 'Active').length} Active)
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Full Name</th>
                    <th className="py-3 px-4 font-semibold">Corporate Email</th>
                    <th className="py-3 px-4 font-semibold">Phone</th>
                    <th className="py-3 px-4 font-semibold">Assigned Division</th>
                    <th className="py-3 px-4 font-semibold">Account Status</th>
                    {isAdmin && <th className="py-3 px-4 font-semibold text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAccounts.map((acc) => (
                    <tr key={acc.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                        {acc.fullName}
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {acc.email}
                      </td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {acc.phone || '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-700 whitespace-nowrap font-medium">
                        {acc.department || 'General HR'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                            acc.status === 'Active'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              acc.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          />
                          {acc.status}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="py-3 px-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditModal(acc)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Edit Account Details"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleToggleStatus(acc)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                acc.status === 'Active'
                                  ? 'text-slate-500 hover:text-amber-600 hover:bg-amber-50'
                                  : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50'
                              }`}
                              title={acc.status === 'Active' ? 'Deactivate Account' : 'Activate Account'}
                            >
                              <Power className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {modalMode && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900">
                {modalMode === 'add' ? 'Configure HR Account' : 'Edit HR Account'}
              </h3>
              <button
                onClick={closeModal}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4" noValidate>
              <FormField
                id="hrName"
                label="Full Name"
                required
                error={formErrors.fullName}
              >
                <input
                  id="hrName"
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, fullName: e.target.value }));
                    if (formErrors.fullName) setFormErrors({});
                  }}
                  placeholder="e.g. David Chen"
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white"
                />
              </FormField>

              <FormField
                id="hrEmail"
                label="Corporate Work Email"
                required
                error={formErrors.email}
              >
                <input
                  id="hrEmail"
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, email: e.target.value }));
                    if (formErrors.email) setFormErrors({});
                  }}
                  placeholder="david.chen@company.internal"
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white"
                />
              </FormField>

              <FormField
                id="hrPhone"
                label="Phone Number"
              >
                <input
                  id="hrPhone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="+1 (555) 019-3321"
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white"
                />
              </FormField>

              <FormField
                id="hrDept"
                label="Assigned Division / Unit"
                hint="Optional department-level delegation"
              >
                <select
                  id="hrDept"
                  value={formData.department}
                  onChange={(e) => setFormData((prev) => ({ ...prev, department: e.target.value }))}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white"
                >
                  <option value="">General Human Resources (All)</option>
                  {activeDepartments.map((dept) => (
                    <option key={dept.id} value={dept.name}>
                      {dept.name} Division
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField
                id="hrStatus"
                label="Account Status"
              >
                <select
                  id="hrStatus"
                  value={formData.status}
                  onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </FormField>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-xs"
                >
                  {modalMode === 'add' ? 'Save Configuration' : 'Update Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
