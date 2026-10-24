import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useRole } from './RoleContext.jsx';
import { useAuth } from './AuthContext.jsx';
import { USER_ROLES } from '../config/navigation.js';
import {
  dismissServerNotification,
  getNotifications,
  markAllServerNotificationsRead,
  markServerNotificationRead,
} from '../services/approvalApi.js';

const CommunicationContext = createContext(null);
const ANNOUNCEMENTS_KEY = 'hcmlite_session_announcements_v1';
const AUDIT_KEY = 'hcmlite_session_audit_v1';
const NOTIFICATIONS_KEY = 'hcmlite_session_notifications_by_role_v1';

function readSessionValue(key, fallback) {
  try {
    const stored = sessionStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

function createId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function CommunicationProvider({ children }) {
  const { currentRole, currentUser, isAdmin, isHr } = useRole();
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState(() => readSessionValue(ANNOUNCEMENTS_KEY, []));
  const [auditEvents, setAuditEvents] = useState(() => readSessionValue(AUDIT_KEY, []));
  const [notificationsByRole, setNotificationsByRole] = useState(() => readSessionValue(NOTIFICATIONS_KEY, {}));
  const [serverNotifications, setServerNotifications] = useState([]);
  const [pendingRequestCount, setPendingRequestCount] = useState(0);
  const [notificationServiceError, setNotificationServiceError] = useState('');
  const notificationRefreshId = useRef(0);

  const refreshNotifications = useCallback(async () => {
    const requestId = ++notificationRefreshId.current;
    if (!user) {
      setServerNotifications([]);
      setPendingRequestCount(0);
      setNotificationServiceError('');
      return;
    }
    try {
      const result = await getNotifications();
      if (requestId !== notificationRefreshId.current) return;
      setServerNotifications(result.notifications.map((item) => ({ ...item, persistent: true })));
      setPendingRequestCount(result.pendingRequestCount);
      setNotificationServiceError('');
    } catch (error) {
      if (requestId !== notificationRefreshId.current) return;
      setNotificationServiceError(error.message);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user) {
      refreshNotifications();
      return undefined;
    }
    refreshNotifications();
    const timer = window.setInterval(refreshNotifications, 15000);
    return () => {
      window.clearInterval(timer);
    };
  }, [user?.id, refreshNotifications]);

  useEffect(() => {
    try { sessionStorage.setItem(ANNOUNCEMENTS_KEY, JSON.stringify(announcements)); } catch { /* Best-effort prototype persistence. */ }
  }, [announcements]);

  useEffect(() => {
    try { sessionStorage.setItem(AUDIT_KEY, JSON.stringify(auditEvents)); } catch { /* Best-effort prototype persistence. */ }
  }, [auditEvents]);

  useEffect(() => {
    try { sessionStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notificationsByRole)); } catch { /* Best-effort prototype persistence. */ }
  }, [notificationsByRole]);

  const recordAuditEvent = ({ action, entityType, entityId = null, status = 'success' }) => {
    if (!action || !entityType) return;
    setAuditEvents((current) => [{
      id: createId('evt'),
      timestamp: new Date().toISOString(),
      actorId: currentRole,
      actorName: currentUser.name,
      action,
      entityType,
      entityId: entityId ? String(entityId) : null,
      status,
    }, ...current]);
  };

  const createNotification = ({ recipientRoles = [], title, message, link = null }) => {
    if (!title || !message) return;
    const safeLink = typeof link === 'string' && link.startsWith('/') && !link.startsWith('//') ? link : null;
    const notification = {
      id: createId('notice'),
      title,
      message,
      link: safeLink,
      createdAt: new Date().toISOString(),
      read: false,
    };
    setNotificationsByRole((current) => {
      const next = { ...current };
      recipientRoles.filter((role) => ['ADMIN', 'HR', 'EMPLOYEE'].includes(role)).forEach((role) => {
        next[role] = [notification, ...(next[role] || [])];
      });
      return next;
    });
  };

  const saveAnnouncement = ({ id = null, title, content, audienceDepartment = 'ALL', priority = 'Normal', status = 'Draft' }) => {
    if (!isAdmin && !isHr) return { success: false, error: 'You are not allowed to manage announcements.' };
    const cleanTitle = String(title || '').trim();
    const cleanContent = String(content || '').trim();
    if (!cleanTitle || !cleanContent) return { success: false, error: 'A title and announcement content are required.' };
    if (cleanTitle.length > 120 || cleanContent.length > 10000) return { success: false, error: 'The title or announcement content exceeds the allowed length.' };
    if (!['Draft', 'Published'].includes(status)) return { success: false, error: 'Choose Draft or Published as the status.' };

    const previous = id ? announcements.find((item) => item.id === id) : null;
    if (id && !previous) return { success: false, error: 'Announcement not found.' };
    if (previous && !isAdmin && previous.author !== currentUser.name) return { success: false, error: 'You can only edit announcements you created.' };

    const now = new Date().toISOString();
    const announcement = {
      id: previous?.id || createId('ann'),
      title: cleanTitle,
      content: cleanContent,
      author: previous?.author || currentUser.name,
      createdAt: previous?.createdAt || now,
      updatedAt: previous ? now : null,
      publishedAt: status === 'Published' ? previous?.publishedAt || now : null,
      status,
      audienceDepartment: audienceDepartment || 'ALL',
      priority: ['Normal', 'Important', 'Urgent'].includes(priority) ? priority : 'Normal',
    };

    setAnnouncements((current) => previous
      ? current.map((item) => item.id === previous.id ? announcement : item)
      : [announcement, ...current]);
    recordAuditEvent({ action: previous ? 'announcement.updated' : 'announcement.created', entityType: 'announcement', entityId: announcement.id });

    if (status === 'Published' && previous?.status !== 'Published') {
      recordAuditEvent({ action: 'announcement.published', entityType: 'announcement', entityId: announcement.id });
      const recipientRoles = Object.entries(USER_ROLES)
        .filter(([, user]) => announcement.audienceDepartment === 'ALL' || user.department === announcement.audienceDepartment)
        .map(([role]) => role);
      createNotification({
        recipientRoles,
        title: 'New company announcement',
        message: announcement.title,
        link: '/announcements',
      });
    }
    return { success: true, announcement };
  };

  const archiveAnnouncement = (id) => {
    const existing = announcements.find((item) => item.id === id);
    if (!existing) return { success: false, error: 'Announcement not found.' };
    if (!isAdmin && (!isHr || existing.author !== currentUser.name)) return { success: false, error: 'You are not allowed to archive this announcement.' };
    setAnnouncements((current) => current.map((item) => item.id === id ? { ...item, status: 'Archived', updatedAt: new Date().toISOString() } : item));
    recordAuditEvent({ action: 'announcement.archived', entityType: 'announcement', entityId: id });
    return { success: true };
  };

  const deleteAnnouncement = (id) => {
    const existing = announcements.find((item) => item.id === id);
    if (!existing) return { success: false, error: 'Announcement not found.' };
    if (!isAdmin && (!isHr || existing.author !== currentUser.name || existing.status !== 'Draft')) return { success: false, error: 'You are not allowed to delete this announcement.' };
    setAnnouncements((current) => current.filter((item) => item.id !== id));
    recordAuditEvent({ action: 'announcement.deleted', entityType: 'announcement', entityId: id });
    return { success: true };
  };

  const markNotificationRead = async (id) => {
    const serverNotification = serverNotifications.find((item) => item.id === id);
    if (serverNotification) {
      try {
        await markServerNotificationRead(id);
        setServerNotifications((current) => current.map((item) => item.id === id ? { ...item, read: true } : item));
        setNotificationServiceError('');
      } catch (error) {
        setNotificationServiceError(error.message);
      }
      return;
    }
    setNotificationsByRole((current) => ({
      ...current,
      [currentRole]: (current[currentRole] || []).map((item) => item.id === id ? { ...item, read: true } : item),
    }));
  };

  const markAllNotificationsRead = async () => {
    try {
      if (serverNotifications.some((item) => !item.read)) await markAllServerNotificationsRead();
      setServerNotifications((current) => current.map((item) => ({ ...item, read: true })));
      setNotificationsByRole((current) => ({
        ...current,
        [currentRole]: (current[currentRole] || []).map((item) => ({ ...item, read: true })),
      }));
      setNotificationServiceError('');
    } catch (error) {
      setNotificationServiceError(error.message);
    }
  };

  const dismissNotification = async (id) => {
    const serverNotification = serverNotifications.find((item) => item.id === id);
    if (serverNotification) {
      try {
        await dismissServerNotification(id);
        setServerNotifications((current) => current.filter((item) => item.id !== id));
        setNotificationServiceError('');
      } catch (error) {
        setNotificationServiceError(error.message);
      }
      return;
    }
    setNotificationsByRole((current) => ({
      ...current,
      [currentRole]: (current[currentRole] || []).filter((item) => item.id !== id),
    }));
  };

  const value = {
    announcements,
    auditEvents,
    notifications: [
      ...serverNotifications,
      ...(notificationsByRole[currentRole] || []).filter(
        (item) => !serverNotifications.some((serverItem) => serverItem.id === item.id)
      ),
    ],
    pendingRequestCount,
    notificationServiceError,
    refreshNotifications,
    recordAuditEvent,
    createNotification,
    saveAnnouncement,
    archiveAnnouncement,
    deleteAnnouncement,
    markNotificationRead,
    markAllNotificationsRead,
    dismissNotification,
  };

  return <CommunicationContext.Provider value={value}>{children}</CommunicationContext.Provider>;
}

export function useCommunication() {
  const context = useContext(CommunicationContext);
  if (!context) throw new Error('useCommunication must be used within a CommunicationProvider');
  return context;
}