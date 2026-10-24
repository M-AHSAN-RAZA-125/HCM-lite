import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  determineAttendanceStatus,
  calculateWorkingDuration,
  getTodayDateString,
  getCurrentTimeString,
} from '../utils/attendanceCalculations.js';
import { useOrganization } from './OrganizationContext.jsx';
import { useCommunication } from './CommunicationContext.jsx';

const AttendanceContext = createContext(null);

const STORAGE_KEY = 'hcmlite_session_attendance_v1';

export function AttendanceProvider({ children }) {
  const { officeRules } = useOrganization();
  const { recordAuditEvent, createNotification } = useCommunication();

  // Load records and correction history from sessionStorage
  const [attendanceState, setAttendanceState] = useState(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Could not read session attendance data', e);
    }
    return {
      records: [],
      correctionHistory: [],
    };
  });

  // Sync with sessionStorage on change
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(attendanceState));
    } catch (e) {
      console.warn('Failed to sync session attendance state', e);
    }
  }, [attendanceState]);

  const records = attendanceState.records;
  const correctionHistory = attendanceState.correctionHistory;

  /**
   * Check In action
   */
  const checkIn = ({
    employeeId,
    employeeName,
    department,
    date = getTodayDateString(),
    time = getCurrentTimeString(),
    locationVerified = false,
    cameraVerified = false,
  }) => {
    if (!employeeId) {
      return { success: false, error: 'Employee identity is required to record check-in.' };
    }

    // Check if record already exists for this employee on this date
    const existing = records.find(
      (r) => r.employeeId.toUpperCase() === employeeId.toUpperCase() && r.date === date
    );

    if (existing) {
      return {
        success: false,
        error: `Attendance already recorded for ${employeeName || employeeId} on ${date}. Check-in timestamp: ${existing.checkIn}.`,
      };
    }

    const status = determineAttendanceStatus({
      checkInTime: time,
      checkOutTime: null,
      officeRules,
    });

    const newRecord = {
      id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      employeeId: employeeId.toUpperCase(),
      employeeName: employeeName || 'Employee Member',
      department: department || 'General',
      date,
      checkIn: time,
      checkOut: null,
      workingHours: null,
      workingMinutes: null,
      status,
      source: 'web_self_service',
      locationVerified,
      cameraVerified,
      notes: '',
      createdAt: new Date().toISOString(),
    };

    setAttendanceState((prev) => ({
      ...prev,
      records: [newRecord, ...prev.records],
    }));

    return { success: true, record: newRecord };
  };

  /**
   * Check Out action
   */
  const checkOut = ({
    employeeId,
    date = getTodayDateString(),
    time = getCurrentTimeString(),
  }) => {
    if (!employeeId) {
      return { success: false, error: 'Employee identity is required to record check-out.' };
    }

    const existingIndex = records.findIndex(
      (r) => r.employeeId.toUpperCase() === employeeId.toUpperCase() && r.date === date
    );

    if (existingIndex === -1) {
      return {
        success: false,
        error: `Cannot check out before checking in. No check-in record found for today (${date}).`,
      };
    }

    const currentRecord = records[existingIndex];

    if (currentRecord.checkOut) {
      return {
        success: false,
        error: `Employee has already checked out for today at ${currentRecord.checkOut}. Repeated check-outs are not permitted.`,
      };
    }

    // Calculate working duration
    const duration = calculateWorkingDuration(currentRecord.checkIn, time);
    const finalStatus = determineAttendanceStatus({
      checkInTime: currentRecord.checkIn,
      checkOutTime: time,
      officeRules,
    });

    const updatedRecord = {
      ...currentRecord,
      checkOut: time,
      workingHours: duration ? duration.formatted : '—',
      workingMinutes: duration ? duration.minutes : 0,
      status: finalStatus,
      updatedAt: new Date().toISOString(),
    };

    setAttendanceState((prev) => {
      const nextRecords = [...prev.records];
      nextRecords[existingIndex] = updatedRecord;
      return { ...prev, records: nextRecords };
    });

    return { success: true, record: updatedRecord };
  };

  /**
   * Manual Attendance Entry (for HR/Admin to record attendance for an employee)
   */
  const addManualRecord = ({
    employeeId,
    employeeName,
    department,
    date,
    checkInTime,
    checkOutTime = null,
    statusOverride = null,
    notes = '',
    addedBy = 'HR Manager',
  }) => {
    if (!employeeId || !date || !checkInTime) {
      return { success: false, error: 'Employee, date, and check-in time are required.' };
    }

    const existing = records.find(
      (r) => r.employeeId.toUpperCase() === employeeId.toUpperCase() && r.date === date
    );

    if (existing) {
      return {
        success: false,
        error: `An attendance record already exists for ${employeeName || employeeId} on ${date}. Use the Edit Attendance action to correct it.`,
      };
    }

    let workingHours = null;
    let workingMinutes = null;
    if (checkOutTime) {
      const duration = calculateWorkingDuration(checkInTime, checkOutTime);
      if (duration) {
        workingHours = duration.formatted;
        workingMinutes = duration.minutes;
      }
    }

    const computedStatus = determineAttendanceStatus({
      checkInTime,
      checkOutTime,
      officeRules,
    });

    const newRecord = {
      id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      employeeId: employeeId.toUpperCase(),
      employeeName: employeeName || 'Employee Member',
      department: department || 'General',
      date,
      checkIn: checkInTime,
      checkOut: checkOutTime,
      workingHours,
      workingMinutes,
      status: statusOverride || computedStatus,
      source: 'hr_manual_entry',
      locationVerified: false,
      cameraVerified: false,
      notes: notes || `Manually recorded by ${addedBy}`,
      createdAt: new Date().toISOString(),
    };

    setAttendanceState((prev) => ({
      ...prev,
      records: [newRecord, ...prev.records],
    }));

    return { success: true, record: newRecord };
  };

  /**
   * Correct Attendance Record (for HR and authorized Admin)
   */
  const correctAttendance = ({
    attendanceId,
    correctedCheckIn,
    correctedCheckOut,
    correctedStatus = null,
    reason,
    notes = '',
    correctedBy = 'HR Manager',
  }) => {
    const existingIndex = records.findIndex((r) => r.id === attendanceId);
    if (existingIndex === -1) {
      return { success: false, error: 'Attendance record not found.' };
    }

    if (!reason || !reason.trim()) {
      return { success: false, error: 'A valid correction reason is required.' };
    }

    const originalRecord = records[existingIndex];

    let workingHours = null;
    let workingMinutes = null;
    if (correctedCheckIn && correctedCheckOut) {
      const duration = calculateWorkingDuration(correctedCheckIn, correctedCheckOut);
      if (!duration) {
        return { success: false, error: 'Check-out time must be after check-in time.' };
      }
      workingHours = duration.formatted;
      workingMinutes = duration.minutes;
    }

    const status =
      correctedStatus ||
      determineAttendanceStatus({
        checkInTime: correctedCheckIn,
        checkOutTime: correctedCheckOut,
        officeRules,
      });

    const updatedRecord = {
      ...originalRecord,
      checkIn: correctedCheckIn,
      checkOut: correctedCheckOut || null,
      workingHours,
      workingMinutes,
      status,
      isCorrected: true,
      lastCorrectedAt: new Date().toISOString(),
      lastCorrectedBy: correctedBy,
    };

    const correctionAudit = {
      id: `corr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      attendanceId: originalRecord.id,
      employeeId: originalRecord.employeeId,
      employeeName: originalRecord.employeeName,
      date: originalRecord.date,
      originalCheckIn: originalRecord.checkIn,
      originalCheckOut: originalRecord.checkOut,
      originalStatus: originalRecord.status,
      correctedCheckIn,
      correctedCheckOut,
      correctedStatus: status,
      reason: reason.trim(),
      notes: notes.trim(),
      correctedBy,
      correctedAt: new Date().toISOString(),
    };

    setAttendanceState((prev) => {
      const nextRecords = [...prev.records];
      nextRecords[existingIndex] = updatedRecord;
      return {
        ...prev,
        records: nextRecords,
        correctionHistory: [correctionAudit, ...prev.correctionHistory],
      };
    });

    recordAuditEvent({ action: 'attendance.corrected', entityType: 'attendance', entityId: attendanceId });
    createNotification({
      recipientRoles: ['ADMIN', 'HR'],
      title: 'Attendance record corrected',
      message: 'An attendance record was updated.',
      link: '/attendance',
    });

    return { success: true, record: updatedRecord, correction: correctionAudit };
  };

  /**
   * Delete attendance record
   */
  const deleteRecord = (attendanceId) => {
    setAttendanceState((prev) => ({
      ...prev,
      records: prev.records.filter((r) => r.id !== attendanceId),
    }));
    return { success: true };
  };

  /**
   * Get today's record for a specific employee
   */
  const getTodayRecordForEmployee = (employeeId, date = getTodayDateString()) => {
    if (!employeeId) return null;
    return records.find(
      (r) => r.employeeId.toUpperCase() === employeeId.toUpperCase() && r.date === date
    ) || null;
  };

  /**
   * Get all records for a specific employee
   */
  const getRecordsForEmployee = (employeeId) => {
    if (!employeeId) return [];
    return records.filter(
      (r) => r.employeeId.toUpperCase() === employeeId.toUpperCase()
    );
  };

  /**
   * Get all records for a specific date
   */
  const getRecordsByDate = (dateStr) => {
    if (!dateStr) return [];
    return records.filter((r) => r.date === dateStr);
  };

  const value = {
    records,
    correctionHistory,
    checkIn,
    checkOut,
    addManualRecord,
    correctAttendance,
    deleteRecord,
    getTodayRecordForEmployee,
    getRecordsForEmployee,
    getRecordsByDate,
  };

  return <AttendanceContext.Provider value={value}>{children}</AttendanceContext.Provider>;
}

export function useAttendance() {
  const context = useContext(AttendanceContext);
  if (!context) {
    throw new Error('useAttendance must be used within an AttendanceProvider');
  }
  return context;
}
