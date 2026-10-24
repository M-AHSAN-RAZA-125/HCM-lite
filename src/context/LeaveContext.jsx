import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  calculateWorkingDays,
  hasOverlappingLeave,
  calculateEmployeeLeaveBalances,
  getEmployeesOnLeaveOnDate,
  isEmployeeOnLeaveOnDate,
  getTodayDateString,
} from '../utils/leaveCalculations.js';
import { useOrganization } from './OrganizationContext.jsx';
import { useEmployees } from './EmployeeContext.jsx';
import { useCommunication } from './CommunicationContext.jsx';

const LeaveContext = createContext(null);

const STORAGE_KEY = 'hcmlite_session_leaves_v1';

export function LeaveProvider({ children }) {
  const { officeRules, activeLeaveTypes, activeHolidays } = useOrganization();
  const { employees } = useEmployees();
  const { recordAuditEvent, createNotification } = useCommunication();

  // Load leave requests from sessionStorage. Starts with empty array [] when no user data.
  const [leaveRequests, setLeaveRequests] = useState(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Could not read session leave data', e);
    }
    return [];
  });

  // Sync to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(leaveRequests));
    } catch (e) {
      console.warn('Failed to sync session leave requests', e);
    }
  }, [leaveRequests]);

  /**
   * Apply for a new leave
   */
  const applyLeave = ({
    employeeId,
    employeeName,
    department,
    leaveTypeId,
    leaveTypeName,
    startDate,
    endDate,
    reason,
    supportingDocName = null,
    appliedBy = null,
  }) => {
    if (!employeeId || !employeeId.trim()) {
      return { success: false, error: 'Employee identification is required.' };
    }
    if (!leaveTypeId) {
      return { success: false, error: 'Please select a leave category.' };
    }
    const selectedLeaveType = activeLeaveTypes.find((lt) => lt.id === leaveTypeId);
    if (!selectedLeaveType) {
      return { success: false, error: 'Selected leave category was not found in active policies.' };
    }
    if (!startDate || !endDate) {
      return { success: false, error: 'Both start date and end date are required.' };
    }
    if (startDate > endDate) {
      return { success: false, error: 'End date cannot be prior to the start date.' };
    }

    // Check retrospective leave policy
    const todayStr = getTodayDateString();
    const permitsRetrospective = Boolean(
      selectedLeaveType.allowRetrospective || officeRules?.allowRetrospective
    );
    if (startDate < todayStr && !permitsRetrospective) {
      return {
        success: false,
        error: `Start date cannot be in the past (${startDate}). Retrospective leave applications are not permitted under the current organization policy.`,
      };
    }

    if (!reason || !reason.trim()) {
      return { success: false, error: 'A reason for the leave application is required.' };
    }

    // 1. Calculate working days
    const calc = calculateWorkingDays({
      startDate,
      endDate,
      workingDays: officeRules?.workingDays,
      weeklyOffDays: officeRules?.weeklyOffDays,
      holidays: activeHolidays,
    });

    if (calc.workingDays <= 0) {
      return {
        success: false,
        error:
          'Selected date range contains 0 working days (all selected days are weekly off days or company holidays).',
      };
    }

    // 2. Check for overlapping requests for this employee
    const overlapCheck = hasOverlappingLeave(
      employeeId,
      startDate,
      endDate,
      leaveRequests
    );

    if (overlapCheck.hasOverlap) {
      const conflict = overlapCheck.conflictingRequest;
      return {
        success: false,
        error: `Conflicting leave already on file (${conflict.leaveTypeName} from ${conflict.startDate} to ${conflict.endDate}, status: ${conflict.status}). Please choose another date range.`,
      };
    }

    // 3. Balance verification
    if (selectedLeaveType) {
      const balances = calculateEmployeeLeaveBalances(
        employeeId,
        [selectedLeaveType],
        leaveRequests
      );
      const balance = balances[0];
      if (balance && balance.isConfigured && balance.remainingDays !== null) {
        if (calc.workingDays > balance.remainingDays) {
          return {
            success: false,
            error: `Requested duration (${calc.workingDays} workdays) exceeds current available balance (${balance.remainingDays} days remaining for ${selectedLeaveType.name}).`,
          };
        }
      }
    }

    // Generate new request
    const newRequest = {
      id: `LV-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
      employeeId: employeeId.trim().toUpperCase(),
      employeeName: employeeName || 'Employee Member',
      department: department || 'General',
      leaveTypeId,
      leaveTypeName: leaveTypeName || selectedLeaveType?.name || 'Leave',
      startDate,
      endDate,
      requestedDays: calc.workingDays,
      totalCalendarDays: calc.totalCalendarDays,
      holidayDates: calc.holidayDates,
      reason: reason.trim(),
      supportingDocName: supportingDocName || null,
      status: 'Pending',
      appliedAt: new Date().toISOString(),
      appliedBy: appliedBy || employeeName || 'Employee',
      reviewedBy: null,
      reviewedAt: null,
      reviewerComment: null,
      rejectionReason: null,
    };

    setLeaveRequests((prev) => [newRequest, ...prev]);
    recordAuditEvent({ action: 'leave.request_submitted', entityType: 'leave_request', entityId: newRequest.id });
    createNotification({
      recipientRoles: ['ADMIN', 'HR'],
      title: 'Leave request submitted',
      message: 'A leave request is awaiting review.',
      link: '/leaves/approvals',
    });
    return { success: true, request: newRequest };
  };

  /**
   * Approve a leave request (HR / Admin)
   */
  const approveLeave = (requestId, reviewerName = 'HR Manager', reviewerComment = '') => {
    const existingIndex = leaveRequests.findIndex((r) => r.id === requestId);
    if (existingIndex === -1) {
      return { success: false, error: 'Leave request not found.' };
    }

    const currentReq = leaveRequests[existingIndex];
    if (currentReq.status !== 'Pending') {
      return {
        success: false,
        error: `Only pending requests can be approved. Current status is ${currentReq.status}.`,
      };
    }

    const updated = {
      ...currentReq,
      status: 'Approved',
      reviewedBy: reviewerName,
      reviewedAt: new Date().toISOString(),
      reviewerComment: reviewerComment ? reviewerComment.trim() : null,
    };

    setLeaveRequests((prev) => {
      const next = [...prev];
      next[existingIndex] = updated;
      return next;
    });

    recordAuditEvent({ action: 'leave.request_approved', entityType: 'leave_request', entityId: currentReq.id });

    return { success: true, request: updated };
  };

  /**
   * Reject a leave request (HR / Admin) - requires non-empty reason
   */
  const rejectLeave = (requestId, reason, reviewerName = 'HR Manager') => {
    if (!reason || !reason.trim()) {
      return { success: false, error: 'A specific reason is required to reject a leave request.' };
    }

    const existingIndex = leaveRequests.findIndex((r) => r.id === requestId);
    if (existingIndex === -1) {
      return { success: false, error: 'Leave request not found.' };
    }

    const currentReq = leaveRequests[existingIndex];
    if (currentReq.status !== 'Pending') {
      return {
        success: false,
        error: `Only pending requests can be rejected. Current status is ${currentReq.status}.`,
      };
    }

    const updated = {
      ...currentReq,
      status: 'Rejected',
      rejectionReason: reason.trim(),
      reviewerComment: reason.trim(),
      reviewedBy: reviewerName,
      reviewedAt: new Date().toISOString(),
    };

    setLeaveRequests((prev) => {
      const next = [...prev];
      next[existingIndex] = updated;
      return next;
    });

    recordAuditEvent({ action: 'leave.request_rejected', entityType: 'leave_request', entityId: currentReq.id });

    return { success: true, request: updated };
  };

  /**
   * Cancel a leave request (Employee while pending, or Admin/HR)
   */
  const cancelLeave = (requestId, cancelledBy = 'Employee') => {
    const existingIndex = leaveRequests.findIndex((r) => r.id === requestId);
    if (existingIndex === -1) {
      return { success: false, error: 'Leave request not found.' };
    }

    const currentReq = leaveRequests[existingIndex];
    if (currentReq.status !== 'Pending') {
      return {
        success: false,
        error: `Cannot cancel request. Status is already ${currentReq.status}.`,
      };
    }

    const updated = {
      ...currentReq,
      status: 'Cancelled',
      cancelledAt: new Date().toISOString(),
      cancelledBy,
    };

    setLeaveRequests((prev) => {
      const next = [...prev];
      next[existingIndex] = updated;
      return next;
    });

    return { success: true, request: updated };
  };

  /**
   * Get leave statistics for a specific date (defaults to today)
   */
  const getLeaveStats = (dateStr = getTodayDateString()) => {
    const pendingCount = leaveRequests.filter((r) => r.status === 'Pending').length;
    const approvedCount = leaveRequests.filter((r) => r.status === 'Approved').length;
    const rejectedCount = leaveRequests.filter((r) => r.status === 'Rejected').length;
    const onLeaveEmployees = getEmployeesOnLeaveOnDate(dateStr, leaveRequests);
    const onLeaveCount = onLeaveEmployees.length;

    return {
      pendingCount,
      approvedCount,
      rejectedCount,
      onLeaveCount,
      onLeaveEmployees,
      totalRequests: leaveRequests.length,
    };
  };

  /**
   * Get requests for a given employee
   */
  const getRequestsForEmployee = (employeeId) => {
    if (!employeeId) return [];
    const cleanId = employeeId.trim().toUpperCase();
    return leaveRequests.filter((r) => r.employeeId.toUpperCase() === cleanId);
  };

  /**
   * Get all pending approval requests
   */
  const pendingApprovals = useMemo(() => {
    return leaveRequests.filter((r) => r.status === 'Pending');
  }, [leaveRequests]);

  /**
   * Get balances for a specific employee
   */
  const getEmployeeBalances = (employeeId) => {
    return calculateEmployeeLeaveBalances(employeeId, activeLeaveTypes, leaveRequests);
  };

  /**
   * Check if employee is on leave today
   */
  const isEmployeeOnLeave = (employeeId, dateStr = getTodayDateString()) => {
    return isEmployeeOnLeaveOnDate(employeeId, dateStr, leaveRequests);
  };

  const value = {
    leaveRequests,
    pendingApprovals,
    applyLeave,
    approveLeave,
    rejectLeave,
    cancelLeave,
    getLeaveStats,
    getRequestsForEmployee,
    getEmployeeBalances,
    isEmployeeOnLeave,
  };

  return <LeaveContext.Provider value={value}>{children}</LeaveContext.Provider>;
}

export function useLeave() {
  const context = useContext(LeaveContext);
  if (!context) {
    throw new Error('useLeave must be used within a LeaveProvider');
  }
  return context;
}
