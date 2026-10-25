import {
  LayoutDashboard,
  Building2,
  Users,
  UserRoundCheck,
  Clock,
  CalendarCheck,
  WalletCards,
  BarChart3,
  Bot,
  Megaphone,
  ShieldCheck,
  Settings,
  User,
} from 'lucide-react';

/**
 * Navigation items configuration per role.
 * Roles: ADMIN, HR, EMPLOYEE
 */
export const NAVIGATION_CONFIG = {
  ADMIN: [
    {
      title: 'Overview',
      items: [
        { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { label: 'Organization', path: '/organization', icon: Building2 },
        { label: 'Employees', path: '/employees', icon: Users },
        { label: 'Employee Approvals', path: '/employee-approvals', icon: UserRoundCheck, pendingBadge: true },
      ],
    },
    {
      title: 'Time & Operations',
      items: [
        { label: 'Attendance', path: '/attendance', icon: Clock },
        { label: 'Leave Management', path: '/leaves', icon: CalendarCheck },
        { label: 'Payroll', path: '/payroll', icon: WalletCards },
      ],
    },
    {
      title: 'Intelligence & Reports',
      items: [
        { label: 'Analytics', path: '/analytics', icon: BarChart3 },
        { label: 'AI Assistant', path: '/ai-assistant', icon: Bot, isAi: true },
      ],
    },
    {
      title: 'Administration',
      items: [
        { label: 'Announcements', path: '/announcements', icon: Megaphone },
        { label: 'Audit Log', path: '/audit-log', icon: ShieldCheck },
        { label: 'Settings', path: '/settings', icon: Settings },
      ],
    },
  ],

  HR: [
    {
      title: 'Overview',
      items: [
        { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { label: 'Organization', path: '/organization', icon: Building2 },
        { label: 'Employees', path: '/employees', icon: Users },
        { label: 'Employee Approvals', path: '/employee-approvals', icon: UserRoundCheck, pendingBadge: true },
      ],
    },
    {
      title: 'Time & Operations',
      items: [
        { label: 'Attendance', path: '/attendance', icon: Clock },
        { label: 'Leave Management', path: '/leaves', icon: CalendarCheck },
        { label: 'Payroll', path: '/payroll', icon: WalletCards },
      ],
    },
    {
      title: 'Intelligence & Reports',
      items: [
        { label: 'Analytics', path: '/analytics', icon: BarChart3 },
        { label: 'AI Assistant', path: '/ai-assistant', icon: Bot, isAi: true },
        { label: 'Announcements', path: '/announcements', icon: Megaphone },
      ],
    },
  ],

  EMPLOYEE: [
    {
      title: 'My Workspace',
      items: [
        { label: 'My Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { label: 'My Attendance', path: '/attendance/my-attendance', icon: Clock },
        { label: 'My Leaves', path: '/leaves', icon: CalendarCheck },
        { label: 'My Payslips', path: '/payroll', icon: WalletCards },
        { label: 'My Profile', path: '/profile', icon: User },
      ],
    },
    {
      title: 'Assistance & Updates',
      items: [
        { label: 'AI Assistant', path: '/ai-assistant', icon: Bot, isAi: true },
        { label: 'Announcements', path: '/announcements', icon: Megaphone },
      ],
    },
  ],
};

export const USER_ROLES = {
  ADMIN: {
    id: 'ADMIN',
    label: 'Administrator',
    name: 'Preview account',
    email: '',
    initials: 'PA',
    badge: 'Administrator preview',
    department: '',
  },
  HR: {
    id: 'HR',
    label: 'HR Manager',
    name: 'Preview account',
    email: '',
    initials: 'PA',
    badge: 'HR preview',
    department: '',
  },
  EMPLOYEE: {
    id: 'EMPLOYEE',
    label: 'Employee',
    name: 'Preview account',
    email: '',
    initials: 'PA',
    badge: 'Employee preview',
    department: '',
  },
};
