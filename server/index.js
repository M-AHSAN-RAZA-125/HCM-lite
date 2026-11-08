import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';

import { getDb, saveDb, resetDb } from './db.js';
import { calculateSalaryStructure, computeEmployeePayrollRecord } from './services/payrollService.js';
import { evaluateAttendanceStatus, getDistanceMeters } from './services/attendanceService.js';
import { calculateWorkingDays, checkLeaveOverlap, getLeaveBalances } from './services/leaveService.js';
import { handleAssistantChat, generateDashboardSummary, parseSmartLeavePrompt } from './services/aiService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));

// Helper: record audit log
function audit(actor, action, entity, details = {}) {
  const db = getDb();
  const entry = {
    id: crypto.randomUUID(),
    actor: {
      id: actor?.id || 'system',
      name: actor?.name || 'System',
      role: actor?.role || 'SYSTEM',
    },
    action,
    entity,
    details,
    createdAt: new Date().toISOString(),
  };
  db.auditLogs.unshift(entry);
  saveDb();
  return entry;
}

// Simple authentication middleware
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  const token = authHeader.split(' ')[1];
  const db = getDb();
  const user = db.users.find((u) => u.id === token && u.status !== 'DEACTIVATED');
  if (!user) {
    return res.status(401).json({ message: 'Invalid or expired session. Please sign in again.' });
  }
  req.user = user;
  next();
}

// Role guard middleware
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: insufficient role permissions' });
    }
    next();
  };
}

// ==========================================
// M1: FIRST-RUN SETUP & AUTHENTICATION
// ==========================================

// Check if first-run setup is needed
app.get('/api/setup/status', (req, res) => {
  const db = getDb();
  const isConfigured = Boolean(db.company?.isConfigured && db.users.some((u) => u.role === 'ADMIN'));
  res.json({
    isConfigured,
    companyName: db.company?.name || '',
  });
});

// Execute first-run setup (creates company and primary Admin account)
app.post('/api/setup', async (req, res) => {
  try {
    const db = getDb();
    const { companyData, adminData } = req.body;

    if (!companyData?.companyName?.trim()) {
      return res.status(400).json({ message: 'Company name is required.' });
    }
    if (!adminData?.adminEmail?.trim() || !adminData?.password?.trim()) {
      return res.status(400).json({ message: 'Admin email and password are required.' });
    }

    // Save company profile
    db.company = {
      ...db.company,
      name: companyData.companyName.trim(),
      email: companyData.companyEmail?.trim() || '',
      phone: companyData.companyPhone?.trim() || '',
      industry: companyData.industry?.trim() || 'Information Technology',
      website: companyData.website?.trim() || '',
      isConfigured: true,
    };

    // Hash admin password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(adminData.password.trim(), salt);

    // Create Admin user
    const adminUser = {
      id: crypto.randomUUID(),
      name: adminData.adminName?.trim() || 'Administrator',
      email: adminData.adminEmail.trim().toLowerCase(),
      passwordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
      mustChangePassword: false,
      createdAt: new Date().toISOString(),
    };

    // Remove any previous admin if restarting setup
    db.users = db.users.filter((u) => u.role !== 'ADMIN');
    db.users.push(adminUser);

    audit(adminUser, 'setup.initialized', 'company', { companyName: db.company.name });
    saveDb();

    res.json({
      success: true,
      message: 'Workspace and Administrator created successfully.',
      user: { id: adminUser.id, name: adminUser.name, email: adminUser.email, role: adminUser.role },
      token: adminUser.id,
    });
  } catch (err) {
    console.error('Setup error:', err);
    res.status(500).json({ message: 'Setup failed. Please retry.' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const db = getDb();
    const user = db.users.find((u) => u.email === email.trim().toLowerCase());

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    if (user.status === 'DEACTIVATED') {
      return res.status(403).json({ message: 'This account has been deactivated. Contact Admin.' });
    }

    if (role && user.role !== role) {
      return res.status(403).json({ message: `Access denied for requested role ${role}. Your registered role is ${user.role}.` });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Find linked employee record if any
    const employee = user.employeeId ? db.employees.find((e) => e.employeeId === user.employeeId) : null;

    audit(user, 'auth.login', 'user', { role: user.role });

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        employeeId: user.employeeId || null,
        department: employee?.department || user.department || null,
        designation: employee?.designation || user.designation || null,
        mustChangePassword: Boolean(user.mustChangePassword),
      },
      token: user.id,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Authentication error.' });
  }
});

// Change Password (for first login or password reset)
app.post('/api/auth/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters.' });
    }

    const db = getDb();
    const user = db.users.find((u) => u.id === req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    // If not first-time mandatory change, verify current password
    if (!user.mustChangePassword && currentPassword) {
      const match = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!match) return res.status(400).json({ message: 'Current password incorrect.' });
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    user.mustChangePassword = false;

    audit(user, 'auth.password_changed', 'user');
    saveDb();

    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Could not change password.' });
  }
});

// Get Current User Profile
app.get('/api/auth/me', authenticate, (req, res) => {
  const db = getDb();
  const user = req.user;
  const employee = user.employeeId ? db.employees.find((e) => e.employeeId === user.employeeId) : null;

  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      employeeId: user.employeeId || null,
      department: employee?.department || user.department || null,
      designation: employee?.designation || user.designation || null,
      mustChangePassword: Boolean(user.mustChangePassword),
    },
  });
});

// ==========================================
// M2: ORGANIZATION SETUP & RULES
// ==========================================

// Get all organization details
app.get('/api/organization', (req, res) => {
  const db = getDb();
  res.json({
    companyProfile: db.company,
    officeRules: db.company.rules,
    departments: db.departments,
    designations: db.designations,
    leaveTypes: db.leaveTypes,
    holidays: db.holidays,
    hrAccounts: db.users.filter((u) => u.role === 'HR').map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status,
      createdAt: u.createdAt,
    })),
  });
});

// Update company profile
app.put('/api/organization/company', authenticate, authorize('ADMIN'), (req, res) => {
  const db = getDb();
  db.company = { ...db.company, ...req.body };
  audit(req.user, 'organization.updated_profile', 'company', req.body);
  saveDb();
  res.json({ success: true, company: db.company });
});

// Update office rules (timings, grace, geofence)
app.put('/api/organization/rules', authenticate, authorize('ADMIN'), (req, res) => {
  const db = getDb();
  db.company.rules = { ...db.company.rules, ...req.body };
  audit(req.user, 'organization.updated_rules', 'office_rules', req.body);
  saveDb();
  res.json({ success: true, rules: db.company.rules });
});

// Departments
app.post('/api/organization/departments', authenticate, authorize('ADMIN'), (req, res) => {
  const { name, code, headName } = req.body;
  if (!name) return res.status(400).json({ message: 'Department name is required' });
  const db = getDb();
  const dept = { id: crypto.randomUUID(), name: name.trim(), code: code?.trim() || name.slice(0, 3).toUpperCase(), headName: headName || '' };
  db.departments.push(dept);
  audit(req.user, 'department.created', 'department', dept);
  saveDb();
  res.json({ success: true, department: dept });
});

app.delete('/api/organization/departments/:id', authenticate, authorize('ADMIN'), (req, res) => {
  const db = getDb();
  db.departments = db.departments.filter((d) => d.id !== req.params.id);
  audit(req.user, 'department.deleted', 'department', { id: req.params.id });
  saveDb();
  res.json({ success: true });
});

// Designations
app.post('/api/organization/designations', authenticate, authorize('ADMIN'), (req, res) => {
  const { title, department } = req.body;
  if (!title) return res.status(400).json({ message: 'Title is required' });
  const db = getDb();
  const desig = { id: crypto.randomUUID(), title: title.trim(), department: department || '' };
  db.designations.push(desig);
  audit(req.user, 'designation.created', 'designation', desig);
  saveDb();
  res.json({ success: true, designation: desig });
});

app.delete('/api/organization/designations/:id', authenticate, authorize('ADMIN'), (req, res) => {
  const db = getDb();
  db.designations = db.designations.filter((d) => d.id !== req.params.id);
  audit(req.user, 'designation.deleted', 'designation', { id: req.params.id });
  saveDb();
  res.json({ success: true });
});

// Public Holidays
app.post('/api/organization/holidays', authenticate, authorize('ADMIN'), (req, res) => {
  const { name, date } = req.body;
  if (!name || !date) return res.status(400).json({ message: 'Name and date are required' });
  const db = getDb();
  const hol = { id: crypto.randomUUID(), name: name.trim(), date };
  db.holidays.push(hol);
  audit(req.user, 'holiday.created', 'holiday', hol);
  saveDb();
  res.json({ success: true, holiday: hol });
});

app.delete('/api/organization/holidays/:id', authenticate, authorize('ADMIN'), (req, res) => {
  const db = getDb();
  db.holidays = db.holidays.filter((h) => h.id !== req.params.id);
  saveDb();
  res.json({ success: true });
});

// Admin creates HR login
app.post('/api/organization/hr-accounts', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and temporary password are required.' });
    }
    const db = getDb();
    const cleanEmail = email.trim().toLowerCase();
    if (db.users.some((u) => u.email === cleanEmail)) {
      return res.status(400).json({ message: 'An account with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password.trim(), salt);

    const hrUser = {
      id: crypto.randomUUID(),
      name: name.trim(),
      email: cleanEmail,
      passwordHash,
      role: 'HR',
      status: 'ACTIVE',
      mustChangePassword: true, // Requires change on first sign-in
      createdAt: new Date().toISOString(),
    };

    db.users.push(hrUser);
    audit(req.user, 'user.created_hr', 'user', { hrEmail: cleanEmail });
    saveDb();

    res.json({ success: true, user: { id: hrUser.id, name: hrUser.name, email: hrUser.email, role: hrUser.role } });
  } catch (err) {
    res.status(500).json({ message: 'Could not create HR account.' });
  }
});

// Deactivate or reset any login (Admin only)
app.patch('/api/organization/users/:id/status', authenticate, authorize('ADMIN'), (req, res) => {
  const db = getDb();
  const user = db.users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found.' });

  const { status, resetPassword } = req.body;
  if (status) user.status = status;
  if (resetPassword) {
    const defaultPass = 'TempPass@123';
    user.passwordHash = bcrypt.hashSync(defaultPass, 10);
    user.mustChangePassword = true;
  }

  audit(req.user, 'user.status_modified', 'user', { targetUserId: user.id, status: user.status });
  saveDb();
  res.json({ success: true, user });
});

// ==========================================
// M3: EMPLOYEES & CSV IMPORT / EXPORT
// ==========================================

// Get employee directory with search and filters
app.get('/api/employees', (req, res) => {
  const db = getDb();
  const { search, department, status, page = 1, limit = 50 } = req.query;

  let list = [...db.employees];
  if (search) {
    const q = search.toLowerCase();
    list = list.filter((e) => e.fullName.toLowerCase().includes(q) || e.employeeId.toLowerCase().includes(q) || e.email.toLowerCase().includes(q));
  }
  if (department && department !== 'All') {
    list = list.filter((e) => e.department === department);
  }
  if (status && status !== 'All') {
    list = list.filter((e) => e.status === status);
  }

  const total = list.length;
  const start = (Number(page) - 1) * Number(limit);
  const paged = list.slice(start, start + Number(limit));

  res.json({ total, employees: paged });
});

// Register new employee (HR & Admin) -> automatically creates employee login with temp password!
app.post('/api/employees', authenticate, authorize('ADMIN', 'HR'), async (req, res) => {
  try {
    const db = getDb();
    const { employeeId, fullName, email, phone, address, department, designation, joiningDate, basicSalary, temporaryPassword } = req.body;

    if (!employeeId || !fullName || !email) {
      return res.status(400).json({ message: 'Employee ID, Full Name, and Email are required.' });
    }

    const cleanId = employeeId.trim().toUpperCase();
    const cleanEmail = email.trim().toLowerCase();

    if (db.employees.some((e) => e.employeeId === cleanId)) {
      return res.status(400).json({ message: `Employee ID ${cleanId} already exists.` });
    }
    if (db.users.some((u) => u.email === cleanEmail)) {
      return res.status(400).json({ message: `User with email ${cleanEmail} already exists.` });
    }

    // Salary structure: Gross = 1.5 * basic (HRA 40%, Medical 10%)
    const basic = Number(basicSalary) || 50000;
    const salary = calculateSalaryStructure(basic);

    // Create user login with temporary password
    const tempPass = temporaryPassword || 'Welcome@123';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(tempPass, salt);

    const userId = crypto.randomUUID();
    const newUser = {
      id: userId,
      name: fullName.trim(),
      email: cleanEmail,
      passwordHash,
      role: 'EMPLOYEE',
      employeeId: cleanId,
      department: department || 'General',
      designation: designation || 'Associate',
      status: 'ACTIVE',
      mustChangePassword: true, // must change password on first login
      createdAt: new Date().toISOString(),
    };
    db.users.push(newUser);

    // Create employee record
    const employeeRecord = {
      id: cleanId,
      employeeId: cleanId,
      userId,
      fullName: fullName.trim(),
      email: cleanEmail,
      phone: phone || '',
      address: address || '',
      department: department || 'General',
      designation: designation || 'Associate',
      joiningDate: joiningDate || new Date().toISOString().split('T')[0],
      salary,
      status: 'Active',
      createdAt: new Date().toISOString(),
    };
    db.employees.push(employeeRecord);

    audit(req.user, 'employee.registered', 'employee', { employeeId: cleanId, fullName, email: cleanEmail });
    saveDb();

    res.json({
      success: true,
      employee: employeeRecord,
      temporaryPassword: tempPass,
    });
  } catch (err) {
    console.error('Register employee error:', err);
    res.status(500).json({ message: 'Could not register employee.' });
  }
});

// Employee 360 profile
app.get('/api/employees/:id', authenticate, (req, res) => {
  const db = getDb();
  const empId = req.params.id;

  // RBAC scope check: Employee can only see own profile
  if (req.user.role === 'EMPLOYEE' && req.user.employeeId !== empId) {
    return res.status(403).json({ message: 'Access denied: You can only view your own profile.' });
  }

  const employee = db.employees.find((e) => e.employeeId === empId || e.id === empId);
  if (!employee) return res.status(404).json({ message: 'Employee not found' });

  const attendance = db.attendance.filter((a) => a.employeeId === employee.employeeId);
  const leaves = db.leaves.filter((l) => l.employeeId === employee.employeeId);
  const balances = getLeaveBalances(employee.employeeId, db.leaves, db.leaveTypes);

  // Payslips from finalized or draft payroll
  const payslips = db.payroll
    .map((p) => {
      const rec = (p.records || []).find((r) => r.employeeId === employee.employeeId);
      return rec ? { month: p.month, status: p.status, ...rec } : null;
    })
    .filter(Boolean);

  res.json({
    employee,
    attendance,
    leaves,
    leaveBalances: balances,
    payslips,
  });
});

// Update employee details (phone & address by employee; full edit by HR/Admin)
app.put('/api/employees/:id', authenticate, (req, res) => {
  const db = getDb();
  const empId = req.params.id;
  const employee = db.employees.find((e) => e.employeeId === empId || e.id === empId);
  if (!employee) return res.status(404).json({ message: 'Employee not found' });

  if (req.user.role === 'EMPLOYEE') {
    if (req.user.employeeId !== employee.employeeId) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    // Only phone & address allowed
    if (req.body.phone !== undefined) employee.phone = req.body.phone;
    if (req.body.address !== undefined) employee.address = req.body.address;
  } else {
    // HR & ADMIN can edit other fields
    Object.assign(employee, req.body);
    if (req.body.basicSalary) {
      employee.salary = calculateSalaryStructure(Number(req.body.basicSalary));
    }
  }

  audit(req.user, 'employee.updated', 'employee', { employeeId: employee.employeeId });
  saveDb();
  res.json({ success: true, employee });
});

// CSV Import dry-run validation (Section 3 of Brief)
app.post('/api/employees/import/dry-run', authenticate, authorize('ADMIN', 'HR'), (req, res) => {
  const { rows } = req.body;
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ message: 'No rows provided.' });
  }

  const db = getDb();
  const errors = [];
  const validRows = [];
  const knownDepts = new Set(db.departments.map((d) => d.name.toLowerCase()));
  const seenIds = new Set(db.employees.map((e) => e.employeeId.toUpperCase()));
  const seenEmails = new Set(db.users.map((u) => u.email.toLowerCase()));

  rows.forEach((row, index) => {
    const rowNum = index + 1;
    const empId = (row.employeeId || row['Employee ID'] || '').trim().toUpperCase();
    const fullName = (row.fullName || row['Full Name'] || '').trim();
    const email = (row.email || row['Email'] || '').trim().toLowerCase();
    const dept = (row.department || row['Department'] || '').trim();
    const dateStr = (row.joiningDate || row['Joining Date'] || '').trim();
    const salary = Number(row.basicSalary || row['Basic Salary'] || 0);

    let hasError = false;

    if (!empId) {
      errors.push({ row: rowNum, field: 'employeeId', reason: 'Employee ID is required' });
      hasError = true;
    } else if (seenIds.has(empId)) {
      errors.push({ row: rowNum, field: 'employeeId', reason: `Employee ID "${empId}" is already registered` });
      hasError = true;
    }

    if (!fullName) {
      errors.push({ row: rowNum, field: 'fullName', reason: 'Full Name is required' });
      hasError = true;
    }

    if (!email || !email.includes('@')) {
      errors.push({ row: rowNum, field: 'email', reason: 'Valid email address is required' });
      hasError = true;
    } else if (seenEmails.has(email)) {
      errors.push({ row: rowNum, field: 'email', reason: `Email "${email}" is already registered` });
      hasError = true;
    }

    if (dept && knownDepts.size > 0 && !knownDepts.has(dept.toLowerCase())) {
      errors.push({ row: rowNum, field: 'department', reason: `Unknown department "${dept}"` });
      hasError = true;
    }

    if (!salary || salary <= 0) {
      errors.push({ row: rowNum, field: 'basicSalary', reason: 'Basic salary must be greater than 0' });
      hasError = true;
    }

    if (!hasError) {
      seenIds.add(empId);
      seenEmails.add(email);
      validRows.push({ employeeId: empId, fullName, email, department: dept, joiningDate: dateStr, basicSalary: salary });
    }
  });

  res.json({
    totalRows: rows.length,
    validCount: validRows.length,
    errorCount: errors.length,
    errors,
    validRows,
  });
});

// CSV Import execution
app.post('/api/employees/import', authenticate, authorize('ADMIN', 'HR'), async (req, res) => {
  const { employees } = req.body;
  if (!Array.isArray(employees)) return res.status(400).json({ message: 'Invalid payload' });

  const db = getDb();
  const created = [];

  for (const emp of employees) {
    const salary = calculateSalaryStructure(emp.basicSalary || 50000);
    const userId = crypto.randomUUID();
    const tempPass = 'Welcome@123';
    const passwordHash = await bcrypt.hash(tempPass, 10);

    db.users.push({
      id: userId,
      name: emp.fullName,
      email: emp.email.toLowerCase(),
      passwordHash,
      role: 'EMPLOYEE',
      employeeId: emp.employeeId,
      department: emp.department || 'General',
      status: 'ACTIVE',
      mustChangePassword: true,
      createdAt: new Date().toISOString(),
    });

    const empRecord = {
      id: emp.employeeId,
      employeeId: emp.employeeId,
      userId,
      fullName: emp.fullName,
      email: emp.email.toLowerCase(),
      department: emp.department || 'General',
      designation: emp.designation || 'Staff',
      joiningDate: emp.joiningDate || new Date().toISOString().split('T')[0],
      salary,
      status: 'Active',
      createdAt: new Date().toISOString(),
    };
    db.employees.push(empRecord);
    created.push(empRecord);
  }

  audit(req.user, 'employee.csv_imported', 'employees', { count: created.length });
  saveDb();
  res.json({ success: true, importedCount: created.length });
});

// ==========================================
// M4: ATTENDANCE & STATUS RULES
// ==========================================

// Web check-in
app.post('/api/attendance/check-in', authenticate, (req, res) => {
  const db = getDb();
  const employeeId = req.user.employeeId;
  if (!employeeId) return res.status(400).json({ message: 'No employee ID associated with this user.' });

  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const currentTimeStr = now.toTimeString().split(' ')[0].slice(0, 5); // "09:20"

  // Check 1: One record per employee per day (second check-in = 409 Conflict)
  const existing = db.attendance.find((a) => a.employeeId === employeeId && a.date === today);
  if (existing) {
    return res.status(409).json({ message: 'Attendance already recorded for today. Second check-in is not permitted.' });
  }

  // Geofence check (if office coordinates are configured)
  const { userLat, userLng } = req.body;
  const rules = db.company.rules || {};
  if (rules.officeLat && rules.officeLng && userLat && userLng) {
    const distance = getDistanceMeters(rules.officeLat, rules.officeLng, userLat, userLng);
    if (distance > (rules.radiusMeters || 150)) {
      return res.status(400).json({
        message: `Check-in rejected: You are ${distance}m away from the office location (Radius: ${rules.radiusMeters}m).`,
      });
    }
  }

  // Status rule: Late after 09:15
  const status = evaluateAttendanceStatus(currentTimeStr, null, rules);

  const record = {
    id: crypto.randomUUID(),
    employeeId,
    employeeName: req.user.name,
    date: today,
    checkInTime: currentTimeStr,
    checkOutTime: null,
    status,
    workHours: 0,
    source: req.body.source || 'web',
    createdAt: now.toISOString(),
  };

  db.attendance.push(record);
  audit(req.user, 'attendance.check_in', 'attendance', { status, checkInTime: currentTimeStr });
  saveDb();

  res.json({ success: true, record });
});

// Web check-out
app.post('/api/attendance/check-out', authenticate, (req, res) => {
  const db = getDb();
  const employeeId = req.user.employeeId;
  const today = new Date().toISOString().split('T')[0];
  const currentTimeStr = new Date().toTimeString().split(' ')[0].slice(0, 5);

  const record = db.attendance.find((a) => a.employeeId === employeeId && a.date === today);
  if (!record) {
    return res.status(404).json({ message: 'No check-in record found for today.' });
  }
  if (record.checkOutTime) {
    return res.status(400).json({ message: 'You have already checked out today.' });
  }

  record.checkOutTime = currentTimeStr;
  const rules = db.company.rules || {};
  record.status = evaluateAttendanceStatus(record.checkInTime, currentTimeStr, rules);

  // Compute work hours
  const [inH, inM] = record.checkInTime.split(':').map(Number);
  const [outH, outM] = currentTimeStr.split(':').map(Number);
  record.workHours = Math.max(0, Math.round(((outH * 60 + outM - (inH * 60 + inM)) / 60) * 10) / 10);

  audit(req.user, 'attendance.check_out', 'attendance', { status: record.status, workHours: record.workHours });
  saveDb();

  res.json({ success: true, record });
});

// Daily attendance board & records
app.get('/api/attendance/records', authenticate, (req, res) => {
  const db = getDb();
  const { date, department } = req.query;
  const targetDate = date || new Date().toISOString().split('T')[0];

  let records = db.attendance.filter((a) => a.date === targetDate);

  if (department && department !== 'All') {
    const empIdsInDept = new Set(
      db.employees.filter((e) => e.department === department).map((e) => e.employeeId)
    );
    records = records.filter((r) => empIdsInDept.has(r.employeeId));
  }

  res.json({ date: targetDate, records });
});

// Employee's own attendance records
app.get('/api/attendance/my', authenticate, (req, res) => {
  const db = getDb();
  const employeeId = req.user.employeeId;
  const records = db.attendance.filter((a) => a.employeeId === employeeId);
  res.json({ records });
});

// Attendance correction request (Employee)
app.post('/api/attendance/corrections', authenticate, (req, res) => {
  const { recordId, requestedStatus, reason } = req.body;
  if (!recordId || !reason) return res.status(400).json({ message: 'Record ID and reason are required.' });

  const db = getDb();
  const record = db.attendance.find((a) => a.id === recordId);
  if (!record) return res.status(404).json({ message: 'Attendance record not found.' });

  record.correctionRequest = {
    id: crypto.randomUUID(),
    requestedStatus: requestedStatus || 'Present',
    reason,
    status: 'PENDING',
    requestedAt: new Date().toISOString(),
  };

  audit(req.user, 'attendance.correction_requested', 'attendance', { recordId, reason });
  saveDb();
  res.json({ success: true, record });
});

// Approve/Reject attendance correction (HR only)
app.patch('/api/attendance/corrections/:id', authenticate, authorize('ADMIN', 'HR'), (req, res) => {
  const { decision, comment } = req.body; // 'APPROVED' or 'REJECTED'
  const db = getDb();
  const record = db.attendance.find((a) => a.correctionRequest?.id === req.params.id);
  if (!record) return res.status(404).json({ message: 'Correction request not found.' });

  if (decision === 'APPROVED') {
    record.status = record.correctionRequest.requestedStatus;
    record.correctionRequest.status = 'APPROVED';
  } else {
    record.correctionRequest.status = 'REJECTED';
  }
  record.correctionRequest.decisionComment = comment || '';
  record.correctionRequest.decisionBy = req.user.name;

  audit(req.user, `attendance.correction_${decision.toLowerCase()}`, 'attendance', { recordId: record.id });
  saveDb();
  res.json({ success: true, record });
});

// ==========================================
// M5: LEAVE MANAGEMENT & APPROVAL INBOX
// ==========================================

// Apply for leave (Working days check, overlap check, quota check)
app.post('/api/leaves/apply', authenticate, (req, res) => {
  const db = getDb();
  const employeeId = req.user.employeeId;
  const { leaveType, startDate, endDate, reason } = req.body;

  if (!leaveType || !startDate || !endDate) {
    return res.status(400).json({ message: 'Leave type, start date, and end date are required.' });
  }

  // 1. Check overlap (422 Unprocessable Entity)
  if (checkLeaveOverlap(db.leaves, employeeId, startDate, endDate)) {
    return res.status(422).json({ message: 'A leave request already exists covering this date range.' });
  }

  // 2. Calculate working days (skips weekends and public holidays)
  const rules = db.company.rules || {};
  const workingDays = calculateWorkingDays(startDate, endDate, rules.weeklyOffDays, db.holidays);
  if (workingDays <= 0) {
    return res.status(422).json({ message: 'The selected date range contains 0 working days.' });
  }

  // 3. Balance quota check (422 Unprocessable Entity)
  if (leaveType !== 'Unpaid') {
    const balances = getLeaveBalances(employeeId, db.leaves, db.leaveTypes);
    const key = leaveType.toLowerCase();
    const available = balances[key]?.balance ?? 0;
    if (workingDays > available) {
      return res.status(422).json({
        message: `Insufficient leave balance for ${leaveType}. Requested: ${workingDays} days, Available: ${available} days.`,
      });
    }
  }

  const leaveRequest = {
    id: crypto.randomUUID(),
    employeeId,
    employeeName: req.user.name,
    leaveType,
    startDate,
    endDate,
    workingDays,
    reason: reason || 'Personal',
    status: 'Pending',
    appliedAt: new Date().toISOString(),
    decisionComment: '',
    decisionBy: null,
    decisionAt: null,
  };

  db.leaves.push(leaveRequest);
  audit(req.user, 'leave.applied', 'leave', { leaveType, workingDays, startDate, endDate });
  saveDb();

  res.json({ success: true, leaveRequest });
});

// Employee's own leaves and balances
app.get('/api/leaves/my', authenticate, (req, res) => {
  const db = getDb();
  const employeeId = req.user.employeeId;
  const leaves = db.leaves.filter((l) => l.employeeId === employeeId);
  const balances = getLeaveBalances(employeeId, db.leaves, db.leaveTypes);
  res.json({ leaves, balances });
});

// HR / Admin Leave approval inbox
app.get('/api/leaves/approvals', authenticate, authorize('ADMIN', 'HR'), (req, res) => {
  const db = getDb();
  const pending = db.leaves.filter((l) => l.status === 'Pending');
  const all = db.leaves;
  res.json({ pending, all });
});

// HR approves or rejects leave with a comment
app.patch('/api/leaves/:id/decision', authenticate, authorize('ADMIN', 'HR'), (req, res) => {
  const { status, comment } = req.body; // 'Approved' | 'Rejected'
  if (!['Approved', 'Rejected'].includes(status)) {
    return res.status(400).json({ message: 'Status must be Approved or Rejected.' });
  }

  const db = getDb();
  const leave = db.leaves.find((l) => l.id === req.params.id);
  if (!leave) return res.status(404).json({ message: 'Leave request not found.' });

  leave.status = status;
  leave.decisionComment = comment || '';
  leave.decisionBy = req.user.name;
  leave.decisionAt = new Date().toISOString();

  // Create in-app notification for the employee
  const emp = db.employees.find((e) => e.employeeId === leave.employeeId);
  if (emp && emp.userId) {
    db.notifications.push({
      id: crypto.randomUUID(),
      userId: emp.userId,
      title: `Leave Request ${status}`,
      message: `Your ${leave.leaveType} leave for ${leave.startDate} to ${leave.endDate} has been ${status.toLowerCase()}.${comment ? ` Note: ${comment}` : ''}`,
      type: 'LEAVE_DECISION',
      isRead: false,
      createdAt: new Date().toISOString(),
    });
  }

  audit(req.user, `leave.${status.toLowerCase()}`, 'leave', { leaveId: leave.id, employeeId: leave.employeeId });
  saveDb();

  res.json({ success: true, leave });
});

// Smart Leave form parser
app.post('/api/leaves/smart-parse', (req, res) => {
  const { sentence } = req.body;
  if (!sentence) return res.status(400).json({ message: 'Sentence is required' });
  const parsed = parseSmartLeavePrompt(sentence);
  res.json({ success: true, parsed });
});

// ==========================================
// M6: PAYROLL LITE & PAYSLIP PDF
// ==========================================

// Get salary structures
app.get('/api/payroll/structures', authenticate, authorize('ADMIN', 'HR'), (req, res) => {
  const db = getDb();
  const structures = db.employees.map((e) => ({
    employeeId: e.employeeId,
    name: e.fullName,
    department: e.department,
    designation: e.designation,
    salary: e.salary,
  }));
  res.json({ structures });
});

// Update basic salary
app.put('/api/payroll/structures/:employeeId', authenticate, authorize('ADMIN', 'HR'), (req, res) => {
  const db = getDb();
  const emp = db.employees.find((e) => e.employeeId === req.params.employeeId);
  if (!emp) return res.status(404).json({ message: 'Employee not found' });

  const basic = Number(req.body.basic) || emp.salary?.basic || 50000;
  emp.salary = calculateSalaryStructure(basic);

  audit(req.user, 'salary_structure.updated', 'employee', { employeeId: emp.employeeId, basic });
  saveDb();
  res.json({ success: true, employee: emp });
});

// HR creates/reviews monthly payroll draft
app.post('/api/payroll/draft', authenticate, authorize('ADMIN', 'HR'), (req, res) => {
  const { month } = req.body; // "YYYY-MM"
  if (!month) return res.status(400).json({ message: 'Month string (YYYY-MM) is required.' });

  const db = getDb();

  // Check if finalized run already exists (locked!)
  const existingFinalized = db.payroll.find((p) => p.month === month && p.status === 'FINALIZED');
  if (existingFinalized) {
    return res.status(403).json({ message: `Payroll for ${month} is already finalized and locked.` });
  }

  // Calculate records for all active employees
  const activeEmployees = db.employees.filter((e) => e.status !== 'Terminated');
  const records = activeEmployees.map((emp) =>
    computeEmployeePayrollRecord(emp, month, db.attendance, db.leaves, 22)
  );

  // Update or create draft
  let run = db.payroll.find((p) => p.month === month);
  if (run) {
    run.records = records;
    run.status = 'DRAFT';
  } else {
    run = {
      id: crypto.randomUUID(),
      month,
      status: 'DRAFT',
      createdBy: req.user.name,
      createdAt: new Date().toISOString(),
      finalizedBy: null,
      finalizedAt: null,
      records,
    };
    db.payroll.push(run);
  }

  audit(req.user, 'payroll.draft_generated', 'payroll', { month, recordsCount: records.length });
  saveDb();

  res.json({ success: true, payrollRun: run });
});

// Admin finalizes payroll (locks month)
app.post('/api/payroll/:id/finalize', authenticate, authorize('ADMIN'), (req, res) => {
  const db = getDb();
  const run = db.payroll.find((p) => p.id === req.params.id);
  if (!run) return res.status(404).json({ message: 'Payroll run not found.' });

  run.status = 'FINALIZED';
  run.finalizedBy = req.user.name;
  run.finalizedAt = new Date().toISOString();

  // Create notifications for each employee
  for (const rec of run.records || []) {
    const emp = db.employees.find((e) => e.employeeId === rec.employeeId);
    if (emp && emp.userId) {
      db.notifications.push({
        id: crypto.randomUUID(),
        userId: emp.userId,
        title: `Payslip Available (${run.month})`,
        message: `Your payslip for ${run.month} is ready. Net Pay: PKR ${rec.netPay.toLocaleString()}`,
        type: 'PAYSLIP_ISSUED',
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    }
  }

  audit(req.user, 'payroll.finalized', 'payroll', { month: run.month });
  saveDb();

  res.json({ success: true, payrollRun: run });
});

// Get payroll history
app.get('/api/payroll/history', (req, res) => {
  const db = getDb();
  res.json({ history: db.payroll });
});

// ==========================================
// M7: DASHBOARDS & ANALYTICS
// ==========================================

app.get('/api/dashboard', authenticate, (req, res) => {
  const db = getDb();
  const role = req.user.role;
  const today = new Date().toISOString().split('T')[0];

  const totalEmployees = db.employees.filter((e) => e.status !== 'Terminated').length;
  const todayAttendance = db.attendance.filter((a) => a.date === today);
  const presentToday = todayAttendance.filter((a) => a.status === 'Present' || a.status === 'Late').length;
  const lateToday = todayAttendance.filter((a) => a.status === 'Late').length;
  const onLeaveToday = db.leaves.filter((l) => l.status === 'Approved' && l.startDate <= today && l.endDate >= today).length;
  const pendingApprovals = db.leaves.filter((l) => l.status === 'Pending').length;

  if (role === 'EMPLOYEE') {
    // Employee self-service dashboard
    const empId = req.user.employeeId;
    const myAtt = db.attendance.filter((a) => a.employeeId === empId);
    const myLeaves = getLeaveBalances(empId, db.leaves, db.leaveTypes);
    const lastPayslip = db.payroll
      .slice()
      .reverse()
      .map((p) => p.records?.find((r) => r.employeeId === empId))
      .find(Boolean);

    return res.json({
      role: 'EMPLOYEE',
      todayCheckIn: todayAttendance.find((a) => a.employeeId === empId) || null,
      hoursThisWeek: 38,
      lateCount: myAtt.filter((a) => a.status === 'Late').length,
      leaveBalances: myLeaves,
      lastPayslip: lastPayslip || null,
      announcements: db.announcements.slice(0, 3),
    });
  }

  // HR & ADMIN Dashboards
  const latestPayroll = db.payroll[db.payroll.length - 1];
  const totalPayrollCost = (latestPayroll?.records || []).reduce((sum, r) => sum + (r.netPay || 0), 0);
  const avgSalary = totalEmployees > 0 ? Math.round(totalPayrollCost / totalEmployees) : 0;

  // Headcount by department
  const headcountByDept = {};
  for (const emp of db.employees) {
    const d = emp.department || 'General';
    headcountByDept[d] = (headcountByDept[d] || 0) + 1;
  }

  res.json({
    role,
    kpis: {
      headcount: totalEmployees,
      presentToday,
      lateToday,
      onLeaveToday,
      pendingApprovals,
      payrollCost: totalPayrollCost,
      avgSalary,
    },
    headcountByDept,
    announcements: db.announcements.slice(0, 5),
    recentAudit: role === 'ADMIN' ? db.auditLogs.slice(0, 8) : [],
  });
});

// ==========================================
// M8: AI ASSISTANT & TOOLS
// ==========================================

// AI Assistant chat endpoint
app.post('/api/ai/chat', authenticate, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Message text is required.' });
    }

    const result = await handleAssistantChat(message, req.user);
    res.json(result);
  } catch (err) {
    console.error('AI Chat Error:', err);
    res.status(500).json({ reply: 'The AI assistant is temporarily unavailable. Please retry.', aiGenerated: true });
  }
});

// AI Dashboard summarizer
app.post('/api/ai/summarize', authenticate, async (req, res) => {
  try {
    const { kpis } = req.body;
    const bullets = await generateDashboardSummary(kpis || {}, req.user.role);
    res.json({ summary: bullets, aiGenerated: true });
  } catch (err) {
    res.status(500).json({ message: 'Could not generate summary' });
  }
});

// ==========================================
// M9: COMMS & AUDIT LOGS
// ==========================================

// Announcements
app.get('/api/announcements', (req, res) => {
  const db = getDb();
  res.json({ announcements: db.announcements });
});

app.post('/api/announcements', authenticate, authorize('ADMIN', 'HR'), (req, res) => {
  const { title, content, target } = req.body;
  if (!title || !content) return res.status(400).json({ message: 'Title and content are required' });

  const db = getDb();
  const announcement = {
    id: crypto.randomUUID(),
    title: title.trim(),
    content: content.trim(),
    author: req.user.name,
    authorRole: req.user.role,
    target: target || 'ALL',
    createdAt: new Date().toISOString(),
  };

  db.announcements.unshift(announcement);
  audit(req.user, 'announcement.posted', 'announcement', { title });
  saveDb();

  res.json({ success: true, announcement });
});

// In-app notifications
app.get('/api/notifications', authenticate, (req, res) => {
  const db = getDb();
  const userNotifs = db.notifications.filter((n) => n.userId === req.user.id);
  res.json({ notifications: userNotifs });
});

app.patch('/api/notifications/:id/read', authenticate, (req, res) => {
  const db = getDb();
  const notif = db.notifications.find((n) => n.id === req.params.id && n.userId === req.user.id);
  if (notif) notif.isRead = true;
  saveDb();
  res.json({ success: true });
});

// Audit logs (Admin only)
app.get('/api/audit-log', authenticate, authorize('ADMIN'), (req, res) => {
  const db = getDb();
  res.json({ logs: db.auditLogs });
});

// Judging Demo Reset (Resets system to 100% empty state)
app.post('/api/system/reset', (req, res) => {
  const empty = resetDb();
  res.json({ success: true, message: 'System database successfully reset to clean empty state.' });
});

// Serve frontend in production or start server
const DIST_DIR = path.join(__dirname, '..', 'dist');
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(DIST_DIR));
  app.get('*', (req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`HCM Lite backend API server running on port ${PORT}`);
});
