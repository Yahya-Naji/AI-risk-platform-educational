'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import {
  CheckCircle,
  AlertCircle,
  Clock,
  CircleCheck,
  Paperclip,
  AlertTriangle,
  Eye,
  ArrowUpDown,
} from 'lucide-react';

type TabKey = 'all' | 'submitted' | 'changes' | 'completed';

interface TaskItem {
  id: string;
  taskId: string;
  title: string;
  status: string;
  dueDate: string | null;
  isOverdue: boolean;
  evidenceCount: number;
  effectiveness: string | null;
  gaps: string | null;
  recommendations: string | null;
  risk: { riskId: string; title: string; category: string; department: string; riskLevel: string } | null;
  control: { controlId: string; type: string } | null;
  assignedTo: { id: string; name: string; avatar: string } | null;
}

function statusStyle(status: string): React.CSSProperties {
  const map: Record<string, React.CSSProperties> = {
    OVERDUE: { background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' },
    CHANGES_REQUESTED: { background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' },
    IN_PROGRESS: { background: 'rgba(74,176,222,0.15)', color: '#4ab0de', border: '1px solid rgba(74,176,222,0.3)' },
    SUBMITTED: { background: 'rgba(139,92,246,0.15)', color: '#8b5cf6', border: '1px solid rgba(139,92,246,0.3)' },
    COMPLETED: { background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' },
    PENDING: { background: 'rgba(106,106,138,0.15)', color: '#6a6a8a', border: '1px solid rgba(106,106,138,0.3)' },
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

const controlTypeLabel: Record<string, string> = {
  PREVENTIVE: 'Preventive',
  DETECTIVE: 'Detective',
  CORRECTIVE: 'Corrective',
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function RMTaskReviewPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [sortField, setSortField] = useState<string>('dueDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const toggleSort = (field: string) => { if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortField(field); setSortDir('asc'); } };

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/risk-manager/tasks');
        const data = await res.json();
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
        <Sidebar role="risk-manager" />
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading tasks...</div>
        </main>
      </div>
    );
  }

  const counts = {
    all: tasks.length,
    submitted: tasks.filter(t => t.status === 'SUBMITTED').length,
    changes: tasks.filter(t => t.status === 'CHANGES_REQUESTED').length,
    completed: tasks.filter(t => t.status === 'COMPLETED').length,
  };

  const filtered = (activeTab === 'all'
    ? tasks
    : tasks.filter(t => {
        const map: Record<string, string[]> = {
          submitted: ['SUBMITTED'],
          changes: ['CHANGES_REQUESTED'],
          completed: ['COMPLETED'],
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
      <Sidebar role="risk-manager" />

      <main style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Header */}
        <div className="animate-fade-up">
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0, lineHeight: 1.2 }}>Task Review</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
            Review and validate tasks submitted by business owners
          </p>
        </div>

        {/* Stats (clickable filters) */}
        <div className="animate-fade-up-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          {[
            { key: 'all' as TabKey, label: 'Total', value: counts.all, color: '#4ab0de', Icon: CheckCircle },
            { key: 'submitted' as TabKey, label: 'Awaiting Review', value: counts.submitted, color: '#8b5cf6', Icon: Clock },
            { key: 'changes' as TabKey, label: 'Changes Requested', value: counts.changes, color: '#f59e0b', Icon: AlertCircle },
            { key: 'completed' as TabKey, label: 'Completed', value: counts.completed, color: '#10b981', Icon: CircleCheck },
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
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: `${stat.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <stat.Icon size={18} color={stat.color} />
              </div>
              <div>
                <div style={{ fontSize: '22px', fontWeight: 700, color: stat.color, lineHeight: 1 }}>{stat.value}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="risk-card animate-fade-up-2" style={{ padding: 0, overflow: 'hidden' }}>
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
                      { key: '', label: 'ASSIGNED TO' },
                      { key: '', label: 'LINKED RISK' },
                      { key: '', label: 'CONTROL' },
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
                    <tr key={task.id}>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--accent-cyan)', fontWeight: 600 }}>{task.taskId}</span>
                          <span style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: '13px' }}>{task.title}</span>
                        </div>
                      </td>
                      <td>
                        {task.assignedTo ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'linear-gradient(135deg, #4ab0de, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                              {task.assignedTo.avatar || task.assignedTo.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{task.assignedTo.name}</span>
                          </div>
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {task.risk ? (
                          <div>
                            <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>{task.risk.riskId}</span>
                            <span style={{ color: 'var(--text-muted)', marginLeft: '4px' }}>{task.risk.title.length > 30 ? task.risk.title.slice(0, 30) + '...' : task.risk.title}</span>
                          </div>
                        ) : '—'}
                      </td>
                      <td>
                        {task.control ? (
                          <span style={{
                            fontSize: '11px', padding: '3px 8px', borderRadius: '6px',
                            background: task.control.type === 'PREVENTIVE' ? 'rgba(139,92,246,0.15)' : 'rgba(74,176,222,0.15)',
                            color: task.control.type === 'PREVENTIVE' ? 'var(--accent-purple)' : 'var(--accent-cyan)',
                          }}>
                            {controlTypeLabel[task.control.type] || task.control.type}
                          </span>
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
                          className={task.status === 'SUBMITTED' ? 'btn-primary' : 'btn-secondary'}
                          style={{ padding: '5px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                          onClick={() => router.push(`/risk-manager/tasks/${task.taskId}`)}
                        >
                          <Eye size={12} /> {task.status === 'SUBMITTED' ? 'Review' : 'View'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div style={{ padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Showing {filtered.length} of {tasks.length} tasks</span>
          </div>
        </div>
      </main>
    </div>
  );
}
