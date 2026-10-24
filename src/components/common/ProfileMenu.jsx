import React, { useState, useRef, useEffect } from 'react';
import { User, Settings, LogOut, ChevronDown, Check, Shield, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRole } from '../../context/RoleContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { signOut } from '../../services/authApi.js';
import { USER_ROLES } from '../../config/navigation.js';

export default function ProfileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [logoutMessage, setLogoutMessage] = useState('');
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const { currentRole, setRole, currentUser } = useRole();
  const { user, clearSession } = useAuth();
  const displayUser = user
    ? { ...currentUser, name: user.fullName, email: user.email, label: USER_ROLES[user.role]?.label || user.role }
    : currentUser;

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavigate = (path) => {
    navigate(path);
    setIsOpen(false);
  };

  const handleRoleChange = (roleKey) => {
    setRole(roleKey);
    setIsOpen(false);
  };

  const handleLogout = async () => {
    setLogoutMessage('Signing out…');
    try {
      if (user) await signOut();
      clearSession();
      setLogoutMessage('');
      setIsOpen(false);
      navigate('/login');
    } catch (error) {
      setLogoutMessage(error.message || 'Could not sign out. Please try again.');
    }
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2.5 p-1.5 pl-2 rounded-xl hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-left"
        aria-label="User menu"
        aria-expanded={isOpen}
      >
        <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-semibold text-xs flex items-center justify-center shrink-0 shadow-sm">
          {displayUser.initials}
        </div>
        <div className="hidden sm:block text-left">
          <div className="text-xs font-semibold text-slate-900 leading-tight">
            {displayUser.name}
          </div>
          <div className="text-[11px] text-slate-500 leading-tight">
            {displayUser.label}
          </div>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden py-1">
          {/* User info banner */}
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
            <div className="text-xs font-semibold text-slate-900">{displayUser.name}</div>
            <div className="text-[11px] text-slate-500 truncate">{displayUser.email}</div>
            <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
              <Shield className="w-3 h-3 text-indigo-600" />
              {displayUser.badge}
            </div>
          </div>

          {/* Quick links */}
          <div className="py-1">
            <button
              onClick={() => handleNavigate('/profile')}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors text-left"
            >
              <User className="w-4 h-4 text-slate-400" />
              <span>My Profile</span>
            </button>
            <button
              onClick={() => handleNavigate('/settings')}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors text-left"
            >
              <Settings className="w-4 h-4 text-slate-400" />
              <span>Account Settings</span>
            </button>
            <button
              onClick={() => handleNavigate('/setup')}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors text-left"
            >
              <Building2 className="w-4 h-4 text-slate-400" />
              <span>Company Setup Wizard</span>
            </button>
          </div>

          {/* Role Switching Section */}
          {import.meta.env.DEV && (
            <div className="border-t border-slate-100 pt-1 pb-1">
              <div className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Preview As Role
              </div>
              {Object.keys(USER_ROLES).map((roleKey) => {
                const r = USER_ROLES[roleKey];
                const isSelected = currentRole === roleKey;
                return (
                  <button
                    key={roleKey}
                    onClick={() => handleRoleChange(roleKey)}
                    className={`w-full flex items-center justify-between px-4 py-1.5 text-xs text-left transition-colors ${
                      isSelected
                        ? 'bg-indigo-50/70 text-indigo-700 font-semibold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>{r.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                  </button>
                );
              })}
            </div>
          )}

          {/* Logout button */}
          <div className="border-t border-slate-100 pt-1">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors text-left"
            >
              <LogOut className="w-4 h-4 text-slate-400" />
              <span>Sign Out</span>
            </button>
          </div>

          {logoutMessage && (
            <div className="px-3 py-2 bg-slate-900 text-white text-[11px] text-center">
              {logoutMessage}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
