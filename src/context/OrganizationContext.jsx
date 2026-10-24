import React, { createContext, useContext, useState, useEffect } from 'react';
import { useCommunication } from './CommunicationContext.jsx';

const OrganizationContext = createContext(null);

const STORAGE_KEY = 'hcmlite_session_org_v1';

export function OrganizationProvider({ children }) {
  const { recordAuditEvent } = useCommunication();
  const [orgData, setOrgData] = useState(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Could not read session org data', e);
    }

    return {
      companyProfile: {
        companyName: '',
        companyEmail: '',
        companyPhone: '',
        industry: '',
        website: '',
        address: '',
        city: '',
        country: '',
        logoUrl: null,
        isConfigured: false,
      },
      officeRules: {
        startTime: '09:00',
        endTime: '18:00',
        gracePeriod: 15,
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        weeklyOffDays: ['Saturday', 'Sunday'],
        locationName: '',
        latitude: '',
        longitude: '',
        radiusMeters: 100,
        isConfigured: false,
      },
      departments: [],
      designations: [],
      leaveTypes: [],
      holidays: [],
      hrAccounts: [],
    };
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(orgData));
    } catch (e) {
      console.warn('Failed to sync session org data', e);
    }
  }, [orgData]);

  // Update Company Profile
  const updateCompanyProfile = (profile) => {
    const isConfigured = Boolean(profile.companyName && profile.companyName.trim());
    setOrgData((prev) => ({
      ...prev,
      companyProfile: {
        ...prev.companyProfile,
        ...profile,
        isConfigured,
      },
    }));
    recordAuditEvent({ action: 'organization.profile_updated', entityType: 'organization' });
    return { success: true };
  };

  // Update Office & Attendance Rules
  const updateOfficeRules = (rules) => {
    setOrgData((prev) => ({
      ...prev,
      officeRules: {
        ...prev.officeRules,
        ...rules,
        isConfigured: true,
      },
    }));
    recordAuditEvent({ action: 'organization.office_rules_updated', entityType: 'organization' });
    return { success: true };
  };

  // Department CRUD
  const addDepartment = (dep) => {
    const cleanName = dep.name.trim();
    const exists = orgData.departments.some(
      (d) => d.name.trim().toLowerCase() === cleanName.toLowerCase()
    );
    if (exists) {
      return { success: false, error: `Department "${cleanName}" already exists.` };
    }

    const newDep = {
      ...dep,
      id: `DEP-${Math.floor(100 + Math.random() * 900)}`,
      name: cleanName,
      status: dep.status || 'Active',
      createdAt: new Date().toISOString(),
    };

    setOrgData((prev) => ({
      ...prev,
      departments: [...prev.departments, newDep],
    }));
    return { success: true, department: newDep };
  };

  const updateDepartment = (id, fields) => {
    const cleanName = fields.name ? fields.name.trim() : '';
    if (cleanName) {
      const duplicate = orgData.departments.some(
        (d) => d.id !== id && d.name.trim().toLowerCase() === cleanName.toLowerCase()
      );
      if (duplicate) {
        return { success: false, error: `Department "${cleanName}" already exists.` };
      }
    }

    let updated = null;
    setOrgData((prev) => ({
      ...prev,
      departments: prev.departments.map((d) => {
        if (d.id === id) {
          updated = { ...d, ...fields, name: cleanName || d.name };
          return updated;
        }
        return d;
      }),
    }));
    return { success: !!updated, department: updated };
  };

  const toggleDepartmentStatus = (id) => {
    setOrgData((prev) => ({
      ...prev,
      departments: prev.departments.map((d) =>
        d.id === id ? { ...d, status: d.status === 'Active' ? 'Inactive' : 'Active' } : d
      ),
    }));
    return { success: true };
  };

  // Designation CRUD
  const addDesignation = (desig) => {
    const cleanName = desig.name.trim();
    const exists = orgData.designations.some(
      (d) =>
        d.departmentId === desig.departmentId &&
        d.name.trim().toLowerCase() === cleanName.toLowerCase()
    );
    if (exists) {
      return {
        success: false,
        error: `Designation "${cleanName}" already exists in the selected department.`,
      };
    }

    const dep = orgData.departments.find((d) => d.id === desig.departmentId);
    const newDesig = {
      ...desig,
      id: `DES-${Math.floor(100 + Math.random() * 900)}`,
      name: cleanName,
      departmentName: dep ? dep.name : 'Unassigned',
      status: desig.status || 'Active',
      createdAt: new Date().toISOString(),
    };

    setOrgData((prev) => ({
      ...prev,
      designations: [...prev.designations, newDesig],
    }));
    return { success: true, designation: newDesig };
  };

  const updateDesignation = (id, fields) => {
    const cleanName = fields.name ? fields.name.trim() : '';
    const targetDeptId = fields.departmentId;

    if (cleanName && targetDeptId) {
      const duplicate = orgData.designations.some(
        (d) =>
          d.id !== id &&
          d.departmentId === targetDeptId &&
          d.name.trim().toLowerCase() === cleanName.toLowerCase()
      );
      if (duplicate) {
        return {
          success: false,
          error: `Designation "${cleanName}" already exists in the selected department.`,
        };
      }
    }

    const dep = targetDeptId
      ? orgData.departments.find((d) => d.id === targetDeptId)
      : null;

    let updated = null;
    setOrgData((prev) => ({
      ...prev,
      designations: prev.designations.map((d) => {
        if (d.id === id) {
          updated = {
            ...d,
            ...fields,
            name: cleanName || d.name,
            departmentName: dep ? dep.name : d.departmentName,
          };
          return updated;
        }
        return d;
      }),
    }));
    return { success: !!updated, designation: updated };
  };

  const toggleDesignationStatus = (id) => {
    setOrgData((prev) => ({
      ...prev,
      designations: prev.designations.map((d) =>
        d.id === id ? { ...d, status: d.status === 'Active' ? 'Inactive' : 'Active' } : d
      ),
    }));
    return { success: true };
  };

  // Leave Types CRUD
  const addLeaveType = (leave) => {
    const cleanName = leave.name.trim();
    const exists = orgData.leaveTypes.some(
      (lt) => lt.name.trim().toLowerCase() === cleanName.toLowerCase()
    );
    if (exists) {
      return { success: false, error: `Leave type "${cleanName}" already exists.` };
    }

    const newLt = {
      ...leave,
      id: `LT-${Math.floor(100 + Math.random() * 900)}`,
      name: cleanName,
      status: leave.status || 'Active',
      createdAt: new Date().toISOString(),
    };

    setOrgData((prev) => ({
      ...prev,
      leaveTypes: [...prev.leaveTypes, newLt],
    }));
    return { success: true, leaveType: newLt };
  };

  const updateLeaveType = (id, fields) => {
    const cleanName = fields.name ? fields.name.trim() : '';
    if (cleanName) {
      const duplicate = orgData.leaveTypes.some(
        (lt) => lt.id !== id && lt.name.trim().toLowerCase() === cleanName.toLowerCase()
      );
      if (duplicate) {
        return { success: false, error: `Leave type "${cleanName}" already exists.` };
      }
    }

    let updated = null;
    setOrgData((prev) => ({
      ...prev,
      leaveTypes: prev.leaveTypes.map((lt) => {
        if (lt.id === id) {
          updated = { ...lt, ...fields, name: cleanName || lt.name };
          return updated;
        }
        return lt;
      }),
    }));
    return { success: !!updated, leaveType: updated };
  };

  const toggleLeaveTypeStatus = (id) => {
    setOrgData((prev) => ({
      ...prev,
      leaveTypes: prev.leaveTypes.map((lt) =>
        lt.id === id ? { ...lt, status: lt.status === 'Active' ? 'Inactive' : 'Active' } : lt
      ),
    }));
    return { success: true };
  };

  // Holiday CRUD
  const addHoliday = (hol) => {
    const cleanName = hol.name.trim();
    const exists = orgData.holidays.some(
      (h) => h.date === hol.date && h.name.trim().toLowerCase() === cleanName.toLowerCase()
    );
    if (exists) {
      return {
        success: false,
        error: `A holiday named "${cleanName}" already exists for ${hol.date}.`,
      };
    }

    const newHol = {
      ...hol,
      id: `HOL-${Math.floor(100 + Math.random() * 900)}`,
      name: cleanName,
      status: hol.status || 'Active',
      createdAt: new Date().toISOString(),
    };

    setOrgData((prev) => ({
      ...prev,
      holidays: [...prev.holidays, newHol],
    }));
    return { success: true, holiday: newHol };
  };

  const updateHoliday = (id, fields) => {
    const cleanName = fields.name ? fields.name.trim() : '';
    const targetDate = fields.date;

    if (cleanName && targetDate) {
      const duplicate = orgData.holidays.some(
        (h) =>
          h.id !== id &&
          h.date === targetDate &&
          h.name.trim().toLowerCase() === cleanName.toLowerCase()
      );
      if (duplicate) {
        return {
          success: false,
          error: `A holiday named "${cleanName}" already exists for ${targetDate}.`,
        };
      }
    }

    let updated = null;
    setOrgData((prev) => ({
      ...prev,
      holidays: prev.holidays.map((h) => {
        if (h.id === id) {
          updated = { ...h, ...fields, name: cleanName || h.name };
          return updated;
        }
        return h;
      }),
    }));
    return { success: !!updated, holiday: updated };
  };

  const toggleHolidayStatus = (id) => {
    setOrgData((prev) => ({
      ...prev,
      holidays: prev.holidays.map((h) =>
        h.id === id ? { ...h, status: h.status === 'Active' ? 'Inactive' : 'Active' } : h
      ),
    }));
    return { success: true };
  };

  // HR Accounts CRUD
  const addHrAccount = (hr) => {
    const cleanEmail = hr.email.trim().toLowerCase();
    const exists = orgData.hrAccounts.some(
      (a) => a.email.trim().toLowerCase() === cleanEmail
    );
    if (exists) {
      return { success: false, error: `HR account with email "${cleanEmail}" already exists.` };
    }

    const newAcc = {
      ...hr,
      id: `HRA-${Math.floor(100 + Math.random() * 900)}`,
      email: cleanEmail,
      status: hr.status || 'Active',
      createdAt: new Date().toISOString(),
    };

    setOrgData((prev) => ({
      ...prev,
      hrAccounts: [...prev.hrAccounts, newAcc],
    }));
    return { success: true, hrAccount: newAcc };
  };

  const updateHrAccount = (id, fields) => {
    const cleanEmail = fields.email ? fields.email.trim().toLowerCase() : '';
    if (cleanEmail) {
      const duplicate = orgData.hrAccounts.some(
        (a) => a.id !== id && a.email.trim().toLowerCase() === cleanEmail
      );
      if (duplicate) {
        return { success: false, error: `HR account with email "${cleanEmail}" already exists.` };
      }
    }

    let updated = null;
    setOrgData((prev) => ({
      ...prev,
      hrAccounts: prev.hrAccounts.map((a) => {
        if (a.id === id) {
          updated = { ...a, ...fields, email: cleanEmail || a.email };
          return updated;
        }
        return a;
      }),
    }));
    return { success: !!updated, hrAccount: updated };
  };

  const toggleHrAccountStatus = (id) => {
    setOrgData((prev) => ({
      ...prev,
      hrAccounts: prev.hrAccounts.map((a) =>
        a.id === id ? { ...a, status: a.status === 'Active' ? 'Inactive' : 'Active' } : a
      ),
    }));
    return { success: true };
  };

  const value = {
    companyProfile: orgData.companyProfile,
    officeRules: orgData.officeRules,
    departments: orgData.departments,
    activeDepartments: orgData.departments.filter((d) => d.status === 'Active'),
    designations: orgData.designations,
    activeDesignations: orgData.designations.filter((d) => d.status === 'Active'),
    leaveTypes: orgData.leaveTypes,
    activeLeaveTypes: orgData.leaveTypes.filter((lt) => lt.status === 'Active'),
    holidays: orgData.holidays,
    activeHolidays: orgData.holidays.filter((h) => h.status === 'Active'),
    hrAccounts: orgData.hrAccounts,
    updateCompanyProfile,
    updateOfficeRules,
    addDepartment,
    updateDepartment,
    toggleDepartmentStatus,
    addDesignation,
    updateDesignation,
    toggleDesignationStatus,
    addLeaveType,
    updateLeaveType,
    toggleLeaveTypeStatus,
    addHoliday,
    updateHoliday,
    toggleHolidayStatus,
    addHrAccount,
    updateHrAccount,
    toggleHrAccountStatus,
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}
