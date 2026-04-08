'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import {
  Clock,
  CheckCircle,
  AlertTriangle,
  Eye,
  Search,
  type LucideIcon,
} from 'lucide-react';

interface PendingRisk {
  id: string;
  riskId: string;
  title: string;
  description: string;
  category: string;
  department: string;
  likelihood: number;
  impact: number;
  inherentScore: number;
  riskLevel: string;
  status: string;
  aiSuggested: boolean;
  createdAt: string;
  reportedBy: { name: string; avatar: string; department: string } | null;
  _count: { controls: number; tasks: number };
}

const CATEGORY_LABELS: Record<string, string> = {
  OPERATIONAL: 'Operational', COMPLIANCE: 'Compliance', FINANCIAL: 'Financial',
  STRATEGIC: 'Strategic', HR_TALENT: 'HR & Talent', IT_CYBER: 'IT & Cyber',
};
const CATEGORY_COLORS: Record<string, string> = {
  OPERATIONAL: '#4ab0de', COMPLIANCE: '#8b5cf6', FINANCIAL: '#f59e0b',
  STRATEGIC: '#ec4899', HR_TALENT: '#ef4444', IT_CYBER: '#10b981',
};
const LEVEL_COLORS: Record<string, string> = {
  CRITICAL: '#ef4444', HIGH: '#f59e0b', MEDIUM: '#4ab0de', LOW: '#10b981',
};
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; Icon: LucideIcon }> = {
  SUBMITTED: { label: 'Pending Review', color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)', Icon: Clock },
  IN_REVIEW: { label: 'In Review', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', Icon: Search },
  VALIDATED: { label: 'Validated', color: '#10b981', bg: 'rgba(16,185,129,0.15)', Icon: CheckCircle },
};

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

type FilterKey = 'all' | 'SUBMITTED' | 'IN_REVIEW' | 'VALIDATED';

export default function PendingReviewPage() {
  const router = useRouter();
  const [risks, setRisks] = useState<PendingRisk[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>('all');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/risks');
        const data = await res.json();
        setRisks(Array.isArray(data) ? data.filter((r: PendingRisk) => r.status !== 'DRAFT' && r.status !== 'REJECTED') : []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-primary)' }}>
        <Sidebar role="risk-manager" />
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading reviews...</div>
        </main>
      </div>
    );
  }

  const pendingCount = risks.filter((r) => r.status === 'SUBMITTED').length;
  const inReviewCount = risks.filter((r) => r.status === 'IN_REVIEW').length;
  const validatedCount = risks.filter((r) => r.status === 'VALIDATED' || r.status === 'ACCEPTED' || r.status === 'MITIGATED').length;

  const filtered = filter === 'all'
    ? risks
    : filter === 'VALIDATED'
      ? risks.filter((r) => r.status === 'VALIDATED' || r.status === 'ACCEPTED' || r.status === 'MITIGATED')
      : risks.filter((r) => r.status === filter);

  const filters: { key: FilterKey; label: string; count: number }[] = [
    { key: 'all', label: 'All Risks', count: risks.length },
    { key: 'SUBMITTED', label: 'Pending Review', count: pendingCount },
    { key: 'IN_REVIEW', label: 'In Review', count: inReviewCount },
    { key: 'VALIDATED', label: 'Completed', count: validatedCount },
  ];

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', overflow: 'hidden' }}>
      <Sidebar role="risk-manager" />

      <main style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {/* Header */}
        <div className="animate-fade-up" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Pending Review</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
              Review and validate risks submitted by business owners
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="animate-fade-up-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {[
            { label: 'Awaiting Review', value: pendingCount, color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', Icon: Clock },
            { label: 'In Progress', value: inReviewCount, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', Icon: AlertTriangle },
            { label: 'Completed', value: validatedCount, color: '#10b981', bg: 'rgba(16,185,129,0.1)', Icon: CheckCircle },
          ].map((s) => {
            const Icon = s.Icon;
            return (
              <div key={s.label} className="risk-card" style={{ padding: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={20} style={{ color: s.color }} />
                </div>
                <div>
                  <div style={{ fontSize: '26px', fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{s.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Filter Tabs */}
        <div className="animate-fade-up-2" style={{ display: 'flex', gap: '8px' }}>
          {filters.map((f) => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              style={{
                padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 500,
                background: filter === f.key ? 'rgba(74,176,222,0.15)' : 'var(--bg-card)',
                color: filter === f.key ? 'var(--accent-cyan)' : 'var(--text-muted)',
                border: filter === f.key ? '1px solid rgba(74,176,222,0.3)' : '1px solid var(--border-color)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px',
              }}>
              {f.label}
              <span style={{ background: filter === f.key ? 'rgba(74,176,222,0.2)' : 'rgba(160,160,192,0.1)', padding: '1px 6px', borderRadius: '8px', fontSize: '10px', fontWeight: 600 }}>
                {f.count}
              </span>
            </button>
          ))}
        </div>

        {/* Risk Cards */}
        <div className="animate-fade-up-3" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtered.length === 0 ? (
            <div className="risk-card" style={{ padding: '40px', textAlign: 'center' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No risks in this category.</div>
            </div>
          ) : (
            filtered.map((risk) => {
              const sc = STATUS_CONFIG[risk.status] || STATUS_CONFIG.SUBMITTED;
              const StatusIcon = sc.Icon;
              const catColor = CATEGORY_COLORS[risk.category] || '#4ab0de';
              const levelColor = LEVEL_COLORS[risk.riskLevel] || '#4ab0de';

              return (
                <div key={risk.id} className="risk-card" style={{ padding: '18px', cursor: 'pointer' }}
                  onClick={() => router.push(`/risk-manager/review/${risk.riskId}`)}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Badges */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
                        <span style={{ background: 'rgba(74,176,222,0.15)', color: 'var(--accent-cyan)', padding: '2px 8px', borderRadius: '5px', fontSize: '11px', fontWeight: 600 }}>
                          {risk.riskId}
                        </span>
                        <span style={{ background: sc.bg, color: sc.color, padding: '2px 8px', borderRadius: '5px', fontSize: '11px', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <StatusIcon size={10} /> {sc.label}
                        </span>
                        <span style={{ background: catColor + '22', color: catColor, padding: '2px 8px', borderRadius: '5px', fontSize: '11px' }}>
                          {CATEGORY_LABELS[risk.category] || risk.category}
                        </span>
                        {risk.aiSuggested && (
                          <span style={{ background: 'rgba(139,92,246,0.15)', color: '#8b5cf6', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 600 }}>AI</span>
                        )}
                      </div>

                      <div style={{ fontWeight: 600, fontSize: '15px', marginBottom: '4px' }}>{risk.title}</div>
                      <p style={{ margin: '0 0 10px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                        {risk.description.length > 180 ? risk.description.slice(0, 180) + '...' : risk.description}
                      </p>

                      <div style={{ display: 'flex', gap: '14px', fontSize: '11px', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                        <span>Submitted: {formatDate(risk.createdAt)}</span>
                        {risk.reportedBy && <span>By: {risk.reportedBy.name}</span>}
                        <span>Dept: {risk.department}</span>
                        <span>{risk._count.controls} control{risk._count.controls !== 1 ? 's' : ''}</span>
                      </div>
                    </div>

                    {/* Score + Action */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      <div style={{ width: '56px', height: '56px', borderRadius: '12px', background: levelColor + '18', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ fontSize: '22px', fontWeight: 800, color: levelColor, lineHeight: 1 }}>{risk.inherentScore}</div>
                        <div style={{ fontSize: '8px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginTop: '2px' }}>{risk.riskLevel}</div>
                      </div>
                      <button className="btn-primary" style={{ padding: '5px 12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                        onClick={(e) => { e.stopPropagation(); router.push(`/risk-manager/review/${risk.riskId}`); }}>
                        <Eye size={11} /> Review
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
