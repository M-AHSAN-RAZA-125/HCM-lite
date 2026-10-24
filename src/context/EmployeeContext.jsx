import React, { createContext, useContext, useState, useEffect } from 'react';
import { useCommunication } from './CommunicationContext.jsx';

const EmployeeContext = createContext(null);

const STORAGE_KEY = 'hcmlite_session_employees_v1';

export function EmployeeProvider({ children }) {
  const { recordAuditEvent } = useCommunication();
  // Initialize from sessionStorage so refreshed tabs during evaluation keep added employees,
  // but initial state is an empty array [] if no records have been added.
  const [employees, setEmployees] = useState(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(employees));
    } catch (e) {
      console.warn('Failed to sync session employees', e);
    }
  }, [employees]);

  // Check if Employee ID is already used
  const isEmployeeIdTaken = (employeeId, currentId = null) => {
    const cleanId = employeeId.trim().toUpperCase();
    return employees.some(
      (emp) => emp.employeeId.toUpperCase() === cleanId && emp.id !== currentId
    );
  };

  // Check if Email is already used
  const isEmailTaken = (email, currentId = null) => {
    const cleanEmail = email.trim().toLowerCase();
    return employees.some(
      (emp) => emp.email.toLowerCase() === cleanEmail && emp.id !== currentId
    );
  };

  // Add new employee
  const addEmployee = (employeeData) => {
    const cleanId = (employeeData.employeeId || '').trim().toUpperCase();
    const cleanEmail = (employeeData.email || '').trim().toLowerCase();

    if (isEmployeeIdTaken(cleanId)) {
      return { success: false, error: `Employee ID "${cleanId}" is already assigned to another employee.` };
    }

    if (isEmailTaken(cleanEmail)) {
      return { success: false, error: `Email "${cleanEmail}" is already registered to another employee.` };
    }

    const newEmp = {
      ...employeeData,
      id: cleanId,
      employeeId: cleanId,
      email: cleanEmail,
      fullName: `${employeeData.firstName} ${employeeData.lastName}`.trim(),
      status: employeeData.status || 'Active',
      createdAt: new Date().toISOString(),
    };

    // Remove any sensitive temporary password from stored state
    delete newEmp.password;
    delete newEmp.confirmPassword;
    delete newEmp.tempPassword;

    setEmployees((prev) => [newEmp, ...prev]);
    recordAuditEvent({ action: 'employee.created', entityType: 'employee', entityId: cleanId });
    return { success: true, employee: newEmp };
  };

  // Update existing employee
  const updateEmployee = (id, updatedFields) => {
    const cleanEmail = updatedFields.email ? updatedFields.email.trim().toLowerCase() : undefined;

    if (cleanEmail && isEmailTaken(cleanEmail, id)) {
      return { success: false, error: `Email "${cleanEmail}" is already in use.` };
    }

    let updatedRecord = null;

    setEmployees((prev) =>
      prev.map((emp) => {
        if (emp.id === id || emp.employeeId === id) {
          const updated = {
            ...emp,
            ...updatedFields,
            fullName: updatedFields.firstName && updatedFields.lastName
              ? `${updatedFields.firstName} ${updatedFields.lastName}`.trim()
              : emp.fullName,
            updatedAt: new Date().toISOString(),
          };
          delete updated.password;
          delete updated.confirmPassword;
          updatedRecord = updated;
          return updated;
        }
        return emp;
      })
    );

    if (updatedRecord) {
      recordAuditEvent({ action: 'employee.updated', entityType: 'employee', entityId: updatedRecord.employeeId });
      return { success: true, employee: updatedRecord };
    }
    return { success: false, error: 'Employee not found.' };
  };

  // Deactivate employee
  const deactivateEmployee = (id) => {
    let updated = null;
    setEmployees((prev) =>
      prev.map((emp) => {
        if (emp.id === id || emp.employeeId === id) {
          updated = { ...emp, status: 'Inactive', deactivatedAt: new Date().toISOString() };
          return updated;
        }
        return emp;
      })
    );
    if (updated) recordAuditEvent({ action: 'employee.status_changed', entityType: 'employee', entityId: updated.employeeId });
    return { success: !!updated, employee: updated };
  };

  // Bulk import valid employees from CSV
  const importEmployees = (validRows) => {
    const sanitizedRows = validRows.map((row) => {
      const cleanId = row.employeeId.trim().toUpperCase();
      const cleanEmail = row.email.trim().toLowerCase();
      const item = {
        ...row,
        id: cleanId,
        employeeId: cleanId,
        email: cleanEmail,
        fullName: `${row.firstName || ''} ${row.lastName || ''}`.trim() || row.fullName || 'Employee',
        status: row.status || 'Active',
        createdAt: new Date().toISOString(),
      };
      delete item.password;
      delete item.confirmPassword;
      return item;
    });

    setEmployees((prev) => [...sanitizedRows, ...prev]);
    return { success: true, count: sanitizedRows.length };
  };

  // Find employee by ID
  const getEmployeeById = (id) => {
    if (!id) return null;
    const clean = id.trim().toUpperCase();
    return employees.find(
      (emp) => emp.id.toUpperCase() === clean || emp.employeeId.toUpperCase() === clean
    ) || null;
  };

  // Clear all session employees (for testing empty states)
  const clearSessionEmployees = () => {
    setEmployees([]);
    sessionStorage.removeItem(STORAGE_KEY);
  };

  const value = {
    employees,
    totalCount: employees.length,
    activeCount: employees.filter((e) => e.status === 'Active').length,
    inactiveCount: employees.filter((e) => e.status === 'Inactive').length,
    onLeaveCount: employees.filter((e) => e.status === 'On Leave').length,
    addEmployee,
    updateEmployee,
    deactivateEmployee,
    importEmployees,
    getEmployeeById,
    isEmployeeIdTaken,
    isEmailTaken,
    clearSessionEmployees,
  };

  return <EmployeeContext.Provider value={value}>{children}</EmployeeContext.Provider>;
}

export function useEmployees() {
  const context = useContext(EmployeeContext);
  if (!context) {
    throw new Error('useEmployees must be used within an EmployeeProvider');
  }
  return context;
}
