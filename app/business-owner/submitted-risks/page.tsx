'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import {
  CheckCircle,
  Clock,
  Search,
  Shield,
  AlertTriangle,
  Eye,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';

interface RiskItem {
  id: string;
  riskId: string;
  title: string;
  description: string;
  category: string;
  status: string;
  likelihood: number;
  impact: number;
  inherentScore: number;
  riskLevel: string;
  aiSuggested: boolean;
  createdAt: string;
  _count: { controls: number; tasks: number };
}

const statusConfig: Record<string, { label: string; bg: string; color: string; border: string; Icon: LucideIcon }> = {
  SUBMITTED: { label: 'Submitted', bg: 'rgba(139,92,246,0.15)', color: '#8b5cf6', border: '1px solid rgba(139,92,246,0.3)', Icon: Clock },
  IN_REVIEW: { label: 'In Review', bg: 'rgba(74,176,222,0.15)', color: '#4ab0de', border: '1px solid rgba(74,176,222,0.3)', Icon: Search },
  VALIDATED: { label: 'Validated', bg: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', Icon: CheckCircle },
  ACCEPTED: { label: 'Accepted', bg: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', Icon: CheckCircle },
  REJECTED: { label: 'Rejected', bg: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', Icon: AlertTriangle },
  MITIGATED: { label: 'Mitigated', bg: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', Icon: Shield },
};

const categoryLabel: Record<string, string> = {
  OPERATIONAL: 'Operational',
  COMPLIANCE: 'Compliance',
  FINANCIAL: 'Financial',
  STRATEGIC: 'Strategic',
  HR_TALENT: 'HR & Talent',
  IT_CYBER: 'IT & Cyber',
};

const categoryColor: Record<string, string> = {
  OPERATIONAL: '#4ab0de',
  COMPLIANCE: '#8b5cf6',
  FINANCIAL: '#f59e0b',
  STRATEGIC: '#ec4899',
  HR_TALENT: '#ef4444',
  IT_CYBER: '#10b981',
};

const riskLevelColor: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH: '#f59e0b',
  MEDIUM: '#4ab0de',
  LOW: '#10b981',
};

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

type FilterKey = 'all' | 'SUBMITTED' | 'IN_REVIEW' | 'VALIDATED' | 'MITIGATED';

export default function SubmittedRisksPage() {
  const router = useRouter();
  const [risks, setRisks] = useState<RiskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>('all');

  useEffect(() => {
    async function load() {
      try {
        const userRes = await fetch('/api/users?email=ahmed.mansouri@hei-adpu.ae');
        const user = await userRes.json();
        const risksRes = await fetch(`/api/risks?userId=${user.id}`);
        const data = await risksRes.json();
        setRisks(data);
      } catch (err) {
        console.error('Failed to load risks:', err);
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
          <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading risks...</div>
        </main>
      </div>
    );
  }

  // Exclude DRAFT status
  const submitted = risks.filter(r => r.status !== 'DRAFT');
  const filtered = filter === 'all' ? submitted : submitted.filter(r => r.status === filter);

  const counts = {
    all: submitted.length,
    SUBMITTED: submitted.filter(r => r.status === 'SUBMITTED').length,
    IN_REVIEW: submitted.filter(r => r.status === 'IN_REVIEW').length,
    VALIDATED: submitted.filter(r => r.status === 'VALIDATED' || r.status === 'ACCEPTED').length,
    MITIGATED: submitted.filter(r => r.status === 'MITIGATED').length,
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', overflow: 'hidden' }}>
      <Sidebar role="business-owner" />

      <main style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Header */}
        <div className="animate-fade-up" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0, lineHeight: 1.2 }}>My Submitted Risks</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
              Track the status of risks you&apos;ve reported
            </p>
          </div>
          <Link href="/business-owner/report-risk" style={{ textDecoration: 'none' }}>
            <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              Report New Risk <ArrowRight size={14} />
            </button>
          </Link>
        </div>

        {/* Stats Row (clickable filters) */}
        <div className="animate-fade-up-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          {[
            { key: 'all' as FilterKey, label: 'Total Submitted', value: counts.all, color: '#4ab0de' },
            { key: 'SUBMITTED' as FilterKey, label: 'Pending Review', value: counts.SUBMITTED + counts.IN_REVIEW, color: '#8b5cf6' },
            { key: 'VALIDATED' as FilterKey, label: 'Validated', value: counts.VALIDATED, color: '#10b981' },
            { key: 'MITIGATED' as FilterKey, label: 'Mitigated', value: counts.MITIGATED, color: '#10b981' },
          ].map((stat) => (
            <div key={stat.label} className="risk-card"
              onClick={() => setFilter(stat.key)}
              style={{
                padding: '16px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s',
                borderColor: filter === stat.key ? stat.color : undefined,
                boxShadow: filter === stat.key ? `0 0 20px ${stat.color}25` : undefined,
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLDivElement).style.borderColor = stat.color; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'none'; if (filter !== stat.key) (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-color)'; }}
            >
              <div style={{ fontSize: '26px', fontWeight: 700, color: stat.color, lineHeight: 1 }}>{stat.value}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Risk Cards */}
        <div className="animate-fade-up-3" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filtered.length === 0 ? (
            <div className="risk-card" style={{ padding: '40px', textAlign: 'center' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No risks found in this category.</div>
            </div>
          ) : (
            filtered.map((risk) => {
              const sc = statusConfig[risk.status] || statusConfig.SUBMITTED;
              const StatusIcon = sc.Icon;
              return (
                <div key={risk.id} className="risk-card" style={{ padding: '20px', cursor: 'pointer' }} onClick={() => router.push(`/business-owner/submitted-risks/${risk.riskId}`)}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Top row: badges */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                        <span style={{
                          background: 'rgba(74,176,222,0.15)', color: 'var(--accent-cyan)',
                          padding: '2px 8px', borderRadius: '5px', fontSize: '11px', fontWeight: 600,
                        }}>
                          {risk.riskId}
                        </span>
                        <span style={{
                          background: sc.bg, color: sc.color, border: sc.border,
                          padding: '2px 8px', borderRadius: '5px', fontSize: '11px', fontWeight: 500,
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                        }}>
                          <StatusIcon size={10} /> {sc.label}
                        </span>
                        <span style={{
                          background: `${categoryColor[risk.category]}22`,
                          color: categoryColor[risk.category] || 'var(--text-secondary)',
                          padding: '2px 8px', borderRadius: '5px', fontSize: '11px',
                        }}>
                          {categoryLabel[risk.category] || risk.category}
                        </span>
                        {risk.aiSuggested && (
                          <span style={{
                            background: 'rgba(139,92,246,0.15)', color: '#8b5cf6',
                            padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 600,
                          }}>
                            AI Suggested
                          </span>
                        )}
                      </div>

                      {/* Title & description */}
                      <div style={{ fontWeight: 600, fontSize: '15px', marginBottom: '4px' }}>{risk.title}</div>
                      <p style={{ margin: '0 0 10px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                        {risk.description.length > 160 ? risk.description.slice(0, 160) + '...' : risk.description}
                      </p>

                      {/* Meta row */}
                      <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>
                        <span>Submitted: {formatDate(risk.createdAt)}</span>
                        <span>{risk._count.controls} control{risk._count.controls !== 1 ? 's' : ''}</span>
                        <span>{risk._count.tasks} task{risk._count.tasks !== 1 ? 's' : ''}</span>
                      </div>
                    </div>

                    {/* Score + Action */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      <div style={{
                        width: '52px', height: '52px', borderRadius: '12px',
                        background: `${riskLevelColor[risk.riskLevel] || '#4ab0de'}18`,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: riskLevelColor[risk.riskLevel] || '#4ab0de', lineHeight: 1 }}>
                          {risk.inherentScore}
                        </div>
                        <div style={{ fontSize: '8px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginTop: '2px' }}>
                          {risk.riskLevel}
                        </div>
                      </div>
                      <button
                        className="btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                        onClick={() => router.push(`/business-owner/submitted-risks/${risk.riskId}`)}
                      >
                        <Eye size={11} /> View
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
