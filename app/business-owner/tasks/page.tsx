'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import {
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Clock,
  CircleCheck,
  Paperclip,
  AlertTriangle,
  ArrowUpDown,
} from 'lucide-react';

type TabKey = 'all' | 'overdue' | 'changes' | 'inprogress' | 'completed' | 'pending';

interface TaskItem {
  id: string;
  taskId: string;
  title: string;
  status: string;
  dueDate: string | null;
  isOverdue: boolean;
  evidenceCount: number;
  risk: { riskId: string; title: string } | null;
  control: { type: string } | null;
}

function statusStyle(status: string): React.CSSProperties {
  const map: Record<string, React.CSSProperties> = {
    OVERDUE: { background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' },
    CHANGES_REQUESTED: { background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' },
    IN_PROGRESS: { background: 'rgba(74,176,222,0.15)', color: '#4ab0de', border: '1px solid rgba(74,176,222,0.3)' },
    SUBMITTED: { background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' },
    COMPLETED: { background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' },
    PENDING: { background: 'rgba(139,92,246,0.15)', color: '#8b5cf6', border: '1px solid rgba(139,92,246,0.3)' },
  };
  return map[status] || { background: 'rgba(160,160,192,0.1)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' };
}

const statusLabel: Record<string, string> = {
  OVERDUE: 'Overdue',
  CHANGES_REQUESTED: 'Changes Requested',
  IN_PROGRESS: 'In Progress',
  SUBMITTED: 'Submitted',
  COMPLETED: 'Completed',
  PENDING: 'Pending',
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function MyTasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [sortField, setSortField] = useState<string>('dueDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const toggleSort = (field: string) => { if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortField(field); setSortDir('asc'); } };

  useEffect(() => {
    async function load() {
      try {
        const userRes = await fetch('/api/users?email=ahmed.mansouri@hei-adpu.ae');
        const user = await userRes.json();
        const tasksRes = await fetch(`/api/business-owner/tasks?userId=${user.id}`);
        const data = await tasksRes.json();
        setTasks(data);
      } catch (err) {
        console.error('Failed to load tasks:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-primary)' }}>
        <Sidebar role="business-owner" />
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading tasks...</div>
        </main>
      </div>
    );
  }

  const counts = {
    all: tasks.length,
    overdue: tasks.filter(t => t.status === 'OVERDUE').length,
    changes: tasks.filter(t => t.status === 'CHANGES_REQUESTED').length,
    inprogress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
    completed: tasks.filter(t => t.status === 'COMPLETED' || t.status === 'SUBMITTED').length,
    pending: tasks.filter(t => t.status === 'PENDING').length,
  };

  const filtered = (activeTab === 'all'
    ? tasks
    : tasks.filter(t => {
        const map: Record<string, string[]> = {
          overdue: ['OVERDUE'],
          changes: ['CHANGES_REQUESTED'],
          inprogress: ['IN_PROGRESS'],
          completed: ['COMPLETED', 'SUBMITTED'],
          pending: ['PENDING'],
        };
        return map[activeTab]?.includes(t.status);
      })
  ).sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    if (sortField === 'taskId') return a.taskId.localeCompare(b.taskId) * dir;
    if (sortField === 'title') return a.title.localeCompare(b.title) * dir;
    if (sortField === 'status') return a.status.localeCompare(b.status) * dir;
    if (sortField === 'dueDate') return ((a.dueDate || '') < (b.dueDate || '') ? -1 : 1) * dir;
    if (sortField === 'evidence') return (a.evidenceCount - b.evidenceCount) * dir;
    return 0;
  });

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', overflow: 'hidden' }}>
      <Sidebar role="business-owner" />

      <main style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Header */}
        <div className="animate-fade-up">
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0, lineHeight: 1.2 }}>My Tasks</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
            All tasks assigned to you across your department&apos;s risks
          </p>
        </div>

        {/* Stats (clickable filters) */}
        <div className="animate-fade-up-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
          {[
            { key: 'all' as TabKey, label: 'Total', value: counts.all, color: '#4ab0de', bg: 'rgba(74,176,222,0.1)', Icon: CheckCircle },
            { key: 'overdue' as TabKey, label: 'Overdue', value: counts.overdue, color: '#ef4444', bg: 'rgba(239,68,68,0.12)', Icon: AlertCircle },
            { key: 'changes' as TabKey, label: 'Changes', value: counts.changes, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', Icon: RefreshCw },
            { key: 'inprogress' as TabKey, label: 'In Progress', value: counts.inprogress, color: '#4ab0de', bg: 'rgba(74,176,222,0.1)', Icon: Clock },
            { key: 'completed' as TabKey, label: 'Done', value: counts.completed, color: '#10b981', bg: 'rgba(16,185,129,0.1)', Icon: CircleCheck },
          ].map((stat) => (
            <div key={stat.label} className="risk-card"
              onClick={() => setActiveTab(stat.key)}
              style={{
                padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', transition: 'all 0.2s',
                borderColor: activeTab === stat.key ? stat.color : undefined,
                boxShadow: activeTab === stat.key ? `0 0 20px ${stat.color}25` : undefined,
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLDivElement).style.borderColor = stat.color; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'none'; if (activeTab !== stat.key) (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-color)'; }}
            >
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <stat.Icon size={18} color={stat.color} />
              </div>
              <div>
                <div style={{ fontSize: '22px', fontWeight: 700, color: stat.color, lineHeight: 1 }}>{stat.value}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Table Card */}
        <div className="risk-card animate-fade-up-2" style={{ padding: 0, overflow: 'hidden' }}>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                No tasks in this category.
              </div>
            ) : (
              <table className="risk-table">
                <thead>
                  <tr>
                    {[
                      { key: 'taskId', label: 'TASK' },
                      { key: '', label: 'CONTROL TYPE' },
                      { key: '', label: 'LINKED RISK' },
                      { key: 'status', label: 'STATUS' },
                      { key: 'dueDate', label: 'DUE DATE' },
                      { key: 'evidence', label: 'EVIDENCE' },
                      { key: '', label: 'ACTION' },
                    ].map((col) => (
                      <th key={col.label} onClick={col.key ? () => toggleSort(col.key) : undefined}
                        style={{ cursor: col.key ? 'pointer' : 'default', userSelect: 'none' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          {col.label}
                          {col.key && <ArrowUpDown size={10} style={{ opacity: sortField === col.key ? 1 : 0.3 }} />}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((task) => (
                    <tr
                      key={task.id}
                      style={{ background: hoveredRow === task.id ? 'rgba(74,176,222,0.05)' : 'transparent' }}
                      onMouseEnter={() => setHoveredRow(task.id)}
                      onMouseLeave={() => setHoveredRow(null)}
                      onClick={() => router.push(`/business-owner/tasks/${task.taskId}`)}
                    >
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--accent-cyan)', fontWeight: 600 }}>{task.taskId}</span>
                          <span style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: '13px' }}>{task.title}</span>
                        </div>
                      </td>
                      <td>
                        {task.control?.type && (
                          <span style={{
                            fontSize: '11px', padding: '3px 8px', borderRadius: '6px',
                            background: task.control.type === 'PREVENTIVE' ? 'rgba(139,92,246,0.15)' : 'rgba(74,176,222,0.15)',
                            color: task.control.type === 'PREVENTIVE' ? 'var(--accent-purple)' : 'var(--accent-cyan)',
                          }}>
                            {task.control.type === 'PREVENTIVE' ? 'Preventive' : task.control.type === 'DETECTIVE' ? 'Detective' : 'Corrective'}
                          </span>
                        )}
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {task.risk ? (
                          <span>{task.risk.riskId} &middot; {task.risk.title}</span>
                        ) : '—'}
                      </td>
                      <td>
                        <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', fontWeight: 500, ...statusStyle(task.status) }}>
                          {statusLabel[task.status] || task.status}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '12px', color: task.isOverdue ? '#ef4444' : 'var(--text-secondary)', fontWeight: task.isOverdue ? 600 : 400, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {formatDate(task.dueDate)}
                          {task.isOverdue && <AlertTriangle size={12} color="#ef4444" />}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Paperclip size={12} style={{ opacity: 0.6 }} /> {task.evidenceCount}
                        </span>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <button
                          className={task.status === 'SUBMITTED' || task.status === 'COMPLETED' ? 'btn-secondary' : 'btn-primary'}
                          style={{ padding: '5px 12px', fontSize: '12px' }}
                          onClick={() => router.push(`/business-owner/tasks/${task.taskId}`)}
                        >
                          {task.status === 'SUBMITTED' || task.status === 'COMPLETED' ? 'View' : 'Open'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
