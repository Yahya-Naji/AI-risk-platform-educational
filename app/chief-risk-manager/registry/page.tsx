'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import {
  Search, Download, Eye, ArrowUpDown,
} from 'lucide-react';

interface RiskRow {
  id: string; riskId: string; title: string; category: string; department: string;
  likelihood: number; impact: number; inherentScore: number; grossScore: number | null;
  riskLevel: string; status: string; fraudRisk: boolean; createdAt: string;
  reportedBy: { name: string; avatar: string } | null;
  assignedTo: { name: string; avatar: string } | null;
  _count: { controls: number; tasks: number };
}

const CAT_LABELS: Record<string, string> = { OPERATIONAL: 'Operational', COMPLIANCE: 'Compliance', FINANCIAL: 'Financial', STRATEGIC: 'Strategic', HR_TALENT: 'HR/Talent', IT_CYBER: 'IT/Cyber' };
const CAT_COLORS: Record<string, string> = { OPERATIONAL: '#4ab0de', COMPLIANCE: '#8b5cf6', FINANCIAL: '#f59e0b', STRATEGIC: '#ec4899', HR_TALENT: '#ef4444', IT_CYBER: '#10b981' };
const LEVEL_COLORS: Record<string, string> = { CRITICAL: '#ef4444', HIGH: '#f59e0b', MEDIUM: '#4ab0de', LOW: '#10b981' };
const STATUS_COLORS: Record<string, string> = { SUBMITTED: '#8b5cf6', IN_REVIEW: '#f59e0b', VALIDATED: '#10b981', ACCEPTED: '#4ab0de', REJECTED: '#ef4444', MITIGATED: '#10b981' };
const STATUS_LABELS: Record<string, string> = { SUBMITTED: 'New', IN_REVIEW: 'In Review', VALIDATED: 'Validated', ACCEPTED: 'Accepted', REJECTED: 'Rejected', MITIGATED: 'Mitigated' };

type SortField = 'riskId' | 'title' | 'category' | 'inherentScore' | 'createdAt';

export default function CRMRegistryPage() {
  const router = useRouter();
  const [risks, setRisks] = useState<RiskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortField, setSortField] = useState<SortField>('inherentScore');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const toggleSort = (f: SortField) => { if (sortField === f) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortField(f); setSortDir('desc'); } };

  useEffect(() => {
    fetch('/api/risks').then(r => r.json()).then(setRisks).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-primary)' }}>
        <Sidebar role="chief-risk-manager" />
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading registry...</div>
        </main>
      </div>
    );
  }

  const departments = [...new Set(risks.map(r => r.department))].sort();

  const filtered = risks.filter(r => {
    if (search && !r.title.toLowerCase().includes(search.toLowerCase()) && !r.riskId.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterDept && r.department !== filterDept) return false;
    if (filterCat && r.category !== filterCat) return false;
    if (filterLevel && r.riskLevel !== filterLevel) return false;
    if (filterStatus && r.status !== filterStatus) return false;
    return true;
  }).sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    if (sortField === 'riskId') return a.riskId.localeCompare(b.riskId) * dir;
    if (sortField === 'title') return a.title.localeCompare(b.title) * dir;
    if (sortField === 'category') return a.category.localeCompare(b.category) * dir;
    if (sortField === 'createdAt') return (a.createdAt < b.createdAt ? -1 : 1) * dir;
    return (a.inherentScore - b.inherentScore) * dir;
  });

  const selectStyle: React.CSSProperties = { padding: '8px 10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '12px', color: 'var(--text-primary)', cursor: 'pointer', outline: 'none' };

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', overflow: 'hidden' }}>
      <Sidebar role="chief-risk-manager" />
      <main style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {/* Header */}
        <div className="animate-fade-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Risk Registry</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
              Enterprise risk overview &middot; {risks.length} total risks
            </p>
          </div>
          <button className="btn-secondary" style={{ fontSize: '12px', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Download size={14} /> Export
          </button>
        </div>

        {/* Filters */}
        <div className="risk-card" style={{ padding: '14px 18px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search risks..." style={{ ...selectStyle, width: '100%', paddingLeft: '32px' }} />
          </div>
          <select value={filterDept} onChange={e => setFilterDept(e.target.value)} style={selectStyle}>
            <option value="">All Departments</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={selectStyle}>
            <option value="">All Categories</option>
            {Object.entries(CAT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)} style={selectStyle}>
            <option value="">All Severities</option>
            {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selectStyle}>
            <option value="">All Status</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        {/* Summary */}
        <div style={{ display: 'flex', gap: '8px', fontSize: '12px', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
          <span>{filtered.length} risks found</span>
          <span style={{ color: 'var(--border-color)' }}>|</span>
          {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(l => {
            const c = filtered.filter(r => r.riskLevel === l).length;
            return c > 0 ? <span key={l} style={{ color: LEVEL_COLORS[l], fontWeight: 600 }}>{c} {l}</span> : null;
          })}
          {(() => { const fc = filtered.filter(r => r.fraudRisk).length; return fc > 0 ? <span style={{ color: '#ef4444', fontWeight: 600 }}>{fc} Fraud Risks</span> : null; })()}
        </div>

        {/* Table */}
        <div className="risk-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="risk-table">
              <thead>
                <tr>
                  {[
                    { key: 'riskId' as SortField, label: 'RISK ID' },
                    { key: 'title' as SortField, label: 'RISK NAME' },
                    { key: 'category' as SortField, label: 'CATEGORY' },
                    { key: '' as string, label: 'DEPT' },
                    { key: 'inherentScore' as SortField, label: 'SCORE' },
                    { key: '' as string, label: 'STATUS' },
                    { key: '' as string, label: 'OWNER' },
                    { key: 'createdAt' as SortField, label: 'DATE' },
                    { key: '' as string, label: 'ACTIONS' },
                  ].map(col => (
                    <th key={col.label} onClick={col.key ? () => toggleSort(col.key as SortField) : undefined} style={{ cursor: col.key ? 'pointer' : 'default', userSelect: 'none' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        {col.label}
                        {col.key && <ArrowUpDown size={10} style={{ opacity: sortField === col.key ? 1 : 0.3 }} />}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>No risks match your filters</td></tr>
                ) : filtered.map(r => {
                  const lc = LEVEL_COLORS[r.riskLevel] || '#4ab0de';
                  const sc = STATUS_COLORS[r.status] || '#4ab0de';
                  const cc = CAT_COLORS[r.category] || '#4ab0de';
                  return (
                    <tr key={r.riskId} style={{ cursor: 'pointer' }} onClick={() => router.push(`/risk-manager/review/${r.riskId}`)}>
                      <td><span style={{ color: '#4ab0de', fontWeight: 600, fontSize: '12px' }}>{r.riskId}</span></td>
                      <td style={{ fontWeight: 500, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.title}
                        {r.fraudRisk && <span style={{ marginLeft: '6px', fontSize: '9px', padding: '1px 5px', borderRadius: '3px', background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontWeight: 700 }}>FRAUD</span>}
                      </td>
                      <td><span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '5px', background: `${cc}18`, color: cc, fontWeight: 600 }}>{CAT_LABELS[r.category] || r.category}</span></td>
                      <td style={{ fontSize: '12px' }}>{r.department}</td>
                      <td><span style={{ fontWeight: 800, color: lc }}>{r.inherentScore}</span></td>
                      <td><span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '5px', background: `${sc}18`, color: sc }}>{STATUS_LABELS[r.status] || r.status}</span></td>
                      <td style={{ fontSize: '12px' }}>{r.assignedTo?.name || r.reportedBy?.name || '—'}</td>
                      <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                      <td onClick={e => e.stopPropagation()}>
                        <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => router.push(`/risk-manager/review/${r.riskId}`)}>
                          <Eye size={10} /> View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '10px 18px', fontSize: '11px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)' }}>
            Showing {filtered.length} of {risks.length} risks
          </div>
        </div>
      </main>
    </div>
  );
}
