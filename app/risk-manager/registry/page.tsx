'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import {
  Search,
  Download,
  Plus,
  Eye,
  Zap,
  ArrowUpDown,
} from 'lucide-react';
import MarkdownRenderer from '@/components/MarkdownRenderer';

interface RiskRow {
  id: string;
  riskId: string;
  title: string;
  category: string;
  department: string;
  likelihood: number;
  impact: number;
  inherentScore: number;
  grossScore: number | null;
  riskLevel: string;
  status: string;
  fraudRisk: boolean;
  reportedBy: { name: string; avatar: string } | null;
  assignedTo: { name: string; avatar: string } | null;
  strategicObjective: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { controls: number; tasks: number };
}

const CATEGORY_LABELS: Record<string, string> = {
  OPERATIONAL: 'Operational', COMPLIANCE: 'Compliance', FINANCIAL: 'Financial',
  STRATEGIC: 'Strategic', HR_TALENT: 'HR/Talent', IT_CYBER: 'IT/Cyber',
};
const CATEGORY_COLORS: Record<string, string> = {
  OPERATIONAL: '#4ab0de', COMPLIANCE: '#8b5cf6', FINANCIAL: '#f59e0b',
  STRATEGIC: '#ec4899', HR_TALENT: '#ef4444', IT_CYBER: '#10b981',
};
const LEVEL_COLORS: Record<string, string> = {
  CRITICAL: '#ef4444', HIGH: '#f59e0b', MEDIUM: '#4ab0de', LOW: '#10b981',
};
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  SUBMITTED: { label: 'Pending Review', color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' },
  IN_REVIEW: { label: 'In Review', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  VALIDATED: { label: 'Validated', color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
  ACCEPTED: { label: 'Accepted', color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
  REJECTED: { label: 'Rejected', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  MITIGATED: { label: 'Mitigated', color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
};

const aiSuggestions = ['High residual risks', 'Fraud risks', 'Overdue items', 'Inadequate controls', 'IT Department'];

export default function RiskRegistryPage() {
  const router = useRouter();
  const [risks, setRisks] = useState<RiskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [levelFilter, setLevelFilter] = useState('All');
  const [catFilter, setCatFilter] = useState('All');
  const [sortField, setSortField] = useState<'inherentScore' | 'riskId' | 'title' | 'category' | 'createdAt' | 'updatedAt'>('inherentScore');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/risks');
        const data = await res.json();
        setRisks(Array.isArray(data) ? data.filter((r: RiskRow) => r.status !== 'DRAFT') : []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  const departments = [...new Set(risks.map((r) => r.department))].sort();
  const categories = [...new Set(risks.map((r) => r.category))].sort();
  const statuses = [...new Set(risks.map((r) => r.status))].sort();
  const levels = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

  const filtered = risks
    .filter((r) => {
      const q = searchQuery.toLowerCase();
      const matchSearch = !q || r.title.toLowerCase().includes(q) || r.riskId.toLowerCase().includes(q) || r.department.toLowerCase().includes(q);
      const matchDept = deptFilter === 'All' || r.department === deptFilter;
      const matchStatus = statusFilter === 'All' || r.status === statusFilter;
      const matchLevel = levelFilter === 'All' || r.riskLevel === levelFilter;
      const matchCat = catFilter === 'All' || r.category === catFilter;
      return matchSearch && matchDept && matchStatus && matchLevel && matchCat;
    })
    .sort((a, b) => {
      if (sortField === 'createdAt' || sortField === 'updatedAt') {
        const aTime = new Date(a[sortField]).getTime();
        const bTime = new Date(b[sortField]).getTime();
        return sortDir === 'asc' ? aTime - bTime : bTime - aTime;
      }
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return sortDir === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });

  // Counts by level
  const levelCounts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  risks.forEach((r) => { if (r.riskLevel in levelCounts) levelCounts[r.riskLevel as keyof typeof levelCounts]++; });
  const fraudCount = risks.filter((r) => r.fraudRisk).length;

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('desc'); }
  };

  const handleAiSearch = async () => {
    if (!searchQuery.trim() || aiLoading) return;
    setAiLoading(true);
    setAiResult(null);
    try {
      const res = await fetch('/api/risk-manager/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: searchQuery, history: [] }),
      });
      const data = await res.json();
      setAiResult(data.message || 'No response from AI.');
    } catch {
      setAiResult('AI service is currently unavailable. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-primary)' }}>
        <Sidebar role="risk-manager" />
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading registry...</div>
        </main>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', overflow: 'hidden' }}>
      <Sidebar role="risk-manager" />

      <main style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {/* Header */}
        <div className="animate-fade-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Risk Registry</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
              Central repository for all organizational risks &middot; {risks.length} total risks
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-secondary" style={{ fontSize: '12px', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
              onClick={() => {
                import('@/lib/export-pdf').then(({ exportRegistryPDF }) => exportRegistryPDF(filtered));
              }}>
              <Download size={14} /> Export
            </button>
            <button className="btn-primary" style={{ fontSize: '12px', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
              onClick={() => router.push('/risk-manager/assistant')}>
              <Plus size={14} /> Ask AI
            </button>
          </div>
        </div>

        {/* AI Search */}
        <div className="animate-fade-up-1 risk-card" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ background: 'linear-gradient(135deg, #4ab0de, #8b5cf6)', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '6px' }}>
              <Zap size={10} style={{ display: 'inline', verticalAlign: 'middle' }} /> AI
            </span>
            <input type="text" placeholder="Ask anything... 'Show high risks in IT' or 'Find fraud-related risks'"
              value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setAiResult(null); }}
              onKeyDown={(e) => { if (e.key === 'Enter' && searchQuery.trim()) handleAiSearch(); }}
              style={{ flex: 1, background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '9px 14px', fontSize: '13px', color: 'var(--text-primary)', outline: 'none', fontFamily: 'inherit' }}
            />
            <button className="btn-primary" style={{ padding: '9px 16px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
              onClick={handleAiSearch} disabled={aiLoading}>
              {aiLoading ? <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} /> : <Search size={14} />}
              {aiLoading ? 'Thinking...' : 'Ask AI'}
            </button>
          </div>
          {aiResult && (
            <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', fontSize: '11px', fontWeight: 700, color: '#8b5cf6' }}>
                <Zap size={12} /> AI Response
                <button onClick={() => setAiResult(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '14px' }}>&times;</button>
              </div>
              <MarkdownRenderer content={aiResult} />
            </div>
          )}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {aiSuggestions.map((chip) => (
              <button key={chip} onClick={() => setSearchQuery(chip)}
                style={{ background: 'rgba(74,176,222,0.08)', border: '1px solid rgba(74,176,222,0.2)', color: 'var(--accent-cyan)', padding: '4px 12px', borderRadius: '16px', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}>
                {chip}
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="animate-fade-up-2" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          {[
            { label: 'All Departments', value: deptFilter, setter: setDeptFilter, options: ['All', ...departments] },
            { label: 'All Categories', value: catFilter, setter: setCatFilter, options: ['All', ...categories] },
            { label: 'All Severities', value: levelFilter, setter: setLevelFilter, options: ['All', ...levels] },
            { label: 'All Status', value: statusFilter, setter: setStatusFilter, options: ['All', ...statuses] },
          ].map((f) => (
            <select key={f.label} value={f.value} onChange={(e) => f.setter(e.target.value)}
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px 12px', fontSize: '12px', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
              {f.options.map((opt) => (
                <option key={opt} value={opt} style={{ background: 'var(--bg-card)' }}>
                  {opt === 'All' ? f.label : (CATEGORY_LABELS[opt] || STATUS_CONFIG[opt]?.label || opt)}
                </option>
              ))}
            </select>
          ))}
        </div>

        {/* Summary Counts */}
        <div className="animate-fade-up-2" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{filtered.length} risks found</span>
          <span style={{ width: '1px', height: '14px', background: 'var(--border-color)' }} />
          {levels.map((lv) => (
            <span key={lv} style={{ fontWeight: 600, color: LEVEL_COLORS[lv] }}>
              {levelCounts[lv as keyof typeof levelCounts]} {lv.charAt(0) + lv.slice(1).toLowerCase()}
            </span>
          ))}
          {fraudCount > 0 && (
            <>
              <span style={{ width: '1px', height: '14px', background: 'var(--border-color)' }} />
              <span style={{ fontWeight: 600, color: '#ef4444' }}>{fraudCount} Fraud Risks</span>
            </>
          )}
        </div>

        {/* Table */}
        <div className="risk-card animate-fade-up-3" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  {[
                    { key: 'riskId', label: 'Risk ID', sortable: true, width: '90px' },
                    { key: 'title', label: 'Risk Name', sortable: true },
                    { key: 'category', label: 'Category', sortable: true, width: '100px' },
                    { key: 'department', label: 'Dept', sortable: false, width: '80px' },
                    { key: 'inherentScore', label: 'Scores (I/G/R)', sortable: true, width: '120px' },
                    { key: 'status', label: 'Status', sortable: false, width: '110px' },
                    { key: 'owner', label: 'Owner', sortable: false, width: '100px' },
                    { key: 'createdAt', label: 'Created', sortable: true, width: '80px' },
                    { key: 'updatedAt', label: 'Updated', sortable: true, width: '80px' },
                    { key: 'actions', label: 'Actions', sortable: false, width: '80px' },
                  ].map((col) => (
                    <th key={col.key} style={{
                      textAlign: col.key === 'inherentScore' || col.key === 'actions' ? 'center' : 'left',
                      padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '10px',
                      textTransform: 'uppercase', letterSpacing: '0.5px', width: col.width,
                      cursor: col.sortable ? 'pointer' : 'default',
                    }}
                      onClick={() => col.sortable && toggleSort(col.key as typeof sortField)}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        {col.label}
                        {col.sortable && <ArrowUpDown size={10} style={{ opacity: sortField === col.key ? 1 : 0.3 }} />}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((risk) => {
                  const sc = STATUS_CONFIG[risk.status] || STATUS_CONFIG.SUBMITTED;
                  const residual = Math.max(1, risk.inherentScore - (risk._count.controls * 2));
                  return (
                    <tr key={risk.id} style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer', transition: 'background 0.15s' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(74,176,222,0.04)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}
                      onClick={() => router.push(`/risk-manager/review/${risk.riskId}`)}>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>{risk.riskId}</span>
                          {risk.fraudRisk && (
                            <span style={{ fontSize: '9px', fontWeight: 600, padding: '1px 5px', borderRadius: '3px', background: 'rgba(239,68,68,0.15)', color: '#ef4444', width: 'fit-content' }}>Fraud</span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px', maxWidth: '220px' }}>
                        <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{risk.title}</div>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', background: (CATEGORY_COLORS[risk.category] || '#4ab0de') + '22', color: CATEGORY_COLORS[risk.category] || '#4ab0de' }}>
                          {CATEGORY_LABELS[risk.category] || risk.category}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: '11px', color: 'var(--text-secondary)' }}>{risk.department}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '4px' }}>
                          {[
                            { val: risk.inherentScore, color: LEVEL_COLORS[risk.riskLevel] || '#4ab0de' },
                            { val: risk.grossScore || risk.inherentScore, color: '#f59e0b' },
                            { val: residual, color: '#4ab0de' },
                          ].map((s, i) => (
                            <span key={i} style={{ fontSize: '11px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: s.color + '22', color: s.color, minWidth: '24px', textAlign: 'center' }}>
                              {s.val}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', background: sc.bg, color: sc.color }}>
                          {sc.label}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        {risk.reportedBy ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'linear-gradient(135deg, #4ab0de, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                              {risk.reportedBy.avatar || risk.reportedBy.name.split(' ').map((n) => n[0]).join('')}
                            </div>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {risk.reportedBy.name.split(' ')[0]}
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: '11px', color: 'var(--text-muted)' }}>
                        {new Date(risk.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: '11px' }}>
                        {(() => {
                          const days = Math.floor((Date.now() - new Date(risk.updatedAt).getTime()) / 86400000);
                          const color = days <= 7 ? '#10b981' : days <= 30 ? '#f59e0b' : '#ef4444';
                          return <span style={{ color }}>{new Date(risk.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>;
                        })()}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <button className="btn-primary" style={{ fontSize: '10px', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          onClick={() => router.push(`/risk-manager/review/${risk.riskId}`)}>
                          <Eye size={10} /> Review
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={9} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>No risks match your filters</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Showing 1–{filtered.length} of {risks.length} risks</span>
          </div>
        </div>
      </main>
    </div>
  );
}
