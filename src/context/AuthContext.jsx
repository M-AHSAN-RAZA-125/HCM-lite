import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useRole } from './RoleContext.jsx';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { setRole } = useRole();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const sessionRequestId = useRef(0);

  const acceptSession = useCallback((authenticatedUser) => {
    setUser(authenticatedUser);
    setRole(authenticatedUser.role);
    setAuthError('');
  }, [setRole]);

  const refreshSession = useCallback(async () => {
    const requestId = ++sessionRequestId.current;
    setLoading(true);
    setAuthError('');
    try {
      const response = await fetch('/api/v1/auth/me', { credentials: 'include' });
      if (requestId !== sessionRequestId.current) return;
      if (response.status === 401) {
        setUser(null);
        return;
      }
      if (!response.ok) {
        throw new Error('The authentication service could not verify your session. Please try again.');
      }
      const payload = await response.json();
      if (requestId !== sessionRequestId.current) return;
      if (!payload.user) {
        throw new Error('The authentication service returned an invalid session response. Please try again.');
      }
      acceptSession(payload.user);
    } catch (error) {
      if (error?.name === 'AbortError') return;
      if (requestId !== sessionRequestId.current) return;
      setAuthError(error instanceof Error ? error.message : 'The authentication service is unavailable. Please try again.');
    } finally {
      if (requestId === sessionRequestId.current) setLoading(false);
    }
  }, [acceptSession]);

  useEffect(() => {
    refreshSession();
    return () => { sessionRequestId.current += 1; };
  }, [refreshSession]);

  useEffect(() => {
    if (!user) return undefined;
    const refreshSession = async () => {
      try {
        const response = await fetch('/api/v1/auth/me', { credentials: 'include' });
        if (response.status === 401 || response.status === 403) {
          setUser(null);
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

  const clearSession = useCallback(() => setUser(null), []);

  return (
    <AuthContext.Provider value={{ user, loading, authError, refreshSession, acceptSession, clearSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within an AuthProvider');
  return value;
}
