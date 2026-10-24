import React, { useMemo, useState } from 'react';
import { Download, Search, ShieldCheck } from 'lucide-react';
import PageHeader from '../components/common/PageHeader.jsx';
import { useCommunication } from '../context/CommunicationContext.jsx';

const PAGE_SIZE = 20;

function escapeCsv(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

function formatTimestamp(value) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export default function AuditLogPage() {
  const { auditEvents } = useCommunication();
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(0);

  const actions = useMemo(() => [...new Set(auditEvents.map((event) => event.action))].sort(), [auditEvents]);
  const filteredEvents = useMemo(() => {
    const query = search.trim().toLowerCase();
    return auditEvents.filter((event) => {
      const date = event.timestamp.slice(0, 10);
      const matchesSearch = !query || [event.action, event.actorName, event.actorId, event.entityType, event.entityId].some((value) => String(value || '').toLowerCase().includes(query));
      return matchesSearch && (actionFilter === 'All' || event.action === actionFilter)
        && (statusFilter === 'All' || event.status === statusFilter)
        && (!startDate || date >= startDate) && (!endDate || date <= endDate);
    }).sort((left, right) => new Date(right.timestamp) - new Date(left.timestamp));
  }, [actionFilter, auditEvents, endDate, search, startDate, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredEvents.length / PAGE_SIZE));
  const pageEvents = filteredEvents.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const updateFilter = (setter) => (event) => { setter(event.target.value); setPage(0); };

  const exportCsv = () => {
    const columns = ['Timestamp', 'Actor', 'Role', 'Action', 'Entity type', 'Entity ID', 'Status'];
    const rows = filteredEvents.map((event) => [event.timestamp, event.actorName, event.actorId, event.action, event.entityType, event.entityId, event.status]);
    const blob = new Blob([[columns, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'hcm-lite-audit-events.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Audit Log" subtitle="Recent actions recorded by this browser session. Production audit records require a protected backend." breadcrumbs={[{ label: 'Audit Log' }]}>
        <button type="button" onClick={exportCsv} disabled={!filteredEvents.length} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"><Download className="h-4 w-4" aria-hidden="true" /> Export CSV</button>
      </PageHeader>

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5">
        <label className="relative sm:col-span-2 lg:col-span-1"><span className="sr-only">Search audit events</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" /><input value={search} onChange={updateFilter(setSearch)} placeholder="Search events" className="min-h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" /></label>
        <label className="text-xs font-medium text-slate-600">Action<select value={actionFilter} onChange={updateFilter(setActionFilter)} className="mt-1 block min-h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"><option>All</option>{actions.map((action) => <option key={action}>{action}</option>)}</select></label>
        <label className="text-xs font-medium text-slate-600">Status<select value={statusFilter} onChange={updateFilter(setStatusFilter)} className="mt-1 block min-h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">{['All', 'success'].map((status) => <option key={status}>{status}</option>)}</select></label>
        <label className="text-xs font-medium text-slate-600">From<input type="date" value={startDate} onChange={updateFilter(setStartDate)} className="mt-1 block min-h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" /></label>
        <label className="text-xs font-medium text-slate-600">To<input type="date" min={startDate || undefined} value={endDate} onChange={updateFilter(setEndDate)} className="mt-1 block min-h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" /></label>
      </div>

      {pageEvents.length ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-slate-500" aria-hidden="true" /><h2 className="text-sm font-semibold text-slate-800">Recorded events</h2></div><span className="text-xs text-slate-500">{filteredEvents.length} total</span></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-slate-50 text-xs font-semibold text-slate-500"><tr><th className="px-4 py-3">When</th><th className="px-4 py-3">Actor</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">Entity</th><th className="px-4 py-3">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{pageEvents.map((event) => <tr key={event.id} className="align-top hover:bg-slate-50/70"><td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">{formatTimestamp(event.timestamp)}</td><td className="px-4 py-3"><span className="block text-sm font-medium text-slate-800">{event.actorName}</span><span className="text-xs text-slate-500">{event.actorId}</span></td><td className="px-4 py-3 font-mono text-xs text-slate-700">{event.action}</td><td className="px-4 py-3 text-xs text-slate-600">{event.entityType}{event.entityId && <span className="block font-mono text-[11px] text-slate-400">{event.entityId}</span>}</td><td className="px-4 py-3"><span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-800">{event.status}</span></td></tr>)}</tbody></table></div>
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3"><span className="text-xs text-slate-500">Page {page + 1} of {pageCount}</span><div className="flex gap-2"><button type="button" onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={page === 0} className="min-h-9 rounded-md border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40">Previous</button><button type="button" onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))} disabled={page >= pageCount - 1} className="min-h-9 rounded-md border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40">Next</button></div></div>
        </div>
      ) : <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-14 text-center"><ShieldCheck className="mx-auto h-6 w-6 text-slate-400" aria-hidden="true" /><h2 className="mt-3 text-base font-semibold text-slate-900">{auditEvents.length ? 'No matching audit events' : 'No audit events recorded'}</h2><p className="mx-auto mt-1 max-w-lg text-sm text-slate-500">{auditEvents.length ? 'Adjust the search or filters to see other events.' : 'Supported actions in this browser session will appear here. This is not a production-grade or immutable audit trail.'}</p></div>}
    </div>
  );
}
