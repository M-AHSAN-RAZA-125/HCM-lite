import React, { useState } from 'react';
import {
  Building2,
  Plus,
  Search,
  Edit2,
  Power,
  Users,
  AlertTriangle,
  X,
  CheckCircle2,
  Info,
  Shield,
} from 'lucide-react';
import FormField from '../common/FormField.jsx';
import EmptyState from '../common/EmptyState.jsx';
import { useOrganization } from '../../context/OrganizationContext.jsx';
import { useEmployees } from '../../context/EmployeeContext.jsx';
import { useRole } from '../../context/RoleContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';

export default function DepartmentsSection() {
  const { departments, addDepartment, updateDepartment, toggleDepartmentStatus } = useOrganization();
  const { employees } = useEmployees();
  const { isAdmin, isHr, isEmployee } = useRole();
  const { showToast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [modalMode, setModalMode] = useState(null); // 'add' | 'edit' | null
  const [activeDepartment, setActiveDepartment] = useState(null);
  const [confirmDeactivateDep, setConfirmDeactivateDep] = useState(null);

  // Form state for modal
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    headEmployeeId: '',
    status: 'Active',
  });
  const [formErrors, setFormErrors] = useState({});

  const canManage = isAdmin || isHr;

  // Calculate actual employee count per department
  const getDepartmentEmployeeCount = (depName) => {
    return employees.filter(
      (e) => (e.department || '').trim().toLowerCase() === depName.trim().toLowerCase()
    ).length;
  };

  // Find department head name
  const getDepartmentHeadName = (headId) => {
    if (!headId) return 'Unassigned';
    const emp = employees.find((e) => e.id === headId || e.employeeId === headId);
    return emp ? emp.fullName : headId;
  };

  const filteredDepartments = departments.filter((d) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      d.name.toLowerCase().includes(q) ||
      (d.description || '').toLowerCase().includes(q)
    );
  });

  const openAddModal = () => {
    setFormData({
      name: '',
      description: '',
      headEmployeeId: '',
      status: 'Active',
    });
    setFormErrors({});
    setModalMode('add');
  };

  const openEditModal = (dep) => {
    setActiveDepartment(dep);
    setFormData({
      name: dep.name,
      description: dep.description || '',
      headEmployeeId: dep.headEmployeeId || '',
      status: dep.status || 'Active',
    });
    setFormErrors({});
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode(null);
    setActiveDepartment(null);
    setFormErrors({});
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.name.trim()) {
      errs.name = 'Department name is required.';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (modalMode === 'add') {
      const res = addDepartment(formData);
      if (res.success) {
        showToast({
          type: 'success',
          title: 'Department Created',
          message: `Department "${res.department.name}" added to current session.`,
        });
        closeModal();
      } else {
        setFormErrors({ name: res.error });
      }
    } else if (modalMode === 'edit') {
      const res = updateDepartment(activeDepartment.id, formData);
      if (res.success) {
        showToast({
          type: 'success',
          title: 'Department Updated',
          message: `Department "${res.department.name}" updated in session.`,
        });
        closeModal();
      } else {
        setFormErrors({ name: res.error });
      }
    }
  };

  const handleToggleStatus = (dep) => {
    if (dep.status === 'Active') {
      setConfirmDeactivateDep(dep);
    } else {
      toggleDepartmentStatus(dep.id);
      showToast({
        type: 'success',
        title: 'Department Activated',
        message: `Department "${dep.name}" is now active.`,
      });
    }
  };

  const confirmDeactivate = () => {
    if (confirmDeactivateDep) {
      toggleDepartmentStatus(confirmDeactivateDep.id);
      showToast({
        type: 'info',
        title: 'Department Deactivated',
        message: `Department "${confirmDeactivateDep.name}" marked as Inactive. Existing employee assignments are preserved.`,
      });
      setConfirmDeactivateDep(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900">
            Department Management
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure functional divisions, assign department heads from actual employee rosters, and track headcounts.
          </p>
        </div>

        {canManage && (
          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-xs transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Department</span>
          </button>
        )}
      </div>

      {departments.length === 0 ? (
        <div className="p-8 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <EmptyState
            icon={Building2}
            title="No Departments Configured"
            description="Organize your workforce into functional business units (e.g. Engineering, Sales, Operations). Employee records will link directly to configured departments."
            actionText={canManage ? 'Add First Department' : undefined}
            onAction={openAddModal}
            phaseBadge="Shared Session State &middot; 0 Units"
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
                placeholder="Search departments..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white"
              />
            </div>

            <div className="text-xs text-slate-500">
              Total Units: <strong className="font-semibold text-slate-800 font-mono">{departments.length}</strong>{' '}
              ({departments.filter((d) => d.status === 'Active').length} Active)
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Department Name</th>
                    <th className="py-3 px-4 font-semibold">Description</th>
                    <th className="py-3 px-4 font-semibold">Department Head</th>
                    <th className="py-3 px-4 font-semibold">Employees</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    {canManage && <th className="py-3 px-4 font-semibold text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDepartments.map((dep) => {
                    const count = getDepartmentEmployeeCount(dep.name);
                    const headName = getDepartmentHeadName(dep.headEmployeeId);
                    return (
                      <tr key={dep.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                          {dep.name}
                        </td>
                        <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                          {dep.description || '—'}
                        </td>
                        <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                          {headName}
                        </td>
                        <td className="py-3 px-4 font-mono font-medium text-slate-700 whitespace-nowrap">
                          {count}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                              dep.status === 'Active'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                dep.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'
                              }`}
                            />
                            {dep.status}
                          </span>
                        </td>
                        {canManage && (
                          <td className="py-3 px-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => openEditModal(dep)}
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="Edit Department"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleToggleStatus(dep)}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  dep.status === 'Active'
                                    ? 'text-slate-500 hover:text-amber-600 hover:bg-amber-50'
                                    : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50'
                                }`}
                                title={dep.status === 'Active' ? 'Deactivate Department' : 'Activate Department'}
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

      {/* Add / Edit Department Modal */}
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
                {modalMode === 'add' ? 'Create New Department' : 'Edit Department'}
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
                id="depName"
                label="Department Name"
                required
                error={formErrors.name}
              >
                <input
                  id="depName"
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, name: e.target.value }));
                    if (formErrors.name) setFormErrors({});
                  }}
                  placeholder="e.g. Engineering / Product Operations"
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white"
                />
              </FormField>

              <FormField
                id="depDesc"
                label="Description"
                hint="Core function and scope of responsibility"
              >
                <textarea
                  id="depDesc"
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Responsible for platform engineering and architecture."
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white resize-none"
                />
              </FormField>

              <FormField
                id="depHead"
                label="Department Head"
                hint="Selected from enrolled team members"
              >
                <select
                  id="depHead"
                  value={formData.headEmployeeId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, headEmployeeId: e.target.value }))}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white"
                >
                  <option value="">Unassigned (None)</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} ({emp.employeeId} &middot; {emp.designation || 'Staff'})
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField
                id="depStatus"
                label="Department Status"
              >
                <select
                  id="depStatus"
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
                  {modalMode === 'add' ? 'Create Department' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Deactivation */}
      {confirmDeactivateDep && (
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
              Deactivate Department &ldquo;{confirmDeactivateDep.name}&rdquo;?
            </h3>

            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              Deactivating this department will hide it from future employee onboarding dropdowns. Existing employee records currently assigned to this department{' '}
              <strong className="text-slate-900 font-semibold">
                will remain completely intact
              </strong>{' '}
              and unaffected.
            </p>

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmDeactivateDep(null)}
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
