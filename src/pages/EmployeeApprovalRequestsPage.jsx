import React, { useCallback, useEffect, useState } from 'react';
import { Check, Eye, LoaderCircle, RefreshCw, Search, UserRoundCheck, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useCommunication } from '../context/CommunicationContext.jsx';
import {
  approveEmployeeRequest,
  getEmployeeRequest,
  getEmployeeRequests,
  rejectEmployeeRequest,
} from '../services/approvalApi.js';

const filters = [
  ['PENDING', 'Pending'],
  ['APPROVED', 'Approved'],
  ['REJECTED', 'Rejected'],
];

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export default function EmployeeApprovalRequestsPage() {
  const { refreshNotifications } = useCommunication();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestIdFromLink = searchParams.get('request');
  const [status, setStatus] = useState('PENDING');
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rejectingRequest, setRejectingRequest] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const refreshRequests = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getEmployeeRequests(status);
      setRequests(result.requests);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    refreshRequests();
  }, [refreshRequests]);

  useEffect(() => {
    if (!requestIdFromLink) return undefined;
    let active = true;
    getEmployeeRequest(requestIdFromLink)
      .then((result) => {
        if (active) setSelectedRequest(result.request);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      });
    return () => {
      active = false;
    };
  }, [requestIdFromLink]);

  const visibleRequests = requests.filter((request) => {
    const query = search.trim().toLowerCase();
    return !query || [request.fullName, request.email, request.department, request.designation]
      .some((value) => value?.toLowerCase().includes(query));
  });

  const viewRequest = async (id) => {
    setError('');
    try {
      const result = await getEmployeeRequest(id);
      setSelectedRequest(result.request);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const approveRequest = async (request) => {
    if (!window.confirm(`Approve the registration request for ${request.fullName}?`)) return;
    setActionBusy(true);
    setError('');
    setSuccessMessage('');
    try {
      await approveEmployeeRequest(request.id);
      setSuccessMessage(`${request.fullName}'s account has been approved.`);
      setSelectedRequest(null);
      await refreshNotifications();
      await refreshRequests();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setActionBusy(false);
    }
  };

  const rejectRequest = async () => {
    if (!rejectingRequest || !window.confirm(`Reject the registration request for ${rejectingRequest.fullName}?`)) return;
    setActionBusy(true);
    setError('');
    setSuccessMessage('');
    try {
      await rejectEmployeeRequest(rejectingRequest.id, rejectionReason.trim());
      setSuccessMessage(`${rejectingRequest.fullName}'s registration request has been rejected.`);
      setRejectingRequest(null);
      setRejectionReason('');
      setSelectedRequest(null);
      await refreshNotifications();
      await refreshRequests();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-indigo-700">
            <UserRoundCheck className="h-4 w-4" aria-hidden="true" />
            Workforce access
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Employee Approval Requests</h1>
          <p className="mt-1 text-sm text-slate-500">Review registration details and approve or reject employee access.</p>
        </div>
        <button type="button" onClick={refreshRequests} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          Refresh
        </button>
      </header>

      {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}</p>}
      {successMessage && <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">{successMessage}</p>}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1" role="tablist" aria-label="Filter employee requests">
            {filters.map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={status === value}
                onClick={() => {
                  setStatus(value);
                  setSuccessMessage('');
                }}
                className={`rounded-md px-3 py-2 text-xs font-semibold ${status === value ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="relative block sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search employees" aria-label="Search employee requests" className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
          </label>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" /> Loading requests…</div>
        ) : visibleRequests.length === 0 ? (
          <div className="p-12 text-center">
            <UserRoundCheck className="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-slate-700">{search ? 'No matching requests' : `No ${status.toLowerCase()} employee requests`}</p>
            <p className="mt-1 text-xs text-slate-500">{search ? 'Try a different name, email, or department.' : 'New employee registrations will appear here.'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Department / Designation</th>
                  <th className="px-4 py-3">Registered</th>
                  <th className="px-4 py-3">Face enrollment</th>
                  <th className="px-4 py-3">Request status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleRequests.map((request) => (
                  <tr key={request.id} className="align-top hover:bg-slate-50/70">
                    <td className="px-4 py-4"><p className="font-semibold text-slate-900">{request.fullName}</p><p className="mt-1 text-xs text-slate-500">{request.email}</p></td>
                    <td className="px-4 py-4 text-slate-600">{request.department || '—'}<p className="mt-1 text-xs text-slate-400">{request.designation || ''}</p></td>
                    <td className="px-4 py-4 text-xs text-slate-600">{formatDate(request.registrationDate)}</td>
                    <td className="px-4 py-4"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">{request.faceEnrollmentStatus}</span></td>
                    <td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${request.status === 'PENDING' ? 'bg-amber-50 text-amber-800' : request.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{request.status}</span></td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => viewRequest(request.id)} className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-white"><Eye className="h-3.5 w-3.5" />View</button>
                        {status === 'PENDING' && <>
                          <button type="button" disabled={actionBusy} onClick={() => approveRequest(request)} className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"><Check className="h-3.5 w-3.5" />Approve</button>
                          <button type="button" disabled={actionBusy} onClick={() => { setRejectingRequest(request); setRejectionReason(''); }} className="inline-flex items-center gap-1 rounded-md border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"><X className="h-3.5 w-3.5" />Reject</button>
                        </>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="request-details-title">
          <section className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div><h2 id="request-details-title" className="text-lg font-bold text-slate-900">Employee request details</h2><p className="mt-1 text-sm text-slate-500">{selectedRequest.status}</p></div>
              <button type="button" onClick={() => { setSelectedRequest(null); if (requestIdFromLink) setSearchParams({}, { replace: true }); }} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close request details"><X className="h-5 w-5" /></button>
            </div>
            {selectedRequest.profilePhotoUrl && <img src={selectedRequest.profilePhotoUrl} alt={`${selectedRequest.fullName} profile`} className="mt-4 h-24 w-24 rounded-xl border border-slate-200 object-cover" />}
            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              {[
                ['Full name', selectedRequest.fullName],
                ['Email', selectedRequest.email],
                ['Department', selectedRequest.department || 'Not provided'],
                ['Designation', selectedRequest.designation || 'Not provided'],
                ['Registration date', formatDate(selectedRequest.registrationDate)],
                ['Face enrollment', selectedRequest.faceEnrollmentStatus],
              ].map(([label, value]) => <div key={label}><dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt><dd className="mt-1 break-words text-sm font-medium text-slate-800">{value}</dd></div>)}
            </dl>
            {selectedRequest.rejectionReason && <p className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">Rejection reason: {selectedRequest.rejectionReason}</p>}
          </section>
        </div>
      )}

      {rejectingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="reject-title">
          <section className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl sm:p-6">
            <h2 id="reject-title" className="text-lg font-bold text-slate-900">Reject registration request?</h2>
            <p className="mt-1 text-sm text-slate-500">This will keep {rejectingRequest.fullName} from signing in. A reason is optional.</p>
            <label className="mt-4 block text-sm font-medium text-slate-700" htmlFor="rejectionReason">Reason (optional)
              <textarea id="rejectionReason" rows={3} maxLength={500} value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
            </label>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" disabled={actionBusy} onClick={() => setRejectingRequest(null)} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">Cancel</button>
              <button type="button" disabled={actionBusy} onClick={rejectRequest} className="inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60">{actionBusy && <LoaderCircle className="h-4 w-4 animate-spin" />}Confirm rejection</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
