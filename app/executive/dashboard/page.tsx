'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import {
  BarChart3,
  Shield,
  AlertTriangle,
  Clock,
  CheckCircle,
  TrendingUp,
  Users,
  Eye,
  Layers,
  Building2,
  Filter,
  X,
  ChevronRight,
  Download,
  type LucideIcon,
} from 'lucide-react';

interface OrgFilters {
  groups: string[];
  companies: string[];
  departments: string[];
}

interface DashboardData {
  orgFilters: OrgFilters;
  stats: {
    criticalHighPct: number;
    totalRisks: number;
    pendingReview: number;
    mitigated: number;
    overdueTasks: number;
    totalControls: number;
    totalTasks: number;
    totalUsers: number;
    fraudTotal: number;
  };
  fraudByCategory: Record<string, number>;
  heatMap: number[][];
  controlAdequacy: { effective: number; partiallyEffective: number; ineffective: number; notAssessed: number; total: number };
  controlsByType: Record<string, number>;
  byDepartment: Record<string, { inherent: number; gross: number; residual: number; count: number }>;
  byCategory: Record<string, number>;
  risksByStatus: Record<string, number>;
  risksByLevel: Record<string, number>;
  tasksByStatus: Record<string, number>;
  byObjective: Record<string, { count: number; highSeverity: number; avgScore: number }>;
  entityExposure: { label: string; value: number }[];
  teamActivity: {
    id: string; name: string; avatar: string; role: string;
    department: string; company: string;
    risksOwned: number; risksReported: number; tasks: number; overdue: number;
  }[];
  topRisks: {
    riskId: string; title: string; category: string; department: string;
    owner: string; inherentScore: number; grossScore: number; residualScore: number;
    riskLevel: string; controlStatus: string; status: string;
  }[];
}

const CATEGORY_LABELS: Record<string, string> = {
  OPERATIONAL: 'Operational', COMPLIANCE: 'Compliance', FINANCIAL: 'Financial',
  STRATEGIC: 'Strategic', HR_TALENT: 'HR & Talent', IT_CYBER: 'IT/Cyber',
};
const CATEGORY_COLORS: Record<string, string> = {
  OPERATIONAL: '#4ab0de', COMPLIANCE: '#8b5cf6', FINANCIAL: '#f59e0b',
  STRATEGIC: '#ec4899', HR_TALENT: '#ef4444', IT_CYBER: '#10b981',
};
const LEVEL_COLORS: Record<string, string> = {
  CRITICAL: '#ef4444', HIGH: '#f59e0b', MEDIUM: '#4ab0de', LOW: '#10b981',
};
const STATUS_LABELS: Record<string, string> = {
  SUBMITTED: 'New', IN_REVIEW: 'In Review', VALIDATED: 'Validated',
  ACCEPTED: 'Accepted', REJECTED: 'Rejected', MITIGATED: 'Mitigated', DRAFT: 'Draft',
};
const ROLE_LABELS: Record<string, string> = {
  BUSINESS_OWNER: 'Business Owner', RISK_MANAGER: 'Risk Manager',
  CHIEF_RISK_MANAGER: 'Chief RM', EXECUTIVE: 'Executive', ADMIN: 'Admin',
};

function getHeatColor(li: number, imp: number): string {
  const s = li * imp;
  if (s >= 20) return '#ef4444';
  if (s >= 12) return '#f59e0b';
  if (s >= 6) return '#4ab0de';
  return '#10b981';
}
function getHeatBg(li: number, imp: number): string {
  const s = li * imp;
  if (s >= 20) return 'rgba(239,68,68,0.3)';
  if (s >= 12) return 'rgba(245,158,11,0.25)';
  if (s >= 6) return 'rgba(74,176,222,0.2)';
  return 'rgba(16,185,129,0.15)';
}

function StatCard({ label, value, suffix, color, icon: Icon, active, onClick }: {
  label: string; value: number | string; suffix?: string; color: string; icon: LucideIcon; active?: boolean; onClick?: () => void;
}) {
  return (
    <div className="risk-card" onClick={onClick}
      style={{ padding: '14px 16px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '12px', borderColor: active ? color : undefined, boxShadow: active ? `0 0 20px ${color}25` : undefined }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = color; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; }}
      onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-color)'; (e.currentTarget as HTMLDivElement).style.transform = 'none'; }}
    >
      <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div>
        <div style={{ fontSize: '22px', fontWeight: 700, color, lineHeight: 1 }}>
          {value}<span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{suffix}</span>
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>{label}</div>
      </div>
    </div>
  );
}

export default function ExecutiveDashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  // Org filter state
  const [filterGroup, setFilterGroup] = useState('');
  const [filterCompany, setFilterCompany] = useState('');
  const [filterDept, setFilterDept] = useState('');

  // Cross-filter: clicking any chart element highlights related data everywhere
  const [crossFilter, setCrossFilter] = useState<{ type: string; value: string } | null>(null);
  const toggleCross = (type: string, value: string) => {
    setCrossFilter((prev) => (prev?.type === type && prev?.value === value) ? null : { type, value });
  };
  // Helper: should a chart item be dimmed?
  const dimmed = (type: string, value: string) => {
    if (!crossFilter) return false;
    if (crossFilter.type === type) return crossFilter.value !== value;
    return true; // different filter type = dim everything
  };

  const isCrossMatch = (risk: { category?: string; department?: string; riskLevel?: string; status?: string; likelihood?: number; impact?: number }) => {
    if (!crossFilter) return true;
    if (crossFilter.type === 'category') return risk.category === crossFilter.value;
    if (crossFilter.type === 'department') return risk.department === crossFilter.value;
    if (crossFilter.type === 'level' && crossFilter.value === 'critical-high') return risk.riskLevel === 'CRITICAL' || risk.riskLevel === 'HIGH';
    if (crossFilter.type === 'level') return risk.riskLevel === crossFilter.value;
    if (crossFilter.type === 'status' && crossFilter.value === 'pending') return risk.status === 'SUBMITTED' || risk.status === 'IN_REVIEW';
    if (crossFilter.type === 'status' && crossFilter.value === 'mitigated') return risk.status === 'MITIGATED';
    if (crossFilter.type === 'heatCell') {
      const [l, i] = crossFilter.value.split('-').map(Number);
      return risk.likelihood === l && risk.impact === i;
    }
    return true;
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterGroup) params.set('group', filterGroup);
    if (filterCompany) params.set('company', filterCompany);
    if (filterDept) params.set('department', filterDept);
    try {
      const res = await fetch(`/api/executive/dashboard?${params}`);
      const d = await res.json();
      setData(d);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [filterGroup, filterCompany, filterDept]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const clearFilters = () => { setFilterGroup(''); setFilterCompany(''); setFilterDept(''); };
  const hasFilters = filterGroup || filterCompany || filterDept;

  if (loading || !data) {
    return (
      <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-primary)' }}>
        <Sidebar role="executive" />
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading executive dashboard...</div>
        </main>
      </div>
    );
  }

  const { stats, heatMap, controlAdequacy, byDepartment, byCategory, byObjective, teamActivity, topRisks, fraudByCategory, entityExposure } = data;
  const ctrlTotal = controlAdequacy.total || 1;
  const maxEntity = Math.max(...entityExposure.map((e) => e.value), 1);
  const objEntries = Object.entries(byObjective).filter(([k]) => k !== 'Unassigned').sort((a, b) => b[1].avgScore - a[1].avgScore);
  const deptEntries = Object.entries(byDepartment);
  const maxDeptScore = Math.max(...deptEntries.map(([, d]) => Math.max(d.inherent, d.residual)), 1);
  const catEntries = Object.entries(byCategory);
  const maxCatCount = Math.max(...catEntries.map(([, c]) => c), 1);

  const selectStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', background: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '12px',
    color: 'var(--text-primary)', cursor: 'pointer', outline: 'none',
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', overflow: 'hidden' }}>
      <Sidebar role="executive" />

      <main style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {/* Connected Banner */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-muted)', margin: '-10px 0 -4px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', animation: 'pulse 2s infinite' }} />
          Connected as <strong style={{ color: 'var(--text-primary)' }}>Executive Board</strong> &middot; National Holding Group &middot; Q1 2026
        </div>

        {/* Header */}
        <div className="animate-fade-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: 700, margin: 0 }}>Executive Board Dashboard</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
              Enterprise risk overview &middot; Read-only &middot; As of {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ padding: '6px 14px', border: '1px solid rgba(176,141,48,0.5)', borderRadius: '6px', fontSize: '11px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: '#e0b84a', background: 'rgba(176,141,48,0.08)' }}>
              Board Confidential
            </span>
            <button className="btn-secondary" style={{ fontSize: '12px', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
              onClick={() => { import('@/lib/export-pdf').then(({ exportAdminOverviewPDF }) => exportAdminOverviewPDF(data as never)); }}>
              <Download size={14} /> Export PDF
            </button>
          </div>
        </div>

        {/* Org Hierarchy Filter */}
        <div className="animate-fade-up-2 risk-card" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building2 size={16} style={{ color: '#4ab0de' }} /> Organizational Scope Filter
            </span>
            {hasFilters && (
              <button onClick={clearFilters} style={{ padding: '6px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', fontSize: '11px', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <X size={12} /> Clear All
              </button>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                Group <span style={{ fontSize: '9px', padding: '2px 6px', background: 'rgba(74,176,222,0.15)', color: '#4ab0de', borderRadius: '4px' }}>{data.orgFilters.groups.length}</span>
              </div>
              <select value={filterGroup} onChange={(e) => { setFilterGroup(e.target.value); setFilterCompany(''); setFilterDept(''); }} style={selectStyle}>
                <option value="">All Groups</option>
                {data.orgFilters.groups.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                Company <span style={{ fontSize: '9px', padding: '2px 6px', background: 'rgba(74,176,222,0.15)', color: '#4ab0de', borderRadius: '4px' }}>{data.orgFilters.companies.length}</span>
              </div>
              <select value={filterCompany} onChange={(e) => { setFilterCompany(e.target.value); setFilterDept(''); }} style={selectStyle}>
                <option value="">All Companies</option>
                {data.orgFilters.companies.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                Department <span style={{ fontSize: '9px', padding: '2px 6px', background: 'rgba(74,176,222,0.15)', color: '#4ab0de', borderRadius: '4px' }}>{data.orgFilters.departments.length}</span>
              </div>
              <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)} style={selectStyle}>
                <option value="">All Departments</option>
                {data.orgFilters.departments.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '12px', borderTop: '1px solid var(--border-color)', marginTop: '12px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginRight: '4px' }}>Current View:</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', background: 'rgba(74,176,222,0.15)', border: '1px solid rgba(74,176,222,0.3)', borderRadius: '6px', fontSize: '11px', color: '#4ab0de' }}>
              <Building2 size={10} /> {filterGroup || 'National Holding Group'}
            </span>
            {filterCompany && <>
              <ChevronRight size={10} style={{ color: 'var(--text-muted)' }} />
              <span style={{ padding: '4px 10px', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '6px', fontSize: '11px', color: '#8b5cf6' }}>{filterCompany}</span>
            </>}
            {filterDept && <>
              <ChevronRight size={10} style={{ color: 'var(--text-muted)' }} />
              <span style={{ padding: '4px 10px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '6px', fontSize: '11px', color: '#f59e0b' }}>{filterDept}</span>
            </>}
          </div>
        </div>

        {/* KPI Stats */}
        <div className="animate-fade-up-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '14px' }}>
          <StatCard label="% Risks Critical & High" value={stats.criticalHighPct} suffix="%" color="#ef4444" icon={AlertTriangle} active={crossFilter?.value === 'critical-high'} onClick={() => toggleCross('level', 'critical-high')} />
          <StatCard label="Total Risks Logged" value={stats.totalRisks} color="#4ab0de" icon={BarChart3} active={!crossFilter} onClick={() => setCrossFilter(null)} />
          <StatCard label="Pending Review" value={stats.pendingReview} color="#8b5cf6" icon={Clock} active={crossFilter?.value === 'pending'} onClick={() => toggleCross('status', 'pending')} />
          <StatCard label="Mitigated Risks" value={stats.mitigated} color="#10b981" icon={CheckCircle} active={crossFilter?.value === 'mitigated'} onClick={() => toggleCross('status', 'mitigated')} />
          <StatCard label="Overdue Tasks" value={stats.overdueTasks} color="#ef4444" icon={AlertTriangle} active={crossFilter?.value === 'overdue'} onClick={() => toggleCross('status', 'overdue')} />
        </div>

        {/* Fraud Risks */}
        {stats.fraudTotal > 0 && (
          <div className="risk-card" style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '14px', fontWeight: 600 }}>Fraud Risks</span>
              <span style={{ fontSize: '20px', fontWeight: 700, color: '#ef4444' }}>{stats.fraudTotal}</span>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
              {Object.entries(fraudByCategory).map(([cat, count]) => {
                const colors = ['#ef4444', '#f59e0b', '#8b5cf6', '#4ab0de'];
                const idx = Object.keys(fraudByCategory).indexOf(cat);
                const color = colors[idx % colors.length];
                return (
                  <div key={cat} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: '8px', cursor: 'pointer' }}
                    onClick={() => setFilterDept('')}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: color, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: '12px', color: 'var(--text-secondary)' }}>{cat}</span>
                    <span style={{ fontSize: '16px', fontWeight: 700, color }}>{count}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
              {Object.entries(fraudByCategory).map(([cat, count]) => {
                const colors = ['#ef4444', '#f59e0b', '#8b5cf6', '#4ab0de'];
                const idx = Object.keys(fraudByCategory).indexOf(cat);
                return (
                  <div key={cat} style={{ width: `${(count / stats.fraudTotal) * 100}%`, height: '100%', background: colors[idx % colors.length] }} />
                );
              })}
            </div>
          </div>
        )}

        {/* Escalation Banner */}
        {stats.overdueTasks > 0 && (
          <div className="animate-fade-up-1" style={{
            padding: '14px 20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '14px',
            background: 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(139,92,246,0.08))',
            border: '1px solid rgba(239,68,68,0.3)',
          }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <AlertTriangle size={20} style={{ color: '#ef4444' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: 600 }}>Board Escalation Required &mdash; {stats.overdueTasks} Overdue Tasks</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {teamActivity.filter((t) => t.overdue > 0).map((t) => `${t.name} (${t.department}) has ${t.overdue} overdue`).join(' · ')}
              </div>
            </div>
            <span style={{ padding: '6px 16px', background: '#ef4444', borderRadius: '8px', color: '#fff', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap', cursor: 'pointer' }}>View Escalations</span>
          </div>
        )}

        {/* Row 1: Heat Map + Control Adequacy + Risk by Category */}
        <div className="animate-fade-up-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
          {/* Heat Map */}
          <div className="risk-card" style={{ padding: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={14} style={{ color: '#8b5cf6' }} /> Risk Heat Map
              </span>
            </div>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', paddingTop: '18px' }}>
                {['Certain', 'Likely', 'Possible', 'Unlikely', 'Rare'].map((l, i) => (
                  <div key={l} style={{ height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '6px', fontSize: '9px', color: 'var(--text-muted)' }}>
                    {5 - i} - {l}
                  </div>
                ))}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '3px', marginBottom: '3px' }}>
                  {['Minor', 'Moderate', 'Significant', 'Major', 'Severe'].map((l) => (
                    <div key={l} style={{ textAlign: 'center', fontSize: '9px', color: 'var(--text-muted)', padding: '2px 0' }}>{l}</div>
                  ))}
                </div>
                {[5, 4, 3, 2, 1].map((li) => (
                  <div key={li} style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '3px', marginBottom: '3px' }}>
                    {[1, 2, 3, 4, 5].map((imp) => {
                      const count = heatMap[5 - li]?.[imp - 1] || 0;
                      return (
                        <div key={`${li}-${imp}`}
                          onClick={() => { if (count > 0) toggleCross('heatCell', `${li}-${imp}`); }}
                          style={{
                            height: '40px', borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: count > 0 ? getHeatBg(li, imp) : 'rgba(42,42,90,0.3)',
                            border: crossFilter?.type === 'heatCell' && crossFilter.value === `${li}-${imp}` ? '2px solid #4ab0de' : count > 0 ? `1px solid ${getHeatColor(li, imp)}40` : '1px solid var(--border-color)',
                            boxShadow: crossFilter?.type === 'heatCell' && crossFilter.value === `${li}-${imp}` ? '0 0 12px rgba(74,176,222,0.5)' : 'none',
                            cursor: count > 0 ? 'pointer' : 'default',
                            fontWeight: 700, fontSize: '14px', color: count > 0 ? getHeatColor(li, imp) : 'transparent',
                            opacity: dimmed('heatCell', `${li}-${imp}`) ? 0.2 : 1,
                            transition: 'transform 0.15s, opacity 0.2s',
                          }}
                          onMouseEnter={(e) => { if (count > 0) (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.08)'; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'none'; }}
                        >
                          {count > 0 ? count : ''}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {[{ label: 'Low (1-4)', color: '#10b981' }, { label: 'Medium (5-9)', color: '#4ab0de' }, { label: 'High (10-19)', color: '#f59e0b' }, { label: 'Critical (20-25)', color: '#ef4444' }].map((i) => (
                <div key={i.label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: `${i.color}40`, border: `1px solid ${i.color}` }} />
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{i.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Control Adequacy */}
          <div className="risk-card" style={{ padding: '18px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={14} style={{ color: '#10b981' }} /> Control Adequacy
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ position: 'relative', width: '130px', height: '130px', flexShrink: 0 }}>
                <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                  {(() => {
                    const segs = [
                      { pct: (controlAdequacy.effective / ctrlTotal) * 100, color: '#10b981' },
                      { pct: (controlAdequacy.partiallyEffective / ctrlTotal) * 100, color: '#f59e0b' },
                      { pct: (controlAdequacy.ineffective / ctrlTotal) * 100, color: '#ef4444' },
                      { pct: (controlAdequacy.notAssessed / ctrlTotal) * 100, color: '#6a6a8a' },
                    ];
                    let offset = 0;
                    return segs.map((s, idx) => {
                      const circ = 2 * Math.PI * 38;
                      const dash = (s.pct / 100) * circ;
                      const el = <circle key={idx} cx="50" cy="50" r="38" fill="none" stroke={s.color} strokeWidth="14" strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={-offset} />;
                      offset += dash;
                      return el;
                    });
                  })()}
                </svg>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 800 }}>{controlAdequacy.total}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Controls</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                {[
                  { label: 'Effective', val: controlAdequacy.effective, color: '#10b981' },
                  { label: 'Partial', val: controlAdequacy.partiallyEffective, color: '#f59e0b' },
                  { label: 'Ineffective', val: controlAdequacy.ineffective, color: '#ef4444' },
                  { label: 'Not Assessed', val: controlAdequacy.notAssessed, color: '#6a6a8a' },
                ].map((i) => (
                  <div key={i.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: i.color, flexShrink: 0 }} />
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', flex: 1 }}>{i.label}</span>
                    <span style={{ fontSize: '12px', fontWeight: 600 }}>{Math.round((i.val / ctrlTotal) * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Control type breakdown */}
            <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {Object.entries(data.controlsByType).map(([type, count]) => (
                  <span key={type} style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '6px', background: 'rgba(74,176,222,0.1)', color: 'var(--text-secondary)' }}>
                    {type}: {count}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Risk by Category (Vertical Bars) */}
          <div className="risk-card" style={{ padding: '18px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 14px' }}>Residual Risk by Category</h3>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '180px', paddingBottom: '20px' }}>
              {catEntries.map(([cat, count]) => {
                const color = CATEGORY_COLORS[cat] || '#4ab0de';
                const hPct = (count / maxCatCount) * 100;
                return (
                  <div key={cat} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: '100%', justifyContent: 'flex-end', cursor: 'pointer', opacity: dimmed('category', cat) ? 0.2 : 1, transition: 'opacity 0.2s' }}
                    onClick={() => toggleCross('category', cat)}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color }}>{count}</span>
                    <div style={{ width: '100%', maxWidth: '48px', borderRadius: '6px 6px 0 0', background: `linear-gradient(to top, ${color}, ${color}aa)`, height: `${Math.max(hPct, 8)}%`, transition: 'height 0.8s ease' }} />
                    <span style={{ fontSize: '9px', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.2 }}>{CATEGORY_LABELS[cat] || cat}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Row 2: Top Entities + Inherent vs Residual by Dept */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          {/* Top Entities by Risk Exposure */}
          <div className="risk-card" style={{ padding: '18px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 14px' }}>Top Entities by Risk Exposure</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {entityExposure.map((e) => (
                <div key={e.label} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', opacity: dimmed('department', e.label) ? 0.2 : 1, transition: 'opacity 0.2s' }}
                  onClick={() => toggleCross('department', e.label)}>
                  <div style={{ width: '140px', fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>{e.label}</div>
                  <div style={{ flex: 1, height: '24px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(e.value / maxEntity) * 100}%`, background: 'linear-gradient(90deg, #4ab0de, #8b5cf6)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '8px', transition: 'width 0.8s ease' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#fff' }}>{e.value}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Inherent vs Residual by Department */}
          <div className="risk-card" style={{ padding: '18px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 14px' }}>Inherent vs Residual by Department</h3>
            <div style={{ display: 'flex', gap: '14px', marginBottom: '10px' }}>
              {[{ label: 'Inherent', color: '#ef4444' }, { label: 'Residual', color: '#10b981' }].map((i) => (
                <div key={i.label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: i.color }} />
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{i.label}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {deptEntries.map(([dept, vals]) => (
                <div key={dept} style={{ cursor: 'pointer', opacity: dimmed('department', dept) ? 0.2 : 1, transition: 'opacity 0.2s' }} onClick={() => toggleCross('department', dept)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                    <span style={{ width: '120px', fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'right', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dept}</span>
                    <div style={{ flex: 1, position: 'relative', height: '20px' }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, height: '10px', borderRadius: '3px', background: 'rgba(239,68,68,0.5)', width: `${(vals.inherent / maxDeptScore) * 100}%`, transition: 'width 0.8s' }} />
                      <div style={{ position: 'absolute', bottom: 0, left: 0, height: '10px', borderRadius: '3px', background: 'rgba(16,185,129,0.6)', width: `${(vals.residual / maxDeptScore) * 100}%`, transition: 'width 0.8s' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                      <span style={{ fontSize: '10px', fontWeight: 600, padding: '1px 6px', borderRadius: '3px', background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>{vals.inherent}</span>
                      <span style={{ fontSize: '10px', fontWeight: 600, padding: '1px 6px', borderRadius: '3px', background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>{vals.residual}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Row 3: Strategic Objectives + AI Insights */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px' }}>
          <div className="risk-card" style={{ padding: '18px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 14px' }}>Risk Exposure by Strategic Objective</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {objEntries.slice(0, 5).map(([obj, vals]) => (
                <div key={obj} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 14px', background: 'var(--bg-secondary)', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'translateX(4px)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'none'; }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: vals.avgScore >= 15 ? 'rgba(239,68,68,0.15)' : vals.avgScore >= 8 ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <TrendingUp size={18} style={{ color: vals.avgScore >= 15 ? '#ef4444' : vals.avgScore >= 8 ? '#f59e0b' : '#10b981' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 500 }}>{obj}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{vals.count} risks &middot; {vals.highSeverity} high severity</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: vals.avgScore >= 15 ? '#ef4444' : vals.avgScore >= 8 ? '#f59e0b' : '#10b981' }}>{vals.avgScore}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Avg Score</div>
                  </div>
                </div>
              ))}
              {objEntries.length === 0 && <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '13px' }}>No strategic objectives assigned</div>}
            </div>
          </div>

          {/* AI Insights */}
          <div className="risk-card" style={{ padding: '18px', background: 'linear-gradient(135deg, rgba(74,176,222,0.08), rgba(139,92,246,0.08))', border: '1px solid rgba(139,92,246,0.3)' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ background: 'linear-gradient(135deg, #4ab0de, #8b5cf6)', color: '#fff', fontSize: '10px', padding: '4px 10px', borderRadius: '6px', fontWeight: 600 }}>AI</span>
              Board Insights
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {stats.criticalHighPct > 30 && (
                <div style={{ display: 'flex', gap: '10px', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                  <span style={{ fontSize: '14px' }}>🔴</span>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    <strong style={{ color: 'var(--text-primary)' }}>Critical:</strong> {stats.criticalHighPct}% of risks are Critical/High. Board escalation recommended.
                  </div>
                </div>
              )}
              {stats.overdueTasks > 0 && (
                <div style={{ display: 'flex', gap: '10px', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                  <span style={{ fontSize: '14px' }}>⚠️</span>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    <strong style={{ color: 'var(--text-primary)' }}>Overdue:</strong> {stats.overdueTasks} tasks past SLA. Immediate attention needed.
                  </div>
                </div>
              )}
              {stats.fraudTotal > 0 && (
                <div style={{ display: 'flex', gap: '10px', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                  <span style={{ fontSize: '14px' }}>🦅</span>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    <strong style={{ color: 'var(--text-primary)' }}>Fraud:</strong> {stats.fraudTotal} fraud risks detected. {Object.entries(fraudByCategory).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Review'} is the top category.
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', gap: '10px', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                <span style={{ fontSize: '14px' }}>💡</span>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  <strong style={{ color: 'var(--text-primary)' }}>Recommendation:</strong> Focus on {Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0]?.[0] ? CATEGORY_LABELS[Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0][0]] : 'top'} category — highest risk concentration.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Team Activity Table */}
        <div className="risk-card" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={14} style={{ color: '#4ab0de' }} /> Team Activity & Workload
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>All roles</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="risk-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Role</th>
                  <th style={{ textAlign: 'center' }}>Risks Owned</th>
                  <th style={{ textAlign: 'center' }}>Risks Reported</th>
                  <th style={{ textAlign: 'center' }}>Tasks</th>
                  <th style={{ textAlign: 'center' }}>Overdue</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {teamActivity.filter((m) => !crossFilter || crossFilter.type !== 'department' || m.department === crossFilter.value).slice(0, 8).map((m) => (
                  <tr key={m.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'linear-gradient(135deg, #4ab0de, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                          {m.avatar || m.name.split(' ').map((n) => n[0]).join('')}
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 500 }}>{m.name}</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{m.department}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(74,176,222,0.1)', color: '#4ab0de', fontWeight: 600 }}>
                        {ROLE_LABELS[m.role] || m.role}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{m.risksOwned}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{m.risksReported}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{m.tasks}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: m.overdue > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)', color: m.overdue > 0 ? '#ef4444' : '#10b981' }}>
                        {m.overdue}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        fontSize: '10px', fontWeight: 600, padding: '3px 10px', borderRadius: '4px',
                        background: m.overdue > 2 ? 'rgba(239,68,68,0.15)' : m.overdue > 0 ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)',
                        color: m.overdue > 2 ? '#ef4444' : m.overdue > 0 ? '#f59e0b' : '#10b981',
                      }}>
                        {m.overdue > 2 ? 'Escalated' : m.overdue > 0 ? 'At Risk' : 'On Track'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Priority Risks Table */}
        <div className="risk-card" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>Top Priority Risks</h3>
            <button className="btn-secondary" style={{ fontSize: '11px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
              onClick={() => router.push('/executive/registry')}>
              View All Risks <Eye size={10} />
            </button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="risk-table">
              <thead>
                <tr>
                  <th>Risk ID</th>
                  <th>Risk Name</th>
                  <th>Category</th>
                  <th>Dept</th>
                  <th>Owner</th>
                  <th style={{ textAlign: 'center' }}>Inherent</th>
                  <th style={{ textAlign: 'center' }}>Residual</th>
                  <th>Control</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {topRisks.filter((r) => isCrossMatch(r)).map((r) => {
                  const levelColor = LEVEL_COLORS[r.riskLevel] || '#4ab0de';
                  return (
                    <tr key={r.riskId} style={{ cursor: 'pointer' }} onClick={() => router.push(`/risk-manager/review/${r.riskId}`)}>
                      <td><span style={{ color: '#4ab0de', fontWeight: 600 }}>{r.riskId}</span></td>
                      <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{r.title}</td>
                      <td>
                        <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', background: `${CATEGORY_COLORS[r.category] || '#4ab0de'}18`, color: CATEGORY_COLORS[r.category] || '#4ab0de' }}>
                          {CATEGORY_LABELS[r.category] || r.category}
                        </span>
                      </td>
                      <td style={{ fontSize: '12px' }}>{r.department}</td>
                      <td style={{ fontSize: '12px' }}>{r.owner}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: `${levelColor}18`, color: levelColor }}>{r.inherentScore}</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: 'rgba(74,176,222,0.15)', color: '#4ab0de' }}>{r.residualScore}</span>
                      </td>
                      <td>
                        <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', background: r.controlStatus === 'Effective' ? 'rgba(16,185,129,0.15)' : r.controlStatus === 'Partial' ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)', color: r.controlStatus === 'Effective' ? '#10b981' : r.controlStatus === 'Partial' ? '#f59e0b' : '#ef4444' }}>
                          {r.controlStatus}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', background: 'rgba(139,92,246,0.15)', color: '#8b5cf6' }}>
                          {STATUS_LABELS[r.status] || r.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Cross-filter indicator */}
      {crossFilter && (
        <div style={{ position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 20px', background: 'var(--bg-card)', border: '1px solid var(--accent-cyan)', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
          <Filter size={14} style={{ color: '#4ab0de' }} />
          <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
            Filtering by <strong style={{ color: '#4ab0de' }}>{crossFilter.type}: {crossFilter.value}</strong>
          </span>
          <button onClick={() => setCrossFilter(null)} style={{ background: 'rgba(239,68,68,0.15)', border: 'none', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', color: '#ef4444', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <X size={12} /> Clear
          </button>
        </div>
      )}
    </div>
  );
}
