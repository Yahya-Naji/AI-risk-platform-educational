'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import {
  Users, AlertTriangle, Shield, CheckCircle, Clock, BarChart3,
  TrendingUp, Eye, Layers, Building2, X, ChevronRight, Download, type LucideIcon,
} from 'lucide-react';

interface RMPerformance {
  id: string; name: string; avatar: string; email: string;
  department: string; company: string;
  totalAssigned: number; validated: number; pending: number; overdue: number;
  tasks: number; joinedAt: string;
}

interface DashboardData {
  orgFilters: { companies: string[]; departments: string[] };
  stats: {
    totalRiskManagers: number; totalBusinessOwners: number; totalRisks: number;
    totalControls: number; totalTasks: number; pendingReview: number;
    overdueTasks: number; mitigated: number; fraudCount: number;
  };
  rmPerformance: RMPerformance[];
  heatMap: number[][];
  byCategory: Record<string, number>;
  byDepartment: Record<string, number>;
  byLevel: Record<string, number>;
  byStatus: Record<string, number>;
  controlAdequacy: { effective: number; partiallyEffective: number; ineffective: number; notAssessed: number; total: number };
  recentRisks: {
    riskId: string; title: string; category: string; department: string;
    riskLevel: string; inherentScore: number; status: string;
    reportedBy: string; assignedTo: string; controlCount: number; taskCount: number; createdAt: string;
  }[];
  boActivity: { id: string; name: string; avatar: string; department: string; company: string; risksReported: number; tasks: number }[];
  fraudByCategory: Record<string, number>;
}

const CATEGORY_LABELS: Record<string, string> = {
  OPERATIONAL: 'Operational', COMPLIANCE: 'Compliance', FINANCIAL: 'Financial',
  STRATEGIC: 'Strategic', HR_TALENT: 'HR & Talent', IT_CYBER: 'IT/Cyber',
};
const LEVEL_COLORS: Record<string, string> = { CRITICAL: '#ef4444', HIGH: '#f59e0b', MEDIUM: '#4ab0de', LOW: '#10b981' };
const STATUS_LABELS: Record<string, string> = {
  SUBMITTED: 'New', IN_REVIEW: 'In Review', VALIDATED: 'Validated',
  ACCEPTED: 'Accepted', REJECTED: 'Rejected', MITIGATED: 'Mitigated',
};
const STATUS_COLORS: Record<string, string> = {
  SUBMITTED: '#8b5cf6', IN_REVIEW: '#f59e0b', VALIDATED: '#10b981',
  ACCEPTED: '#4ab0de', REJECTED: '#ef4444', MITIGATED: '#10b981',
};

function getHeatColor(l: number, i: number): string {
  const s = l * i;
  if (s >= 20) return '#ef4444'; if (s >= 12) return '#f59e0b'; if (s >= 6) return '#4ab0de'; return '#10b981';
}
function getHeatBg(l: number, i: number): string {
  const s = l * i;
  if (s >= 20) return 'rgba(239,68,68,0.3)'; if (s >= 12) return 'rgba(245,158,11,0.25)'; if (s >= 6) return 'rgba(74,176,222,0.2)'; return 'rgba(16,185,129,0.15)';
}

function StatCard({ label, value, color, icon: Icon, active, onClick }: { label: string; value: number; color: string; icon: LucideIcon; active?: boolean; onClick?: () => void }) {
  return (
    <div className="risk-card" onClick={onClick}
      style={{ padding: '18px', display: 'flex', alignItems: 'center', gap: '14px', cursor: onClick ? 'pointer' : 'default', transition: 'all 0.2s', borderColor: active ? color : undefined, boxShadow: active ? `0 0 20px ${color}25` : undefined }}
      onMouseEnter={(e) => { if (onClick) { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLDivElement).style.borderColor = color; } }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'none'; if (!active) (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-color)'; }}
    >
      <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={20} style={{ color }} />
      </div>
      <div>
        <div style={{ fontSize: '24px', fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>{label}</div>
      </div>
    </div>
  );
}

export default function ChiefRiskManagerDashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterCompany, setFilterCompany] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [highlight, setHighlight] = useState<string | null>(null);
  const toggleHL = (v: string) => setHighlight((p) => p === v ? null : v);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterCompany) params.set('company', filterCompany);
    if (filterDept) params.set('department', filterDept);
    try {
      const res = await fetch(`/api/chief-risk-manager/dashboard?${params}`);
      setData(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [filterCompany, filterDept]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const clearFilters = () => { setFilterCompany(''); setFilterDept(''); };
  const hasFilters = filterCompany || filterDept;

  if (loading || !data) {
    return (
      <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-primary)' }}>
        <Sidebar role="chief-risk-manager" />
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading dashboard...</div>
        </main>
      </div>
    );
  }

  const { stats, fraudByCategory, rmPerformance, heatMap, byCategory, byDepartment, byLevel, controlAdequacy, recentRisks, boActivity } = data;
  const selectStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', background: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '12px',
    color: 'var(--text-primary)', cursor: 'pointer', outline: 'none',
  };
  const ctrlTotal = controlAdequacy.total || 1;

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', overflow: 'hidden' }}>
      <Sidebar role="chief-risk-manager" />

      <main style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {/* Header */}
        <div className="animate-fade-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Chief Risk Manager Dashboard</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
              Manage risk managers, validate workflows, and oversee enterprise risk
            </p>
          </div>
          <button className="btn-secondary" style={{ fontSize: '12px', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={() => { import('@/lib/export-pdf').then(({ exportAdminOverviewPDF }) => exportAdminOverviewPDF(data as never)); }}>
            <Download size={14} /> Export PDF
          </button>
        </div>

        {/* Org Filter */}
        <div className="risk-card" style={{ padding: '14px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building2 size={14} style={{ color: '#4ab0de' }} /> Scope Filter
            </span>
            {hasFilters && (
              <button onClick={clearFilters} style={{ padding: '4px 10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', fontSize: '11px', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <X size={10} /> Clear
              </button>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>Company</div>
              <select value={filterCompany} onChange={(e) => { setFilterCompany(e.target.value); setFilterDept(''); }} style={selectStyle}>
                <option value="">All Companies</option>
                {data.orgFilters.companies.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>Department</div>
              <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)} style={selectStyle}>
                <option value="">All Departments</option>
                {data.orgFilters.departments.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
          {hasFilters && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Viewing:</span>
              {filterCompany && <span style={{ padding: '3px 8px', background: 'rgba(139,92,246,0.1)', borderRadius: '4px', fontSize: '11px', color: '#8b5cf6' }}>{filterCompany}</span>}
              {filterCompany && filterDept && <ChevronRight size={10} style={{ color: 'var(--text-muted)' }} />}
              {filterDept && <span style={{ padding: '3px 8px', background: 'rgba(245,158,11,0.1)', borderRadius: '4px', fontSize: '11px', color: '#f59e0b' }}>{filterDept}</span>}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="animate-fade-up-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
          <StatCard label="Risk Managers" value={stats.totalRiskManagers} color="#8b5cf6" icon={Users} active={highlight === 'rm'} onClick={() => toggleHL('rm')} />
          <StatCard label="Total Risks" value={stats.totalRisks} color="#4ab0de" icon={BarChart3} active={!highlight} onClick={() => setHighlight(null)} />
          <StatCard label="Pending Review" value={stats.pendingReview} color="#f59e0b" icon={Clock} active={highlight === 'pending'} onClick={() => toggleHL('pending')} />
          <StatCard label="Overdue Tasks" value={stats.overdueTasks} color="#ef4444" icon={AlertTriangle} active={highlight === 'overdue'} onClick={() => toggleHL('overdue')} />
          <StatCard label="Mitigated" value={stats.mitigated} color="#10b981" icon={CheckCircle} active={highlight === 'mitigated'} onClick={() => toggleHL('mitigated')} />
        </div>

        {/* Fraud Risks */}
        {stats.fraudCount > 0 && fraudByCategory && Object.keys(fraudByCategory).length > 0 && (
          <div className="risk-card" style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={16} style={{ color: '#ef4444' }} /> Fraud Risks
              </span>
              <span style={{ fontSize: '20px', fontWeight: 700, color: '#ef4444' }}>{stats.fraudCount}</span>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
              {Object.entries(fraudByCategory).map(([cat, count], idx) => {
                const colors = ['#ef4444', '#f59e0b', '#8b5cf6', '#4ab0de'];
                const color = colors[idx % colors.length];
                return (
                  <div key={cat} style={{ flex: 1, minWidth: '120px', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: color, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: '12px', color: 'var(--text-secondary)' }}>{cat}</span>
                    <span style={{ fontSize: '16px', fontWeight: 700, color }}>{count}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
              {Object.entries(fraudByCategory).map(([cat, count], idx) => {
                const colors = ['#ef4444', '#f59e0b', '#8b5cf6', '#4ab0de'];
                return (
                  <div key={cat} style={{ width: `${(count / stats.fraudCount) * 100}%`, height: '100%', background: colors[idx % colors.length] }} />
                );
              })}
            </div>
          </div>
        )}

        {/* Risk Manager Performance Table */}
        <div className="risk-card" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={14} style={{ color: '#8b5cf6' }} /> Risk Manager Performance
            </h3>
            <button onClick={() => router.push('/risk-manager/registry')} className="btn-secondary" style={{ fontSize: '11px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              Full Registry <Eye size={10} />
            </button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="risk-table">
              <thead>
                <tr>
                  <th>Risk Manager</th>
                  <th>Department</th>
                  <th style={{ textAlign: 'center' }}>Assigned</th>
                  <th style={{ textAlign: 'center' }}>Validated</th>
                  <th style={{ textAlign: 'center' }}>Pending</th>
                  <th style={{ textAlign: 'center' }}>Tasks</th>
                  <th style={{ textAlign: 'center' }}>Overdue</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rmPerformance.map((rm) => (
                  <tr key={rm.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #8b5cf6, #4ab0de)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                          {rm.avatar || rm.name.split(' ').map((n) => n[0]).join('')}
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600 }}>{rm.name}</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{rm.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: '12px' }}>{rm.department}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{rm.totalAssigned}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600, color: '#10b981' }}>{rm.validated}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600, color: '#f59e0b' }}>{rm.pending}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{rm.tasks}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, background: rm.overdue > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)', color: rm.overdue > 0 ? '#ef4444' : '#10b981' }}>
                        {rm.overdue}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        fontSize: '10px', fontWeight: 600, padding: '3px 10px', borderRadius: '4px',
                        background: rm.overdue > 2 ? 'rgba(239,68,68,0.15)' : rm.overdue > 0 ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)',
                        color: rm.overdue > 2 ? '#ef4444' : rm.overdue > 0 ? '#f59e0b' : '#10b981',
                      }}>
                        {rm.overdue > 2 ? 'Escalated' : rm.overdue > 0 ? 'At Risk' : 'On Track'}
                      </span>
                    </td>
                  </tr>
                ))}
                {rmPerformance.length === 0 && (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>No risk managers found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Heat Map + Control Adequacy + By Level */}
        <div className="animate-fade-up-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
          {/* Heat Map */}
          <div className="risk-card" style={{ padding: '18px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={14} style={{ color: '#8b5cf6' }} /> Risk Heat Map
            </h3>
            <div style={{ display: 'flex', gap: '3px', flexDirection: 'column' }}>
              {[5, 4, 3, 2, 1].map((li) => (
                <div key={li} style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                  <div style={{ width: '16px', fontSize: '9px', color: 'var(--text-muted)', textAlign: 'center' }}>{li}</div>
                  {[1, 2, 3, 4, 5].map((imp) => {
                    const count = heatMap[5 - li]?.[imp - 1] || 0;
                    return (
                      <div key={`${li}-${imp}`} style={{
                        flex: 1, aspectRatio: '1', borderRadius: '4px',
                        background: count > 0 ? getHeatBg(li, imp) : 'rgba(42,42,90,0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '11px', fontWeight: 700, color: count > 0 ? getHeatColor(li, imp) : 'transparent',
                        cursor: count > 0 ? 'pointer' : 'default',
                      }}>
                        {count > 0 ? count : ''}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Control Adequacy */}
          <div className="risk-card" style={{ padding: '18px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 12px' }}>Control Adequacy</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { label: 'Effective', val: controlAdequacy.effective, color: '#10b981' },
                { label: 'Partially Effective', val: controlAdequacy.partiallyEffective, color: '#f59e0b' },
                { label: 'Ineffective', val: controlAdequacy.ineffective, color: '#ef4444' },
                { label: 'Not Assessed', val: controlAdequacy.notAssessed, color: '#6a6a8a' },
              ].map((i) => (
                <div key={i.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{i.label}</span>
                    <span style={{ fontWeight: 700, color: i.color }}>{Math.round((i.val / ctrlTotal) * 100)}%</span>
                  </div>
                  <div style={{ height: '6px', borderRadius: '3px', background: 'var(--bg-secondary)' }}>
                    <div style={{ height: '100%', borderRadius: '3px', width: `${(i.val / ctrlTotal) * 100}%`, background: i.color, transition: 'width 0.5s' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* By Risk Level */}
          <div className="risk-card" style={{ padding: '18px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 12px' }}>Risks by Severity</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((level) => {
                const count = byLevel[level] || 0;
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
            <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>By Status</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {Object.entries(data.byStatus).map(([status, count]) => (
                  <span key={status} style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '6px', background: `${STATUS_COLORS[status] || '#4ab0de'}15`, color: STATUS_COLORS[status] || '#4ab0de' }}>
                    {STATUS_LABELS[status] || status}: {count}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Business Owner Activity */}
        <div className="risk-card" style={{ padding: '18px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={14} style={{ color: '#4ab0de' }} /> Business Owner Activity
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table className="risk-table">
              <thead>
                <tr><th>Name</th><th>Department</th><th>Company</th><th style={{ textAlign: 'center' }}>Risks Reported</th><th style={{ textAlign: 'center' }}>Tasks</th></tr>
              </thead>
              <tbody>
                {boActivity.slice(0, 8).map((bo) => (
                  <tr key={bo.id}>
                    <td style={{ fontWeight: 600 }}>{bo.name}</td>
                    <td>{bo.department}</td>
                    <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{bo.company}</td>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: bo.risksReported > 0 ? '#8b5cf6' : 'var(--text-muted)' }}>{bo.risksReported}</td>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: bo.tasks > 0 ? '#4ab0de' : 'var(--text-muted)' }}>{bo.tasks}</td>
                  </tr>
                ))}
                {boActivity.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>No business owners found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Risks */}
        <div className="risk-card" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>Recent Risk Registry</h3>
            <button onClick={() => router.push('/risk-manager/registry')} className="btn-secondary" style={{ fontSize: '11px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              Full Registry <Eye size={10} />
            </button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="risk-table">
              <thead>
                <tr>
                  <th>Risk ID</th><th>Title</th><th>Category</th><th>Dept</th>
                  <th>Score</th><th>Level</th><th>Status</th><th>Assigned To</th>
                </tr>
              </thead>
              <tbody>
                {recentRisks.filter((r) => {
                  if (!highlight) return true;
                  if (highlight === 'pending') return r.status === 'SUBMITTED' || r.status === 'IN_REVIEW';
                  if (highlight === 'mitigated') return r.status === 'MITIGATED';
                  if (highlight === 'overdue') return r.status === 'SUBMITTED' || r.status === 'IN_REVIEW';
                  if (highlight === 'rm') return true;
                  return true;
                }).map((r) => {
                  const lc = LEVEL_COLORS[r.riskLevel] || '#4ab0de';
                  const sc = STATUS_COLORS[r.status] || '#4ab0de';
                  return (
                    <tr key={r.riskId} style={{ cursor: 'pointer' }} onClick={() => router.push(`/risk-manager/review/${r.riskId}`)}>
                      <td><span style={{ color: '#4ab0de', fontWeight: 600, fontSize: '12px' }}>{r.riskId}</span></td>
                      <td style={{ fontWeight: 500, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</td>
                      <td style={{ fontSize: '12px' }}>{CATEGORY_LABELS[r.category] || r.category}</td>
                      <td style={{ fontSize: '12px' }}>{r.department}</td>
                      <td><span style={{ fontWeight: 800, color: lc }}>{r.inherentScore}</span></td>
                      <td><span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '5px', background: `${lc}18`, color: lc }}>{r.riskLevel}</span></td>
                      <td><span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '5px', background: `${sc}18`, color: sc }}>{STATUS_LABELS[r.status] || r.status}</span></td>
                      <td style={{ fontSize: '12px' }}>{r.assignedTo}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
