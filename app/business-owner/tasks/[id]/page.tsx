'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import {
  Calendar,
  User,
  CalendarDays,
  RotateCw,
  Crosshair,
  Upload,
  Check,
  CheckCircle,
  Square,
  Save,
  FileText,
  FileSpreadsheet,
  FileEdit,
  Image,
  Paperclip,
  XCircle,
  Send,
  ArrowRight,
  Zap,
} from 'lucide-react';

/* ─── Types ─────────────────────────────────────────────────────────────────── */

interface EvidenceFile {
  id: string;
  fileName: string;
  fileSize: string | null;
  fileType: string | null;
  createdAt: string;
}

interface CommentData {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; name: string; avatar: string | null; role: string };
}

interface TaskData {
  id: string;
  taskId: string;
  title: string;
  description: string | null;
  status: string;
  dueDate: string | null;
  isOverdue: boolean;
  evidenceCount: number;
  effectiveness: string | null;
  gaps: string | null;
  recommendations: string | null;
  createdAt: string;
  risk: {
    id: string;
    riskId: string;
    title: string;
    description: string;
    category: string;
    likelihood: number;
    impact: number;
    inherentScore: number;
    riskLevel: string;
  };
  control: {
    id: string;
    controlId: string;
    description: string;
    type: string;
    designRating: number | null;
    effectivenessRating: number | null;
  } | null;
  evidence: EvidenceFile[];
  comments: CommentData[];
  assignedTo: { id: string; name: string; avatar: string | null } | null;
}

/* ─── Helpers ───────────────────────────────────────────────────────────────── */

const statusLabel: Record<string, string> = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  CHANGES_REQUESTED: 'Changes Requested',
  SUBMITTED: 'Submitted',
  COMPLETED: 'Completed',
  OVERDUE: 'Overdue',
};

function statusStyle(status: string): React.CSSProperties {
  const map: Record<string, React.CSSProperties> = {
    OVERDUE: { background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' },
    CHANGES_REQUESTED: { background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' },
    IN_PROGRESS: { background: 'rgba(74,176,222,0.15)', color: '#4ab0de', border: '1px solid rgba(74,176,222,0.3)' },
    SUBMITTED: { background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' },
    COMPLETED: { background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' },
    PENDING: { background: 'rgba(139,92,246,0.15)', color: '#8b5cf6', border: '1px solid rgba(139,92,246,0.3)' },
  };
  return map[status] || { background: 'rgba(160,160,192,0.1)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' };
}

const riskLevelColor: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH: '#f59e0b',
  MEDIUM: '#4ab0de',
  LOW: '#10b981',
};

const categoryLabel: Record<string, string> = {
  OPERATIONAL: 'Operational',
  COMPLIANCE: 'Compliance',
  FINANCIAL: 'Financial',
  STRATEGIC: 'Strategic',
  HR_TALENT: 'HR & Talent',
  IT_CYBER: 'IT & Cyber',
};

const controlTypeLabel: Record<string, string> = {
  PREVENTIVE: 'Preventive',
  DETECTIVE: 'Detective',
  CORRECTIVE: 'Corrective',
};

const roleLabel: Record<string, string> = {
  BUSINESS_OWNER: 'Business Owner',
  RISK_MANAGER: 'Risk Manager',
  ADMIN: 'Administrator',
};

function formatDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function daysOverdue(d: string | null): number {
  if (!d) return 0;
  const diff = Date.now() - new Date(d).getTime();
  return Math.max(0, Math.floor(diff / 86400000));
}

function timeAgo(d: string): string {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(d);
}

function FileIcon({ name }: { name: string }) {
  if (name.endsWith('.pdf')) return <FileText size={18} color="var(--accent-cyan)" />;
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) return <FileSpreadsheet size={18} color="#10b981" />;
  if (name.endsWith('.docx') || name.endsWith('.doc')) return <FileEdit size={18} color="#8b5cf6" />;
  if (name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg')) return <Image size={18} color="#f59e0b" />;
  return <Paperclip size={18} color="var(--text-muted)" />;
}

/* ─── Checklist items derived from task state ───────────────────────────────── */
function getChecklist(task: TaskData) {
  return [
    { label: 'Task description reviewed', done: true },
    { label: 'Assessment notes provided', done: !!(task.effectiveness || task.gaps) },
    { label: 'Evidence files uploaded', done: task.evidence.length > 0 },
    { label: 'Ready for submission', done: task.status === 'SUBMITTED' || task.status === 'COMPLETED' },
  ];
}

/* ─── Component ─────────────────────────────────────────────────────────────── */

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params?.id as string;

  const [task, setTask] = useState<TaskData | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');

  // Form state
  const [effectiveness, setEffectiveness] = useState('');
  const [gaps, setGaps] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [newComment, setNewComment] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  /* ── Load task data ─────────────────────────────────────────────────────── */
  const loadTask = useCallback(async () => {
    try {
      const res = await fetch(`/api/business-owner/tasks?taskId=${taskId}`);
      if (!res.ok) return;
      const data: TaskData = await res.json();
      setTask(data);
      setEffectiveness(data.effectiveness || '');
      setGaps(data.gaps || '');
      setRecommendations(data.recommendations || '');
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    async function getUser() {
      try {
        const res = await fetch('/api/users?email=ahmed.mansouri@hei-adpu.ae');
        if (res.ok) {
          const data = await res.json();
          setUserId(data.id);
        }
      } catch { /* */ }
    }
    getUser();
    loadTask();
  }, [loadTask]);

  /* ── Save assessment draft ──────────────────────────────────────────────── */
  const handleSave = async () => {
    if (!task) return;
    setSaving(true);
    try {
      await fetch('/api/business-owner/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: task.taskId,
          effectiveness,
          gaps,
          recommendations,
        }),
      });
      setSavedMsg('Draft saved');
      setTimeout(() => setSavedMsg(''), 3000);
    } catch { /* */ }
    setSaving(false);
  };

  /* ── Submit for review ──────────────────────────────────────────────────── */
  const handleSubmit = async () => {
    if (!task) return;
    setSubmitting(true);
    try {
      await fetch('/api/business-owner/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: task.taskId,
          status: 'SUBMITTED',
          effectiveness,
          gaps,
          recommendations,
        }),
      });
      setSavedMsg('Submitted!');
      setTimeout(() => router.push('/business-owner/dashboard'), 1500);
    } catch { /* */ }
    setSubmitting(false);
  };

  /* ── Mark as complete ───────────────────────────────────────────────────── */
  const handleComplete = async () => {
    if (!task) return;
    setSubmitting(true);
    try {
      await fetch('/api/business-owner/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: task.taskId, status: 'COMPLETED' }),
      });
      setSavedMsg('Marked as complete!');
      setTimeout(() => router.push('/business-owner/dashboard'), 1500);
    } catch { /* */ }
    setSubmitting(false);
  };

  /* ── AI Propose ─────────────────────────────────────────────────────────── */
  const handleAiPropose = async () => {
    if (!task || aiLoading) return;
    setAiLoading(true);
    try {
      const prompt = `For the risk "${task.risk.title}" (Category: ${categoryLabel[task.risk.category] || task.risk.category}, Risk Level: ${task.risk.riskLevel}, Score: ${task.risk.inherentScore}) with control "${task.control?.description || 'N/A'}" (Type: ${task.control ? controlTypeLabel[task.control.type] : 'N/A'}), provide a JSON object with exactly three fields:
1. "effectiveness": A 2-3 sentence assessment of the control's effectiveness
2. "gaps": A 2-3 sentence description of gaps or weaknesses
3. "recommendations": A 2-3 sentence set of recommendations for improvement
Return ONLY valid JSON, no markdown.`;
      const res = await fetch('/api/risk-manager/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt, history: [] }),
      });
      const data = await res.json();
      try {
        const parsed = JSON.parse(data.message);
        if (parsed.effectiveness) setEffectiveness(parsed.effectiveness);
        if (parsed.gaps) setGaps(parsed.gaps);
        if (parsed.recommendations) setRecommendations(parsed.recommendations);
      } catch {
        setEffectiveness(data.message || '');
      }
    } catch { /* */ }
    setAiLoading(false);
  };

  /* ── File upload ────────────────────────────────────────────────────────── */
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || !task) return;
    setUploading(true);
    const newEvidence: EvidenceFile[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fd = new FormData();
      fd.append('file', file);
      fd.append('taskId', task.taskId);
      try {
        const res = await fetch('/api/business-owner/tasks/upload', {
          method: 'POST',
          body: fd,
        });
        if (res.ok) {
          const evidence = await res.json();
          newEvidence.push(evidence);
        }
      } catch { /* */ }
    }
    // Update task evidence without resetting form fields
    if (newEvidence.length > 0) {
      setTask((prev) => prev ? { ...prev, evidence: [...prev.evidence, ...newEvidence], evidenceCount: prev.evidenceCount + newEvidence.length } : prev);
    }
    setUploading(false);
    // Reset file input
    const input = document.getElementById('file-upload-input') as HTMLInputElement;
    if (input) input.value = '';
  };

  /* ── Delete evidence ─────────────────────────────────────────────────────── */
  const handleDeleteEvidence = async (evidenceId: string) => {
    if (!task) return;
    try {
      const res = await fetch(`/api/business-owner/tasks/upload?id=${evidenceId}`, { method: 'DELETE' });
      if (res.ok) {
        setTask((prev) => prev ? {
          ...prev,
          evidence: prev.evidence.filter((e) => e.id !== evidenceId),
          evidenceCount: prev.evidenceCount - 1,
        } : prev);
      }
    } catch { /* */ }
  };

  /* ── Add comment ────────────────────────────────────────────────────────── */
  const handleComment = async () => {
    if (!newComment.trim() || !userId || !task) return;
    try {
      await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: task.taskId, userId, content: newComment }),
      });
      setNewComment('');
      loadTask();
    } catch { /* */ }
  };

  /* ── Loading state ──────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-primary)' }}>
        <Sidebar role="business-owner" />
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>Loading task...</div>
        </main>
      </div>
    );
  }

  if (!task) {
    return (
      <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-primary)' }}>
        <Sidebar role="business-owner" />
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <XCircle size={32} color="var(--text-muted)" style={{ marginBottom: '12px' }} />
            <div style={{ color: 'var(--text-secondary)', fontSize: '15px', marginBottom: '16px' }}>
              Task &ldquo;{taskId}&rdquo; not found
            </div>
            <Link href="/business-owner/dashboard" className="btn-primary" style={{ textDecoration: 'none' }}>
              &larr; Back to Dashboard
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const checklist = getChecklist(task);
  const overdueDays = task.isOverdue ? daysOverdue(task.dueDate) : 0;
  const changesRequested = task.status === 'CHANGES_REQUESTED';
  const lastManagerComment = [...task.comments].reverse().find(c => c.user.role === 'RISK_MANAGER');

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', overflow: 'hidden' }}>
      <Sidebar role="business-owner" />

      <main style={{ flex: 1, overflowY: 'auto', paddingBottom: '80px' }}>
        <div style={{ padding: '28px 32px', display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', alignItems: 'start' }}>

          {/* ── LEFT COLUMN ────────────────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Breadcrumb */}
            <div className="animate-fade-up" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)' }}>
              <Link href="/business-owner/dashboard" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
                My Tasks
              </Link>
              <span>&rsaquo;</span>
              <span style={{ color: 'var(--accent-cyan)' }}>Task Detail</span>
            </div>

            {/* Task Header */}
            <div className="animate-fade-up-1">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
                <span style={{
                  background: 'rgba(74,176,222,0.15)', color: 'var(--accent-cyan)',
                  border: '1px solid rgba(74,176,222,0.3)', padding: '3px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                }}>
                  {task.taskId}
                </span>
                {task.control && (
                  <span style={{
                    background: 'rgba(139,92,246,0.15)', color: 'var(--accent-purple)',
                    border: '1px solid rgba(139,92,246,0.3)', padding: '3px 10px', borderRadius: '6px', fontSize: '12px',
                  }}>
                    {controlTypeLabel[task.control.type] || task.control.type}
                  </span>
                )}
                <span style={{ ...statusStyle(task.status), padding: '3px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>
                  {statusLabel[task.status] || task.status}
                </span>
              </div>
              <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 10px', lineHeight: 1.3 }}>
                {task.title}
              </h1>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Calendar size={13} style={{ opacity: 0.6 }} /> Due:{' '}
                  <span style={{ color: task.isOverdue ? '#ef4444' : 'var(--text-primary)', fontWeight: 600 }}>
                    {formatDate(task.dueDate)}
                  </span>
                  {task.isOverdue && <span style={{ color: '#ef4444', marginLeft: '4px' }}>({overdueDays}d overdue)</span>}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <User size={13} style={{ opacity: 0.6 }} /> Assigned by: <span style={{ color: 'var(--text-primary)' }}>Ahmed Al-Rashid</span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <CalendarDays size={13} style={{ opacity: 0.6 }} /> Created: {formatDate(task.createdAt)}
                </span>
              </div>
            </div>

            {/* Changes Requested Banner */}
            {changesRequested && lastManagerComment && (
              <div className="animate-fade-up-1" style={{
                background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.35)',
                borderRadius: '10px', padding: '16px',
              }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <RotateCw size={18} color="#f59e0b" style={{ flexShrink: 0, marginTop: '1px' }} />
                  <div>
                    <div style={{ fontWeight: 600, color: '#f59e0b', fontSize: '14px', marginBottom: '4px' }}>
                      Changes Requested
                    </div>
                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.5 }}>
                      {lastManagerComment.content}
                    </p>
                    <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                      — {lastManagerComment.user.name}, Risk Manager &middot; {timeAgo(lastManagerComment.createdAt)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Task Description */}
            {task.description && (
              <div className="risk-card animate-fade-up-2" style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '11px', fontWeight: 600, margin: '0 0 12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Task Description
                </h3>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                  {task.description}
                </p>
              </div>
            )}

            {/* Control Assignment */}
            {task.control && (
              <div className="animate-fade-up-2" style={{
                padding: '20px', borderRadius: '12px',
                background: 'rgba(74,176,222,0.04)', border: '1px solid transparent',
                backgroundImage: 'linear-gradient(var(--bg-card), var(--bg-card)), linear-gradient(135deg, #4ab0de 0%, #8b5cf6 100%)',
                backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box',
              }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--accent-cyan)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Crosshair size={12} /> ASSIGNED CONTROL
                </div>
                <div style={{ fontWeight: 600, fontSize: '15px', marginBottom: '6px' }}>
                  {controlTypeLabel[task.control.type] || task.control.type} Control — {task.control.controlId}
                </div>
                <p style={{ margin: '0 0 12px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {task.control.description}
                </p>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <span style={{
                    background: 'rgba(139,92,246,0.15)', color: 'var(--accent-purple)',
                    border: '1px solid rgba(139,92,246,0.3)', padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
                  }}>
                    {controlTypeLabel[task.control.type]}
                  </span>
                  {task.control.designRating && (
                    <span style={{
                      background: 'rgba(74,176,222,0.1)', color: 'var(--accent-cyan)',
                      border: '1px solid rgba(74,176,222,0.2)', padding: '3px 10px', borderRadius: '6px', fontSize: '11px',
                    }}>
                      Design: {task.control.designRating}/5
                    </span>
                  )}
                  {task.control.effectivenessRating && (
                    <span style={{
                      background: 'rgba(74,176,222,0.1)', color: 'var(--accent-cyan)',
                      border: '1px solid rgba(74,176,222,0.2)', padding: '3px 10px', borderRadius: '6px', fontSize: '11px',
                    }}>
                      Effectiveness: {task.control.effectivenessRating}/5
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Assessment Input */}
            <div className="risk-card animate-fade-up-3" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>Assessment Input</h3>
                <button
                  className="btn-primary"
                  style={{ fontSize: '12px', padding: '7px 14px', display: 'flex', alignItems: 'center', gap: '6px', opacity: aiLoading ? 0.6 : 1 }}
                  onClick={handleAiPropose}
                  disabled={aiLoading}
                >
                  {aiLoading ? (
                    <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                  ) : (
                    <Zap size={14} />
                  )}
                  {aiLoading ? 'AI Thinking...' : 'AI Propose'}
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[
                  { label: 'Control Effectiveness', hint: 'How effective is this control? Describe your assessment.', value: effectiveness, setter: setEffectiveness },
                  { label: 'Gaps Identified', hint: 'Any gaps or weaknesses found during assessment?', value: gaps, setter: setGaps },
                  { label: 'Recommendations', hint: 'Suggested improvements or remediation steps.', value: recommendations, setter: setRecommendations },
                ].map((field) => (
                  <div key={field.label}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                      {field.label}
                    </label>
                    <textarea
                      placeholder={field.hint}
                      value={field.value}
                      onChange={(e) => field.setter(e.target.value)}
                      rows={4}
                      style={{
                        width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                        borderRadius: '8px', padding: '12px', fontSize: '13px', color: 'var(--text-primary)',
                        resize: 'vertical', outline: 'none', fontFamily: 'inherit', lineHeight: 1.6,
                        transition: 'border-color 0.2s',
                      }}
                      onFocus={(e) => { e.target.style.borderColor = 'var(--accent-cyan)'; }}
                      onBlur={(e) => { e.target.style.borderColor = 'var(--border-color)'; }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Evidence Upload */}
            <div className="risk-card animate-fade-up-4" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>
                  Evidence & Documentation
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {task.evidence.length} file{task.evidence.length !== 1 ? 's' : ''} uploaded
                </span>
              </div>

              {/* Drag Drop Zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setIsDragOver(false); handleFileUpload(e.dataTransfer.files); }}
                onClick={() => document.getElementById('file-upload-input')?.click()}
                style={{
                  border: `2px dashed ${isDragOver ? 'var(--accent-cyan)' : 'var(--border-color)'}`,
                  borderRadius: '10px', padding: '28px', textAlign: 'center',
                  background: isDragOver ? 'rgba(74,176,222,0.06)' : 'var(--bg-primary)',
                  cursor: 'pointer', transition: 'all 0.2s', marginBottom: '16px',
                }}
              >
                <input
                  id="file-upload-input"
                  type="file"
                  multiple
                  accept=".pdf,.xlsx,.xls,.docx,.doc,.png,.jpg,.jpeg"
                  style={{ display: 'none' }}
                  onChange={(e) => handleFileUpload(e.target.files)}
                />
                <Upload size={28} color="var(--text-muted)" style={{ marginBottom: '8px' }} />
                <div style={{ fontWeight: 500, fontSize: '14px', marginBottom: '4px' }}>
                  {uploading ? 'Uploading...' : 'Drop files here or click to browse'}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Supported: PDF, XLSX, DOCX, PNG, JPG (max 50MB)
                </div>
              </div>

              {/* Existing Files */}
              {task.evidence.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {task.evidence.map((file) => (
                    <div key={file.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 14px', background: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)', borderRadius: '8px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <FileIcon name={file.fileName} />
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 500 }}>{file.fileName}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {file.fileSize || '—'} &middot; Uploaded {timeAgo(file.createdAt)}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                          fontSize: '11px', padding: '3px 8px', borderRadius: '5px', fontWeight: 500,
                          background: 'rgba(16,185,129,0.15)', color: '#10b981',
                          display: 'flex', alignItems: 'center', gap: '4px',
                        }}>
                          <Check size={10} /> Uploaded
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteEvidence(file.id); }}
                          style={{
                            width: '26px', height: '26px', borderRadius: '6px',
                            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.15s',
                          }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.2)'; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.1)'; }}
                          title="Remove file"
                        >
                          <XCircle size={12} color="#ef4444" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT COLUMN ───────────────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Related Risk Card */}
            <div className="risk-card animate-fade-up" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '11px', fontWeight: 600, margin: '0 0 14px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Related Risk
              </h3>
              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{
                    background: 'rgba(74,176,222,0.15)', color: 'var(--accent-cyan)',
                    padding: '2px 8px', borderRadius: '5px', fontSize: '11px', fontWeight: 600,
                  }}>
                    {task.risk.riskId}
                  </span>
                  <span style={{
                    ...statusStyle(task.risk.riskLevel === 'CRITICAL' ? 'OVERDUE' : task.risk.riskLevel === 'HIGH' ? 'CHANGES_REQUESTED' : 'IN_PROGRESS'),
                    padding: '2px 8px', borderRadius: '5px', fontSize: '11px', fontWeight: 600,
                  }}>
                    {task.risk.riskLevel}
                  </span>
                </div>
                <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>{task.risk.title}</div>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  {task.risk.description.length > 120 ? task.risk.description.slice(0, 120) + '...' : task.risk.description}
                </p>
              </div>

              {/* Score display */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: riskLevelColor[task.risk.riskLevel] || '#4ab0de' }}>
                    {task.risk.inherentScore}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>Score</div>
                </div>
                <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>{task.risk.likelihood}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>Likelihood</div>
                </div>
                <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>{task.risk.impact}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>Impact</div>
                </div>
              </div>

              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Category: <span style={{ color: 'var(--text-secondary)' }}>{categoryLabel[task.risk.category] || task.risk.category}</span>
              </div>
            </div>

            {/* Task Summary */}
            <div className="risk-card animate-fade-up-1" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '11px', fontWeight: 600, margin: '0 0 14px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Task Summary
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { label: 'Task ID', value: task.taskId },
                  { label: 'Due Date', value: formatDate(task.dueDate), danger: task.isOverdue },
                  ...(task.isOverdue ? [{ label: 'Days Overdue', value: `${overdueDays} days`, danger: true }] : []),
                  { label: 'Linked Risk', value: task.risk.riskId },
                  { label: 'Control', value: task.control ? task.control.controlId : '—' },
                  { label: 'Evidence Files', value: `${task.evidence.length}` },
                ].map((row) => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{row.label}</span>
                    <span style={{ color: row.danger ? '#ef4444' : 'var(--text-primary)', fontWeight: 500 }}>
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Submission Checklist */}
            <div className="risk-card animate-fade-up-2" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '11px', fontWeight: 600, margin: '0 0 14px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Submission Checklist
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {checklist.map((item) => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                    {item.done
                      ? <CheckCircle size={16} color="#10b981" />
                      : <Square size={16} color="var(--text-muted)" />
                    }
                    <span style={{ color: item.done ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
              <div style={{
                marginTop: '14px', padding: '10px', background: 'var(--bg-primary)',
                borderRadius: '8px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)',
              }}>
                {checklist.filter((c) => c.done).length} / {checklist.length} complete
              </div>
            </div>

            {/* Activity / Comments */}
            <div className="risk-card animate-fade-up-3" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '11px', fontWeight: 600, margin: '0 0 14px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Activity
              </h3>

              {task.comments.length === 0 ? (
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                  No comments yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '16px' }}>
                  {task.comments.map((c) => {
                    const isRM = c.user.role === 'RISK_MANAGER';
                    const avatarColor = isRM ? '#8b5cf6' : '#4ab0de';
                    return (
                      <div key={c.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                        <div style={{
                          width: '32px', height: '32px', borderRadius: '50%',
                          background: `${avatarColor}33`, border: `1px solid ${avatarColor}66`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '11px', fontWeight: 700, color: avatarColor, flexShrink: 0,
                        }}>
                          {c.user.avatar || c.user.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '3px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 600 }}>{c.user.name}</span>
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                              {roleLabel[c.user.role] || c.user.role}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{timeAgo(c.createdAt)}</span>
                          </div>
                          <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                            {c.content}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <textarea
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
                style={{
                  width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                  borderRadius: '8px', padding: '10px', fontSize: '13px', color: 'var(--text-primary)',
                  resize: 'none', outline: 'none', fontFamily: 'inherit', marginBottom: '8px',
                }}
                onFocus={(e) => { e.target.style.borderColor = 'var(--accent-cyan)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--border-color)'; }}
              />
              <button
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '8px', opacity: newComment.trim() ? 1 : 0.5 }}
                onClick={handleComment}
                disabled={!newComment.trim()}
              >
                <Send size={13} /> Send Comment
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* ── Sticky Bottom Action Bar ──────────────────────────────────────── */}
      <div style={{
        position: 'fixed', bottom: 0, left: '240px', right: 0,
        background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)',
        padding: '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: '12px', zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>
          <span className="pulse-dot" style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: savedMsg ? '#10b981' : 'var(--text-muted)', display: 'inline-block',
          }} />
          {savedMsg ? (
            <span style={{ color: '#10b981' }}>{savedMsg}</span>
          ) : (
            <span>Ready</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {task.status !== 'COMPLETED' && task.status !== 'SUBMITTED' && (
            <>
              <button className="btn-secondary" onClick={handleSave} disabled={saving}>
                <Save size={14} /> {saving ? 'Saving...' : 'Save Draft'}
              </button>
              <button className="btn-primary" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit for Review'} <ArrowRight size={14} />
              </button>
            </>
          )}
          {task.status === 'SUBMITTED' && (
            <button
              className="btn-primary"
              style={{ background: '#10b981' }}
              onClick={handleComplete}
              disabled={submitting}
            >
              <Check size={14} /> {submitting ? 'Processing...' : 'Mark as Complete'}
            </button>
          )}
          {task.status === 'COMPLETED' && (
            <span style={{ color: '#10b981', fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle size={16} /> Task Completed
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
