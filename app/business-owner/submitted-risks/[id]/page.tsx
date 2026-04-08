'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import {
  ArrowLeft,
  Calendar,
  CalendarDays,
  CheckCircle,
  Clock,
  Search,
  Shield,
  AlertTriangle,
  User,
  Sparkles,
  Settings,
  Scale,
  DollarSign,
  Target,
  Users,
  ShieldCheck,
  XCircle,
  type LucideIcon,
} from 'lucide-react';

/* ─── Types ─────────────────────────────────────────────────────────────────── */

interface ControlData {
  id: string;
  controlId: string;
  description: string;
  type: string;
  designRating: number | null;
  effectivenessRating: number | null;
  totalRating: number | null;
  adequacy: string | null;
  tasks: {
    taskId: string;
    title: string;
    status: string;
    dueDate: string | null;
    assignedTo: { name: string; avatar: string | null } | null;
  }[];
}

interface RiskDetail {
  id: string;
  riskId: string;
  title: string;
  description: string;
  category: string;
  department: string;
  process: string | null;
  likelihood: number;
  impact: number;
  inherentScore: number;
  riskLevel: string;
  status: string;
  aiSuggested: boolean;
  aiLikelihood: number | null;
  aiImpact: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  reportedBy: { id: string; name: string; avatar: string | null; role: string; department: string } | null;
  assignedTo: { id: string; name: string; avatar: string | null; role: string } | null;
  controls: ControlData[];
  tasks: { taskId: string; title: string; status: string; dueDate: string | null; evidenceCount: number }[];
}

/* ─── Helpers ───────────────────────────────────────────────────────────────── */

const statusConfig: Record<string, { label: string; bg: string; color: string; border: string; Icon: LucideIcon }> = {
  DRAFT: { label: 'Draft', bg: 'rgba(160,160,192,0.1)', color: 'var(--text-muted)', border: '1px solid var(--border-color)', Icon: Clock },
  SUBMITTED: { label: 'Submitted', bg: 'rgba(139,92,246,0.15)', color: '#8b5cf6', border: '1px solid rgba(139,92,246,0.3)', Icon: Clock },
  IN_REVIEW: { label: 'In Review', bg: 'rgba(74,176,222,0.15)', color: '#4ab0de', border: '1px solid rgba(74,176,222,0.3)', Icon: Search },
  VALIDATED: { label: 'Validated', bg: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', Icon: CheckCircle },
  ACCEPTED: { label: 'Accepted', bg: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', Icon: CheckCircle },
  REJECTED: { label: 'Rejected', bg: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', Icon: AlertTriangle },
  MITIGATED: { label: 'Mitigated', bg: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', Icon: Shield },
};

const taskStatusStyle: Record<string, React.CSSProperties> = {
  OVERDUE: { background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' },
  CHANGES_REQUESTED: { background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' },
  IN_PROGRESS: { background: 'rgba(74,176,222,0.15)', color: '#4ab0de', border: '1px solid rgba(74,176,222,0.3)' },
  SUBMITTED: { background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' },
  COMPLETED: { background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' },
  PENDING: { background: 'rgba(139,92,246,0.15)', color: '#8b5cf6', border: '1px solid rgba(139,92,246,0.3)' },
};

const taskStatusLabel: Record<string, string> = {
  PENDING: 'Pending', IN_PROGRESS: 'In Progress', CHANGES_REQUESTED: 'Changes',
  SUBMITTED: 'Submitted', COMPLETED: 'Completed', OVERDUE: 'Overdue',
};

const categoryConfig: Record<string, { label: string; color: string; Icon: LucideIcon }> = {
  OPERATIONAL: { label: 'Operational', color: '#4ab0de', Icon: Settings },
  COMPLIANCE: { label: 'Compliance', color: '#8b5cf6', Icon: Scale },
  FINANCIAL: { label: 'Financial', color: '#f59e0b', Icon: DollarSign },
  STRATEGIC: { label: 'Strategic', color: '#ec4899', Icon: Target },
  HR_TALENT: { label: 'HR & Talent', color: '#ef4444', Icon: Users },
  IT_CYBER: { label: 'IT & Cyber', color: '#10b981', Icon: ShieldCheck },
};

const riskLevelColor: Record<string, string> = {
  CRITICAL: '#ef4444', HIGH: '#f59e0b', MEDIUM: '#4ab0de', LOW: '#10b981',
};

const controlTypeLabel: Record<string, string> = {
  PREVENTIVE: 'Preventive', DETECTIVE: 'Detective', CORRECTIVE: 'Corrective',
};

const likelihoodLabel: Record<number, string> = {
  1: 'Rare', 2: 'Unlikely', 3: 'Possible', 4: 'Likely', 5: 'Almost Certain',
};
const impactLabel: Record<number, string> = {
  1: 'Negligible', 2: 'Minor', 3: 'Moderate', 4: 'Major', 5: 'Severe',
};

function formatDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/* ─── Component ─────────────────────────────────────────────────────────────── */

export default function RiskDetailPage() {
  const params = useParams();
  const riskId = params?.id as string;

  const [risk, setRisk] = useState<RiskDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/risks?riskId=${riskId}`);
        if (res.ok) {
          setRisk(await res.json());
        }
      } catch { /* */ }
      setLoading(false);
    }
    load();
  }, [riskId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-primary)' }}>
        <Sidebar role="business-owner" />
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading risk details...</div>
        </main>
      </div>
    );
  }

  if (!risk) {
    return (
      <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-primary)' }}>
        <Sidebar role="business-owner" />
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <XCircle size={32} color="var(--text-muted)" style={{ marginBottom: '12px' }} />
            <div style={{ color: 'var(--text-secondary)', fontSize: '15px', marginBottom: '16px' }}>
              Risk &ldquo;{riskId}&rdquo; not found
            </div>
            <Link href="/business-owner/submitted-risks" className="btn-primary" style={{ textDecoration: 'none' }}>
              <ArrowLeft size={14} /> Back to Submitted Risks
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const sc = statusConfig[risk.status] || statusConfig.SUBMITTED;
  const StatusIcon = sc.Icon;
  const cat = categoryConfig[risk.category] || categoryConfig.OPERATIONAL;
  const CatIcon = cat.Icon;

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', overflow: 'hidden' }}>
      <Sidebar role="business-owner" />

      <main style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
        <div style={{ maxWidth: '1100px', display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', alignItems: 'start' }}>

          {/* ── LEFT COLUMN ────────────────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Breadcrumb */}
            <div className="animate-fade-up" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)' }}>
              <Link href="/business-owner/submitted-risks" style={{ color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ArrowLeft size={12} /> My Submitted Risks
              </Link>
              <span>&rsaquo;</span>
              <span style={{ color: 'var(--accent-cyan)' }}>{risk.riskId}</span>
            </div>

            {/* Risk Header */}
            <div className="animate-fade-up-1">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
                <span style={{
                  background: 'rgba(74,176,222,0.15)', color: 'var(--accent-cyan)',
                  border: '1px solid rgba(74,176,222,0.3)', padding: '3px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                }}>
                  {risk.riskId}
                </span>
                <span style={{
                  background: sc.bg, color: sc.color, border: sc.border,
                  padding: '3px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 500,
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                }}>
                  <StatusIcon size={11} /> {sc.label}
                </span>
                <span style={{
                  background: `${cat.color}22`, color: cat.color,
                  padding: '3px 10px', borderRadius: '6px', fontSize: '12px',
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                }}>
                  <CatIcon size={11} /> {cat.label}
                </span>
                {risk.aiSuggested && (
                  <span style={{
                    background: 'rgba(139,92,246,0.15)', color: '#8b5cf6',
                    padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                  }}>
                    <Sparkles size={10} /> AI Suggested
                  </span>
                )}
              </div>

              <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 10px', lineHeight: 1.3 }}>
                {risk.title}
              </h1>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Calendar size={13} style={{ opacity: 0.6 }} /> Submitted: {formatDate(risk.createdAt)}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <CalendarDays size={13} style={{ opacity: 0.6 }} /> Updated: {formatDate(risk.updatedAt)}
                </span>
                {risk.department && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <User size={13} style={{ opacity: 0.6 }} /> {risk.department}
                  </span>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="risk-card animate-fade-up-2" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '11px', fontWeight: 600, margin: '0 0 12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Risk Description
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                {risk.description}
              </p>
              {risk.notes && (
                <div style={{ marginTop: '14px', padding: '12px', borderRadius: '8px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Notes</div>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{risk.notes}</p>
                </div>
              )}
            </div>

            {/* Risk Assessment */}
            <div className="risk-card animate-fade-up-2" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '11px', fontWeight: 600, margin: '0 0 14px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Risk Assessment
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div style={{ padding: '16px', borderRadius: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>LIKELIHOOD</div>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{risk.likelihood}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{likelihoodLabel[risk.likelihood] || ''}</div>
                  {risk.aiLikelihood && risk.aiLikelihood !== risk.likelihood && (
                    <div style={{ fontSize: '10px', color: '#8b5cf6', marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                      <Sparkles size={9} /> AI: {risk.aiLikelihood}
                    </div>
                  )}
                </div>
                <div style={{ padding: '16px', borderRadius: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>IMPACT</div>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{risk.impact}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{impactLabel[risk.impact] || ''}</div>
                  {risk.aiImpact && risk.aiImpact !== risk.impact && (
                    <div style={{ fontSize: '10px', color: '#8b5cf6', marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                      <Sparkles size={9} /> AI: {risk.aiImpact}
                    </div>
                  )}
                </div>
                <div style={{ padding: '16px', borderRadius: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>INHERENT SCORE</div>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: riskLevelColor[risk.riskLevel] || '#4ab0de', lineHeight: 1 }}>{risk.inherentScore}</div>
                  <div style={{ fontSize: '11px', color: riskLevelColor[risk.riskLevel], fontWeight: 600, marginTop: '4px' }}>{risk.riskLevel}</div>
                </div>
              </div>
            </div>

            {/* Controls */}
            {risk.controls.length > 0 && (
              <div className="animate-fade-up-3" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>
                  Controls ({risk.controls.length})
                </h3>
                {risk.controls.map((ctl) => (
                  <div key={ctl.id} className="risk-card" style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span style={{
                        background: 'rgba(74,176,222,0.15)', color: 'var(--accent-cyan)',
                        padding: '2px 8px', borderRadius: '5px', fontSize: '11px', fontWeight: 600,
                      }}>
                        {ctl.controlId}
                      </span>
                      <span style={{
                        background: 'rgba(139,92,246,0.15)', color: 'var(--accent-purple)',
                        padding: '2px 8px', borderRadius: '5px', fontSize: '11px',
                      }}>
                        {controlTypeLabel[ctl.type] || ctl.type}
                      </span>
                      {ctl.adequacy && (
                        <span style={{
                          background: ctl.adequacy === 'Adequate' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                          color: ctl.adequacy === 'Adequate' ? '#10b981' : '#f59e0b',
                          padding: '2px 8px', borderRadius: '5px', fontSize: '11px',
                        }}>
                          {ctl.adequacy}
                        </span>
                      )}
                    </div>
                    <p style={{ margin: '0 0 12px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      {ctl.description}
                    </p>

                    {/* Control ratings */}
                    <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-muted)', marginBottom: ctl.tasks.length > 0 ? '14px' : '0' }}>
                      {ctl.designRating && <span>Design: <strong style={{ color: 'var(--text-primary)' }}>{ctl.designRating}/5</strong></span>}
                      {ctl.effectivenessRating && <span>Effectiveness: <strong style={{ color: 'var(--text-primary)' }}>{ctl.effectivenessRating}/5</strong></span>}
                      {ctl.totalRating && <span>Total: <strong style={{ color: 'var(--text-primary)' }}>{ctl.totalRating}</strong></span>}
                    </div>

                    {/* Tasks under this control */}
                    {ctl.tasks.length > 0 && (
                      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                        <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                          Assigned Tasks
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {ctl.tasks.map((t) => (
                            <Link
                              key={t.taskId}
                              href={`/business-owner/tasks/${t.taskId}`}
                              style={{ textDecoration: 'none', color: 'inherit' }}
                            >
                              <div style={{
                                padding: '8px 12px', borderRadius: '8px', background: 'var(--bg-primary)',
                                border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center',
                                justifyContent: 'space-between', fontSize: '12px', cursor: 'pointer',
                                transition: 'border-color 0.2s',
                              }}
                                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--accent-cyan)'; }}
                                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-color)'; }}
                              >
                                <div>
                                  <span style={{ color: 'var(--accent-cyan)', fontWeight: 600, marginRight: '8px' }}>{t.taskId}</span>
                                  <span style={{ color: 'var(--text-primary)' }}>{t.title}</span>
                                </div>
                                <span style={{
                                  fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: 500,
                                  ...(taskStatusStyle[t.status] || {}),
                                }}>
                                  {taskStatusLabel[t.status] || t.status}
                                </span>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── RIGHT COLUMN ───────────────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Risk Score Card */}
            <div className="animate-fade-up" style={{
              padding: '24px', borderRadius: '12px', textAlign: 'center',
              background: 'rgba(74,176,222,0.04)', border: '1px solid transparent',
              backgroundImage: 'linear-gradient(var(--bg-card), var(--bg-card)), linear-gradient(135deg, #4ab0de 0%, #8b5cf6 100%)',
              backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box',
            }}>
              <div style={{ fontSize: '48px', fontWeight: 800, color: riskLevelColor[risk.riskLevel] || '#4ab0de', lineHeight: 1 }}>
                {risk.inherentScore}
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: riskLevelColor[risk.riskLevel], marginTop: '4px' }}>
                {risk.riskLevel} RISK
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                {risk.likelihood} (Likelihood) &times; {risk.impact} (Impact)
              </div>
            </div>

            {/* Details Card */}
            <div className="risk-card animate-fade-up-1" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '11px', fontWeight: 600, margin: '0 0 14px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Risk Details
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { label: 'Risk ID', value: risk.riskId },
                  { label: 'Category', value: cat.label },
                  { label: 'Department', value: risk.department },
                  ...(risk.process ? [{ label: 'Process', value: risk.process }] : []),
                  { label: 'Status', value: sc.label },
                  { label: 'Controls', value: `${risk.controls.length}` },
                  { label: 'Tasks', value: `${risk.tasks.length}` },
                ].map((row) => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{row.label}</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* People */}
            <div className="risk-card animate-fade-up-2" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '11px', fontWeight: 600, margin: '0 0 14px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                People
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {risk.reportedBy && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '50%',
                      background: 'linear-gradient(135deg, #4ab0de 0%, #8b5cf6 100%)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '11px', fontWeight: 700, color: '#fff', flexShrink: 0,
                    }}>
                      {risk.reportedBy.avatar || 'U'}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600 }}>{risk.reportedBy.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Reported By</div>
                    </div>
                  </div>
                )}
                {risk.assignedTo && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '50%',
                      background: 'rgba(139,92,246,0.3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '11px', fontWeight: 700, color: '#8b5cf6', flexShrink: 0,
                    }}>
                      {risk.assignedTo.avatar || 'U'}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600 }}>{risk.assignedTo.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Assigned To (Risk Manager)</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Timeline */}
            <div className="risk-card animate-fade-up-3" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '11px', fontWeight: 600, margin: '0 0 14px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Timeline
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative', paddingLeft: '20px' }}>
                {/* Vertical line */}
                <div style={{ position: 'absolute', left: '5px', top: '6px', bottom: '6px', width: '2px', background: 'var(--border-color)' }} />

                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '-20px', top: '2px', width: '12px', height: '12px', borderRadius: '50%', background: '#10b981', border: '2px solid var(--bg-card)' }} />
                  <div style={{ fontSize: '12px', fontWeight: 600 }}>Risk Created</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatDate(risk.createdAt)}</div>
                </div>

                {risk.status !== 'DRAFT' && risk.status !== 'SUBMITTED' && (
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '-20px', top: '2px', width: '12px', height: '12px', borderRadius: '50%', background: '#4ab0de', border: '2px solid var(--bg-card)' }} />
                    <div style={{ fontSize: '12px', fontWeight: 600 }}>Under Review</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Risk Manager reviewing</div>
                  </div>
                )}

                {(risk.status === 'VALIDATED' || risk.status === 'ACCEPTED' || risk.status === 'MITIGATED') && (
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '-20px', top: '2px', width: '12px', height: '12px', borderRadius: '50%', background: '#10b981', border: '2px solid var(--bg-card)' }} />
                    <div style={{ fontSize: '12px', fontWeight: 600 }}>Validated</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Controls assigned</div>
                  </div>
                )}

                {risk.status === 'MITIGATED' && (
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '-20px', top: '2px', width: '12px', height: '12px', borderRadius: '50%', background: '#10b981', border: '2px solid var(--bg-card)' }} />
                    <div style={{ fontSize: '12px', fontWeight: 600 }}>Mitigated</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Risk fully addressed</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
