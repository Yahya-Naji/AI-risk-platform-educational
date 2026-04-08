'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import {
  Users,
  AlertTriangle,
  Shield,
  CheckCircle,
  Clock,
  BarChart3,
  TrendingUp,
  Eye,
  Layers,
  type LucideIcon,
} from 'lucide-react';

interface OverviewData {
  stats: {
    totalUsers: number;
    totalRisks: number;
    totalControls: number;
    totalTasks: number;
    overdueTasks: number;
    fraudCount: number;
    pendingReview: number;
    mitigated: number;
  };
  usersByRole: Record<string, number>;
  usersByDept: Record<string, number>;
  risksByLevel: Record<string, number>;
  risksByCategory: Record<string, number>;
  risksByStatus: Record<string, number>;
  risksByDept: Record<string, number>;
  controlsByAdequacy: Record<string, number>;
  controlsByType: Record<string, number>;
  tasksByStatus: Record<string, number>;
  businessOwnerActivity: {
    id: string;
    name: string;
    department: string;
    risksReported: number;
    tasksAssigned: number;
  }[];
  recentRisks: {
    riskId: string;
    title: string;
    category: string;
    department: string;
    riskLevel: string;
    inherentScore: number;
    status: string;
    reportedBy: string;
    controlCount: number;
    taskCount: number;
    createdAt: string;
  }[];
  heatMap: number[][];
}

const CATEGORY_LABELS: Record<string, string> = {
  OPERATIONAL: 'Operational',
  COMPLIANCE: 'Compliance',
  FINANCIAL: 'Financial',
  STRATEGIC: 'Strategic',
  HR_TALENT: 'HR & Talent',
  IT_CYBER: 'IT & Cyber',
};

const LEVEL_COLORS: Record<string, string> = {
  LOW: '#10b981',
  MEDIUM: '#4ab0de',
  HIGH: '#f59e0b',
  CRITICAL: '#ef4444',
};

const STATUS_LABELS: Record<string, string> = {
  SUBMITTED: 'Submitted',
  IN_REVIEW: 'In Review',
  VALIDATED: 'Validated',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
  MITIGATED: 'Mitigated',
};

const STATUS_COLORS: Record<string, string> = {
  SUBMITTED: '#8b5cf6',
  IN_REVIEW: '#f59e0b',
  VALIDATED: '#10b981',
  ACCEPTED: '#4ab0de',
  REJECTED: '#ef4444',
  MITIGATED: '#10b981',
};

const ROLE_LABELS: Record<string, string> = {
  BUSINESS_OWNER: 'Business Owners',
  RISK_MANAGER: 'Risk Managers',
  ADMIN: 'Administrators',
};

const ROLE_COLORS: Record<string, string> = {
  BUSINESS_OWNER: '#4ab0de',
  RISK_MANAGER: '#8b5cf6',
  ADMIN: '#ef4444',
};

const TASK_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  SUBMITTED: 'Submitted',
  COMPLETED: 'Completed',
  CHANGES_REQUESTED: 'Changes Req.',
  OVERDUE: 'Overdue',
};

const TASK_STATUS_COLORS: Record<string, string> = {
  PENDING: '#6a6a8a',
  IN_PROGRESS: '#f59e0b',
  SUBMITTED: '#8b5cf6',
  COMPLETED: '#10b981',
  CHANGES_REQUESTED: '#ef4444',
  OVERDUE: '#ef4444',
};

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function StatCard({ label, value, color, icon: Icon, sub }: { label: string; value: number | string; color: string; icon: LucideIcon; sub?: string }) {
  return (
    <div className="risk-card" style={{ padding: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
      <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: `${color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={20} style={{ color }} />
      </div>
      <div>
        <div style={{ fontSize: '26px', fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{label}</div>
        {sub && <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '1px' }}>{sub}</div>}
      </div>
    </div>
  );
}

export default function AdminOverviewPage() {
  const router = useRouter();
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/admin/overview');
        const d = await res.json();
        setData(d);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading || !data) {
    return (
      <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-primary)' }}>
        <Sidebar role="admin" />
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading overview...</div>
        </main>
      </div>
    );
  }

  const { stats } = data;

  // Heat map color
  const maxHeat = Math.max(...data.heatMap.flat(), 1);
  const heatColor = (v: number) => {
    if (v === 0) return { bg: 'rgba(42,42,90,0.3)', text: 'var(--text-muted)' };
    const ratio = v / maxHeat;
    if (ratio > 0.7) return { bg: 'rgba(239,68,68,0.35)', text: '#ef4444' };
    if (ratio > 0.4) return { bg: 'rgba(245,158,11,0.3)', text: '#f59e0b' };
    if (ratio > 0.15) return { bg: 'rgba(74,176,222,0.25)', text: '#4ab0de' };
    return { bg: 'rgba(16,185,129,0.2)', text: '#10b981' };
  };

  // Max for bar charts
  const maxRiskByDept = Math.max(...Object.values(data.risksByDept), 1);
  const maxTaskByStatus = Math.max(...Object.values(data.tasksByStatus), 1);

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', overflow: 'hidden' }}>
      <Sidebar role="admin" />

      <main style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {/* Header */}
        <div className="animate-fade-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Admin Overview</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
              Platform-wide view of risks, users, controls, and tasks
            </p>
          </div>
          <button className="btn-secondary" style={{ fontSize: '12px', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={() => {
              import('@/lib/export-pdf').then(({ exportAdminOverviewPDF }) => exportAdminOverviewPDF(data));
            }}>
            <BarChart3 size={14} /> Export PDF
          </button>
        </div>

        {/* Top Stats */}
        <div className="animate-fade-up-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          <StatCard label="Total Users" value={stats.totalUsers} color="#4ab0de" icon={Users} />
          <StatCard label="Total Risks" value={stats.totalRisks} color="#8b5cf6" icon={AlertTriangle} />
          <StatCard label="Pending Review" value={stats.pendingReview} color="#f59e0b" icon={Clock} />
          <StatCard label="Overdue Tasks" value={stats.overdueTasks} color="#ef4444" icon={AlertTriangle} sub={`of ${stats.totalTasks} total tasks`} />
        </div>

        {/* Secondary Stats */}
        <div className="animate-fade-up-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          <StatCard label="Controls" value={stats.totalControls} color="#10b981" icon={Shield} />
          <StatCard label="Tasks" value={stats.totalTasks} color="#4ab0de" icon={CheckCircle} />
          <StatCard label="Mitigated" value={stats.mitigated} color="#10b981" icon={TrendingUp} />
          <StatCard label="Fraud Risks" value={stats.fraudCount} color="#ef4444" icon={AlertTriangle} />
        </div>

        {/* Row: Risk Heat Map + Users by Role + Risks by Level */}
        <div className="animate-fade-up-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
          {/* Heat Map */}
          <div className="risk-card" style={{ padding: '18px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={14} style={{ color: '#8b5cf6' }} /> Risk Heat Map
            </div>
            <div style={{ display: 'flex', gap: '3px', flexDirection: 'column' }}>
              <div style={{ display: 'flex', gap: '3px', marginLeft: '44px' }}>
                {['Rare', 'Unlikely', 'Possible', 'Likely', 'Certain'].map((l) => (
                  <div key={l} style={{ flex: 1, textAlign: 'center', fontSize: '8px', color: 'var(--text-muted)' }}>{l}</div>
                ))}
              </div>
              {data.heatMap.map((row, ri) => (
                <div key={ri} style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                  <div style={{ width: '40px', fontSize: '8px', color: 'var(--text-muted)', textAlign: 'right', paddingRight: '4px' }}>
                    {['Severe', 'Major', 'Moderate', 'Minor', 'Negligible'][ri]}
                  </div>
                  {row.map((v, ci) => {
                    const c = heatColor(v);
                    return (
                      <div key={ci} style={{ flex: 1, aspectRatio: '1', borderRadius: '4px', background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: c.text }}>{v || ''}</span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Users by Role */}
          <div className="risk-card" style={{ padding: '18px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={14} style={{ color: '#4ab0de' }} /> Users by Role
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {Object.entries(data.usersByRole).map(([role, count]) => (
                <div key={role}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{ROLE_LABELS[role] || role}</span>
                    <span style={{ fontWeight: 700, color: ROLE_COLORS[role] || '#4ab0de' }}>{count}</span>
                  </div>
                  <div style={{ height: '6px', borderRadius: '3px', background: 'var(--bg-secondary)' }}>
                    <div style={{ height: '100%', borderRadius: '3px', width: `${(count / stats.totalUsers) * 100}%`, background: ROLE_COLORS[role] || '#4ab0de', transition: 'width 0.5s' }} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>Departments</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {Object.entries(data.usersByDept).map(([dept, count]) => (
                  <span key={dept} style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '6px', background: 'rgba(74,176,222,0.1)', color: 'var(--text-secondary)' }}>
                    {dept}: {count}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Risks by Level */}
          <div className="risk-card" style={{ padding: '18px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart3 size={14} style={{ color: '#f59e0b' }} /> Risks by Severity
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((level) => {
                const count = data.risksByLevel[level] || 0;
                const color = LEVEL_COLORS[level];
                return (
                  <div key={level}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{level}</span>
                      <span style={{ fontWeight: 700, color }}>{count}</span>
                    </div>
                    <div style={{ height: '6px', borderRadius: '3px', background: 'var(--bg-secondary)' }}>
                      <div style={{ height: '100%', borderRadius: '3px', width: `${(count / Math.max(stats.totalRisks, 1)) * 100}%`, background: color, transition: 'width 0.5s' }} />
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Risk status breakdown */}
            <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>By Status</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {Object.entries(data.risksByStatus).map(([status, count]) => (
                  <span key={status} style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '6px', background: `${STATUS_COLORS[status] || '#4ab0de'}15`, color: STATUS_COLORS[status] || '#4ab0de' }}>
                    {STATUS_LABELS[status] || status}: {count}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Row: Risks by Department + Risks by Category + Task Status */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
          {/* Risks by Department */}
          <div className="risk-card" style={{ padding: '18px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '14px' }}>Risks by Department</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {Object.entries(data.risksByDept)
                .sort((a, b) => b[1] - a[1])
                .map(([dept, count]) => (
                  <div key={dept}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '3px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{dept}</span>
                      <span style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>{count}</span>
                    </div>
                    <div style={{ height: '5px', borderRadius: '3px', background: 'var(--bg-secondary)' }}>
                      <div style={{ height: '100%', borderRadius: '3px', width: `${(count / maxRiskByDept) * 100}%`, background: 'linear-gradient(90deg, #4ab0de, #8b5cf6)' }} />
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Risks by Category */}
          <div className="risk-card" style={{ padding: '18px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '14px' }}>Risks by Category</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {Object.entries(data.risksByCategory)
                .sort((a, b) => b[1] - a[1])
                .map(([cat, count]) => {
                  const colors = ['#4ab0de', '#8b5cf6', '#f59e0b', '#ec4899', '#ef4444', '#10b981'];
                  const idx = Object.keys(data.risksByCategory).indexOf(cat);
                  const color = colors[idx % colors.length];
                  return (
                    <div key={cat}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '3px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>{CATEGORY_LABELS[cat] || cat}</span>
                        <span style={{ fontWeight: 700, color }}>{count}</span>
                      </div>
                      <div style={{ height: '5px', borderRadius: '3px', background: 'var(--bg-secondary)' }}>
                        <div style={{ height: '100%', borderRadius: '3px', width: `${(count / Math.max(stats.totalRisks, 1)) * 100}%`, background: color }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Task Status */}
          <div className="risk-card" style={{ padding: '18px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '14px' }}>Task Status</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {Object.entries(data.tasksByStatus)
                .sort((a, b) => b[1] - a[1])
                .map(([status, count]) => {
                  const color = TASK_STATUS_COLORS[status] || '#4ab0de';
                  return (
                    <div key={status}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '3px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>{TASK_STATUS_LABELS[status] || status}</span>
                        <span style={{ fontWeight: 700, color }}>{count}</span>
                      </div>
                      <div style={{ height: '5px', borderRadius: '3px', background: 'var(--bg-secondary)' }}>
                        <div style={{ height: '100%', borderRadius: '3px', width: `${(count / maxTaskByStatus) * 100}%`, background: color }} />
                      </div>
                    </div>
                  );
                })}
            </div>
            {/* Control adequacy */}
            <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>Control Adequacy</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {Object.entries(data.controlsByAdequacy).map(([adeq, count]) => {
                  const c = adeq === 'Adequate' ? '#10b981' : adeq === 'Needs Improvement' ? '#f59e0b' : '#ef4444';
                  return (
                    <span key={adeq} style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '6px', background: `${c}15`, color: c }}>
                      {adeq}: {count}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Business Owner Activity */}
        <div className="risk-card" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={14} style={{ color: '#4ab0de' }} /> Business Owner Activity
            </div>
            <button onClick={() => router.push('/admin/users')} style={{ fontSize: '11px', color: 'var(--accent-cyan)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              View All Users <Eye size={11} />
            </button>
          </div>
          {data.businessOwnerActivity.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>No business owners found.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="risk-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Department</th>
                    <th>Risks Reported</th>
                    <th>Tasks Assigned</th>
                  </tr>
                </thead>
                <tbody>
                  {data.businessOwnerActivity.map((bo) => (
                    <tr key={bo.id}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{bo.name}</td>
                      <td>{bo.department}</td>
                      <td>
                        <span style={{ fontWeight: 700, color: bo.risksReported > 0 ? '#8b5cf6' : 'var(--text-muted)' }}>
                          {bo.risksReported}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: bo.tasksAssigned > 0 ? '#4ab0de' : 'var(--text-muted)' }}>
                          {bo.tasksAssigned}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Risk Registry */}
        <div className="risk-card" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={14} style={{ color: '#f59e0b' }} /> Recent Risk Registry
            </div>
            <button onClick={() => router.push('/risk-manager/registry')} style={{ fontSize: '11px', color: 'var(--accent-cyan)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              View Full Registry <Eye size={11} />
            </button>
          </div>
          {data.recentRisks.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>No risks found.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="risk-table">
                <thead>
                  <tr>
                    <th>Risk ID</th>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Department</th>
                    <th>Score</th>
                    <th>Level</th>
                    <th>Status</th>
                    <th>Reported By</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentRisks.map((r) => {
                    const levelColor = LEVEL_COLORS[r.riskLevel] || '#4ab0de';
                    const statusColor = STATUS_COLORS[r.status] || '#4ab0de';
                    return (
                      <tr key={r.riskId} onClick={() => router.push(`/risk-manager/review/${r.riskId}`)}>
                        <td>
                          <span style={{ color: 'var(--accent-cyan)', fontWeight: 600, fontSize: '12px' }}>{r.riskId}</span>
                        </td>
                        <td style={{ fontWeight: 500, color: 'var(--text-primary)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.title}
                        </td>
                        <td style={{ fontSize: '12px' }}>{CATEGORY_LABELS[r.category] || r.category}</td>
                        <td style={{ fontSize: '12px' }}>{r.department}</td>
                        <td>
                          <span style={{ fontWeight: 800, color: levelColor }}>{r.inherentScore}</span>
                        </td>
                        <td>
                          <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '5px', background: `${levelColor}18`, color: levelColor }}>
                            {r.riskLevel}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '5px', background: `${statusColor}18`, color: statusColor }}>
                            {STATUS_LABELS[r.status] || r.status}
                          </span>
                        </td>
                        <td style={{ fontSize: '12px' }}>{r.reportedBy}</td>
                        <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatDate(r.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
