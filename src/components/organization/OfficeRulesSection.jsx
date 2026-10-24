import React, { useState, useEffect } from 'react';
import {
  Clock,
  MapPin,
  Calendar,
  Save,
  RotateCcw,
  Shield,
  Info,
  Compass,
} from 'lucide-react';
import FormField from '../common/FormField.jsx';
import { useOrganization } from '../../context/OrganizationContext.jsx';
import { useRole } from '../../context/RoleContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';

const ALL_DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export default function OfficeRulesSection() {
  const { officeRules, updateOfficeRules } = useOrganization();
  const { isAdmin } = useRole();
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    startTime: '09:00',
    endTime: '18:00',
    gracePeriod: 15,
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    weeklyOffDays: ['Saturday', 'Sunday'],
    locationName: 'Primary Corporate Headquarters',
    latitude: '37.7749',
    longitude: '-122.4194',
    radiusMeters: 100,
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (officeRules) {
      setFormData({
        startTime: officeRules.startTime || '09:00',
        endTime: officeRules.endTime || '18:00',
        gracePeriod: officeRules.gracePeriod !== undefined ? officeRules.gracePeriod : 15,
        workingDays: officeRules.workingDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        weeklyOffDays: officeRules.weeklyOffDays || ['Saturday', 'Sunday'],
        locationName: officeRules.locationName || '',
        latitude: officeRules.latitude || '',
        longitude: officeRules.longitude || '',
        radiusMeters: officeRules.radiusMeters !== undefined ? officeRules.radiusMeters : 100,
      });
    }
  }, [officeRules]);

  const validate = () => {
    const errs = {};

    // Working hours validation
    if (!formData.startTime) {
      errs.startTime = 'Start time is required.';
    }
    if (!formData.endTime) {
      errs.endTime = 'End time is required.';
    }
    if (formData.startTime && formData.endTime) {
      if (formData.endTime <= formData.startTime) {
        errs.endTime = 'Office end time must be later than start time for same-day shifts.';
      }
    }

    // Grace period validation
    const graceNum = Number(formData.gracePeriod);
    if (isNaN(graceNum) || graceNum < 0) {
      errs.gracePeriod = 'Grace period must be a non-negative number (0 or higher).';
    }

    // Radius validation
    const radiusNum = Number(formData.radiusMeters);
    if (isNaN(radiusNum) || radiusNum <= 0) {
      errs.radiusMeters = 'Allowed attendance radius must be a positive number in meters.';
    }

    // Coordinates validation (if entered)
    if (formData.latitude !== '') {
      const latNum = Number(formData.latitude);
      if (isNaN(latNum) || latNum < -90 || latNum > 90) {
        errs.latitude = 'Latitude must be a valid number between -90 and 90.';
      }
    }

    if (formData.longitude !== '') {
      const lngNum = Number(formData.longitude);
      if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
        errs.longitude = 'Longitude must be a valid number between -180 and 180.';
      }
    }

    // Working days vs Weekly off conflicts
    const conflicts = formData.workingDays.filter((d) => formData.weeklyOffDays.includes(d));
    if (conflicts.length > 0) {
      errs.daysConflict = `Conflict detected: ${conflicts.join(', ')} cannot be both a working day and a weekly off day.`;
    }

    if (formData.workingDays.length === 0) {
      errs.daysConflict = 'Please select at least one working day for the organization.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleWorkingDayToggle = (day) => {
    setFormData((prev) => {
      const isWorking = prev.workingDays.includes(day);
      let updatedWorking;
      let updatedOff = [...prev.weeklyOffDays];

      if (isWorking) {
        updatedWorking = prev.workingDays.filter((d) => d !== day);
        if (!updatedOff.includes(day)) updatedOff.push(day);
      } else {
        updatedWorking = [...prev.workingDays, day];
        updatedOff = updatedOff.filter((d) => d !== day);
      }

      return {
        ...prev,
        workingDays: updatedWorking,
        weeklyOffDays: updatedOff,
      };
    });
    if (errors.daysConflict) {
      setErrors((prev) => ({ ...prev, daysConflict: undefined }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isAdmin) {
      showToast({
        type: 'info',
        title: 'Permission Notice',
        message: 'Only Administrator accounts can configure company-wide attendance rules.',
      });
      return;
    }

    if (validate()) {
      updateOfficeRules(formData);
      showToast({
        type: 'success',
        title: 'Attendance Rules Saved',
        message: 'Company work hours and geofence settings updated for current session.',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900">
            Office & Attendance Rules
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Standard shift hours, punctuality grace thresholds, work-week calendar, and geofencing parameters.
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
        {/* Work Hours & Punctuality */}
        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Shift Schedule & Punctuality Thresholds
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField
              id="startTime"
              label="Standard Office Start Time"
              required
              error={errors.startTime}
            >
              <input
                id="startTime"
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData((prev) => ({ ...prev, startTime: e.target.value }))}
                disabled={!isAdmin}
                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white disabled:bg-slate-100 disabled:text-slate-500 transition-all font-mono"
              />
            </FormField>

            <FormField
              id="endTime"
              label="Standard Office End Time"
              required
              error={errors.endTime}
            >
              <input
                id="endTime"
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData((prev) => ({ ...prev, endTime: e.target.value }))}
                disabled={!isAdmin}
                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white disabled:bg-slate-100 disabled:text-slate-500 transition-all font-mono"
              />
            </FormField>

            <FormField
              id="gracePeriod"
              label="Punctuality Grace Period (Minutes)"
              required
              error={errors.gracePeriod}
              hint="Check-ins within grace window are not marked late"
            >
              <input
                id="gracePeriod"
                type="number"
                min="0"
                max="120"
                value={formData.gracePeriod}
                onChange={(e) => setFormData((prev) => ({ ...prev, gracePeriod: e.target.value }))}
                disabled={!isAdmin}
                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white disabled:bg-slate-100 disabled:text-slate-500 transition-all font-mono"
              />
            </FormField>
          </div>
        </div>

        {/* Working Days & Weekly Off Days */}
        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Work Week Calendar Configuration
            </h3>
          </div>

          <p className="text-xs text-slate-500">
            Select the active working days for your organization. Unchecked days are automatically designated as weekly off days.
          </p>

          {errors.daysConflict && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
              {errors.daysConflict}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 pt-1">
            {ALL_DAYS.map((day) => {
              const isWorking = formData.workingDays.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => isAdmin && handleWorkingDayToggle(day)}
                  disabled={!isAdmin}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    isWorking
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-950 font-semibold shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'
                  } ${!isAdmin ? 'cursor-default' : 'cursor-pointer'}`}
                >
                  <span className="block text-xs">{day.substring(0, 3)}</span>
                  <span className="text-[10px] uppercase tracking-wider mt-1 block font-mono">
                    {isWorking ? 'Work' : 'Off'}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="text-[11px] text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100">
            <span>
              Total Working Days: <strong className="font-semibold text-slate-900">{formData.workingDays.length}</strong> / 7
            </span>
            <span>
              Weekly Offs: <strong className="font-semibold text-slate-900">{formData.weeklyOffDays.length}</strong> days ({formData.weeklyOffDays.join(', ') || 'None'})
            </span>
          </div>
        </div>

        {/* Geofencing & Office Location Parameters */}
        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Location Geofencing & Attendance Boundary
            </h3>
          </div>

          {/* Architecture notice */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Location Verification Notice:</strong> Coordinate validation is configured here for attendance bounds checking. Live GPS verification against employee mobile devices and browsers will be activated when the Attendance Geofence Engine connects in Phase 5.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <FormField
                id="locationName"
                label="Site / Branch Name"
                hint="e.g. Headquarters / Campus A"
              >
                <input
                  id="locationName"
                  type="text"
                  value={formData.locationName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, locationName: e.target.value }))}
                  disabled={!isAdmin}
                  placeholder="San Francisco HQ"
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white disabled:bg-slate-100 disabled:text-slate-500 transition-all"
                />
              </FormField>
            </div>

            <FormField
              id="radiusMeters"
              label="Allowed Radius (Meters)"
              required
              error={errors.radiusMeters}
            >
              <input
                id="radiusMeters"
                type="number"
                min="10"
                max="5000"
                value={formData.radiusMeters}
                onChange={(e) => setFormData((prev) => ({ ...prev, radiusMeters: e.target.value }))}
                disabled={!isAdmin}
                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white disabled:bg-slate-100 disabled:text-slate-500 transition-all font-mono"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              id="latitude"
              label="Center Latitude (°)"
              error={errors.latitude}
              hint="-90.0 to 90.0 (e.g. 37.7749)"
            >
              <div className="relative flex items-center">
                <Compass className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                <input
                  id="latitude"
                  type="text"
                  value={formData.latitude}
                  onChange={(e) => setFormData((prev) => ({ ...prev, latitude: e.target.value }))}
                  disabled={!isAdmin}
                  placeholder="37.7749"
                  className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white disabled:bg-slate-100 disabled:text-slate-500 transition-all font-mono"
                />
              </div>
            </FormField>

            <FormField
              id="longitude"
              label="Center Longitude (°)"
              error={errors.longitude}
              hint="-180.0 to 180.0 (e.g. -122.4194)"
            >
              <div className="relative flex items-center">
                <Compass className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                <input
                  id="longitude"
                  type="text"
                  value={formData.longitude}
                  onChange={(e) => setFormData((prev) => ({ ...prev, longitude: e.target.value }))}
                  disabled={!isAdmin}
                  placeholder="-122.4194"
                  className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white disabled:bg-slate-100 disabled:text-slate-500 transition-all font-mono"
                />
              </div>
            </FormField>
          </div>
        </div>

        {/* Action Buttons */}
        {isAdmin && (
          <div className="pt-2 flex items-center justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            >
              <Save className="w-4 h-4" />
              <span>Save Attendance Rules</span>
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
