import React, { useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCommunication } from '../../context/CommunicationContext.jsx';

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

export default function NotificationButton() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { notifications, markNotificationRead, markAllNotificationsRead, dismissNotification } = useCommunication();
  const unreadCount = notifications.filter((item) => !item.read).length;

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsOpen(false);
    };
    const handleKeyDown = (event) => { if (event.key === 'Escape') setIsOpen(false); };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      <button type="button" onClick={() => setIsOpen((open) => !open)} className="relative rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'} aria-expanded={isOpen} aria-haspopup="dialog">
        <Bell className="h-5 w-5" aria-hidden="true" />
        {unreadCount > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      {isOpen && <section role="dialog" aria-label="Notifications" className="absolute right-0 top-full z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3"><div><h2 className="text-sm font-semibold text-slate-900">Notifications</h2><p className="text-xs text-slate-500">{unreadCount} unread</p></div>{unreadCount > 0 && <button type="button" onClick={markAllNotificationsRead} className="inline-flex min-h-8 items-center gap-1.5 rounded-md px-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"><CheckCheck className="h-3.5 w-3.5" /> Mark all read</button>}</div>
        <div className="max-h-[min(65vh,24rem)] overflow-y-auto">
          {notifications.length ? notifications.map((item) => <div key={item.id} className={`flex gap-3 border-b border-slate-100 px-4 py-3 ${item.read ? '' : 'bg-indigo-50/40'}`}>
            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.read ? 'bg-slate-300' : 'bg-indigo-600'}`} aria-label={item.read ? 'Read' : 'Unread'} />
            <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-800">{item.title}</p><p className="mt-0.5 break-words text-xs leading-relaxed text-slate-600">{item.message}</p><div className="mt-2 flex items-center justify-between gap-2"><time className="text-[11px] text-slate-400" dateTime={item.createdAt}>{formatDate(item.createdAt)}</time>{item.link ? <Link to={item.link} onClick={() => { markNotificationRead(item.id); setIsOpen(false); }} className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">Open</Link> : !item.read ? <button type="button" onClick={() => markNotificationRead(item.id)} className="text-xs font-semibold text-indigo-700 hover:text-indigo-900">Mark read</button> : null}</div></div>
            <button type="button" onClick={() => dismissNotification(item.id)} aria-label={`Dismiss ${item.title}`} title="Dismiss notification" className="h-7 shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"><X className="h-3.5 w-3.5" /></button>
          </div>) : <div className="px-4 py-10 text-center"><Bell className="mx-auto h-5 w-5 text-slate-400" aria-hidden="true" /><p className="mt-2 text-sm font-medium text-slate-700">You’re all caught up</p><p className="mt-1 text-xs text-slate-500">New notifications will appear here.</p></div>}
        </div>
      </section>}
    </div>
  );
}
