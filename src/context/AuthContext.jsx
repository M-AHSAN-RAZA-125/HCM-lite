import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useRole } from './RoleContext.jsx';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { setRole } = useRole();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const acceptSession = useCallback((authenticatedUser) => {
    setUser(authenticatedUser);
    setRole(authenticatedUser.role);
  }, [setRole]);

  useEffect(() => {
    let active = true;
    fetch('/api/v1/auth/me', { credentials: 'include' })
      .then(async (response) => {
        if (!response.ok) return null;
        const payload = await response.json();
        return payload.user || null;
      })
      .then((authenticatedUser) => {
        if (active && authenticatedUser) acceptSession(authenticatedUser);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [acceptSession]);

  const clearSession = useCallback(() => setUser(null), []);

  return (
    <AuthContext.Provider value={{ user, loading, acceptSession, clearSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within an AuthProvider');
  return value;
}
