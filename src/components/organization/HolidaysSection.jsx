import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Plus,
  Search,
  Edit2,
  Power,
  Building2,
  Clock,
  CalendarDays,
  X,
  AlertTriangle,
  ArrowUpDown,
} from 'lucide-react';
import FormField from '../common/FormField.jsx';
import EmptyState from '../common/EmptyState.jsx';
import { useOrganization } from '../../context/OrganizationContext.jsx';
import { useRole } from '../../context/RoleContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';

export default function HolidaysSection() {
  const { holidays, activeDepartments, addHoliday, updateHoliday, toggleHolidayStatus } = useOrganization();
  const { isAdmin, isHr } = useRole();
  const { showToast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState('ALL');
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' | 'desc'
  const [modalMode, setModalMode] = useState(null); // 'add' | 'edit'
  const [activeHoliday, setActiveHoliday] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    appliesTo: 'ALL',
    status: 'Active',
  });
  const [formErrors, setFormErrors] = useState({});

  const canManage = isAdmin || isHr;

  // Extract unique years from configured holidays
  const holidayYears = useMemo(() => {
    const set = new Set();
    holidays.forEach((h) => {
      if (h.date) {
        set.add(h.date.substring(0, 4));
      }
    });
    return Array.from(set).sort();
  }, [holidays]);

  // Filtered & sorted holidays
  const filteredHolidays = useMemo(() => {
    return holidays
      .filter((h) => {
        if (selectedYear !== 'ALL' && !h.date.startsWith(selectedYear)) {
          return false;
        }
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          return (
            h.name.toLowerCase().includes(q) ||
            (h.description || '').toLowerCase().includes(q) ||
            h.date.includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.date).getTime();
        const timeB = new Date(b.date).getTime();
        return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
      });
  }, [holidays, searchTerm, selectedYear, sortOrder]);

  // Upcoming holidays (active and today or future)
  const todayStr = new Date().toISOString().split('T')[0];
  const upcomingHolidays = useMemo(() => {
    return holidays
      .filter((h) => h.status === 'Active' && h.date >= todayStr)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 3);
  }, [holidays, todayStr]);

  const openAddModal = () => {
    setFormData({
      name: '',
      date: new Date().toISOString().split('T')[0],
      description: '',
      appliesTo: 'ALL',
      status: 'Active',
    });
    setFormErrors({});
    setModalMode('add');
  };

  const openEditModal = (h) => {
    setActiveHoliday(h);
    setFormData({
      name: h.name,
      date: h.date,
      description: h.description || '',
      appliesTo: h.appliesTo || 'ALL',
      status: h.status || 'Active',
    });
    setFormErrors({});
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode(null);
    setActiveHoliday(null);
    setFormErrors({});
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.name.trim()) {
      errs.name = 'Holiday title is required.';
    }
    if (!formData.date) {
      errs.date = 'Holiday calendar date is required.';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (modalMode === 'add') {
      const res = addHoliday(formData);
      if (res.success) {
        showToast({
          type: 'success',
          title: 'Holiday Added',
          message: `Holiday "${res.holiday.name}" scheduled for ${res.holiday.date}.`,
        });
        closeModal();
      } else {
        setFormErrors({ name: res.error });
      }
    } else if (modalMode === 'edit') {
      const res = updateHoliday(activeHoliday.id, formData);
      if (res.success) {
        showToast({
          type: 'success',
          title: 'Holiday Updated',
          message: `Holiday "${res.holiday.name}" updated.`,
        });
        closeModal();
      } else {
        setFormErrors({ name: res.error });
      }
    }
  };

  const handleToggleStatus = (h) => {
    toggleHolidayStatus(h.id);
    showToast({
      type: h.status === 'Active' ? 'info' : 'success',
      title: `Holiday ${h.status === 'Active' ? 'Deactivated' : 'Activated'}`,
      message: `"${h.name}" marked as ${h.status === 'Active' ? 'Inactive' : 'Active'}.`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900">
            Company Holiday Calendar
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure observed corporate holidays, statutory office closures, and department-specific observances.
          </p>
        </div>

        {canManage && (
          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-xs transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Holiday</span>
          </button>
        )}
      </div>

      {/* Upcoming Holidays Showcase (if any configured) */}
      {upcomingHolidays.length > 0 && (
        <div className="p-4 bg-gradient-to-r from-indigo-50/70 to-violet-50/70 border border-indigo-100 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <CalendarDays className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-950">
              Next Upcoming Observances
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {upcomingHolidays.map((h) => {
              const dateObj = new Date(h.date + 'T00:00:00');
              const formatted = dateObj.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                weekday: 'short',
              });
              return (
                <div key={h.id} className="p-3 bg-white border border-indigo-100 rounded-lg shadow-xs">
                  <span className="text-[11px] font-mono text-indigo-600 font-semibold">{formatted}</span>
                  <div className="text-xs font-bold text-slate-900 mt-0.5 truncate">{h.name}</div>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    {h.appliesTo === 'ALL' ? 'Company-wide' : 'Department Specific'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {holidays.length === 0 ? (
        <div className="p-8 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <EmptyState
            icon={Calendar}
            title="No Holidays Configured"
            description="Add your organization's observed public and company holidays (e.g. New Year's Day, Memorial Day, Labor Day, Winter Break) to align time tracking."
            actionText={canManage ? 'Add First Holiday' : undefined}
            onAction={openAddModal}
            phaseBadge="Shared Session State &middot; 0 Holidays"
          />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search holiday name or date..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white"
                />
              </div>

              {holidayYears.length > 0 && (
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
                >
                  <option value="ALL">All Years</option>
                  {holidayYears.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex items-center gap-3 self-end sm:self-auto text-xs text-slate-500">
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors"
                title="Sort by date"
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
                <span>Date: {sortOrder === 'asc' ? 'Earliest first' : 'Latest first'}</span>
              </button>

              <span>Total: <strong className="font-semibold text-slate-900 font-mono">{holidays.length}</strong></span>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Holiday Date</th>
                    <th className="py-3 px-4 font-semibold">Holiday Name</th>
                    <th className="py-3 px-4 font-semibold">Description</th>
                    <th className="py-3 px-4 font-semibold">Applies To</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    {canManage && <th className="py-3 px-4 font-semibold text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHolidays.map((h) => {
                    const dateObj = new Date(h.date + 'T00:00:00');
                    const formatted = dateObj.toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    });

                    return (
                      <tr key={h.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-mono font-medium text-slate-900 whitespace-nowrap">
                          {formatted}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                          {h.name}
                        </td>
                        <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                          {h.description || '—'}
                        </td>
                        <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                          {h.appliesTo === 'ALL'
                            ? 'All Employees'
                            : activeDepartments.find((d) => d.id === h.appliesTo)?.name || 'Specific Unit'}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                              h.status === 'Active'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                h.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'
                              }`}
                            />
                            {h.status}
                          </span>
                        </td>
                        {canManage && (
                          <td className="py-3 px-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => openEditModal(h)}
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="Edit Holiday"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleToggleStatus(h)}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  h.status === 'Active'
                                    ? 'text-slate-500 hover:text-amber-600 hover:bg-amber-50'
                                    : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50'
                                }`}
                                title={h.status === 'Active' ? 'Deactivate Holiday' : 'Activate Holiday'}
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

      {/* Add / Edit Holiday Modal */}
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
                {modalMode === 'add' ? 'Schedule Holiday' : 'Edit Holiday'}
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
                id="holName"
                label="Holiday Title"
                required
                error={formErrors.name}
              >
                <input
                  id="holName"
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, name: e.target.value }));
                    if (formErrors.name) setFormErrors({});
                  }}
                  placeholder="e.g. Independence Day / Founder's Day"
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white"
                />
              </FormField>

              <FormField
                id="holDate"
                label="Observed Calendar Date"
                required
                error={formErrors.date}
              >
                <input
                  id="holDate"
                  type="date"
                  value={formData.date}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, date: e.target.value }));
                    if (formErrors.date) setFormErrors({});
                  }}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white font-mono"
                />
              </FormField>

              <FormField
                id="holApplies"
                label="Applies To"
              >
                <select
                  id="holApplies"
                  value={formData.appliesTo}
                  onChange={(e) => setFormData((prev) => ({ ...prev, appliesTo: e.target.value }))}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white"
                >
                  <option value="ALL">All Company Employees</option>
                  {activeDepartments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name} Division Only
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField
                id="holDesc"
                label="Description & Notes"
              >
                <textarea
                  id="holDesc"
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Corporate offices closed. Critical system on-call applies."
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white resize-none"
                />
              </FormField>

              <FormField
                id="holStatus"
                label="Status"
              >
                <select
                  id="holStatus"
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
                  {modalMode === 'add' ? 'Save Holiday' : 'Update Holiday'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
