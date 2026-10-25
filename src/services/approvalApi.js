import { apiUrl } from './apiUrl.js';

async function approvalRequest(path, options = {}) {
  let response;
  try {
    response = await fetch(apiUrl(path), {
      credentials: 'include',
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error('Approval service is unavailable. Please try again later.');
  }
  const payload = response.status === 204 ? {} : await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || 'The request could not be completed.');
  return payload;
}

export function getEmployeeRequests(status = 'PENDING') {
  return approvalRequest(`/api/v1/admin/employee-requests?status=${encodeURIComponent(status)}`);
}

export function getEmployeeRequest(id) {
  return approvalRequest(`/api/v1/admin/employee-requests/${encodeURIComponent(id)}`);
}

export function approveEmployeeRequest(id) {
  return approvalRequest(`/api/v1/admin/employee-requests/${encodeURIComponent(id)}/approve`, {
    method: 'POST',
    body: '{}',
  });
}

export function rejectEmployeeRequest(id, reason) {
  return approvalRequest(`/api/v1/admin/employee-requests/${encodeURIComponent(id)}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function getNotifications() {
  return approvalRequest('/api/v1/notifications');
}

export function markServerNotificationRead(id) {
  return approvalRequest(`/api/v1/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' });
}

export function dismissServerNotification(id) {
  return approvalRequest(`/api/v1/notifications/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function markAllServerNotificationsRead() {
  return approvalRequest('/api/v1/notifications/read-all', { method: 'POST', body: '{}' });
}
