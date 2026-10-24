import React, { useState } from 'react';
import { X, UserPlus, Clock, Calendar, AlertCircle } from 'lucide-react';
import FormField from '../common/FormField.jsx';
import { useEmployees } from '../../context/EmployeeContext.jsx';
import { getTodayDateString, timeToMinutes } from '../../utils/attendanceCalculations.js';

export default function ManualAttendanceModal({
  isOpen,
  onClose,
  onSave,
  currentUserRole = 'HR Manager',
}) {
  const { employees } = useEmployees();

  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [date, setDate] = useState(getTodayDateString());
  const [checkIn, setCheckIn] = useState('09:00');
  const [checkOut, setCheckOut] = useState('18:00');
  const [statusOverride, setStatusOverride] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState({});

  if (!isOpen) return null;

  const activeEmployees = employees.filter((e) => e.status !== 'Inactive');

  const validate = () => {
    const newErrors = {};
    if (!selectedEmployeeId) {
      newErrors.employee = 'Please select an employee.';
    }
    if (!date) {
      newErrors.date = 'Date is required.';
    }
    if (!checkIn) {
      newErrors.checkIn = 'Check-in time is required.';
    }
    if (checkIn && checkOut) {
      const inMins = timeToMinutes(checkIn);
      const outMins = timeToMinutes(checkOut);
      if (inMins !== null && outMins !== null && outMins <= inMins) {
        newErrors.checkOut = 'Check-out time must be after check-in time.';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const emp = employees.find((e) => e.employeeId === selectedEmployeeId);

    onSave({
      employeeId: selectedEmployeeId,
      employeeName: emp ? emp.fullName : 'Employee',
      department: emp ? emp.department : 'General',
      date,
      checkInTime: checkIn.length === 5 ? `${checkIn}:00` : checkIn,
      checkOutTime: checkOut ? (checkOut.length === 5 ? `${checkOut}:00` : checkOut) : null,
      statusOverride: statusOverride || null,
      notes: notes.trim(),
      addedBy: currentUserRole,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden transform transition-all">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Record Attendance</h3>
                <p className="text-xs text-slate-500">
                  Manual entry for team member attendance
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Employee Selection */}
            <FormField label="Employee" required error={errors.employee}>
              {activeEmployees.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                  No active employees enrolled in directory. Add an employee in Employee Management first.
                </div>
              ) : (
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                >
                  <option value="">Select an enrolled employee...</option>
                  {activeEmployees.map((emp) => (
                    <option key={emp.employeeId} value={emp.employeeId}>
                      {emp.fullName} ({emp.employeeId}) &middot; {emp.department}
                    </option>
                  ))}
                </select>
              )}
            </FormField>

            {/* Date */}
            <FormField label="Attendance Date" required error={errors.date}>
              <input
                type="date"
                value={date}
                max={getTodayDateString()}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
              />
            </FormField>

            {/* Times */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Check-In Time" required error={errors.checkIn}>
                <input
                  type="time"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                />
              </FormField>

              <FormField label="Check-Out Time" error={errors.checkOut} hint="Leave blank if shift in progress">
                <input
                  type="time"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                />
              </FormField>
            </div>

            {/* Status Override */}
            <FormField label="Status" hint="Leave as Auto-Calculate or override explicitly">
              <select
                value={statusOverride}
                onChange={(e) => setStatusOverride(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
              >
                <option value="">Auto-calculate from office shift rules</option>
                <option value="Present">Present</option>
                <option value="Late">Late</option>
                <option value="Half Day">Half Day</option>
                <option value="On Leave">On Leave</option>
                <option value="Absent">Absent</option>
              </select>
            </FormField>

            {/* Reason / Notes */}
            <FormField label="Notes & Justification" hint="Saved with manual record for audit tracking">
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Employee punch missed due to offsite deployment"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
              />
            </FormField>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={activeEmployees.length === 0}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 rounded-lg shadow-xs transition-colors"
              >
                Save Attendance Record
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
