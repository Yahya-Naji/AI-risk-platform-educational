'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import {
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  CircleCheck,
  ClipboardList,
  Zap,
  MessageSquare,
  Bot,
  AlertCircle,
  Paperclip,
  ArrowRight,
  Plus,
  ArrowUpDown,
} from 'lucide-react';

type TabKey = 'all' | 'overdue' | 'changes' | 'inprogress' | 'completed' | 'submitted' | 'pending';

interface DashboardData {
  user: {
    id: string;
    name: string;
    role: string;
    department: string;
    company: string;
    group: string;
    avatar: string;
  };
  stats: {
    totalTasks: number;
    overdue: number;
    changesRequested: number;
    inProgress: number;
    completed: number;
    submitted: number;
    pending: number;
  };
  tasks: Array<{
    id: string;
    taskId: string;
    title: string;
    status: string;
    dueDate: string | null;
    isOverdue: boolean;
    evidenceCount: number;
    controlType: string | null;
    linkedRisk: { riskId: string; title: string } | null;
  }>;
  highPriorityRisks: Array<{
    id: string;
    riskId: string;
    title: string;
    inherentScore: number;
    riskLevel: string;
    controlCount: number;
  }>;
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

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    OVERDUE: 'Overdue',
    CHANGES_REQUESTED: 'Changes',
    IN_PROGRESS: 'In Progress',
    SUBMITTED: 'Submitted',
    COMPLETED: 'Completed',
    PENDING: 'Pending',
  };
  return map[status] || status;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function BusinessOwnerDashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
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
        const dashRes = await fetch(`/api/business-owner/dashboard?userId=${user.id}`);
        const dashData = await dashRes.json();
        setData(dashData);
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading || !data) {
    return (
      <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-primary)' }}>
        <Sidebar role="business-owner" />
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading dashboard...</div>
        </main>
      </div>
    );
  }

  const { user, stats, tasks, highPriorityRisks } = data;

  const filteredTasks = (activeTab === 'all'
    ? tasks
    : tasks.filter((t) => {
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
        <div className="animate-fade-up" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0, lineHeight: 1.2 }}>My Dashboard</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
              Welcome back, {user.name.split(' ')[0]} &middot; Here&apos;s your task overview
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link href="/business-owner/report-risk" style={{ textDecoration: 'none' }}>
              <button className="btn-primary"><Plus size={15} /> Report New Risk</button>
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '38px', height: '38px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #4ab0de 0%, #8b5cf6 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: '13px', color: '#fff',
                }}
              >
                {user.avatar}
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600 }}>{user.name}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{user.department.replace(' Department', ' Lead')}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Overdue Alert */}
        {stats.overdue > 0 && (
          <div
            className="animate-fade-up-1"
            style={{
              background: 'linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(239,68,68,0.08) 100%)',
              border: '1px solid rgba(239,68,68,0.35)',
              borderRadius: '12px',
              padding: '12px 18px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertTriangle size={20} color="#ef4444" />
              <div>
                <span style={{ fontWeight: 600, color: '#ef4444', fontSize: '14px' }}>{stats.overdue} Tasks Overdue</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '13px', marginLeft: '8px' }}>
                  You have tasks past their due date that require immediate attention
                </span>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('overdue')}
              style={{
                background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)',
                color: '#ef4444', padding: '6px 14px', borderRadius: '8px',
                fontSize: '12px', fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              View Overdue Tasks
            </button>
          </div>
        )}

        {/* Stats Grid */}
        <div className="animate-fade-up-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
          {[
            { label: 'Total Tasks', value: stats.totalTasks, Icon: CheckCircle, color: '#4ab0de', bg: 'rgba(74,176,222,0.1)', tab: 'all' as TabKey },
            { label: 'Overdue', value: stats.overdue, Icon: AlertCircle, color: '#ef4444', bg: 'rgba(239,68,68,0.12)', tab: 'overdue' as TabKey },
            { label: 'Changes Requested', value: stats.changesRequested, Icon: RefreshCw, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', tab: 'changes' as TabKey },
            { label: 'Completed', value: stats.completed + stats.submitted, Icon: CircleCheck, color: '#10b981', bg: 'rgba(16,185,129,0.1)', tab: 'completed' as TabKey },
          ].map((stat) => (
            <div key={stat.label} className="risk-card"
              onClick={() => setActiveTab(stat.tab)}
              style={{
                padding: '18px', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', transition: 'all 0.2s',
                borderColor: activeTab === stat.tab ? stat.color : undefined,
                boxShadow: activeTab === stat.tab ? `0 0 20px ${stat.color}25` : undefined,
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLDivElement).style.borderColor = stat.color; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'none'; if (activeTab !== stat.tab) (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-color)'; }}
            >
              <div
                style={{
                  width: '42px', height: '42px', borderRadius: '12px', background: stat.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}
              >
                <stat.Icon size={20} color={stat.color} />
              </div>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: stat.color, lineHeight: 1 }}>{stat.value}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Main Grid: Tasks + Sidebar */}
        <div className="animate-fade-up-3" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', alignItems: 'start' }}>
          {/* Tasks Card */}
          <div className="risk-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 18px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ClipboardList size={16} style={{ opacity: 0.7 }} /> My Pending Tasks
              </h2>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Sorted by priority</span>
            </div>
            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
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
                  {filteredTasks.map((task) => (
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
                        {task.controlType && (
                          <span
                            style={{
                              fontSize: '11px', padding: '3px 8px', borderRadius: '6px',
                              background: task.controlType === 'PREVENTIVE' ? 'rgba(139,92,246,0.15)' : 'rgba(74,176,222,0.15)',
                              color: task.controlType === 'PREVENTIVE' ? 'var(--accent-purple)' : 'var(--accent-cyan)',
                            }}
                          >
                            {task.controlType === 'PREVENTIVE' ? 'Preventive' : 'Detective'}
                          </span>
                        )}
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {task.linkedRisk ? `${task.linkedRisk.riskId} ${task.linkedRisk.title}` : '—'}
                      </td>
                      <td>
                        <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', fontWeight: 500, ...statusStyle(task.status) }}>
                          {statusLabel(task.status)}
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
                          className={task.status === 'SUBMITTED' ? 'btn-secondary' : 'btn-primary'}
                          style={{ padding: '5px 12px', fontSize: '12px' }}
                          onClick={() => router.push(`/business-owner/tasks/${task.taskId}`)}
                        >
                          {task.status === 'SUBMITTED' ? 'View' : 'Open'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Quick Actions */}
            <div className="risk-card" style={{ padding: '18px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={15} style={{ opacity: 0.7 }} /> Quick Actions
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <Link href="/business-owner/report-risk" style={{ textDecoration: 'none' }}>
                  <div
                    style={{
                      padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)',
                      background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', gap: '12px',
                      cursor: 'pointer', transition: 'border-color 0.2s',
                    }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = 'var(--accent-cyan)')}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-color)')}
                  >
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <MessageSquare size={18} color="#8b5cf6" />
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Report New Risk</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Use AI to identify & report risks</div>
                    </div>
                    <ArrowRight size={14} style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} />
                  </div>
                </Link>
                <Link href="/business-owner/assistant" style={{ textDecoration: 'none' }}>
                  <div
                    style={{
                      padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)',
                      background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', gap: '12px',
                      cursor: 'pointer', transition: 'border-color 0.2s',
                    }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = 'var(--accent-cyan)')}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-color)')}
                  >
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(74,176,222,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Bot size={18} color="#4ab0de" />
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Ask AI Assistant</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Get help with tasks & risks</div>
                    </div>
                    <ArrowRight size={14} style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} />
                  </div>
                </Link>
              </div>
            </div>

            {/* High Priority Risks */}
            <div className="risk-card" style={{ padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={15} color="#ef4444" /> High Priority Risks
                </h3>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Your department</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {highPriorityRisks.map((risk) => (
                  <div
                    key={risk.id}
                    style={{
                      padding: '12px', background: 'var(--bg-primary)', borderRadius: '8px',
                      border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center',
                      justifyContent: 'space-between', gap: '10px',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '11px', color: risk.riskLevel === 'HIGH' ? '#ef4444' : '#f59e0b', fontWeight: 600, marginBottom: '2px' }}>
                        {risk.riskId}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 500 }}>{risk.title}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {risk.controlCount} control{risk.controlCount !== 1 ? 's' : ''} assigned to you
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div
                        style={{
                          width: '36px', height: '36px', borderRadius: '10px',
                          background: risk.inherentScore >= 15 ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                          color: risk.inherentScore >= 15 ? '#ef4444' : '#f59e0b',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 800, fontSize: '16px',
                        }}
                      >
                        {risk.inherentScore}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
