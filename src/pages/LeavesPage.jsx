import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  CalendarCheck,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  Users,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  WalletCards,
  FileText,
  AlertCircle,
  Eye,
  Check,
  Building2,
  ChevronRight,
  Filter,
} from 'lucide-react';
import PageHeader from '../components/common/PageHeader.jsx';
import StatCard from '../components/common/StatCard.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import LeaveRequestsTable from '../components/leaves/LeaveRequestsTable.jsx';
import LeaveDetailsModal from '../components/leaves/LeaveDetailsModal.jsx';
import LeaveApprovalModal from '../components/leaves/LeaveApprovalModal.jsx';
import LeaveApplicationModal from '../components/leaves/LeaveApplicationModal.jsx';
import LeaveBalancesView from '../components/leaves/LeaveBalancesView.jsx';
import LeaveCalendarView from '../components/leaves/LeaveCalendarView.jsx';
import { useLeave } from '../context/LeaveContext.jsx';
import { useRole } from '../context/RoleContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useOrganization } from '../context/OrganizationContext.jsx';
import { getTodayDateString, formatLeaveRange } from '../utils/leaveCalculations.js';

export default function LeavesPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isEmployee, isAdmin, isHr, currentUser } = useRole();
  const { activeLeaveTypes } = useOrganization();
  const {
    leaveRequests,
    pendingApprovals,
    getLeaveStats,
    getRequestsForEmployee,
    approveLeave,
    rejectLeave,
    cancelLeave,
  } = useLeave();
  const { showToast } = useToast();

  // Tab mapping based on current URL path
  const currentPath = location.pathname;
  const initialTab = useMemo(() => {
    if (currentPath === '/leaves/apply') return 'apply';
    if (currentPath === '/leaves/my-requests') return 'my-requests';
    if (currentPath === '/leaves/approvals') return 'approvals';
    if (currentPath === '/leaves/calendar') return 'calendar';
    if (currentPath === '/leaves/balances') return 'balances';
    return isEmployee ? 'my-requests' : 'overview';
  }, [currentPath, isEmployee]);

  const [activeTab, setActiveTab] = useState(initialTab);

  // Sync tab with route changes
  useEffect(() => {
    if (currentPath === '/leaves/apply') setActiveTab('apply');
    else if (currentPath === '/leaves/my-requests') setActiveTab('my-requests');
    else if (currentPath === '/leaves/approvals') setActiveTab('approvals');
    else if (currentPath === '/leaves/calendar') setActiveTab('calendar');
    else if (currentPath === '/leaves/balances') setActiveTab('balances');
    else if (currentPath === '/leaves') {
      setActiveTab(isEmployee ? 'my-requests' : 'overview');
    }
  }, [currentPath, isEmployee]);

  // Modal states
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [approvalModal, setApprovalModal] = useState({
    isOpen: false,
    request: null,
    mode: 'approve', // 'approve' | 'reject'
  });
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);

  // Stats calculation
  const todayStr = getTodayDateString();
  const stats = getLeaveStats(todayStr);

  // Filter requests for current employee session
  const myRequests = useMemo(() => {
    return getRequestsForEmployee('EMP-0094').concat(
      leaveRequests.filter(
        (r) =>
          r.employeeId.toUpperCase() !== 'EMP-0094' &&
          r.employeeName.toLowerCase() === currentUser.name.toLowerCase()
      )
    );
  }, [getRequestsForEmployee, leaveRequests, currentUser]);

  // Handlers for approvals and cancellations
  const handleApproveClick = (req) => {
    setApprovalModal({
      isOpen: true,
      request: req,
      mode: 'approve',
    });
  };

  const handleRejectClick = (req) => {
    setApprovalModal({
      isOpen: true,
      request: req,
      mode: 'reject',
    });
  };

  const handleConfirmDecision = ({ requestId, reason, mode }) => {
    if (mode === 'approve') {
      const res = approveLeave(requestId, currentUser.name, reason);
      if (res.success) {
        showToast({
          type: 'success',
          title: 'Leave Request Approved',
          message: `Leave application ${requestId} for ${res.request.employeeName} has been approved.`,
        });
      } else {
        showToast({
          type: 'error',
          title: 'Approval Failed',
          message: res.error || 'Failed to approve request.',
        });
      }
    } else {
      const res = rejectLeave(requestId, reason, currentUser.name);
      if (res.success) {
        showToast({
          type: 'info',
          title: 'Leave Request Rejected',
          message: `Leave application ${requestId} has been rejected with justification recorded.`,
        });
      } else {
        showToast({
          type: 'error',
          title: 'Rejection Failed',
          message: res.error || 'Failed to reject request.',
        });
      }
    }
  };

  const handleCancelClick = (requestId) => {
    if (window.confirm('Are you sure you want to withdraw this leave request?')) {
      const res = cancelLeave(requestId, currentUser.name);
      if (res.success) {
        showToast({
          type: 'info',
          title: 'Request Cancelled',
          message: `Leave application ${requestId} has been marked as Cancelled.`,
        });
      } else {
        showToast({
          type: 'error',
          title: 'Cancellation Failed',
          message: res.error || 'Failed to cancel request.',
        });
      }
    }
  };

  // Switch tab and navigate route cleanly
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    if (tabId === 'overview') navigate('/leaves');
    else if (tabId === 'my-requests') navigate('/leaves/my-requests');
    else if (tabId === 'approvals') navigate('/leaves/approvals');
    else if (tabId === 'calendar') navigate('/leaves/calendar');
    else if (tabId === 'balances') navigate('/leaves/balances');
    else if (tabId === 'apply') navigate('/leaves/apply');
  };

  // Tab definitions
  const tabs = useMemo(() => {
    const list = [];
    if (!isEmployee) {
      list.push({ id: 'overview', label: 'All Requests' });
      list.push({
        id: 'approvals',
        label: 'Pending Approvals',
        badge: pendingApprovals.length > 0 ? pendingApprovals.length : null,
      });
    }
    list.push({ id: 'my-requests', label: 'My Requests' });
    list.push({ id: 'balances', label: 'Leave Balances' });
    list.push({ id: 'calendar', label: 'Leave Calendar' });
    return list;
  }, [isEmployee, pendingApprovals.length]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={isEmployee ? 'My Leave Requests' : 'Leave Management'}
        subtitle={
          isEmployee
            ? 'Submit time-off requests, check balance quotas, and track review status.'
            : 'Manage organization leave requests, audit approvals, and track workforce time-off.'
        }
        breadcrumbs={[{ label: 'Leaves', path: '/leaves' }]}
      >
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              if (activeTab === 'apply') {
                handleTabChange(isEmployee ? 'my-requests' : 'overview');
              } else {
                setIsApplyModalOpen(true);
              }
            }}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Apply for Leave</span>
          </button>
        </div>
      </PageHeader>

      {/* KPI Stat Cards (derived strictly from actual data) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Pending Requests"
          value={stats.pendingCount}
          status={
            stats.pendingCount > 0
              ? `${stats.pendingCount} awaiting HR decision`
              : 'Queue is clear'
          }
          statusType={stats.pendingCount > 0 ? 'warning' : 'neutral'}
          icon={Clock}
          hint={stats.pendingCount > 0 ? 'Requires action' : '0 in review'}
        />

        <StatCard
          title="Approved Requests"
          value={stats.approvedCount}
          status={
            stats.approvedCount > 0
              ? `${stats.approvedCount} approved time-off request(s)`
              : 'No approved records'
          }
          statusType={stats.approvedCount > 0 ? 'success' : 'neutral'}
          icon={CheckCircle2}
          hint={stats.approvedCount > 0 ? 'Granted leaves' : '0 approved'}
        />

        <StatCard
          title="Rejected Requests"
          value={stats.rejectedCount}
          status={
            stats.rejectedCount > 0
              ? `${stats.rejectedCount} with recorded justification`
              : 'Zero rejections'
          }
          statusType={stats.rejectedCount > 0 ? 'danger' : 'neutral'}
          icon={XCircle}
          hint={stats.rejectedCount > 0 ? 'Declined' : '0 rejected'}
        />

        <StatCard
          title="Employees on Leave Today"
          value={stats.onLeaveCount}
          status={
            stats.onLeaveCount > 0
              ? `${stats.onLeaveCount} active today (${todayStr})`
              : 'All active staff available'
          }
          statusType={stats.onLeaveCount > 0 ? 'info' : 'neutral'}
          icon={Users}
          hint={
            stats.onLeaveCount > 0
              ? stats.onLeaveEmployees.map((e) => e.employeeName).join(', ')
              : '0 on leave today'
          }
        />
      </div>

      {/* Configuration Advisory if Leave Types are missing */}
      {activeLeaveTypes.length === 0 && (
        <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold">Leave Policies Not Configured</span>
              <p className="text-amber-800 mt-0.5">
                Setup annual quotas, paid/unpaid status, and approval requirements in Organization Settings.
              </p>
            </div>
          </div>
          {(isAdmin || isHr) && (
            <Link
              to="/organization"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded-xl transition-colors whitespace-nowrap"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Configure Policies</span>
            </Link>
          )}
        </div>
      )}

      {/* Direct Page Mode for `/leaves/apply` */}
      {activeTab === 'apply' ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => handleTabChange(isEmployee ? 'my-requests' : 'overview')}
              className="text-indigo-600 hover:text-indigo-800 font-semibold"
            >
              &larr; Back to Leave Workspace
            </button>
          </div>
          <LeaveApplicationModal
            isOpen={true}
            isPageMode={true}
            onClose={() => handleTabChange(isEmployee ? 'my-requests' : 'overview')}
          />
        </div>
      ) : (
        <>
          {/* Tabs Navigation Bar */}
          <div className="border-b border-slate-200">
            <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-px">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-all ${
                      isActive
                        ? 'border-indigo-600 text-indigo-700'
                        : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <span>{tab.label}</span>
                    {tab.badge && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* TAB 1: ALL REQUESTS (HR / Admin) */}
          {activeTab === 'overview' && !isEmployee && (
            <div className="space-y-4">
              <LeaveRequestsTable
                requests={leaveRequests}
                onViewDetails={setSelectedRequest}
                onApprove={handleApproveClick}
                onReject={handleRejectClick}
                onCancel={handleCancelClick}
                canReview={isAdmin || isHr}
                emptyTitle="No Leave Applications on File"
                emptyDescription="There are currently no leave requests recorded in this workspace. Employees can apply for leaves or HR can submit requests on their behalf."
                onApplyClick={() => setIsApplyModalOpen(true)}
              />
            </div>
          )}

          {/* TAB 2: PENDING APPROVALS QUEUE (HR / Admin) */}
          {activeTab === 'approvals' && !isEmployee && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    <span>Leave Approval Queue</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Review and authorize pending leave requests. Approving or rejecting updates the employee's status and records the decision audit.
                  </p>
                </div>
                <div className="text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl self-start sm:self-auto">
                  {pendingApprovals.length} Request(s) Pending Action
                </div>
              </div>

              {pendingApprovals.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-xs">
                  <EmptyState
                    icon={CheckCircle2}
                    title="No Pending Leave Approvals"
                    description="All employee time-off requests have been reviewed and processed. New submissions from employees will appear in this queue."
                    phaseBadge="Approval Queue Clear"
                  />
                </div>
              ) : (
                <LeaveRequestsTable
                  requests={pendingApprovals}
                  onViewDetails={setSelectedRequest}
                  onApprove={handleApproveClick}
                  onReject={handleRejectClick}
                  onCancel={handleCancelClick}
                  canReview={true}
                  emptyTitle="No Pending Leave Approvals"
                  emptyDescription="All submitted leave requests have already been reviewed."
                />
              )}
            </div>
          )}

          {/* ACCESS RESTRICTED ADVISORY FOR EMPLOYEE VISITING APPROVALS */}
          {activeTab === 'approvals' && isEmployee && (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center max-w-lg mx-auto shadow-xs space-y-4 my-8">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Access Restricted</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  The Leave Approvals Queue is restricted to HR Managers and System Administrators. As an Employee, you can view your personal applications and status in <strong>My Requests</strong>.
                </p>
              </div>
              <div>
                <button
                  onClick={() => handleTabChange('my-requests')}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs"
                >
                  Go to My Requests
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: MY REQUESTS (Employee self-service & personal history) */}
          {activeTab === 'my-requests' && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {isEmployee ? 'My Leave Applications' : `Leave History for ${currentUser.name}`}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Track the review status of your personal time-off applications or withdraw pending requests.
                  </p>
                </div>
                <button
                  onClick={() => setIsApplyModalOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>Draft New Request</span>
                </button>
              </div>

              <LeaveRequestsTable
                requests={myRequests}
                onViewDetails={setSelectedRequest}
                onApprove={handleApproveClick}
                onReject={handleRejectClick}
                onCancel={handleCancelClick}
                canReview={false}
                emptyTitle="No Personal Leave Applications"
                emptyDescription="You have not submitted any leave applications yet. Click 'Apply for Leave' to request time off."
                onApplyClick={() => setIsApplyModalOpen(true)}
              />
            </div>
          )}

          {/* TAB 4: LEAVE BALANCES */}
          {activeTab === 'balances' && <LeaveBalancesView />}

          {/* TAB 5: LEAVE CALENDAR */}
          {activeTab === 'calendar' && <LeaveCalendarView />}
        </>
      )}

      {/* Details Modal */}
      <LeaveDetailsModal
        isOpen={Boolean(selectedRequest)}
        onClose={() => setSelectedRequest(null)}
        request={selectedRequest}
        onApprove={handleApproveClick}
        onReject={handleRejectClick}
        onCancel={handleCancelClick}
        canReview={isAdmin || isHr}
        canCancel={
          selectedRequest?.status === 'Pending' &&
          (isEmployee || isAdmin || isHr)
        }
      />

      {/* Approval / Rejection Modal */}
      <LeaveApprovalModal
        isOpen={approvalModal.isOpen}
        onClose={() =>
          setApprovalModal({ isOpen: false, request: null, mode: 'approve' })
        }
        request={approvalModal.request}
        mode={approvalModal.mode}
        onConfirm={handleConfirmDecision}
      />

      {/* Application Modal (Popup) */}
      <LeaveApplicationModal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
      />
    </div>
  );
}
