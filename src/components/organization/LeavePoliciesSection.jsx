import React, { useState } from 'react';
import {
  CalendarCheck,
  Plus,
  Search,
  Edit2,
  Power,
  Shield,
  CheckCircle2,
  AlertTriangle,
  X,
  FileText,
} from 'lucide-react';
import FormField from '../common/FormField.jsx';
import EmptyState from '../common/EmptyState.jsx';
import { useOrganization } from '../../context/OrganizationContext.jsx';
import { useRole } from '../../context/RoleContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';

export default function LeavePoliciesSection() {
  const { leaveTypes, addLeaveType, updateLeaveType, toggleLeaveTypeStatus } = useOrganization();
  const { isAdmin, isHr } = useRole();
  const { showToast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [modalMode, setModalMode] = useState(null); // 'add' | 'edit'
  const [activeLeave, setActiveLeave] = useState(null);
  const [confirmDeactivateLeave, setConfirmDeactivateLeave] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    quotaDays: 14,
    paidType: 'Paid',
    requiresApproval: true,
    carryForward: false,
    maxCarryForward: 0,
    status: 'Active',
  });
  const [formErrors, setFormErrors] = useState({});

  const canManage = isAdmin || isHr;

  const filteredLeaveTypes = leaveTypes.filter((lt) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      lt.name.toLowerCase().includes(q) ||
      (lt.description || '').toLowerCase().includes(q) ||
      lt.paidType.toLowerCase().includes(q)
    );
  });

  const openAddModal = () => {
    setFormData({
      name: '',
      description: '',
      quotaDays: 14,
      paidType: 'Paid',
      requiresApproval: true,
      carryForward: false,
      maxCarryForward: 0,
      status: 'Active',
    });
    setFormErrors({});
    setModalMode('add');
  };

  const openEditModal = (lt) => {
    setActiveLeave(lt);
    setFormData({
      name: lt.name,
      description: lt.description || '',
      quotaDays: lt.quotaDays,
      paidType: lt.paidType || 'Paid',
      requiresApproval: lt.requiresApproval !== undefined ? lt.requiresApproval : true,
      carryForward: lt.carryForward !== undefined ? lt.carryForward : false,
      maxCarryForward: lt.maxCarryForward || 0,
      status: lt.status || 'Active',
    });
    setFormErrors({});
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode(null);
    setActiveLeave(null);
    setFormErrors({});
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.name.trim()) {
      errs.name = 'Leave type name is required.';
    }

    const quota = Number(formData.quotaDays);
    if (isNaN(quota) || quota < 0) {
      errs.quotaDays = 'Annual quota must be a non-negative number of days.';
    }

    if (formData.carryForward) {
      const maxCarry = Number(formData.maxCarryForward);
      if (isNaN(maxCarry) || maxCarry < 0) {
        errs.maxCarryForward = 'Maximum carry forward must be a non-negative number.';
      } else if (maxCarry > quota) {
        errs.maxCarryForward = 'Carry forward days cannot exceed the total annual quota.';
      }
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (modalMode === 'add') {
      const res = addLeaveType(formData);
      if (res.success) {
        showToast({
          type: 'success',
          title: 'Leave Policy Created',
          message: `Leave policy "${res.leaveType.name}" added to session.`,
        });
        closeModal();
      } else {
        setFormErrors({ name: res.error });
      }
    } else if (modalMode === 'edit') {
      const res = updateLeaveType(activeLeave.id, formData);
      if (res.success) {
        showToast({
          type: 'success',
          title: 'Leave Policy Updated',
          message: `Leave policy "${res.leaveType.name}" updated.`,
        });
        closeModal();
      } else {
        setFormErrors({ name: res.error });
      }
    }
  };

  const handleToggleStatus = (lt) => {
    if (lt.status === 'Active') {
      setConfirmDeactivateLeave(lt);
    } else {
      toggleLeaveTypeStatus(lt.id);
      showToast({
        type: 'success',
        title: 'Leave Policy Activated',
        message: `Policy "${lt.name}" is now active.`,
      });
    }
  };

  const confirmDeactivate = () => {
    if (confirmDeactivateLeave) {
      toggleLeaveTypeStatus(confirmDeactivateLeave.id);
      showToast({
        type: 'info',
        title: 'Leave Policy Deactivated',
        message: `Policy "${confirmDeactivateLeave.name}" set to Inactive. Existing historical balances are untouched.`,
      });
      setConfirmDeactivateLeave(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900">
            Leave Types & Accrual Policies
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure time-off categories, annual day quotas, paid vs unpaid structures, and carry-forward allowances.
          </p>
        </div>

        {canManage && (
          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-xs transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Leave Type</span>
          </button>
        )}
      </div>

      {leaveTypes.length === 0 ? (
        <div className="p-8 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <EmptyState
            icon={CalendarCheck}
            title="No Leave Policies Configured"
            description="Create your company's time-off policies (e.g. Annual Vacation, Casual Leave, Sick Leave, Parental Leave) with explicit day quotas and approval rules."
            actionText={canManage ? 'Add First Leave Policy' : undefined}
            onAction={openAddModal}
            phaseBadge="Shared Session State &middot; 0 Policies"
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
                placeholder="Search leave policies..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white"
              />
            </div>

            <div className="text-xs text-slate-500">
              Total Policies: <strong className="font-semibold text-slate-800 font-mono">{leaveTypes.length}</strong>{' '}
              ({leaveTypes.filter((lt) => lt.status === 'Active').length} Active)
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Policy Name</th>
                    <th className="py-3 px-4 font-semibold">Compensation</th>
                    <th className="py-3 px-4 font-semibold">Annual Quota</th>
                    <th className="py-3 px-4 font-semibold">Approval Req.</th>
                    <th className="py-3 px-4 font-semibold">Carry Forward</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    {canManage && <th className="py-3 px-4 font-semibold text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLeaveTypes.map((lt) => (
                    <tr key={lt.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                        <div>{lt.name}</div>
                        {lt.description && (
                          <div className="text-[11px] text-slate-400 font-normal truncate max-w-xs">
                            {lt.description}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold ${
                            lt.paidType === 'Paid'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {lt.paidType}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-800 whitespace-nowrap">
                        {lt.quotaDays} days/yr
                      </td>
                      <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                        {lt.requiresApproval ? 'Yes' : 'No (Auto)'}
                      </td>
                      <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                        {lt.carryForward ? `Max ${lt.maxCarryForward} days` : 'Disabled'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                            lt.status === 'Active'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              lt.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          />
                          {lt.status}
                        </span>
                      </td>
                      {canManage && (
                        <td className="py-3 px-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditModal(lt)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Edit Leave Policy"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleToggleStatus(lt)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                lt.status === 'Active'
                                  ? 'text-slate-500 hover:text-amber-600 hover:bg-amber-50'
                                  : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50'
                              }`}
                              title={lt.status === 'Active' ? 'Deactivate Policy' : 'Activate Policy'}
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
            className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900">
                {modalMode === 'add' ? 'Configure New Leave Policy' : 'Edit Leave Policy'}
              </h3>
              <button
                onClick={closeModal}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4" noValidate>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  id="ltName"
                  label="Policy Name"
                  required
                  error={formErrors.name}
                >
                  <input
                    id="ltName"
                    type="text"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, name: e.target.value }));
                      if (formErrors.name) setFormErrors({});
                    }}
                    placeholder="e.g. Annual Vacation Leave"
                    className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white"
                  />
                </FormField>

                <FormField
                  id="ltPaid"
                  label="Compensation Type"
                >
                  <select
                    id="ltPaid"
                    value={formData.paidType}
                    onChange={(e) => setFormData((prev) => ({ ...prev, paidType: e.target.value }))}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white"
                  >
                    <option value="Paid">Paid Leave</option>
                    <option value="Unpaid">Unpaid Leave</option>
                  </select>
                </FormField>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  id="ltQuota"
                  label="Annual Quota (Days per Year)"
                  required
                  error={formErrors.quotaDays}
                >
                  <input
                    id="ltQuota"
                    type="number"
                    min="0"
                    max="365"
                    value={formData.quotaDays}
                    onChange={(e) => setFormData((prev) => ({ ...prev, quotaDays: Number(e.target.value) }))}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white font-mono"
                  />
                </FormField>

                <FormField
                  id="ltStatus"
                  label="Policy Status"
                >
                  <select
                    id="ltStatus"
                    value={formData.status}
                    onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </FormField>
              </div>

              <FormField
                id="ltDesc"
                label="Description & Eligibility Conditions"
              >
                <textarea
                  id="ltDesc"
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Accrues at 1.16 days per month for full-time permanent employees."
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white resize-none"
                />
              </FormField>

              {/* Approval & Carry Forward options */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.requiresApproval}
                    onChange={(e) => setFormData((prev) => ({ ...prev, requiresApproval: e.target.checked }))}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs text-slate-700 font-medium">
                    Requires Supervisor or HR Approval
                  </span>
                </label>

                <div className="pt-2 border-t border-slate-200/80">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.carryForward}
                      onChange={(e) => setFormData((prev) => ({ ...prev, carryForward: e.target.checked }))}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-xs text-slate-700 font-medium">
                      Enable Annual Carry-Forward to Next Year
                    </span>
                  </label>

                  {formData.carryForward && (
                    <div className="mt-2.5 pl-6">
                      <FormField
                        id="ltMaxCarry"
                        label="Maximum Carry Forward Days"
                        error={formErrors.maxCarryForward}
                      >
                        <input
                          id="ltMaxCarry"
                          type="number"
                          min="0"
                          max={formData.quotaDays || 365}
                          value={formData.maxCarryForward}
                          onChange={(e) => setFormData((prev) => ({ ...prev, maxCarryForward: Number(e.target.value) }))}
                          className="w-full sm:w-48 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 font-mono"
                        />
                      </FormField>
                    </div>
                  )}
                </div>
              </div>

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
                  {modalMode === 'add' ? 'Create Policy' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Deactivation */}
      {confirmDeactivateLeave && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900">
              Deactivate Leave Policy &ldquo;{confirmDeactivateLeave.name}&rdquo;?
            </h3>

            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              Deactivating this policy disables new leave requests under this category. Previously recorded leave histories and approvals{' '}
              <strong className="text-slate-900 font-semibold">are retained safely</strong>.
            </p>

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmDeactivateLeave(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeactivate}
                className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs"
              >
                Confirm Deactivation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
