import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useRole } from './RoleContext.jsx';
import { apiUrl } from '../services/apiUrl.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { setRole } = useRole();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [authNotice, setAuthNotice] = useState('');
  const sessionRequestId = useRef(0);
  const sessionAbortController = useRef(null);
  const wasAuthenticated = useRef(false);

  const acceptSession = useCallback((authenticatedUser) => {
    setUser(authenticatedUser);
    wasAuthenticated.current = true;
    setRole(authenticatedUser.role);
    setAuthError('');
    setAuthNotice('');
  }, [setRole]);

  const refreshSession = useCallback(async () => {
    const requestId = ++sessionRequestId.current;
    sessionAbortController.current?.abort();
    const controller = new AbortController();
    sessionAbortController.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    setLoading(true);
    setAuthError('');
    try {
      const response = await fetch(apiUrl('/api/v1/auth/me'), {
        credentials: 'include',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      if (requestId !== sessionRequestId.current) return;
      const payload = await response.json().catch(() => ({}));
      if (requestId !== sessionRequestId.current) return;
      if (response.status === 401) {
        setUser(null);
        const expired = wasAuthenticated.current || payload.code === 'SESSION_EXPIRED';
        wasAuthenticated.current = false;
        setAuthNotice(
          payload.code === 'SESSION_INVALID'
            ? 'Your account is no longer authorized to access HCM Lite. Please contact your administrator.'
            : expired
              ? 'Your session has expired. Please sign in again.'
              : ''
        );
        return;
      }
      if (response.status === 403) {
        setUser(null);
        wasAuthenticated.current = false;
        setAuthNotice('Your account is not authorized to access this application.');
        return;
      }
      if (!response.ok) {
        console.error('Session verification endpoint returned an unexpected status.', {
          path: '/api/v1/auth/me',
          status: response.status,
          contentType: response.headers.get('content-type'),
        });
        throw new Error("We couldn't verify your session right now. Please try again.");
      }
      if (!payload.user) {
        console.error('Session verification endpoint returned an invalid response shape.');
        throw new Error("We couldn't verify your session right now. Please try again.");
      }
      acceptSession(payload.user);
    } catch (error) {
      if (requestId !== sessionRequestId.current) return;
      console.error('Session verification request failed.', {
        reason: error?.name === 'AbortError' ? 'timeout' : 'network_or_response_error',
      });
      setAuthError("We couldn't verify your session right now. Please try again.");
    } finally {
      window.clearTimeout(timeout);
      if (requestId === sessionRequestId.current) {
        sessionAbortController.current = null;
        setLoading(false);
      }
    }
  }, [acceptSession]);

  useEffect(() => {
    refreshSession();
    return () => {
      sessionRequestId.current += 1;
      sessionAbortController.current?.abort();
    };
  }, [refreshSession]);

  useEffect(() => {
    if (!user) return undefined;
    const refreshSession = async () => {
      try {
        const response = await fetch(apiUrl('/api/v1/auth/me'), { credentials: 'include' });
        if (response.status === 401 || response.status === 403) {
          const payload = await response.json().catch(() => ({}));
          setUser(null);
          wasAuthenticated.current = false;
          setAuthNotice(
            payload.code === 'SESSION_INVALID' || response.status === 403
              ? 'Your account is no longer authorized to access HCM Lite. Please contact your administrator.'
              : 'Your session has expired. Please sign in again.'
          );
          return;
        }
        if (!response.ok) {
          console.error('Session revalidation returned an unexpected response:', response.status);
          return;
        }
        const payload = await response.json();
        if (payload.user) {
          acceptSession(payload.user);
          return;
        }
        console.error('Session revalidation response did not include a user.');
      } catch (error) {
        console.error('Session revalidation failed:', error instanceof Error ? error.message : 'Unknown error');
      }
    };
    const timer = window.setInterval(refreshSession, 30000);
    return () => window.clearInterval(timer);
  }, [user?.id, acceptSession]);

  const clearSession = useCallback(() => {
    sessionRequestId.current += 1;
    sessionAbortController.current?.abort();
    sessionAbortController.current = null;
    wasAuthenticated.current = false;
    setUser(null);
    setAuthError('');
    setAuthNotice('');
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      authError,
      authNotice,
      refreshSession,
      acceptSession,
      clearSession,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within an AuthProvider');
  return value;
}
