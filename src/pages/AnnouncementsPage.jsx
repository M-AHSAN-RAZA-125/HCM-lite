import React, { useEffect, useMemo, useState } from 'react';
import { Archive, Bell, Megaphone, Pencil, Plus, Send, Trash2, X } from 'lucide-react';
import PageHeader from '../components/common/PageHeader.jsx';
import { useRole } from '../context/RoleContext.jsx';
import { useOrganization } from '../context/OrganizationContext.jsx';
import { useCommunication } from '../context/CommunicationContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

const EMPTY_FORM = { title: '', content: '', audienceDepartment: 'ALL', priority: 'Normal' };

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export default function AnnouncementsPage() {
  const { isAdmin, isHr, isEmployee, currentUser } = useRole();
  const { activeDepartments } = useOrganization();
  const { announcements, saveAnnouncement, archiveAnnouncement, deleteAnnouncement } = useCommunication();
  const { showToast } = useToast();
  const [form, setForm] = useState(EMPTY_FORM);
  const [formStatus, setFormStatus] = useState('Draft');
  const [editingId, setEditingId] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const canManage = isAdmin || isHr;

  useEffect(() => {
    if (!selected) return undefined;
    const onKeyDown = (event) => { if (event.key === 'Escape') setSelected(null); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selected]);

  const visibleAnnouncements = useMemo(() => announcements
    .filter((item) => {
      if (isEmployee) return item.status === 'Published' && (item.audienceDepartment === 'ALL' || item.audienceDepartment === currentUser.department);
      if (isHr && !isAdmin && item.status !== 'Published' && item.author !== currentUser.name) return false;
      return true;
    })
    .filter((item) => !canManage || statusFilter === 'All' || item.status === statusFilter)
    .sort((left, right) => new Date(right.publishedAt || right.createdAt) - new Date(left.publishedAt || left.createdAt)),
  [announcements, canManage, currentUser.department, currentUser.name, isAdmin, isEmployee, isHr, statusFilter]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormStatus('Draft');
    setIsFormOpen(true);
  };

  const openEdit = (announcement) => {
    setEditingId(announcement.id);
    setForm({ title: announcement.title, content: announcement.content, audienceDepartment: announcement.audienceDepartment, priority: announcement.priority });
    setFormStatus(announcement.status === 'Published' ? 'Published' : 'Draft');
    setIsFormOpen(true);
  };

  const submitForm = (status) => {
    const result = saveAnnouncement({ ...form, id: editingId, status });
    if (!result.success) {
      showToast({ type: 'error', title: 'Announcement not saved', message: result.error });
      return;
    }
    showToast({ type: 'success', title: status === 'Published' ? 'Announcement published' : 'Draft saved' });
    setIsFormOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleArchive = (announcement) => {
    if (!window.confirm(`Archive "${announcement.title}"?`)) return;
    const result = archiveAnnouncement(announcement.id);
    if (!result.success) showToast({ type: 'error', title: 'Could not archive announcement', message: result.error });
  };

  const handleDelete = (announcement) => {
    if (!window.confirm(`Delete "${announcement.title}"? This cannot be undone.`)) return;
    const result = deleteAnnouncement(announcement.id);
    if (!result.success) showToast({ type: 'error', title: 'Could not delete announcement', message: result.error });
  };

  const canEdit = (announcement) => announcement.status !== 'Archived' && (isAdmin || (isHr && announcement.author === currentUser.name));
  const canDelete = (announcement) => isAdmin || (isHr && announcement.author === currentUser.name && announcement.status === 'Draft');

  return (
    <div className="space-y-6">
      <PageHeader title="Company Announcements" subtitle="Updates from your organization, with visibility based on your role and department." breadcrumbs={[{ label: 'Announcements' }]}>
        {canManage && <button type="button" onClick={openCreate} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-indigo-600 px-3.5 text-sm font-semibold text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"><Plus className="h-4 w-4" aria-hidden="true" /> Create announcement</button>}
      </PageHeader>

      {canManage && <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-slate-500">Drafts are visible only to their author and administrators.</p><label className="flex items-center gap-2 text-sm text-slate-600">Status<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">{['All', 'Draft', 'Published', 'Archived'].map((status) => <option key={status}>{status}</option>)}</select></label></div>}

      {isFormOpen && (
        <form onSubmit={(event) => { event.preventDefault(); submitForm(formStatus); }} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-label={editingId ? 'Edit announcement' : 'Create announcement'}>
          <div className="flex items-center justify-between gap-3"><h2 className="text-base font-semibold text-slate-900">{editingId ? 'Edit announcement' : 'New announcement'}</h2><button type="button" onClick={() => setIsFormOpen(false)} aria-label="Close form" className="rounded-md p-2 text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"><X className="h-4 w-4" /></button></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm font-medium text-slate-700 sm:col-span-2">Title<input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} maxLength={120} required className="min-h-10 w-full rounded-lg border border-slate-200 px-3 font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" /></label>
            <label className="space-y-1.5 text-sm font-medium text-slate-700 sm:col-span-2">Announcement<textarea value={form.content} onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))} maxLength={10000} required rows={5} className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2.5 font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" /></label>
            <label className="space-y-1.5 text-sm font-medium text-slate-700">Audience<select value={form.audienceDepartment} onChange={(event) => setForm((current) => ({ ...current, audienceDepartment: event.target.value }))} className="min-h-10 w-full rounded-lg border border-slate-200 bg-white px-3 font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"><option value="ALL">All employees</option>{activeDepartments.map((department) => <option key={department.id} value={department.name}>{department.name}</option>)}</select></label>
            <label className="space-y-1.5 text-sm font-medium text-slate-700">Priority<select value={form.priority} onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))} className="min-h-10 w-full rounded-lg border border-slate-200 bg-white px-3 font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">{['Normal', 'Important', 'Urgent'].map((priority) => <option key={priority}>{priority}</option>)}</select></label>
          </div>
          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3">
            <button type="button" onClick={() => submitForm('Draft')} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Pencil className="h-4 w-4" /> Save draft</button>
            <button type="button" onClick={() => submitForm('Published')} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-indigo-600 px-3.5 text-sm font-semibold text-white hover:bg-indigo-700"><Send className="h-4 w-4" /> {formStatus === 'Published' && editingId ? 'Save and publish' : 'Publish'}</button>
          </div>
        </form>
      )}

      {visibleAnnouncements.length ? (
        <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
          {visibleAnnouncements.map((announcement) => (
            <article key={announcement.id} className="p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2"><span className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${announcement.status === 'Published' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : announcement.status === 'Draft' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-slate-200 bg-slate-100 text-slate-600'}`}>{announcement.status}</span>{announcement.priority !== 'Normal' && <span className="rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-800">{announcement.priority}</span>}<span className="text-xs text-slate-500">{announcement.audienceDepartment === 'ALL' ? 'All employees' : announcement.audienceDepartment}</span></div>
                  <h2 className="text-base font-semibold text-slate-900">{announcement.title}</h2>
                  <p className="mt-1 line-clamp-3 whitespace-pre-wrap break-words text-sm text-slate-600">{announcement.content}</p>
                  <p className="mt-3 text-xs text-slate-400">{announcement.status === 'Published' && announcement.publishedAt ? `Published ${formatDate(announcement.publishedAt)}` : `Created ${formatDate(announcement.createdAt)}`} - {announcement.author}</p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {announcement.status === 'Published' && <button type="button" onClick={() => setSelected(announcement)} className="min-h-9 rounded-md border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">Read details</button>}
                  {canEdit(announcement) && <button type="button" onClick={() => openEdit(announcement)} aria-label={`Edit ${announcement.title}`} title="Edit" className="rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"><Pencil className="h-4 w-4" /></button>}
                  {canEdit(announcement) && announcement.status !== 'Archived' && <button type="button" onClick={() => handleArchive(announcement)} aria-label={`Archive ${announcement.title}`} title="Archive" className="rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"><Archive className="h-4 w-4" /></button>}
                  {canDelete(announcement) && <button type="button" onClick={() => handleDelete(announcement)} aria-label={`Delete ${announcement.title}`} title="Delete" className="rounded-md border border-rose-200 p-2 text-rose-700 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"><Trash2 className="h-4 w-4" /></button>}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-300 bg-white px-5 py-14 text-center"><div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><Megaphone className="h-5 w-5" aria-hidden="true" /></div><h2 className="mt-4 text-base font-semibold text-slate-900">{statusFilter === 'All' ? 'No announcements yet' : `No ${statusFilter.toLowerCase()} announcements`}</h2><p className="mt-1 max-w-md text-sm text-slate-500">{isEmployee ? 'Published announcements for your audience will appear here.' : 'Create a draft or publish an update for your organization.'}</p>{canManage && statusFilter === 'All' && <button type="button" onClick={openCreate} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg bg-indigo-600 px-3.5 text-sm font-semibold text-white hover:bg-indigo-700"><Plus className="h-4 w-4" /> Create announcement</button>}</div>
      )}

      {!isEmployee && announcements.length === 0 && <p className="flex items-center gap-2 text-xs text-slate-500"><Bell className="h-3.5 w-3.5" /> Publishing creates role-scoped notifications in this browser session.</p>}

      {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}><section role="dialog" aria-modal="true" aria-labelledby="announcement-detail-title" className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-5 shadow-xl sm:p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase text-indigo-700">{selected.audienceDepartment === 'ALL' ? 'All employees' : selected.audienceDepartment}</p><h2 id="announcement-detail-title" className="mt-1 text-lg font-bold text-slate-900">{selected.title}</h2></div><button type="button" onClick={() => setSelected(null)} aria-label="Close announcement details" className="rounded-md p-2 text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"><X className="h-4 w-4" /></button></div><p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{selected.content}</p><p className="mt-6 border-t border-slate-100 pt-3 text-xs text-slate-500">Published {formatDate(selected.publishedAt)} - {selected.author}</p></section></div>}
    </div>
  );
}
