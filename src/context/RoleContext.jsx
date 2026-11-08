import React, { createContext, useContext, useState, useEffect } from 'react';
import { USER_ROLES } from '../config/navigation.js';

const RoleContext = createContext();

export function RoleProvider({ children }) {
  // Store selected role in localStorage for session convenience
  const [currentRole, setCurrentRole] = useState(() => {
    const saved = localStorage.getItem('hcmlite_preview_role');
    return saved && USER_ROLES[saved] ? saved : 'ADMIN';
  });

  useEffect(() => {
    localStorage.setItem('hcmlite_preview_role', currentRole);
  }, [currentRole]);

  const setRole = (role) => {
    if (USER_ROLES[role]) {
      setCurrentRole(role);
    }
  };

  const currentUser = USER_ROLES[currentRole] || USER_ROLES.ADMIN;

  const value = {
    currentRole,
    setRole,
    currentUser,
    isAdmin: currentRole === 'ADMIN',
    isHr: currentRole === 'HR',
    isEmployee: currentRole === 'EMPLOYEE',
  };

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
}
