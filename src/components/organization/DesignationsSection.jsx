import React, { useState } from 'react';
import {
  Briefcase,
  Plus,
  Search,
  Edit2,
  Power,
  Building2,
  Users,
  AlertTriangle,
  X,
  Info,
} from 'lucide-react';
import FormField from '../common/FormField.jsx';
import EmptyState from '../common/EmptyState.jsx';
import { useOrganization } from '../../context/OrganizationContext.jsx';
import { useEmployees } from '../../context/EmployeeContext.jsx';
import { useRole } from '../../context/RoleContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';

export default function DesignationsSection() {
  const {
    designations,
    activeDepartments,
    addDesignation,
    updateDesignation,
    toggleDesignationStatus,
  } = useOrganization();
  const { employees } = useEmployees();
  const { isAdmin, isHr } = useRole();
  const { showToast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [modalMode, setModalMode] = useState(null); // 'add' | 'edit' | null
  const [activeDesig, setActiveDesig] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    departmentId: '',
    description: '',
    status: 'Active',
  });
  const [formErrors, setFormErrors] = useState({});

  const canManage = isAdmin || isHr;

  // Calculate actual employee count per designation
  const getDesignationEmployeeCount = (desigName) => {
    return employees.filter(
      (e) => (e.designation || '').trim().toLowerCase() === desigName.trim().toLowerCase()
    ).length;
  };

  const filteredDesignations = designations.filter((d) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      d.name.toLowerCase().includes(q) ||
      (d.departmentName || '').toLowerCase().includes(q) ||
      (d.description || '').toLowerCase().includes(q)
    );
  });

  const openAddModal = () => {
    if (activeDepartments.length === 0) {
      showToast({
        type: 'info',
        title: 'Department Required',
        message: 'Please create at least one active department before configuring job designations.',
      });
      return;
    }

    setFormData({
      name: '',
      departmentId: activeDepartments[0]?.id || '',
      description: '',
      status: 'Active',
    });
    setFormErrors({});
    setModalMode('add');
  };

  const openEditModal = (desig) => {
    setActiveDesig(desig);
    setFormData({
      name: desig.name,
      departmentId: desig.departmentId || '',
      description: desig.description || '',
      status: desig.status || 'Active',
    });
    setFormErrors({});
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode(null);
    setActiveDesig(null);
    setFormErrors({});
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.name.trim()) {
      errs.name = 'Designation title is required.';
    }
    if (!formData.departmentId) {
      errs.departmentId = 'Department assignment is required.';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (modalMode === 'add') {
      const res = addDesignation(formData);
      if (res.success) {
        showToast({
          type: 'success',
          title: 'Designation Added',
          message: `Designation "${res.designation.name}" added to session.`,
        });
        closeModal();
      } else {
        setFormErrors({ name: res.error });
      }
    } else if (modalMode === 'edit') {
      const res = updateDesignation(activeDesig.id, formData);
      if (res.success) {
        showToast({
          type: 'success',
          title: 'Designation Updated',
          message: `Designation "${res.designation.name}" updated.`,
        });
        closeModal();
      } else {
        setFormErrors({ name: res.error });
      }
    }
  };

  const handleToggleStatus = (desig) => {
    toggleDesignationStatus(desig.id);
    showToast({
      type: desig.status === 'Active' ? 'info' : 'success',
      title: `Designation ${desig.status === 'Active' ? 'Deactivated' : 'Activated'}`,
      message: `"${desig.name}" status changed to ${desig.status === 'Active' ? 'Inactive' : 'Active'}.`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900">
            Job Designations & Titles
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Define official corporate titles associated with verified departments.
          </p>
        </div>

        {canManage && (
          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-xs transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Designation</span>
          </button>
        )}
      </div>

      {designations.length === 0 ? (
        <div className="p-8 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <EmptyState
            icon={Briefcase}
            title="No Designations Configured"
            description="Define specific career titles (e.g. Senior Frontend Engineer, HR Specialist, Account Director) mapped to your functional departments."
            actionText={canManage ? 'Add First Designation' : undefined}
            onAction={openAddModal}
            phaseBadge="Shared Session State &middot; 0 Titles"
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
                placeholder="Search by title, department..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white"
              />
            </div>

            <div className="text-xs text-slate-500">
              Total Titles: <strong className="font-semibold text-slate-800 font-mono">{designations.length}</strong>{' '}
              ({designations.filter((d) => d.status === 'Active').length} Active)
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Designation Title</th>
                    <th className="py-3 px-4 font-semibold">Department</th>
                    <th className="py-3 px-4 font-semibold">Description</th>
                    <th className="py-3 px-4 font-semibold">Employees Count</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    {canManage && <th className="py-3 px-4 font-semibold text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDesignations.map((desig) => {
                    const count = getDesignationEmployeeCount(desig.name);
                    return (
                      <tr key={desig.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                          {desig.name}
                        </td>
                        <td className="py-3 px-4 text-slate-700 whitespace-nowrap font-medium">
                          {desig.departmentName || 'Unassigned'}
                        </td>
                        <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                          {desig.description || '—'}
                        </td>
                        <td className="py-3 px-4 font-mono font-medium text-slate-700 whitespace-nowrap">
                          {count}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                              desig.status === 'Active'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                desig.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'
                              }`}
                            />
                            {desig.status}
                          </span>
                        </td>
                        {canManage && (
                          <td className="py-3 px-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => openEditModal(desig)}
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="Edit Designation"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleToggleStatus(desig)}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  desig.status === 'Active'
                                    ? 'text-slate-500 hover:text-amber-600 hover:bg-amber-50'
                                    : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50'
                                }`}
                                title={desig.status === 'Active' ? 'Deactivate Designation' : 'Activate Designation'}
                              >
                                <Power className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Designation Modal */}
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
                {modalMode === 'add' ? 'Create New Designation' : 'Edit Designation'}
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
                id="desigName"
                label="Designation / Title"
                required
                error={formErrors.name}
              >
                <input
                  id="desigName"
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, name: e.target.value }));
                    if (formErrors.name) setFormErrors({});
                  }}
                  placeholder="e.g. Lead Full-Stack Engineer"
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white"
                />
              </FormField>

              <FormField
                id="desigDept"
                label="Associated Department"
                required
                error={formErrors.departmentId}
              >
                <select
                  id="desigDept"
                  value={formData.departmentId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, departmentId: e.target.value }))}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white"
                >
                  <option value="">Select a department...</option>
                  {activeDepartments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField
                id="desigDesc"
                label="Job Scope & Responsibilities"
              >
                <textarea
                  id="desigDesc"
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Senior technical ownership of core web application modules."
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white resize-none"
                />
              </FormField>

              <FormField
                id="desigStatus"
                label="Status"
              >
                <select
                  id="desigStatus"
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
                  {modalMode === 'add' ? 'Create Designation' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
