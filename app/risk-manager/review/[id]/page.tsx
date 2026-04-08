'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  AlertTriangle,
  Shield,
  Zap,
  FileText,
  Users,
  ChevronRight,
} from 'lucide-react';

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
  notes: string | null;
  aiSuggested: boolean;
  aiLikelihood: number | null;
  aiImpact: number | null;
  fraudRisk: boolean;
  fraudDescription: string | null;
  strategicObjective: string | null;
  createdAt: string;
  reportedBy: { id: string; name: string; avatar: string; role: string; department: string } | null;
  assignedTo: { id: string; name: string; avatar: string; role: string } | null;
  controls: Array<{ id: string; controlId: string; description: string; type: string; tasks: Array<{ taskId: string; title: string; status: string; dueDate: string | null }> }>;
  tasks: Array<{ taskId: string; title: string; status: string; dueDate: string | null; evidenceCount: number }>;
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
const LIKELIHOOD_LABELS: Record<number, string> = {
  1: 'Rare', 2: 'Unlikely', 3: 'Possible', 4: 'Likely', 5: 'Almost Certain',
};
const IMPACT_LABELS: Record<number, string> = {
  1: 'Negligible', 2: 'Minor', 3: 'Moderate', 4: 'Major', 5: 'Severe',
};

function getRiskLevel(score: number): { label: string; color: string } {
  if (score >= 20) return { label: 'Critical', color: '#ef4444' };
  if (score >= 12) return { label: 'High', color: '#f59e0b' };
  if (score >= 6) return { label: 'Medium', color: '#4ab0de' };
  return { label: 'Low', color: '#10b981' };
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ReviewRiskPage() {
  const params = useParams();
  const router = useRouter();
  const riskId = params.id as string;

  const [risk, setRisk] = useState<RiskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [adjLikelihood, setAdjLikelihood] = useState(0);
  const [adjImpact, setAdjImpact] = useState(0);
  const [decision, setDecision] = useState<'propose' | 'accept' | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/risks?riskId=${riskId}`);
        const data = await res.json();
        if (data && !data.error) {
          setRisk(data);
          setAdjLikelihood(data.likelihood);
          setAdjImpact(data.impact);
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    load();
  }, [riskId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-primary)' }}>
        <Sidebar role="risk-manager" />
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading risk details...</div>
        </main>
      </div>
    );
  }

  if (!risk) {
    return (
      <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-primary)' }}>
        <Sidebar role="risk-manager" />
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Risk not found</div>
          <Link href="/risk-manager/review" style={{ color: 'var(--accent-cyan)', fontSize: '13px' }}>Back to reviews</Link>
        </main>
      </div>
    );
  }

  const adjScore = adjLikelihood * adjImpact;
  const adjLevel = getRiskLevel(adjScore);
  const catColor = CATEGORY_COLORS[risk.category] || '#4ab0de';
  const levelColor = LEVEL_COLORS[risk.riskLevel] || '#4ab0de';

  // Related risks from same department (placeholder)
  const relatedRisks = risk.controls.length;

  const handleAccept = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/risk-manager/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          riskId: risk.id,
          action: 'accept',
          likelihood: adjLikelihood,
          impact: adjImpact,
        }),
      });
      if (res.ok) {
        setToast('Risk accepted successfully');
        setTimeout(() => router.push('/risk-manager/review'), 1500);
      }
    } catch { setToast('Error accepting risk'); }
    finally { setSubmitting(false); }
  };

  const handleReject = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/risk-manager/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          riskId: risk.id,
          action: 'reject',
          reason: rejectReason,
        }),
      });
      if (res.ok) {
        setShowRejectModal(false);
        setToast('Risk rejected');
        setTimeout(() => router.push('/risk-manager/review'), 1500);
      }
    } catch { setToast('Error rejecting risk'); }
    finally { setSubmitting(false); }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', overflow: 'hidden' }}>
      <Sidebar role="risk-manager" />

      <main style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {/* Toast */}
        {toast && (
          <div style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 2000, background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', padding: '14px 22px', borderRadius: '12px', fontWeight: 600, fontSize: '14px', boxShadow: '0 8px 32px rgba(16,185,129,0.4)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={16} /> {toast}
          </div>
        )}

        {/* Reject Modal */}
        {showRejectModal && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => setShowRejectModal(false)}>
            <div style={{ background: 'var(--bg-card)', borderRadius: '16px', padding: '28px', maxWidth: '480px', width: '90%', border: '1px solid var(--border-color)' }}
              onClick={(e) => e.stopPropagation()}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 12px' }}>Reject Risk</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>Provide a reason for rejecting this risk submission.</p>
              <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason for rejection..."
                rows={4}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '13px', resize: 'none', outline: 'none', fontFamily: 'inherit', marginBottom: '16px' }} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button className="btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }} onClick={() => setShowRejectModal(false)}>Cancel</button>
                <button style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '8px', border: 'none', background: '#ef4444', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                  onClick={handleReject} disabled={submitting}>{submitting ? 'Rejecting...' : 'Reject Risk'}</button>
              </div>
            </div>
          </div>
        )}

        {/* Breadcrumb */}
        <div className="animate-fade-up" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)' }}>
          <Link href="/risk-manager/review" style={{ color: 'var(--accent-cyan)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ArrowLeft size={14} /> Pending Review
          </Link>
          <ChevronRight size={14} />
          <span>{risk.title}</span>
        </div>

        {/* Header */}
        <div className="animate-fade-up" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 6px' }}>{risk.title}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ background: catColor + '22', color: catColor, padding: '2px 8px', borderRadius: '5px', fontSize: '11px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <FileText size={10} /> {CATEGORY_LABELS[risk.category]} Risk
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Users size={12} /> {risk.department} Department
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={12} /> Submitted: {formatDate(risk.createdAt)}
              </span>
            </div>
          </div>
          <span style={{
            background: risk.status === 'SUBMITTED' ? 'rgba(139,92,246,0.15)' : 'rgba(16,185,129,0.15)',
            color: risk.status === 'SUBMITTED' ? '#8b5cf6' : '#10b981',
            padding: '4px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
          }}>
            {risk.status === 'SUBMITTED' ? 'Pending Review' : risk.status}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '18px', alignItems: 'start' }}>
          {/* LEFT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Risk Description */}
            <div className="risk-card animate-fade-up-1" style={{ padding: '22px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={16} style={{ opacity: 0.7 }} /> Risk Description
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.65, margin: '0 0 16px' }}>{risk.description}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Risk Category</div>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>{CATEGORY_LABELS[risk.category]}</div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Related Project</div>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>{risk.process || risk.strategicObjective || risk.department + ' Operations'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Potential Impact</div>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>{IMPACT_LABELS[risk.impact]}</div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Affected Systems</div>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>{risk.department}</div>
                </div>
              </div>
            </div>

            {/* Business Owner Assessment */}
            <div className="risk-card animate-fade-up-2" style={{ padding: '22px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={16} style={{ opacity: 0.7 }} /> Business Owner Assessment
              </h3>
              <div style={{ padding: '16px', borderRadius: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600 }}>Submitted Rating</span>
                  {risk.reportedBy && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Rated by {risk.reportedBy.name}</span>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', textAlign: 'center' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Likelihood</div>
                    <div style={{ fontSize: '28px', fontWeight: 800, color: '#4ab0de', lineHeight: 1 }}>{risk.likelihood}</div>
                    <div style={{ fontSize: '11px', color: '#4ab0de', marginTop: '2px' }}>{LIKELIHOOD_LABELS[risk.likelihood]}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Impact</div>
                    <div style={{ fontSize: '28px', fontWeight: 800, color: '#ef4444', lineHeight: 1 }}>{risk.impact}</div>
                    <div style={{ fontSize: '11px', color: '#ef4444', marginTop: '2px' }}>{IMPACT_LABELS[risk.impact]}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Inherent Risk</div>
                    <div style={{ fontSize: '28px', fontWeight: 800, color: levelColor, lineHeight: 1 }}>{risk.inherentScore}</div>
                    <div style={{ fontSize: '11px', color: levelColor, marginTop: '2px' }}>{risk.riskLevel}</div>
                  </div>
                </div>
              </div>
              {risk.notes && (
                <div style={{ padding: '12px 14px', borderRadius: '8px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>Business Owner Notes</div>
                  &ldquo;{risk.notes}&rdquo;
                </div>
              )}
            </div>

            {/* Your Validation */}
            <div className="risk-card animate-fade-up-3" style={{ padding: '22px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={16} style={{ color: '#8b5cf6' }} /> Your Validation
              </h3>

              {/* Adjust Rating */}
              <div style={{ padding: '16px', borderRadius: '10px', background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)', marginBottom: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#8b5cf6', marginBottom: '12px' }}>Adjust Rating (if needed)</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 140px', gap: '12px', alignItems: 'end' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Likelihood</label>
                    <select value={adjLikelihood} onChange={(e) => setAdjLikelihood(parseInt(e.target.value))}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }}>
                      {[1, 2, 3, 4, 5].map((v) => <option key={v} value={v}>{v} - {LIKELIHOOD_LABELS[v]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Impact</label>
                    <select value={adjImpact} onChange={(e) => setAdjImpact(parseInt(e.target.value))}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }}>
                      {[1, 2, 3, 4, 5].map((v) => <option key={v} value={v}>{v} - {IMPACT_LABELS[v]}</option>)}
                    </select>
                  </div>
                  <div style={{ textAlign: 'center', padding: '8px', borderRadius: '10px', background: adjLevel.color + '18' }}>
                    <div style={{ fontSize: '28px', fontWeight: 800, color: adjLevel.color, lineHeight: 1 }}>{adjScore}</div>
                    <div style={{ fontSize: '11px', color: adjLevel.color, fontWeight: 600, marginTop: '2px' }}>{adjLevel.label}</div>
                  </div>
                </div>
              </div>

              {/* AI Recommendation */}
              <div style={{ padding: '14px 16px', borderRadius: '10px', background: 'rgba(74,176,222,0.06)', border: '1px solid rgba(74,176,222,0.15)', marginBottom: '16px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <Zap size={16} style={{ color: '#4ab0de', marginTop: '2px', flexShrink: 0 }} />
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  Based on the <strong style={{ color: 'var(--text-primary)' }}>{adjLevel.label.toLowerCase()} inherent risk score ({adjScore})</strong> and the {CATEGORY_LABELS[risk.category]?.toLowerCase()}-critical nature of this risk, I recommend <strong style={{ color: 'var(--text-primary)' }}>{adjScore >= 12 ? 'proposing controls' : 'accepting as-is'}</strong> to {adjScore >= 12 ? 'mitigate exposure' : 'acknowledge within tolerance'}. {adjScore >= 12 ? 'Key controls should address the identified risk factors.' : 'Risk is within acceptable tolerance levels.'}
                </div>
              </div>

              {/* Decision */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '10px' }}>Your Decision</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div onClick={() => setDecision('propose')}
                    style={{
                      padding: '14px 16px', borderRadius: '10px', cursor: 'pointer',
                      background: decision === 'propose' ? 'rgba(16,185,129,0.08)' : 'var(--bg-primary)',
                      border: decision === 'propose' ? '2px solid #10b981' : '1px solid var(--border-color)',
                      display: 'flex', alignItems: 'center', gap: '12px',
                    }}>
                    <div style={{
                      width: '22px', height: '22px', borderRadius: '50%',
                      border: decision === 'propose' ? '2px solid #10b981' : '2px solid var(--border-color)',
                      background: decision === 'propose' ? '#10b981' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {decision === 'propose' && <CheckCircle size={14} color="#fff" />}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Shield size={14} style={{ color: '#8b5cf6' }} /> Propose Controls
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Risk requires mitigation. You&apos;ll define controls and assign tasks to the Business Owner.</div>
                    </div>
                  </div>

                  <div onClick={() => setDecision('accept')}
                    style={{
                      padding: '14px 16px', borderRadius: '10px', cursor: 'pointer',
                      background: decision === 'accept' ? 'rgba(74,176,222,0.08)' : 'var(--bg-primary)',
                      border: decision === 'accept' ? '2px solid #4ab0de' : '1px solid var(--border-color)',
                      display: 'flex', alignItems: 'center', gap: '12px',
                    }}>
                    <div style={{
                      width: '22px', height: '22px', borderRadius: '50%',
                      border: decision === 'accept' ? '2px solid #4ab0de' : '2px solid var(--border-color)',
                      background: decision === 'accept' ? '#4ab0de' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {decision === 'accept' && <CheckCircle size={14} color="#fff" />}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CheckCircle size={14} style={{ color: '#4ab0de' }} /> Accept Risk (No Controls)
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Risk is within tolerance. Validate and close without additional controls.</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <Link href="/risk-manager/review" style={{ textDecoration: 'none' }}>
                  <button className="btn-secondary" style={{ padding: '10px 20px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ArrowLeft size={14} /> Back
                  </button>
                </Link>

                {decision === 'propose' ? (
                  <button className="btn-primary" style={{ flex: 1, padding: '10px 20px', fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    onClick={() => router.push(`/risk-manager/review/${risk.riskId}/controls?id=${risk.id}&l=${adjLikelihood}&i=${adjImpact}`)}>
                    Continue to Propose Controls <ChevronRight size={16} />
                  </button>
                ) : decision === 'accept' ? (
                  <button style={{ flex: 1, padding: '10px 20px', fontSize: '14px', fontWeight: 700, borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    onClick={handleAccept} disabled={submitting}>
                    <CheckCircle size={16} /> {submitting ? 'Accepting...' : 'Accept Risk'}
                  </button>
                ) : (
                  <button style={{ flex: 1, padding: '10px 20px', fontSize: '14px', fontWeight: 600, borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-muted)', cursor: 'not-allowed' }} disabled>
                    Select a decision above
                  </button>
                )}

                <button style={{ padding: '10px 16px', fontSize: '13px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#ef4444', cursor: 'pointer', fontWeight: 600 }}
                  onClick={() => setShowRejectModal(true)}>
                  Reject
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Risk Owner */}
            <div className="risk-card animate-fade-up-1" style={{ padding: '18px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 600, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Users size={14} /> Risk Owner
              </h4>
              {risk.reportedBy && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #4ab0de, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: '#fff' }}>
                    {risk.reportedBy.avatar || risk.reportedBy.name.split(' ').map((n) => n[0]).join('')}
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>{risk.reportedBy.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Business Owner &middot; {risk.reportedBy.department}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Inherent Risk Score */}
            <div className="risk-card animate-fade-up-2" style={{ padding: '18px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase' }}>Inherent Risk</div>
              <div style={{ fontSize: '48px', fontWeight: 800, color: levelColor, lineHeight: 1 }}>{risk.inherentScore}</div>
              <div style={{ fontSize: '12px', color: levelColor, fontWeight: 600, marginTop: '4px' }}>{risk.riskLevel}</div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                <span>L: {risk.likelihood}</span>
                <span>x</span>
                <span>I: {risk.impact}</span>
              </div>
            </div>

            {/* Related Risks */}
            <div className="risk-card animate-fade-up-3" style={{ padding: '18px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 600, margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle size={14} /> Related Risks
              </h4>
              {risk.controls.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {risk.controls.map((ctrl) => (
                    <div key={ctrl.id} style={{ padding: '10px', borderRadius: '8px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '12px', fontWeight: 600 }}>{ctrl.description}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{ctrl.type} &middot; {ctrl.tasks.length} tasks</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No controls assigned yet</div>
              )}
            </div>

            {/* Risk Context */}
            <div className="risk-card animate-fade-up-4" style={{ padding: '18px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 600, margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Zap size={14} style={{ color: '#f59e0b' }} /> Risk Context
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ padding: '10px', borderRadius: '8px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600 }}>Similar Risks in Registry</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{relatedRisks} {CATEGORY_LABELS[risk.category]?.toLowerCase()} risks from {risk.department}</div>
                </div>
                {risk.aiSuggested && (
                  <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#8b5cf6' }}>AI-Identified Risk</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>This risk was identified by the AI copilot</div>
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
