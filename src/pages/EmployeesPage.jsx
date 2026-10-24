import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Users,
  UserPlus,
  Filter,
  Download,
  Upload,
  Search,
  MoreVertical,
  Eye,
  Edit2,
  UserX,
  ChevronLeft,
  ChevronRight,
  X,
  Shield,
  FileSpreadsheet,
  CheckCircle2,
} from 'lucide-react';
import PageHeader from '../components/common/PageHeader.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import EmployeeStatusBadge from '../components/employees/EmployeeStatusBadge.jsx';
import EmployeeFormModal, { DEPARTMENTS } from '../components/employees/EmployeeFormModal.jsx';
import DeactivateConfirmModal from '../components/employees/DeactivateConfirmModal.jsx';
import EmployeeImportModal from '../components/employees/EmployeeImportModal.jsx';
import { useEmployees } from '../context/EmployeeContext.jsx';
import { useOrganization } from '../context/OrganizationContext.jsx';
import { useRole } from '../context/RoleContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function EmployeesPage() {
  const navigate = useNavigate();
  const { employees, totalCount, activeCount, addEmployee, updateEmployee, deactivateEmployee, importEmployees } = useEmployees();
  const { departments, designations } = useOrganization();
  const { isHr, isAdmin, isEmployee, currentUser } = useRole();
  const { showToast } = useToast();

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('ALL');
  const [selectedDesignation, setSelectedDesignation] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [deactivatingEmployee, setDeactivatingEmployee] = useState(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [activeActionDropdown, setActiveActionDropdown] = useState(null);

  // Available departments combining organization settings with existing employee records
  const availableDepartments = useMemo(() => {
    const set = new Set();
    if (departments && departments.length > 0) {
      departments.filter((d) => d.status === 'Active').forEach((d) => set.add(d.name));
    } else {
      DEPARTMENTS.forEach((d) => set.add(d));
    }
    employees.forEach((emp) => {
      if (emp.department) set.add(emp.department);
    });
    return Array.from(set).sort();
  }, [departments, employees]);

  // Extract unique designations from organization settings and current employee list
  const availableDesignations = useMemo(() => {
    const set = new Set();
    if (designations && designations.length > 0) {
      designations.filter((d) => d.status === 'Active').forEach((d) => set.add(d.title));
    }
    employees.forEach((emp) => {
      if (emp.designation) set.add(emp.designation);
    });
    return Array.from(set).sort();
  }, [designations, employees]);

  // Filtered employee list
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      // If current role is employee, they only see themselves
      if (isEmployee) {
        const isSelf =
          emp.email.toLowerCase() === currentUser.email.toLowerCase() ||
          emp.fullName.toLowerCase() === currentUser.name.toLowerCase() ||
          emp.employeeId === 'EMP-0094';
        if (!isSelf) return false;
      }

      // Search matching name, ID, email, or phone
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesName = (emp.fullName || '').toLowerCase().includes(query);
        const matchesId = (emp.employeeId || '').toLowerCase().includes(query);
        const matchesEmail = (emp.email || '').toLowerCase().includes(query);
        const matchesPhone = (emp.phone || '').toLowerCase().includes(query);
        if (!matchesName && !matchesId && !matchesEmail && !matchesPhone) {
          return false;
        }
      }

      // Department filter
      if (selectedDepartment !== 'ALL' && emp.department !== selectedDepartment) {
        return false;
      }

      // Designation filter
      if (selectedDesignation !== 'ALL' && emp.designation !== selectedDesignation) {
        return false;
      }

      // Status filter
      if (selectedStatus !== 'ALL' && emp.status !== selectedStatus) {
        return false;
      }

      return true;
    });
  }, [employees, searchTerm, selectedDepartment, selectedDesignation, selectedStatus, isEmployee, currentUser]);

  // Pagination slice
  const totalPages = Math.ceil(filteredEmployees.length / pageSize) || 1;
  const paginatedEmployees = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredEmployees.slice(start, start + pageSize);
  }, [filteredEmployees, currentPage, pageSize]);

  const hasActiveFilters =
    searchTerm.trim().length > 0 ||
    selectedDepartment !== 'ALL' ||
    selectedDesignation !== 'ALL' ||
    selectedStatus !== 'ALL';

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedDepartment('ALL');
    setSelectedDesignation('ALL');
    setSelectedStatus('ALL');
    setCurrentPage(1);
  };

  // Handlers for Add, Edit, Deactivate
  const handleSaveNewEmployee = (newEmpData) => {
    const res = addEmployee(newEmpData);
    if (res.success) {
      showToast({
        type: 'success',
        title: 'Employee Added',
        message: `${res.employee.fullName} (${res.employee.employeeId}) has been added to the session directory.`,
      });
      setIsAddModalOpen(false);
    } else {
      showToast({
        type: 'error',
        title: 'Could Not Add Employee',
        message: res.error || 'Failed to add employee.',
      });
    }
  };

  const handleSaveEditEmployee = (updatedData) => {
    if (!editingEmployee) return;
    const res = updateEmployee(editingEmployee.id, updatedData);
    if (res.success) {
      showToast({
        type: 'success',
        title: 'Employee Updated',
        message: `${res.employee.fullName} (${res.employee.employeeId}) changes saved to session state.`,
      });
      setEditingEmployee(null);
    } else {
      showToast({
        type: 'error',
        title: 'Update Failed',
        message: res.error || 'Failed to update employee.',
      });
    }
  };

  const handleConfirmDeactivation = (id) => {
    const res = deactivateEmployee(id);
    if (res.success) {
      showToast({
        type: 'info',
        title: 'Employee Deactivated',
        message: `${res.employee.fullName} status has been updated to Inactive.`,
      });
    }
  };

  const handleImportSuccess = (validRows, stats) => {
    importEmployees(validRows);
    showToast({
      type: 'success',
      title: 'Batch Import Completed',
      message: `Successfully imported ${stats.valid} employee record(s) into current session.`,
    });
  };

  // CSV Export handler
  const handleExportCSV = () => {
    if (!filteredEmployees.length) {
      alert('There are no employee records to export under the current filter.');
      return;
    }

    const headers = [
      'Employee ID',
      'First Name',
      'Last Name',
      'Full Name',
      'Email',
      'Phone',
      'Department',
      'Designation',
      'Joining Date',
      'Employment Type',
      'Status',
      'Reporting Manager',
    ];

    const csvRows = [headers.join(',')];

    filteredEmployees.forEach((emp) => {
      const row = [
        `"${emp.employeeId || ''}"`,
        `"${emp.firstName || ''}"`,
        `"${emp.lastName || ''}"`,
        `"${emp.fullName || ''}"`,
        `"${emp.email || ''}"`,
        `"${emp.phone || ''}"`,
        `"${emp.department || ''}"`,
        `"${emp.designation || ''}"`,
        `"${emp.joiningDate || ''}"`,
        `"${emp.employmentType || ''}"`,
        `"${emp.status || ''}"`,
        `"${emp.reportingManager || ''}"`,
      ];
      csvRows.push(row.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `hcm_lite_employees_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast({
      type: 'info',
      title: 'CSV Exported',
      message: `Exported ${filteredEmployees.length} employee record(s) to CSV.`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Employees"
        subtitle="Manage employee records and organization members."
        breadcrumbs={[{ label: 'Employees' }]}
      >
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Import / Export Controls (Only for HR or Admin) */}
          {!isEmployee && (
            <>
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-xs transition-colors"
                title="Import employees via CSV"
              >
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">Import CSV</span>
              </button>

              <button
                onClick={handleExportCSV}
                disabled={employees.length === 0}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 border border-slate-200 rounded-lg shadow-xs transition-colors"
                title={employees.length === 0 ? 'No employees to export' : 'Export current employee list'}
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">Export CSV</span>
              </button>
            </>
          )}

          {/* Add Employee Button (HR role has active write permissions; Admin has view-oriented role) */}
          {!isEmployee && (
            <button
              onClick={() => {
                if (isHr) {
                  setIsAddModalOpen(true);
                } else {
                  showToast({
                    type: 'info',
                    title: 'Role Permission Notice',
                    message: 'Admin has organizational governance access. Switch to HR Manager role via the top selector to add and manage employee records.',
                  });
                }
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Employee</span>
            </button>
          )}
        </div>
      </PageHeader>

      {/* Role Notice Banner for Employee Role */}
      {isEmployee && (
        <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-start gap-3">
          <Shield className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <div className="text-xs text-indigo-950">
            <strong className="font-semibold block mb-0.5">Employee Self-Service View</strong>
            <p className="text-slate-600 leading-relaxed">
              As an employee, you can view your personal profile, review your contact information, and submit profile updates. Directory modifications and organizational imports require HR Manager credentials.
            </p>
          </div>
        </div>
      )}

      {/* Directory Content */}
      {employees.length === 0 ? (
        /* Empty State when no employees exist */
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-12 shadow-xs">
          <EmptyState
            icon={Users}
            title="No Employees in Directory"
            description="Your organization has not enrolled any employees yet. Add your first team member manually or import your roster using a CSV file."
            actionText={!isEmployee ? "Add First Employee" : undefined}
            onAction={() => setIsAddModalOpen(true)}
            secondaryActionText={!isEmployee ? "Import CSV Roster" : undefined}
            onSecondaryAction={() => setIsImportModalOpen(true)}
            phaseBadge="Shared Session State &middot; 0 Records"
          />
        </div>
      ) : (
        /* Filter Bar and Directory Table */
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              {/* Search Field */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search by name, ID, email, or phone..."
                  className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition-all"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded"
                    aria-label="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filters Dropdowns */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Department Filter */}
                <select
                  value={selectedDepartment}
                  onChange={(e) => {
                    setSelectedDepartment(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                  aria-label="Filter by department"
                >
                  <option value="ALL">All Departments</option>
                  {availableDepartments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>

                {/* Designation Filter */}
                <select
                  value={selectedDesignation}
                  onChange={(e) => {
                    setSelectedDesignation(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all max-w-[160px] truncate"
                  aria-label="Filter by designation"
                >
                  <option value="ALL">All Designations</option>
                  {availableDesignations.map((desig) => (
                    <option key={desig} value={desig}>
                      {desig}
                    </option>
                  ))}
                </select>

                {/* Status Filter */}
                <select
                  value={selectedStatus}
                  onChange={(e) => {
                    setSelectedStatus(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                  aria-label="Filter by employment status"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="On Leave">On Leave</option>
                </select>

                {/* Clear Filters Button */}
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>
                )}
              </div>
            </div>

            {/* Total Results Summary Bar */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span>
                  Showing <strong className="font-semibold text-slate-800">{filteredEmployees.length}</strong> of{' '}
                  <strong className="font-semibold text-slate-800">{totalCount}</strong> total employees
                </span>
                {hasActiveFilters && (
                  <span className="text-amber-700 font-medium">(Filtered)</span>
                )}
              </div>
              <span className="font-mono text-[11px] text-slate-400">
                {activeCount} Active &middot; {totalCount - activeCount} Inactive/On Leave
              </span>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            {filteredEmployees.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <Users className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs sm:text-sm font-semibold text-slate-700">No matching employees found</p>
                <p className="text-xs text-slate-400">Try adjusting your search terms or clearing the selected filters.</p>
                <button
                  onClick={clearFilters}
                  className="mt-2 px-3 py-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 rounded-lg"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Employee</th>
                      <th className="py-3 px-4 font-semibold">Employee ID</th>
                      <th className="py-3 px-4 font-semibold">Email</th>
                      <th className="py-3 px-4 font-semibold">Department</th>
                      <th className="py-3 px-4 font-semibold">Designation</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedEmployees.map((emp) => (
                      <tr
                        key={emp.id}
                        className="hover:bg-slate-50/70 transition-colors group"
                      >
                        {/* Employee Avatar + Name */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <Link
                            to={`/employees/${emp.id}`}
                            className="flex items-center gap-3 group-hover:text-indigo-600 transition-colors"
                          >
                            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-semibold text-xs flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                              {emp.photoUrl ? (
                                <img
                                  src={emp.photoUrl}
                                  alt={emp.fullName}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span>
                                  {emp.firstName ? emp.firstName.charAt(0) : ''}
                                  {emp.lastName ? emp.lastName.charAt(0) : ''}
                                </span>
                              )}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900 group-hover:text-indigo-600">
                                {emp.fullName}
                              </div>
                              <div className="text-[11px] text-slate-400 sm:hidden">
                                {emp.designation}
                              </div>
                            </div>
                          </Link>
                        </td>

                        {/* Employee ID */}
                        <td className="py-3 px-4 whitespace-nowrap font-mono font-medium text-slate-700">
                          {emp.employeeId}
                        </td>

                        {/* Email */}
                        <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                          {emp.email}
                        </td>

                        {/* Department */}
                        <td className="py-3 px-4 whitespace-nowrap text-slate-700 font-medium">
                          {emp.department}
                        </td>

                        {/* Designation */}
                        <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                          {emp.designation}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <EmployeeStatusBadge status={emp.status} />
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* View Profile */}
                            <Link
                              to={`/employees/${emp.id}`}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="View Employee 360 Profile"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>

                            {/* Edit (HR only, or Employee on own profile) */}
                            {(isHr || (isEmployee && (currentUser.name.toLowerCase() === emp.fullName.toLowerCase() || emp.employeeId === 'EMP-0094'))) && (
                              <button
                                onClick={() => setEditingEmployee(emp)}
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="Edit Employee Record"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            )}

                            {/* Deactivate (HR only) */}
                            {isHr && emp.status !== 'Inactive' && (
                              <button
                                onClick={() => setDeactivatingEmployee(emp)}
                                className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Deactivate Employee"
                              >
                                <UserX className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {filteredEmployees.length > 0 && (
              <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                <div>
                  Showing{' '}
                  <span className="font-semibold text-slate-700 font-mono">
                    {(currentPage - 1) * pageSize + 1}
                  </span>{' '}
                  to{' '}
                  <span className="font-semibold text-slate-700 font-mono">
                    {Math.min(currentPage * pageSize, filteredEmployees.length)}
                  </span>{' '}
                  of{' '}
                  <span className="font-semibold text-slate-700 font-mono">
                    {filteredEmployees.length}
                  </span>{' '}
                  records
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-1 px-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                          currentPage === pageNum
                            ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {pageNum}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                    aria-label="Next page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      <EmployeeFormModal
        isOpen={isAddModalOpen}
        mode="add"
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleSaveNewEmployee}
      />

      {/* Edit Employee Modal */}
      <EmployeeFormModal
        isOpen={!!editingEmployee}
        mode="edit"
        initialData={editingEmployee}
        onClose={() => setEditingEmployee(null)}
        onSave={handleSaveEditEmployee}
      />

      {/* Deactivate Confirmation Modal */}
      <DeactivateConfirmModal
        isOpen={!!deactivatingEmployee}
        employee={deactivatingEmployee}
        onClose={() => setDeactivatingEmployee(null)}
        onConfirm={handleConfirmDeactivation}
      />

      {/* CSV Import Modal */}
      <EmployeeImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={handleImportSuccess}
      />
    </div>
  );
}
