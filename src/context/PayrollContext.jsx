import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  calculateSalaryStructureTotals,
  calculateMonthlyPayroll,
  generatePayrollRunId,
} from '../utils/payrollCalculations.js';
import { useEmployees } from './EmployeeContext.jsx';
import { useAttendance } from './AttendanceContext.jsx';
import { useLeave } from './LeaveContext.jsx';
import { useOrganization } from './OrganizationContext.jsx';

const PayrollContext = createContext(null);

const STORAGE_KEY = 'hcmlite_session_payroll_v1';

export function PayrollProvider({ children }) {
  const { employees } = useEmployees();
  const { records: attendanceRecords } = useAttendance();
  const { leaveRequests } = useLeave();
  const { companyProfile } = useOrganization();

  // Load from sessionStorage
  const [payrollData, setPayrollData] = useState(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Could not read session payroll data', e);
    }

    return {
      salaryStructures: [],
      payrollRuns: [],
    };
  });

  // Sync to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payrollData));
    } catch (e) {
      console.warn('Failed to sync session payroll data', e);
    }
  }, [payrollData]);

  const { salaryStructures, payrollRuns } = payrollData;

  /**
   * Add a new salary structure
   */
  const addSalaryStructure = (data) => {
    const totals = calculateSalaryStructureTotals(data);
    const id = `STR-${String(salaryStructures.length + 1).padStart(3, '0')}`;

    const newStructure = {
      ...data,
      id,
      employeeId: (data.employeeId || '').trim().toUpperCase(),
      employeeName: data.employeeName || 'Staff Member',
      department: data.department || 'General',
      designation: data.designation || 'Staff',
      salaryFrequency: data.salaryFrequency || 'Monthly',
      status: data.status || 'Active',
      ...totals,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setPayrollData((prev) => ({
      ...prev,
      salaryStructures: [newStructure, ...prev.salaryStructures],
    }));

    return { success: true, structure: newStructure };
  };

  /**
   * Update an existing salary structure
   */
  const updateSalaryStructure = (id, data) => {
    const totals = calculateSalaryStructureTotals(data);
    let updated = null;

    setPayrollData((prev) => ({
      ...prev,
      salaryStructures: prev.salaryStructures.map((s) => {
        if (s.id === id) {
          updated = {
            ...s,
            ...data,
            id,
            employeeId: (data.employeeId || s.employeeId).trim().toUpperCase(),
            salaryFrequency: data.salaryFrequency || s.salaryFrequency || 'Monthly',
            status: data.status || s.status || 'Active',
            ...totals,
            updatedAt: new Date().toISOString(),
          };
          return updated;
        }
        return s;
      }),
    }));

    return { success: !!updated, structure: updated };
  };

  /**
   * Toggle Active / Inactive status of a salary structure
   */
  const toggleSalaryStructureStatus = (id) => {
    let updated = null;
    setPayrollData((prev) => ({
      ...prev,
      salaryStructures: prev.salaryStructures.map((s) => {
        if (s.id === id) {
          const nextStatus = s.status === 'Active' ? 'Inactive' : 'Active';
          updated = { ...s, status: nextStatus, updatedAt: new Date().toISOString() };
          return updated;
        }
        return s;
      }),
    }));
    return { success: !!updated, structure: updated };
  };

  /**
   * Delete a salary structure (only if no finalized payroll runs reference it)
   */
  const deleteSalaryStructure = (id) => {
    // Check if any finalized run references this structure
    const isReferenced = payrollRuns.some(
      (r) =>
        r.status !== 'Draft' &&
        r.items.some((item) => item.structureId === id)
    );

    if (isReferenced) {
      return {
        success: false,
        error: 'Cannot delete salary structure: it has been used in a finalized payroll run. Deactivate it instead.',
      };
    }

    setPayrollData((prev) => ({
      ...prev,
      salaryStructures: prev.salaryStructures.filter((s) => s.id !== id),
    }));

    return { success: true };
  };

  /**
   * Get active salary structure for a specific employee
   */
  const getEmployeeActiveStructure = (employeeId) => {
    if (!employeeId) return null;
    const cleanId = employeeId.trim().toUpperCase();
    return (
      salaryStructures.find(
        (s) => s.employeeId.toUpperCase() === cleanId && s.status === 'Active'
      ) || null
    );
  };

  /**
   * Save a calculated payroll run as Draft
   */
  const savePayrollDraft = (draftInput) => {
    const {
      periodMonth,
      periodYear,
      periodLabel,
      items,
      excludedEmployees = [],
      totalGross,
      totalDeductions,
      totalNet,
      createdByRole = 'HR',
    } = draftInput;

    // Check if an existing run exists for this period
    const existingIndex = payrollRuns.findIndex(
      (r) => r.month === periodMonth && r.year === periodYear
    );

    if (existingIndex !== -1) {
      const existing = payrollRuns[existingIndex];
      if (existing.status === 'Finalized' || existing.status === 'Locked') {
        return {
          success: false,
          error: `Payroll for ${periodLabel} is already ${existing.status.toLowerCase()} and cannot be overwritten.`,
        };
      }

      // Update existing draft
      const updatedDraft = {
        ...existing,
        items,
        excludedEmployees,
        totalGross,
        totalDeductions,
        totalNet,
        employeesCount: items.length,
        createdByRole,
        updatedAt: new Date().toISOString(),
      };

      setPayrollData((prev) => {
        const nextRuns = [...prev.payrollRuns];
        nextRuns[existingIndex] = updatedDraft;
        return { ...prev, payrollRuns: nextRuns };
      });

      return { success: true, payrollRun: updatedDraft, isUpdated: true };
    }

    // Create new draft
    const newRunId = generatePayrollRunId(periodYear, periodMonth);
    const newDraft = {
      id: newRunId,
      month: periodMonth,
      year: periodYear,
      periodLabel: periodLabel || `Month ${periodMonth}, ${periodYear}`,
      status: 'Draft',
      totalGross,
      totalDeductions,
      totalNet,
      employeesCount: items.length,
      items,
      excludedEmployees,
      createdByRole,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      finalizedByRole: null,
      finalizedAt: null,
      lockedByRole: null,
      lockedAt: null,
    };

    setPayrollData((prev) => ({
      ...prev,
      payrollRuns: [newDraft, ...prev.payrollRuns],
    }));

    return { success: true, payrollRun: newDraft, isUpdated: false };
  };

  /**
   * Finalize an eligible payroll run (Admin action)
   */
  const finalizePayrollRun = (runId, finalizedByRole = 'ADMIN') => {
    const existingIndex = payrollRuns.findIndex((r) => r.id === runId);
    if (existingIndex === -1) {
      return { success: false, error: 'Payroll run not found.' };
    }

    const currentRun = payrollRuns[existingIndex];
    if (currentRun.status === 'Locked') {
      return { success: false, error: 'Payroll run is already locked.' };
    }

    const finalizedRun = {
      ...currentRun,
      status: 'Finalized',
      finalizedByRole,
      finalizedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setPayrollData((prev) => {
      const nextRuns = [...prev.payrollRuns];
      nextRuns[existingIndex] = finalizedRun;
      return { ...prev, payrollRuns: nextRuns };
    });

    return { success: true, payrollRun: finalizedRun };
  };

  /**
   * Lock a finalized payroll run (Admin action)
   */
  const lockPayrollRun = (runId, lockedByRole = 'ADMIN') => {
    const existingIndex = payrollRuns.findIndex((r) => r.id === runId);
    if (existingIndex === -1) {
      return { success: false, error: 'Payroll run not found.' };
    }

    const currentRun = payrollRuns[existingIndex];
    if (currentRun.status !== 'Finalized') {
      return {
        success: false,
        error: `Only finalized payroll runs can be locked. Current status: ${currentRun.status}.`,
      };
    }

    const lockedRun = {
      ...currentRun,
      status: 'Locked',
      lockedByRole,
      lockedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setPayrollData((prev) => {
      const nextRuns = [...prev.payrollRuns];
      nextRuns[existingIndex] = lockedRun;
      return { ...prev, payrollRuns: nextRuns };
    });

    return { success: true, payrollRun: lockedRun };
  };

  /**
   * Delete a draft payroll run
   */
  const deletePayrollDraft = (runId) => {
    const existing = payrollRuns.find((r) => r.id === runId);
    if (!existing) {
      return { success: false, error: 'Payroll run not found.' };
    }
    if (existing.status !== 'Draft') {
      return {
        success: false,
        error: `Cannot delete a ${existing.status.toLowerCase()} payroll run.`,
      };
    }

    setPayrollData((prev) => ({
      ...prev,
      payrollRuns: prev.payrollRuns.filter((r) => r.id !== runId),
    }));

    return { success: true };
  };

  /**
   * Query a payroll run for a specific year and month
   */
  const getPayrollRunForPeriod = (year, month) => {
    return payrollRuns.find((r) => r.year === Number(year) && r.month === Number(month)) || null;
  };

  /**
   * Retrieve all finalized payslips for a given employee
   */
  const getFinalizedPayslipsForEmployee = (employeeId) => {
    if (!employeeId) return [];
    const cleanId = employeeId.trim().toUpperCase();

    const finalizedRuns = payrollRuns.filter(
      (r) => r.status === 'Finalized' || r.status === 'Locked'
    );

    const payslips = [];
    finalizedRuns.forEach((run) => {
      const match = run.items.find((item) => item.employeeId.toUpperCase() === cleanId);
      if (match) {
        payslips.push({
          ...match,
          runId: run.id,
          month: run.month,
          year: run.year,
          periodLabel: run.periodLabel,
          payrollStatus: run.status,
          finalizedAt: run.finalizedAt,
          companyName: companyProfile?.companyName || 'Enterprise Organization',
          companyLogoUrl: companyProfile?.logoUrl || null,
        });
      }
    });

    return payslips;
  };

  /**
   * Retrieve all finalized payslips across the organization (for HR / Admin)
   */
  const getAllFinalizedPayslips = () => {
    const finalizedRuns = payrollRuns.filter(
      (r) => r.status === 'Finalized' || r.status === 'Locked'
    );

    const payslips = [];
    finalizedRuns.forEach((run) => {
      run.items.forEach((item) => {
        payslips.push({
          ...item,
          runId: run.id,
          month: run.month,
          year: run.year,
          periodLabel: run.periodLabel,
          payrollStatus: run.status,
          finalizedAt: run.finalizedAt,
          companyName: companyProfile?.companyName || 'Enterprise Organization',
          companyLogoUrl: companyProfile?.logoUrl || null,
        });
      });
    });

    return payslips;
  };

  const value = {
    salaryStructures,
    payrollRuns,
    addSalaryStructure,
    updateSalaryStructure,
    toggleSalaryStructureStatus,
    deleteSalaryStructure,
    getEmployeeActiveStructure,
    savePayrollDraft,
    finalizePayrollRun,
    lockPayrollRun,
    deletePayrollDraft,
    getPayrollRunForPeriod,
    getFinalizedPayslipsForEmployee,
    getAllFinalizedPayslips,
  };

  return <PayrollContext.Provider value={value}>{children}</PayrollContext.Provider>;
}

export function usePayroll() {
  const context = useContext(PayrollContext);
  if (!context) {
    throw new Error('usePayroll must be used within a PayrollProvider');
  }
  return context;
}
