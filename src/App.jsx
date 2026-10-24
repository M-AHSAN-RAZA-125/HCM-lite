import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { RoleProvider } from './context/RoleContext.jsx';
import { OrganizationProvider } from './context/OrganizationContext.jsx';
import { EmployeeProvider } from './context/EmployeeContext.jsx';
import { AttendanceProvider } from './context/AttendanceContext.jsx';
import { LeaveProvider } from './context/LeaveContext.jsx';
import { PayrollProvider } from './context/PayrollContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { CommunicationProvider } from './context/CommunicationContext.jsx';
import AppRoutes from './routes/AppRoutes.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <RoleProvider>
        <CommunicationProvider>
          <OrganizationProvider>
            <EmployeeProvider>
              <AttendanceProvider>
                <LeaveProvider>
                  <PayrollProvider>
                    <ToastProvider>
                      <AppRoutes />
                    </ToastProvider>
                  </PayrollProvider>
                </LeaveProvider>
              </AttendanceProvider>
            </EmployeeProvider>
          </OrganizationProvider>
        </CommunicationProvider>
      </RoleProvider>
    </BrowserRouter>
  );
}
