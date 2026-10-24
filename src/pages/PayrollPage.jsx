import React from 'react';
import { WalletCards, DollarSign, Download, Play, FileCheck } from 'lucide-react';
import PageHeader from '../components/common/PageHeader.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import { useRole } from '../context/RoleContext.jsx';

export default function PayrollPage() {
  const { isEmployee } = useRole();

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEmployee ? 'My Payslips & Compensation' : 'Payroll & Compensation'}
        subtitle={
          isEmployee
            ? 'Access your monthly salary slips, breakdown of allowances, and tax withholdings.'
            : 'Process automated payroll batches, direct deposits, tax compliance, and expense reimbursements.'
        }
        breadcrumbs={[{ label: 'Payroll' }]}
      >
        {!isEmployee && (
          <button
            onClick={() => alert('Payroll execution engine will be wired to financial services in Phase 2.')}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Process Pay Run</span>
          </button>
        )}
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500 uppercase">
            {isEmployee ? 'Current Gross Rate' : 'Total Monthly Payroll'}
          </span>
          <div className="text-2xl font-bold text-slate-900 mt-1 font-mono tabular-nums">—</div>
          <span className="text-xs text-slate-400 mt-2 block">Salary structure not assigned</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500 uppercase">
            {isEmployee ? 'Tax Withholdings' : 'Tax & Statutory Liabilities'}
          </span>
          <div className="text-2xl font-bold text-slate-900 mt-1 font-mono tabular-nums">—</div>
          <span className="text-xs text-slate-400 mt-2 block">Tax rules unconfigured</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500 uppercase">
            {isEmployee ? 'Generated Payslips' : 'Executed Cycles'}
          </span>
          <div className="text-2xl font-bold text-slate-900 mt-1 font-mono tabular-nums">0</div>
          <span className="text-xs text-slate-400 mt-2 block">No past cycles</span>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <EmptyState
          icon={WalletCards}
          title={isEmployee ? 'No Payslips Generated Yet' : 'No Payroll Cycles Processed'}
          description={
            isEmployee
              ? 'Your payslips will be available for download here at the end of each monthly billing cycle once payroll is executed.'
              : 'Configure salary structures, bank disbursement accounts, and tax brackets before launching the first pay cycle.'
          }
          actionText={isEmployee ? 'View Compensation Policy' : 'Configure Salary Grades'}
          onAction={() => alert('Compensation module is planned for Phase 2.')}
          phaseBadge="Phase 2 Financial Engine"
        />
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 mb-2">
          <span>Payroll Processing API Architecture</span>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          Ready for endpoints: <code className="text-indigo-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">POST /api/v1/payroll/calculate</code>, <code className="text-indigo-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">GET /api/v1/payroll/slips</code>, <code className="text-indigo-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">GET /api/v1/payroll/slips/:id/pdf</code>.
        </p>
      </div>
    </div>
  );
}
