'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import {
  Calendar, User, CheckCircle, XCircle, Send, ArrowLeft,
  FileText, FileSpreadsheet, FileEdit, Image, Paperclip,
  AlertTriangle, Crosshair, Check,
} from 'lucide-react';
import MarkdownRenderer from '@/components/MarkdownRenderer';

interface EvidenceFile {
  id: string; fileName: string; fileSize: string | null; fileType: string | null; createdAt: string;
}
interface CommentData {
  id: string; content: string; createdAt: string;
  user: { id: string; name: string; avatar: string | null; role: string };
}
interface TaskData {
  id: string; taskId: string; title: string; description: string | null;
  status: string; dueDate: string | null; isOverdue: boolean;
  effectiveness: string | null; gaps: string | null; recommendations: string | null;
  createdAt: string; evidenceCount: number;
  risk: { id: string; riskId: string; title: string; description: string; category: string; likelihood: number; impact: number; inherentScore: number; riskLevel: string };
  control: { id: string; controlId: string; description: string; type: string; designRating: number | null; effectivenessRating: number | null } | null;
  evidence: EvidenceFile[];
  comments: CommentData[];
  assignedTo: { id: string; name: string; avatar: string | null } | null;
}

const statusStyle: Record<string, React.CSSProperties> = {
  SUBMITTED: { background: 'rgba(139,92,246,0.15)', color: '#8b5cf6', border: '1px solid rgba(139,92,246,0.3)' },
  COMPLETED: { background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' },
  CHANGES_REQUESTED: { background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' },
};
const statusLabel: Record<string, string> = { SUBMITTED: 'Submitted for Review', COMPLETED: 'Completed', CHANGES_REQUESTED: 'Changes Requested' };
const categoryLabel: Record<string, string> = { OPERATIONAL: 'Operational', COMPLIANCE: 'Compliance', FINANCIAL: 'Financial', STRATEGIC: 'Strategic', HR_TALENT: 'HR & Talent', IT_CYBER: 'IT & Cyber' };
const controlTypeLabel: Record<string, string> = { PREVENTIVE: 'Preventive', DETECTIVE: 'Detective', CORRECTIVE: 'Corrective' };
const riskLevelColor: Record<string, string> = { CRITICAL: '#ef4444', HIGH: '#f59e0b', MEDIUM: '#4ab0de', LOW: '#10b981' };

function formatDate(d: string | null) { return d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'; }
function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
function FileIcon({ name }: { name: string }) {
  if (name.endsWith('.pdf')) return <FileText size={16} color="var(--accent-cyan)" />;
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) return <FileSpreadsheet size={16} color="#10b981" />;
  if (name.endsWith('.docx') || name.endsWith('.doc')) return <FileEdit size={16} color="#8b5cf6" />;
  if (name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg')) return <Image size={16} color="#f59e0b" />;
  return <Paperclip size={16} color="var(--text-muted)" />;
}

export default function RMTaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params?.id as string;

  const [task, setTask] = useState<TaskData | null>(null);
  const [loading, setLoading] = useState(true);
  const [rmUserId, setRmUserId] = useState('');
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  const loadTask = useCallback(async () => {
    try {
      const res = await fetch(`/api/business-owner/tasks?taskId=${taskId}`);
      if (res.ok) setTask(await res.json());
    } catch { /* */ }
    finally { setLoading(false); }
  }, [taskId]);

  useEffect(() => {
    async function getUser() {
      try {
        const res = await fetch('/api/users?email=sara.khalil@adek.gov.ae');
        if (res.ok) { const d = await res.json(); setRmUserId(d.id); }
      } catch { /* */ }
    }
    getUser();
    loadTask();
  }, [loadTask]);

  const handleAction = async (action: 'approve' | 'changes') => {
    if (!task) return;
    setSaving(true);
    try {
      // Update task status
      await fetch('/api/business-owner/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: task.taskId,
          status: action === 'approve' ? 'COMPLETED' : 'CHANGES_REQUESTED',
        }),
      });
      // Add comment if provided
      if (comment.trim() && rmUserId) {
        await fetch('/api/comments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId: task.taskId, userId: rmUserId, content: comment }),
        });
      }
      setSavedMsg(action === 'approve' ? 'Task approved!' : 'Changes requested');
      setTimeout(() => router.push('/risk-manager/tasks'), 1500);
    } catch { /* */ }
    setSaving(false);
  };

  if (loading || !task) {
    return (
      <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-primary)' }}>
        <Sidebar role="risk-manager" />
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{loading ? 'Loading...' : 'Task not found'}</div>
        </main>
      </div>
    );
  }

  const lc = riskLevelColor[task.risk.riskLevel] || '#4ab0de';

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', overflow: 'hidden' }}>
      <Sidebar role="risk-manager" />

      <main style={{ flex: 1, overflowY: 'auto', paddingBottom: '80px' }}>
        <div style={{ padding: '24px 28px', display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', alignItems: 'start' }}>

          {/* LEFT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Breadcrumb */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>
              <Link href="/risk-manager/tasks" style={{ color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ArrowLeft size={14} /> Task Review
              </Link>
              <span>&rsaquo;</span>
              <span style={{ color: 'var(--accent-cyan)' }}>{task.taskId}</span>
            </div>

            {/* Header */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                <span style={{ background: 'rgba(74,176,222,0.15)', color: 'var(--accent-cyan)', padding: '3px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>{task.taskId}</span>
                {task.control && <span style={{ background: 'rgba(139,92,246,0.15)', color: 'var(--accent-purple)', padding: '3px 10px', borderRadius: '6px', fontSize: '12px' }}>{controlTypeLabel[task.control.type]}</span>}
                <span style={{ ...statusStyle[task.status], padding: '3px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>{statusLabel[task.status] || task.status}</span>
              </div>
              <h1 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 8px' }}>{task.title}</h1>
              <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={12} /> Due: <strong style={{ color: task.isOverdue ? '#ef4444' : 'var(--text-primary)' }}>{formatDate(task.dueDate)}</strong></span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><User size={12} /> Assigned to: <strong style={{ color: 'var(--text-primary)' }}>{task.assignedTo?.name || '—'}</strong></span>
              </div>
            </div>

            {/* Task Description */}
            {task.description && (
              <div className="risk-card" style={{ padding: '18px' }}>
                <h3 style={{ fontSize: '11px', fontWeight: 600, margin: '0 0 10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Task Description</h3>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.7 }}>{task.description}</p>
              </div>
            )}

            {/* Control */}
            {task.control && (
              <div style={{ padding: '18px', borderRadius: '12px', background: 'rgba(74,176,222,0.04)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--accent-cyan)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Crosshair size={12} /> ASSIGNED CONTROL
                </div>
                <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>{controlTypeLabel[task.control.type]} Control — {task.control.controlId}</div>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{task.control.description}</p>
              </div>
            )}

            {/* BO's Assessment (what the RM needs to review) */}
            <div className="risk-card" style={{ padding: '18px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={16} style={{ color: '#8b5cf6' }} /> Business Owner Assessment
              </h3>
              {[
                { label: 'Control Effectiveness', value: task.effectiveness },
                { label: 'Gaps Identified', value: task.gaps },
                { label: 'Recommendations', value: task.recommendations },
              ].map((field) => (
                <div key={field.label} style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>{field.label}</div>
                  {field.value ? (
                    <div style={{ padding: '12px', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <MarkdownRenderer content={field.value} />
                    </div>
                  ) : (
                    <div style={{ padding: '12px', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px dashed var(--border-color)', color: 'var(--text-muted)', fontSize: '12px', fontStyle: 'italic' }}>
                      Not provided
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Evidence */}
            <div className="risk-card" style={{ padding: '18px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 14px' }}>Evidence & Documentation ({task.evidence.length})</h3>
              {task.evidence.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', border: '1px dashed var(--border-color)', borderRadius: '8px' }}>
                  No evidence uploaded yet
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {task.evidence.map((file) => (
                    <div key={file.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                      <FileIcon name={file.fileName} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '12px', fontWeight: 500 }}>{file.fileName}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{file.fileSize || '—'} &middot; {timeAgo(file.createdAt)}</div>
                      </div>
                      <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '5px', background: 'rgba(16,185,129,0.15)', color: '#10b981', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Check size={9} /> Uploaded
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Activity */}
            <div className="risk-card" style={{ padding: '18px' }}>
              <h3 style={{ fontSize: '11px', fontWeight: 600, margin: '0 0 12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Activity</h3>
              {task.comments.length === 0 ? (
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No comments yet.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {task.comments.map((c) => (
                    <div key={c.id} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: c.user.role === 'RISK_MANAGER' ? 'rgba(139,92,246,0.2)' : 'rgba(74,176,222,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: c.user.role === 'RISK_MANAGER' ? '#8b5cf6' : '#4ab0de', flexShrink: 0 }}>
                        {c.user.avatar || c.user.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '2px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 600 }}>{c.user.name}</span>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{timeAgo(c.createdAt)}</span>
                        </div>
                        <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{c.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Related Risk */}
            <div className="risk-card" style={{ padding: '18px' }}>
              <h3 style={{ fontSize: '11px', fontWeight: 600, margin: '0 0 12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Related Risk</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ background: 'rgba(74,176,222,0.15)', color: 'var(--accent-cyan)', padding: '2px 8px', borderRadius: '5px', fontSize: '11px', fontWeight: 600 }}>{task.risk.riskId}</span>
                <span style={{ background: `${lc}18`, color: lc, padding: '2px 8px', borderRadius: '5px', fontSize: '11px', fontWeight: 600 }}>{task.risk.riskLevel}</span>
              </div>
              <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>{task.risk.title}</div>
              <p style={{ margin: '0 0 10px', fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                {task.risk.description.length > 100 ? task.risk.description.slice(0, 100) + '...' : task.risk.description}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: lc }}>{task.risk.inherentScore}</div>
                  <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Score</div>
                </div>
                <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: 700 }}>{task.risk.likelihood}</div>
                  <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Likelihood</div>
                </div>
                <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: 700 }}>{task.risk.impact}</div>
                  <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Impact</div>
                </div>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>Category: {categoryLabel[task.risk.category] || task.risk.category}</div>
            </div>

            {/* Review Checklist */}
            <div className="risk-card" style={{ padding: '18px' }}>
              <h3 style={{ fontSize: '11px', fontWeight: 600, margin: '0 0 12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Review Checklist</h3>
              {[
                { label: 'Assessment provided', done: !!(task.effectiveness || task.gaps) },
                { label: 'Evidence uploaded', done: task.evidence.length > 0 },
                { label: 'Recommendations given', done: !!task.recommendations },
              ].map((item) => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', marginBottom: '8px' }}>
                  {item.done ? <CheckCircle size={14} color="#10b981" /> : <XCircle size={14} color="var(--text-muted)" />}
                  <span style={{ color: item.done ? 'var(--text-primary)' : 'var(--text-muted)' }}>{item.label}</span>
                </div>
              ))}
            </div>

            {/* RM Feedback */}
            {task.status === 'SUBMITTED' && (
              <div className="risk-card" style={{ padding: '18px' }}>
                <h3 style={{ fontSize: '11px', fontWeight: 600, margin: '0 0 12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Your Feedback</h3>
                <textarea
                  placeholder="Add review notes or feedback for the business owner..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                  style={{
                    width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                    borderRadius: '8px', padding: '10px', fontSize: '12px', color: 'var(--text-primary)',
                    resize: 'vertical', outline: 'none', fontFamily: 'inherit', lineHeight: 1.5,
                  }}
                  onFocus={(e) => { e.target.style.borderColor = 'var(--accent-cyan)'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'var(--border-color)'; }}
                />
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Bottom Action Bar */}
      {task.status === 'SUBMITTED' && (
        <div style={{
          position: 'fixed', bottom: 0, left: '240px', right: 0,
          background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)',
          padding: '12px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 100,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>
            {savedMsg ? <span style={{ color: '#10b981', fontWeight: 600 }}>{savedMsg}</span> : <span>Review {task.taskId}</span>}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => handleAction('changes')}
              disabled={saving}
              style={{
                padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)',
                color: '#f59e0b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              <AlertTriangle size={14} /> Request Changes
            </button>
            <button
              onClick={() => handleAction('approve')}
              disabled={saving}
              style={{
                padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                background: '#10b981', border: 'none', color: '#fff', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              <Send size={14} /> {saving ? 'Processing...' : 'Approve & Complete'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
