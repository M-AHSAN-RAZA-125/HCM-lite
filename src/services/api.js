// HCM Lite unified API client

const TOKEN_KEY = 'hcmlite_auth_token';
const USER_KEY = 'hcmlite_auth_user';

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
}

export function setAuthSession(token, user) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function apiRequest(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const config = {
    ...options,
    headers,
  };

  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
  }

  const response = await fetch(endpoint, config);

  let data;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const errorMsg = data?.message || `Request failed with status ${response.status}`;
    const err = new Error(errorMsg);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

export const api = {
  // Setup
  getSetupStatus: () => apiRequest('/api/setup/status'),
  setupCompany: (companyData, adminData) => apiRequest('/api/setup', { method: 'POST', body: { companyData, adminData } }),

  // Auth
  login: (email, password, role) => apiRequest('/api/auth/login', { method: 'POST', body: { email, password, role } }),
  changePassword: (currentPassword, newPassword) =>
    apiRequest('/api/auth/change-password', { method: 'POST', body: { currentPassword, newPassword } }),
  getCurrentUser: () => apiRequest('/api/auth/me'),

  // Organization
  getOrganization: () => apiRequest('/api/organization'),
  updateCompanyProfile: (profile) => apiRequest('/api/organization/company', { method: 'PUT', body: profile }),
  updateOfficeRules: (rules) => apiRequest('/api/organization/rules', { method: 'PUT', body: rules }),
  createDepartment: (dept) => apiRequest('/api/organization/departments', { method: 'POST', body: dept }),
  deleteDepartment: (id) => apiRequest(`/api/organization/departments/${id}`, { method: 'DELETE' }),
  createDesignation: (desig) => apiRequest('/api/organization/designations', { method: 'POST', body: desig }),
  deleteDesignation: (id) => apiRequest(`/api/organization/designations/${id}`, { method: 'DELETE' }),
  createHoliday: (holiday) => apiRequest('/api/organization/holidays', { method: 'POST', body: holiday }),
  deleteHoliday: (id) => apiRequest(`/api/organization/holidays/${id}`, { method: 'DELETE' }),
  createHrAccount: (data) => apiRequest('/api/organization/hr-accounts', { method: 'POST', body: data }),
  updateUserStatus: (id, status, resetPassword) =>
    apiRequest(`/api/organization/users/${id}/status`, { method: 'PATCH', body: { status, resetPassword } }),

  // Employees
  getEmployees: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/api/employees${query ? `?${query}` : ''}`);
  },
  registerEmployee: (data) => apiRequest('/api/employees', { method: 'POST', body: data }),
  getEmployeeProfile: (id) => apiRequest(`/api/employees/${id}`),
  updateEmployee: (id, data) => apiRequest(`/api/employees/${id}`, { method: 'PUT', body: data }),
  dryRunImport: (rows) => apiRequest('/api/employees/import/dry-run', { method: 'POST', body: { rows } }),
  executeImport: (employees) => apiRequest('/api/employees/import', { method: 'POST', body: { employees } }),

  // Attendance
  checkIn: (data = {}) => apiRequest('/api/attendance/check-in', { method: 'POST', body: data }),
  checkOut: () => apiRequest('/api/attendance/check-out', { method: 'POST' }),
  getAttendanceRecords: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/api/attendance/records${query ? `?${query}` : ''}`);
  },
  getMyAttendance: () => apiRequest('/api/attendance/my'),
  requestCorrection: (recordId, requestedStatus, reason) =>
    apiRequest('/api/attendance/corrections', { method: 'POST', body: { recordId, requestedStatus, reason } }),
  decideCorrection: (id, decision, comment) =>
    apiRequest(`/api/attendance/corrections/${id}`, { method: 'PATCH', body: { decision, comment } }),

  // Leaves
  applyLeave: (data) => apiRequest('/api/leaves/apply', { method: 'POST', body: data }),
  getMyLeaves: () => apiRequest('/api/leaves/my'),
  getLeaveApprovals: () => apiRequest('/api/leaves/approvals'),
  decideLeave: (id, status, comment) =>
    apiRequest(`/api/leaves/${id}/decision`, { method: 'PATCH', body: { status, comment } }),
  smartParseLeave: (sentence) => apiRequest('/api/leaves/smart-parse', { method: 'POST', body: { sentence } }),

  // Payroll
  getSalaryStructures: () => apiRequest('/api/payroll/structures'),
  updateSalaryStructure: (employeeId, basic) =>
    apiRequest(`/api/payroll/structures/${employeeId}`, { method: 'PUT', body: { basic } }),
  generatePayrollDraft: (month) => apiRequest('/api/payroll/draft', { method: 'POST', body: { month } }),
  finalizePayroll: (id) => apiRequest(`/api/payroll/${id}/finalize`, { method: 'POST' }),
  getPayrollHistory: () => apiRequest('/api/payroll/history'),

  // Dashboards & AI
  getDashboard: () => apiRequest('/api/dashboard'),
  chatAi: (message) => apiRequest('/api/ai/chat', { method: 'POST', body: { message } }),
  summarizeDashboard: (kpis) => apiRequest('/api/ai/summarize', { method: 'POST', body: { kpis } }),

  // Comms & Audit
  getAnnouncements: () => apiRequest('/api/announcements'),
  createAnnouncement: (data) => apiRequest('/api/announcements', { method: 'POST', body: data }),
  getNotifications: () => apiRequest('/api/notifications'),
  markNotificationRead: (id) => apiRequest(`/api/notifications/${id}/read`, { method: 'PATCH' }),
  getAuditLog: () => apiRequest('/api/audit-log'),

  // System
  resetSystem: () => apiRequest('/api/system/reset', { method: 'POST' }),
};
