'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import {
  ArrowLeft,
  CheckCircle,
  Plus,
  X,
  Shield,
  Zap,
  ChevronRight,
  Clock,
  Users,
  ArrowRight,
} from 'lucide-react';

interface RiskBasic {
  id: string;
  riskId: string;
  title: string;
  category: string;
  department: string;
  inherentScore: number;
  riskLevel: string;
  reportedBy: { id: string; name: string; department: string } | null;
}

interface ControlDraft {
  id: string;
  description: string;
  type: 'PREVENTIVE' | 'DETECTIVE' | 'CORRECTIVE';
  assignToId: string;
  dueDate: string;
  priority: 'High' | 'Medium' | 'Low';
  aiSuggested: boolean;
}

interface UserOption {
  id: string;
  name: string;
  department: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  OPERATIONAL: 'Operational', COMPLIANCE: 'Compliance', FINANCIAL: 'Financial',
  STRATEGIC: 'Strategic', HR_TALENT: 'HR & Talent', IT_CYBER: 'IT & Cyber',
};
const LEVEL_COLORS: Record<string, string> = {
  CRITICAL: '#ef4444', HIGH: '#f59e0b', MEDIUM: '#4ab0de', LOW: '#10b981',
};

function getRiskLevel(score: number): string {
  if (score >= 20) return 'Critical';
  if (score >= 12) return 'High';
  if (score >= 6) return 'Medium';
  return 'Low';
}

// AI-suggested controls based on category
function getAiControls(category: string): Array<{ description: string; type: 'PREVENTIVE' | 'DETECTIVE' }> {
  const suggestions: Record<string, Array<{ description: string; type: 'PREVENTIVE' | 'DETECTIVE' }>> = {
    COMPLIANCE: [
      { description: 'Engage Local Regulatory Consultant', type: 'PREVENTIVE' },
      { description: 'Compliance Checklist & Timeline', type: 'PREVENTIVE' },
      { description: 'Regular Compliance Status Reviews', type: 'DETECTIVE' },
    ],
    FINANCIAL: [
      { description: 'Budget Variance Monitoring & Reporting', type: 'DETECTIVE' },
      { description: 'Financial Controls Reconciliation', type: 'PREVENTIVE' },
      { description: 'Quarterly Financial Audit Review', type: 'DETECTIVE' },
    ],
    OPERATIONAL: [
      { description: 'Process Documentation & SOP Update', type: 'PREVENTIVE' },
      { description: 'Operational Risk Monitoring Dashboard', type: 'DETECTIVE' },
      { description: 'Business Continuity Plan Review', type: 'PREVENTIVE' },
    ],
    IT_CYBER: [
      { description: 'Security Vulnerability Assessment', type: 'DETECTIVE' },
      { description: 'Access Control Policy Implementation', type: 'PREVENTIVE' },
      { description: 'Incident Response Plan Update', type: 'PREVENTIVE' },
    ],
    STRATEGIC: [
      { description: 'Strategic Risk Assessment Workshop', type: 'PREVENTIVE' },
      { description: 'Market Analysis & Monitoring', type: 'DETECTIVE' },
      { description: 'Stakeholder Communication Plan', type: 'PREVENTIVE' },
    ],
    HR_TALENT: [
      { description: 'Talent Retention Program Review', type: 'PREVENTIVE' },
      { description: 'HR Compliance Audit', type: 'DETECTIVE' },
      { description: 'Succession Planning Update', type: 'PREVENTIVE' },
    ],
  };
  return suggestions[category] || suggestions.OPERATIONAL;
}

export default function ProposeControlsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const riskIdParam = params.id as string;
  const internalId = searchParams.get('id') || '';
  const adjL = parseInt(searchParams.get('l') || '3');
  const adjI = parseInt(searchParams.get('i') || '3');

  const [risk, setRisk] = useState<RiskBasic | null>(null);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [controls, setControls] = useState<ControlDraft[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<Array<{ description: string; type: 'PREVENTIVE' | 'DETECTIVE'; selected: boolean }>>([]);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [riskRes, usersRes] = await Promise.all([
          fetch(`/api/risks?riskId=${riskIdParam}`),
          fetch('/api/users?role=BUSINESS_OWNER'),
        ]);
        const riskData = await riskRes.json();
        const usersData = await usersRes.json();
        if (riskData && !riskData.error) {
          setRisk(riskData);
          const suggestions = getAiControls(riskData.category);
          setAiSuggestions(suggestions.map((s) => ({ ...s, selected: false })));
        }
        setUsers(Array.isArray(usersData) ? usersData : [usersData].filter(Boolean));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    load();
  }, [riskIdParam]);

  const toggleAiSuggestion = (idx: number) => {
    setAiSuggestions((prev) => prev.map((s, i) => i === idx ? { ...s, selected: !s.selected } : s));
    const sug = aiSuggestions[idx];
    if (!sug.selected) {
      // Add to controls
      const defaultUser = risk?.reportedBy?.id || users[0]?.id || '';
      const defaultDate = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];
      setControls((prev) => [...prev, {
        id: `ai-${Date.now()}-${idx}`,
        description: sug.description,
        type: sug.type,
        assignToId: defaultUser,
        dueDate: defaultDate,
        priority: 'High',
        aiSuggested: true,
      }]);
    } else {
      // Remove from controls
      setControls((prev) => prev.filter((c) => c.description !== sug.description));
    }
  };

  const addEmptyControl = () => {
    const defaultUser = risk?.reportedBy?.id || users[0]?.id || '';
    const defaultDate = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];
    setControls((prev) => [...prev, {
      id: `manual-${Date.now()}`,
      description: '',
      type: 'PREVENTIVE',
      assignToId: defaultUser,
      dueDate: defaultDate,
      priority: 'High',
      aiSuggested: false,
    }]);
  };

  const removeControl = (id: string) => {
    const ctrl = controls.find((c) => c.id === id);
    if (ctrl?.aiSuggested) {
      setAiSuggestions((prev) => prev.map((s) => s.description === ctrl.description ? { ...s, selected: false } : s));
    }
    setControls((prev) => prev.filter((c) => c.id !== id));
  };

  const updateControl = (id: string, field: string, value: string) => {
    setControls((prev) => prev.map((c) => c.id === id ? { ...c, [field]: value } : c));
  };

  const handleValidate = async () => {
    if (controls.length === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/risk-manager/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          riskId: internalId || risk?.id,
          action: 'validate',
          likelihood: adjL,
          impact: adjI,
          controls: controls.map((c) => ({
            description: c.description,
            type: c.type,
            assignToId: c.assignToId,
            dueDate: c.dueDate,
            priority: c.priority,
          })),
        }),
      });
      if (res.ok) {
        const result = await res.json();
        setToast(`Risk validated! ${result.controls?.length || 0} controls and ${result.tasks?.length || 0} tasks created.`);
        setTimeout(() => router.push('/risk-manager/review'), 2000);
      }
    } catch { setToast('Error validating risk'); }
    finally { setSubmitting(false); }
  };

  if (loading || !risk) {
    return (
      <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-primary)' }}>
        <Sidebar role="risk-manager" />
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading...</div>
        </main>
      </div>
    );
  }

  const adjScore = adjL * adjI;
  const levelColor = LEVEL_COLORS[risk.riskLevel] || '#4ab0de';
  const estResidual = Math.max(1, adjScore - (controls.length * 3));
  const reductionPct = adjScore > 0 ? Math.round(((adjScore - estResidual) / adjScore) * 100) : 0;

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

        {/* Breadcrumb */}
        <div className="animate-fade-up" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)' }}>
          <Link href="/risk-manager/review" style={{ color: 'var(--accent-cyan)', textDecoration: 'none' }}>Pending Review</Link>
          <ChevronRight size={14} />
          <Link href={`/risk-manager/review/${risk.riskId}`} style={{ color: 'var(--accent-cyan)', textDecoration: 'none' }}>{risk.title}</Link>
          <ChevronRight size={14} />
          <span>Propose Controls</span>
        </div>

        {/* Header */}
        <div className="animate-fade-up">
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={20} style={{ color: '#8b5cf6' }} /> Propose Controls
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>Define controls and assign implementation tasks</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '18px', alignItems: 'start' }}>
          {/* LEFT */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Risk Summary */}
            <div className="risk-card animate-fade-up-1" style={{ padding: '18px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Shield size={22} style={{ color: '#8b5cf6' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '15px' }}>{risk.title}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {CATEGORY_LABELS[risk.category]} Risk &middot; {risk.department} Department &middot; {risk.reportedBy?.name}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '24px', fontWeight: 800, color: levelColor }}>{adjScore}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Inherent Risk</div>
              </div>
            </div>

            {/* AI Suggested Controls */}
            <div className="risk-card animate-fade-up-2" style={{ padding: '22px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={16} style={{ color: '#4ab0de' }} /> AI Suggested Controls
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 14px' }}>Click to add to your control plan</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {aiSuggestions.map((sug, idx) => (
                  <div key={idx} onClick={() => toggleAiSuggestion(idx)}
                    style={{
                      padding: '14px 16px', borderRadius: '10px', cursor: 'pointer',
                      background: sug.selected ? 'rgba(16,185,129,0.06)' : 'var(--bg-primary)',
                      border: sug.selected ? '2px solid #10b981' : '1px solid var(--border-color)',
                      display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.2s',
                    }}>
                    <div style={{
                      width: '22px', height: '22px', borderRadius: '6px',
                      border: sug.selected ? '2px solid #10b981' : '2px solid var(--border-color)',
                      background: sug.selected ? '#10b981' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      {sug.selected && <CheckCircle size={14} color="#fff" />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '13px' }}>{sug.description}</div>
                      <span style={{ fontSize: '10px', fontWeight: 600, padding: '1px 6px', borderRadius: '3px', background: sug.type === 'PREVENTIVE' ? 'rgba(16,185,129,0.15)' : 'rgba(74,176,222,0.15)', color: sug.type === 'PREVENTIVE' ? '#10b981' : '#4ab0de', marginTop: '4px', display: 'inline-block' }}>
                        {sug.type}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Controls to Implement */}
            <div className="risk-card animate-fade-up-3" style={{ padding: '22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>Controls to Implement</h3>
                <span style={{ fontSize: '12px', color: 'var(--accent-cyan)' }}>{controls.length} controls</span>
              </div>

              {controls.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', borderRadius: '10px', border: '1px dashed var(--border-color)' }}>
                  Select AI suggestions above or add controls manually
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {controls.map((ctrl, idx) => (
                    <div key={ctrl.id} style={{ padding: '18px', borderRadius: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600 }}>{idx + 1}. {ctrl.description || 'New Control'}</span>
                        <button onClick={() => removeControl(ctrl.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
                          <X size={16} />
                        </button>
                      </div>

                      {!ctrl.aiSuggested && (
                        <div style={{ marginBottom: '10px' }}>
                          <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Control Description</label>
                          <input value={ctrl.description} onChange={(e) => updateControl(ctrl.id, 'description', e.target.value)}
                            placeholder="Describe the control..."
                            style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '12px', outline: 'none', fontFamily: 'inherit' }} />
                        </div>
                      )}

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                        <div>
                          <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Control Type</label>
                          <select value={ctrl.type} onChange={(e) => updateControl(ctrl.id, 'type', e.target.value)}
                            style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '12px', outline: 'none', fontFamily: 'inherit' }}>
                            <option value="PREVENTIVE">Preventive</option>
                            <option value="DETECTIVE">Detective</option>
                            <option value="CORRECTIVE">Corrective</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Assign To</label>
                          <select value={ctrl.assignToId} onChange={(e) => updateControl(ctrl.id, 'assignToId', e.target.value)}
                            style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '12px', outline: 'none', fontFamily: 'inherit' }}>
                            {users.map((u) => (
                              <option key={u.id} value={u.id}>{u.name} ({u.department})</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div>
                          <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Due Date</label>
                          <input type="date" value={ctrl.dueDate} onChange={(e) => updateControl(ctrl.id, 'dueDate', e.target.value)}
                            style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '12px', outline: 'none', fontFamily: 'inherit' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Priority</label>
                          <select value={ctrl.priority} onChange={(e) => updateControl(ctrl.id, 'priority', e.target.value)}
                            style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '12px', outline: 'none', fontFamily: 'inherit' }}>
                            <option value="High">High</option>
                            <option value="Medium">Medium</option>
                            <option value="Low">Low</option>
                          </select>
                        </div>
                      </div>

                      {/* Task Preview */}
                      <div style={{ marginTop: '10px', padding: '10px 12px', borderRadius: '8px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CheckCircle size={14} style={{ color: '#10b981', flexShrink: 0 }} />
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          Task will be created for <strong style={{ color: 'var(--text-primary)' }}>{users.find((u) => u.id === ctrl.assignToId)?.name || 'Assignee'}</strong>
                          {ctrl.dueDate && <span> &middot; Due: {new Date(ctrl.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
                          <span> &middot; {ctrl.priority} Priority</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Another Control */}
              <button onClick={addEmptyControl}
                style={{
                  width: '100%', padding: '14px', marginTop: '12px', borderRadius: '10px',
                  border: '1px dashed var(--border-color)', background: 'transparent',
                  color: 'var(--text-muted)', fontSize: '13px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                }}>
                <Plus size={14} /> Add Another Control
              </button>
            </div>
          </div>

          {/* RIGHT SIDEBAR */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Control Summary */}
            <div className="risk-card animate-fade-up-1" style={{ padding: '18px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 600, margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Shield size={14} /> Control Summary
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { label: 'Total Controls', value: controls.length },
                  { label: 'Tasks to Create', value: controls.length },
                  { label: 'Assigned To', value: risk.reportedBy?.name || '—' },
                  { label: 'Earliest Due', value: controls.length > 0 ? new Date(Math.min(...controls.map((c) => new Date(c.dueDate).getTime()))).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—' },
                ].map((item) => (
                  <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{item.label}</span>
                    <span style={{ fontWeight: 600 }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Expected Risk Reduction */}
            <div className="risk-card animate-fade-up-2" style={{ padding: '18px', background: 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(74,176,222,0.08))' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 600, margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Zap size={14} style={{ color: '#f59e0b' }} /> Expected Risk Reduction
              </h4>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '12px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>Inherent Risk</div>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: levelColor }}>{adjScore}</div>
                </div>
                <ArrowRight size={20} style={{ color: 'var(--text-muted)' }} />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>Est. Residual</div>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: '#4ab0de' }}>{controls.length > 0 ? estResidual : '—'}</div>
                </div>
              </div>
              {controls.length > 0 && (
                <div style={{ textAlign: 'center', fontSize: '14px', fontWeight: 700, color: '#10b981' }}>
                  {reductionPct}% Risk Reduction
                </div>
              )}
            </div>

            {/* Validate Button */}
            <button onClick={handleValidate} disabled={controls.length === 0 || submitting}
              style={{
                width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
                background: controls.length > 0 ? 'linear-gradient(135deg, #10b981, #059669)' : 'var(--border-color)',
                color: '#fff', fontSize: '14px', fontWeight: 700, cursor: controls.length > 0 ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                boxShadow: controls.length > 0 ? '0 4px 20px rgba(16,185,129,0.3)' : 'none',
              }}>
              <CheckCircle size={16} /> {submitting ? 'Validating...' : 'Validate Risk & Create Tasks'}
            </button>

            <Link href={`/risk-manager/review/${risk.riskId}`} style={{ textDecoration: 'none' }}>
              <button className="btn-secondary" style={{ width: '100%', padding: '12px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <ArrowLeft size={14} /> Back to Review
              </button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
