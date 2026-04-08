'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CheckSquare,
  AlertTriangle,
  MessageSquare,
  RefreshCw,
} from 'lucide-react';

interface Notification {
  id: string;
  type: string;
  message: string;
  link: string;
  createdAt: string;
}

const typeConfig: Record<string, { icon: typeof Bell; color: string }> = {
  task_assigned: { icon: CheckSquare, color: '#4ab0de' },
  changes_requested: { icon: RefreshCw, color: '#f59e0b' },
  risk_submitted: { icon: AlertTriangle, color: '#8b5cf6' },
  review_requested: { icon: MessageSquare, color: '#10b981' },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function NotificationBell({ userId }: { userId?: string }) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userId) return;
    async function load() {
      try {
        const res = await fetch(`/api/notifications?userId=${userId}`);
        if (res.ok) setNotifications(await res.json());
      } catch { /* */ }
    }
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !readIds.has(n.id)).length;

  const handleClick = (notif: Notification) => {
    setReadIds(prev => new Set(prev).add(notif.id));
    setOpen(false);
    router.push(notif.link);
  };

  const btnRef = useRef<HTMLButtonElement>(null);

  if (!userId) return null;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        ref={btnRef}
        onClick={() => setOpen(!open)}
        style={{
          width: '34px', height: '34px', borderRadius: '8px',
          background: open ? 'rgba(74,176,222,0.15)' : 'transparent',
          border: '1px solid var(--border-color)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', transition: 'all 0.2s',
        }}
      >
        <Bell size={16} style={{ color: open ? 'var(--accent-cyan)' : 'var(--text-muted)' }} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: '-4px', right: '-4px',
            width: '18px', height: '18px', borderRadius: '50%',
            background: '#ef4444', color: '#fff', fontSize: '10px', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid var(--bg-secondary)',
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'fixed', top: '48px', left: '6px',
          width: '228px', maxHeight: '380px', overflowY: 'auto',
          background: 'var(--bg-card)', border: '1px solid var(--border-color)',
          borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          zIndex: 9999,
        }}>
          <div style={{
            padding: '14px 16px', borderBottom: '1px solid var(--border-color)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>Notifications</span>
            {unreadCount > 0 && (
              <span style={{
                padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600,
                background: 'rgba(239,68,68,0.15)', color: '#ef4444',
              }}>
                {unreadCount} new
              </span>
            )}
          </div>

          {notifications.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              No notifications
            </div>
          ) : (
            notifications.map((notif) => {
              const config = typeConfig[notif.type] || typeConfig.task_assigned;
              const Icon = config.icon;
              const isRead = readIds.has(notif.id);
              return (
                <div
                  key={notif.id}
                  onClick={() => handleClick(notif)}
                  style={{
                    padding: '10px 12px',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex', gap: '8px', alignItems: 'flex-start',
                    cursor: 'pointer', transition: 'background 0.15s',
                    background: isRead ? 'transparent' : `${config.color}08`,
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-card-hover)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = isRead ? 'transparent' : `${config.color}08`; }}
                >
                  <div style={{
                    width: '26px', height: '26px', borderRadius: '6px',
                    background: `${config.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Icon size={12} style={{ color: config.color }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '11px', color: 'var(--text-primary)', fontWeight: isRead ? 400 : 600,
                      lineHeight: 1.4, marginBottom: '2px',
                      overflow: 'hidden', textOverflow: 'ellipsis',
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
                    }}>
                      {notif.message}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {timeAgo(notif.createdAt)}
                    </div>
                  </div>
                  {!isRead && (
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: config.color, flexShrink: 0, marginTop: '6px' }} />
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
