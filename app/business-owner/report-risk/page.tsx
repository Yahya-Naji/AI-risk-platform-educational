'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import {
  Bot,
  Check,
  CheckCircle,
  Send,
  Settings,
  Scale,
  DollarSign,
  Target,
  Users,
  ShieldCheck,
  Sparkles,
  BarChart3,
  ClipboardList,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';
import MarkdownRenderer from '@/components/MarkdownRenderer';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

interface DraftRisk {
  id: string;
  title: string;
  category: string;
  description: string;
  likelihood: number;
  impact: number;
  selected: boolean;
  aiSuggested: boolean;
  notes?: string;
}

const CATEGORY_COLORS: Record<string, { bg: string; color: string; Icon: LucideIcon }> = {
  OPERATIONAL: { bg: 'rgba(74,176,222,0.15)', color: '#4ab0de', Icon: Settings },
  COMPLIANCE: { bg: 'rgba(139,92,246,0.15)', color: '#8b5cf6', Icon: Scale },
  FINANCIAL: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', Icon: DollarSign },
  STRATEGIC: { bg: 'rgba(236,72,153,0.15)', color: '#ec4899', Icon: Target },
  HR_TALENT: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', Icon: Users },
  IT_CYBER: { bg: 'rgba(16,185,129,0.15)', color: '#10b981', Icon: ShieldCheck },
};

const CATEGORY_LABELS: Record<string, string> = {
  OPERATIONAL: 'OPERATIONAL',
  COMPLIANCE: 'COMPLIANCE',
  FINANCIAL: 'FINANCIAL',
  STRATEGIC: 'STRATEGIC',
  HR_TALENT: 'HR / TALENT',
  IT_CYBER: 'IT / CYBER',
};

const LIKELIHOOD_LABELS: Record<number, string> = {
  1: '1 - Rare',
  2: '2 - Unlikely',
  3: '3 - Possible',
  4: '4 - Likely',
  5: '5 - Almost Certain',
};

const IMPACT_LABELS: Record<number, string> = {
  1: '1 - Negligible',
  2: '2 - Minor',
  3: '3 - Moderate',
  4: '4 - Major',
  5: '5 - Severe',
};

function getRiskLevel(score: number): { label: string; color: string } {
  if (score >= 20) return { label: 'Critical Risk', color: '#ef4444' };
  if (score >= 12) return { label: 'High Risk', color: '#ef4444' };
  if (score >= 6) return { label: 'Medium Risk', color: '#f59e0b' };
  return { label: 'Low Risk', color: '#10b981' };
}

export default function ReportRiskPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Step 1: Chat
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [draftRisks, setDraftRisks] = useState<DraftRisk[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Step 2: Review
  const [reviewRisks, setReviewRisks] = useState<DraftRisk[]>([]);

  // Toast
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch('/api/users?email=ahmed.mansouri@hei-adpu.ae');
        const user = await res.json();
        setUserId(user.id);
        setMessages([{
          role: 'assistant',
          content: "Hello! Tell me about a project, initiative, or situation you'd like to assess for risks. I'll analyze it and identify all potential risks for you to review.",
          timestamp: new Date().toISOString(),
        }]);
      } catch { /* ignore */ }
    }
    loadUser();
  }, []);

  const handleSend = async (text?: string) => {
    const msg = (text ?? inputValue).trim();
    if (!msg || isLoading || !userId) return;
    setInputValue('');

    const userMsg: ChatMessage = { role: 'user', content: msg, timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, sessionId, userId }),
      });
      const data = await res.json();
      setSessionId(data.sessionId);

      const aiMsg: ChatMessage = { role: 'assistant', content: data.message, timestamp: new Date().toISOString() };
      setMessages((prev) => [...prev, aiMsg]);

      if (data.risks && data.risks.length > 0) {
        setDraftRisks(data.risks);
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: "I'm having trouble connecting. Please try again.", timestamp: new Date().toISOString() }]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRisk = (id: string) => {
    setDraftRisks((prev) => prev.map((r) => r.id === id ? { ...r, selected: !r.selected } : r));
  };

  const selectAll = () => {
    const allSelected = draftRisks.every((r) => r.selected);
    setDraftRisks((prev) => prev.map((r) => ({ ...r, selected: !allSelected })));
  };

  const goToReview = () => {
    const selected = draftRisks.filter((r) => r.selected);
    if (selected.length === 0) return;
    setReviewRisks(selected.map((r) => ({ ...r })));
    setStep(2);
  };

  const updateReviewRisk = (id: string, field: string, value: number | string) => {
    setReviewRisks((prev) => prev.map((r) => r.id === id ? { ...r, [field]: value } : r));
  };

  const handleSubmit = async () => {
    if (!userId || reviewRisks.length === 0) return;

    try {
      const res = await fetch('/api/risks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          risks: reviewRisks.map((r) => ({
            title: r.title,
            description: r.description,
            category: r.category,
            likelihood: r.likelihood,
            impact: r.impact,
            aiSuggested: r.aiSuggested,
            aiLikelihood: r.likelihood,
            aiImpact: r.impact,
            notes: r.notes || null,
          })),
        }),
      });

      if (res.ok) {
        setToast(`${reviewRisks.length} risks submitted for review!`);
        setTimeout(() => router.push('/business-owner/dashboard'), 2000);
      }
    } catch {
      setToast('Failed to submit. Please try again.');
    }
  };

  const selectedCount = draftRisks.filter((r) => r.selected).length;

  // Submission summary for Step 2
  const summaryHigh = reviewRisks.filter((r) => r.likelihood * r.impact >= 12).length;
  const summaryMedium = reviewRisks.filter((r) => r.likelihood * r.impact >= 6 && r.likelihood * r.impact < 12).length;
  const summaryLow = reviewRisks.filter((r) => r.likelihood * r.impact < 6).length;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <Sidebar role="business-owner" />

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Toast */}
        {toast && (
          <div style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 2000, background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', padding: '14px 22px', borderRadius: '12px', fontWeight: 600, fontSize: '14px', boxShadow: '0 8px 32px rgba(16,185,129,0.4)', animation: 'fadeUp 0.3s ease', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={16} /> {toast}
          </div>
        )}

        {/* Connected User Bar */}
        <div style={{ padding: '8px 24px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)', fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
          Connected as <strong style={{ color: 'var(--text-primary)' }}>Sarah Lee</strong> (Business Owner) &middot; Finance Department
        </div>

        {/* Step Indicator */}
        <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', gap: '0' }}>
          {[
            { num: 1, label: 'Identify Risks' },
            { num: 2, label: 'Review & Rate' },
            { num: 3, label: 'Submit' },
          ].map((s, i) => (
            <div key={s.num} style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    background: step > s.num ? '#10b981' : step === s.num ? 'linear-gradient(135deg, #4ab0de, #8b5cf6)' : 'var(--bg-card)',
                    border: step >= s.num ? 'none' : '1px solid var(--border-color)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '12px', fontWeight: 700, color: step >= s.num ? '#fff' : 'var(--text-muted)',
                  }}
                >
                  {step > s.num ? <Check size={14} /> : s.num}
                </div>
                <span style={{ fontSize: '13px', fontWeight: step === s.num ? 600 : 400, color: step === s.num ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                  {s.label}
                </span>
              </div>
              {i < 2 && (
                <div style={{ width: '60px', height: '2px', background: step > s.num ? '#10b981' : 'var(--border-color)', margin: '0 12px' }} />
              )}
            </div>
          ))}
        </div>

        {/* Page Header */}
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>
                {step === 1 ? 'Report New Risk' : 'Review & Rate Risks'}
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                {step === 1 ? 'Step 1: Describe your situation and select the risks you want to report' : 'Step 2: Review AI suggestions and adjust ratings if needed'}
              </p>
            </div>
            {step === 2 && (
              <button onClick={() => setStep(1)} style={{ padding: '7px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '13px', cursor: 'pointer', fontWeight: 500 }}>
                &larr; Back
              </button>
            )}
          </div>
        </div>

        {/* STEP 1: Identify Risks */}
        {step === 1 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Chat Header */}
            <div style={{ padding: '14px 24px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, #4ab0de 0%, #8b5cf6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Bot size={20} color="#fff" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '14px' }}>Risk AI Co-Pilot</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Describe your situation, I&apos;ll identify all potential risks</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span className="pulse-dot" style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>Online</span>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {messages.map((msg, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: '10px', alignItems: 'flex-start' }}>
                    {msg.role === 'assistant' && (
                      <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg, #4ab0de, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                        <Bot size={14} color="#fff" />
                      </div>
                    )}
                    <div
                      style={{
                        maxWidth: '70%', padding: '11px 15px',
                        borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                        background: msg.role === 'user' ? 'linear-gradient(135deg, #4ab0de, #8b5cf6)' : 'var(--bg-card)',
                        border: msg.role === 'user' ? 'none' : '1px solid var(--border-color)',
                        fontSize: '13px', lineHeight: '1.6',
                        whiteSpace: msg.role === 'user' ? 'pre-wrap' : undefined,
                      }}
                    >
                      {msg.role === 'assistant' ? <MarkdownRenderer content={msg.content} /> : msg.content}
                    </div>
                  </div>
                  {msg.timestamp && (
                    <div style={{ textAlign: msg.role === 'user' ? 'right' : 'left', marginLeft: msg.role === 'assistant' ? '38px' : '0', fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
              ))}

              {/* Draft Risk Cards */}
              {draftRisks.length > 0 && (
                <div style={{ marginLeft: '38px' }}>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                    I&apos;ve analyzed your situation and identified <strong>{draftRisks.length} potential risks</strong>. Select the ones you&apos;d like to report:
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {draftRisks.map((risk) => {
                      const cat = CATEGORY_COLORS[risk.category] || CATEGORY_COLORS.OPERATIONAL;
                      const CatIcon = cat.Icon;
                      return (
                        <div
                          key={risk.id}
                          onClick={() => toggleRisk(risk.id)}
                          style={{
                            padding: '14px 16px', borderRadius: '12px', cursor: 'pointer',
                            border: risk.selected ? '2px solid #10b981' : '1px solid var(--border-color)',
                            background: risk.selected ? 'rgba(16,185,129,0.05)' : 'var(--bg-card)',
                            transition: 'all 0.2s',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: cat.bg, color: cat.color, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <CatIcon size={11} /> {CATEGORY_LABELS[risk.category] || risk.category}
                              </span>
                              <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(139,92,246,0.15)', color: '#8b5cf6', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                <Sparkles size={9} /> AI
                              </span>
                            </div>
                            <div
                              style={{
                                width: '20px', height: '20px', borderRadius: '4px',
                                border: risk.selected ? '2px solid #10b981' : '2px solid var(--border-color)',
                                background: risk.selected ? '#10b981' : 'transparent',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'all 0.2s',
                              }}
                            >
                              {risk.selected && <Check size={12} color="#fff" />}
                            </div>
                          </div>
                          <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>{risk.title}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{risk.description}</div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Select All + Continue */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <button
                        onClick={selectAll}
                        style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer' }}
                      >
                        Select All
                      </button>
                      <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 600 }}>
                        {selectedCount} of {draftRisks.length} selected
                      </span>
                    </div>
                    <button
                      onClick={goToReview}
                      disabled={selectedCount === 0}
                      style={{
                        padding: '8px 18px', borderRadius: '8px', border: 'none',
                        background: selectedCount > 0 ? 'linear-gradient(135deg, #4ab0de, #8b5cf6)' : 'var(--border-color)',
                        color: '#fff', fontSize: '13px', fontWeight: 600, cursor: selectedCount > 0 ? 'pointer' : 'not-allowed',
                        display: 'flex', alignItems: 'center', gap: '6px',
                      }}
                    >
                      Continue to Review <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* Typing */}
              {isLoading && (
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg, #4ab0de, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Bot size={14} color="#fff" />
                  </div>
                  <div style={{ padding: '12px 16px', borderRadius: '14px 14px 14px 4px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', display: 'flex', gap: '5px', alignItems: 'center' }}>
                    {[0, 1, 2].map((d) => (
                      <span key={d} className="typing-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-cyan)', display: 'inline-block', animationDelay: `${d * 0.2}s` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-card)', flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '10px 14px' }}>
                <textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(e) => { setInputValue(e.target.value); if (textareaRef.current) { textareaRef.current.style.height = 'auto'; textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 100) + 'px'; } }}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Describe another concern or ask a follow-up question..."
                  rows={1}
                  style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: '13px', resize: 'none', lineHeight: '1.5', fontFamily: 'inherit', maxHeight: '100px' }}
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!inputValue.trim() || isLoading}
                  style={{
                    width: '36px', height: '36px', borderRadius: '10px', border: 'none',
                    background: inputValue.trim() && !isLoading ? 'linear-gradient(135deg, #4ab0de, #8b5cf6)' : 'var(--border-color)',
                    color: '#fff', cursor: inputValue.trim() && !isLoading ? 'pointer' : 'not-allowed',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Review & Rate */}
        {step === 2 && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
            <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {reviewRisks.map((risk, idx) => {
                const score = risk.likelihood * risk.impact;
                const level = getRiskLevel(score);
                const cat = CATEGORY_COLORS[risk.category] || CATEGORY_COLORS.OPERATIONAL;
                const CatIcon = cat.Icon;
                return (
                  <div key={risk.id} className="risk-card" style={{ padding: '24px' }}>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: cat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <CatIcon size={18} color={cat.color} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '16px' }}>{risk.title}</div>
                          <div style={{ fontSize: '12px', color: cat.color }}>{CATEGORY_LABELS[risk.category] || risk.category} Risk</div>
                        </div>
                      </div>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Risk {idx + 1} of {reviewRisks.length}</span>
                    </div>

                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '20px' }}>{risk.description}</p>

                    {/* Rating Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                      <div style={{ padding: '14px', borderRadius: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          LIKELIHOOD <span style={{ fontSize: '9px', padding: '1px 5px', borderRadius: '3px', background: 'rgba(16,185,129,0.15)', color: '#10b981', fontWeight: 600 }}>AI suggested</span>
                        </div>
                        <select
                          value={risk.likelihood}
                          onChange={(e) => updateReviewRisk(risk.id, 'likelihood', parseInt(e.target.value))}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }}
                        >
                          {[1, 2, 3, 4, 5].map((v) => <option key={v} value={v}>{LIKELIHOOD_LABELS[v]}</option>)}
                        </select>
                      </div>
                      <div style={{ padding: '14px', borderRadius: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          IMPACT <span style={{ fontSize: '9px', padding: '1px 5px', borderRadius: '3px', background: 'rgba(16,185,129,0.15)', color: '#10b981', fontWeight: 600 }}>AI suggested</span>
                        </div>
                        <select
                          value={risk.impact}
                          onChange={(e) => updateReviewRisk(risk.id, 'impact', parseInt(e.target.value))}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }}
                        >
                          {[1, 2, 3, 4, 5].map((v) => <option key={v} value={v}>{IMPACT_LABELS[v]}</option>)}
                        </select>
                      </div>
                      <div style={{ padding: '14px', borderRadius: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>INHERENT RISK SCORE</div>
                        <div style={{ fontSize: '28px', fontWeight: 800, color: level.color, lineHeight: 1 }}>{score}</div>
                        <div style={{ fontSize: '11px', color: level.color, fontWeight: 600, marginTop: '4px' }}>{level.label}</div>
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <label style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Additional Notes (Optional)</label>
                      <input
                        value={risk.notes || ''}
                        onChange={(e) => updateReviewRisk(risk.id, 'notes', e.target.value)}
                        placeholder="Add any context or details about this risk..."
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }}
                      />
                    </div>
                  </div>
                );
              })}

              {/* Submission Summary */}
              <div className="risk-card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BarChart3 size={18} style={{ opacity: 0.7 }} /> Submission Summary
                  </h3>
                  <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 600 }}>{reviewRisks.length} risks ready to submit</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ textAlign: 'center', padding: '14px', borderRadius: '10px', background: 'rgba(239,68,68,0.08)' }}>
                    <div style={{ fontSize: '28px', fontWeight: 800, color: '#ef4444' }}>{summaryHigh}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>High Risk</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '14px', borderRadius: '10px', background: 'rgba(245,158,11,0.08)' }}>
                    <div style={{ fontSize: '28px', fontWeight: 800, color: '#f59e0b' }}>{summaryMedium}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Medium Risk</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '14px', borderRadius: '10px', background: 'rgba(16,185,129,0.08)' }}>
                    <div style={{ fontSize: '28px', fontWeight: 800, color: '#10b981' }}>{summaryLow}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Low Risk</div>
                  </div>
                </div>

                <div style={{ padding: '12px 14px', borderRadius: '8px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ClipboardList size={14} style={{ opacity: 0.6, flexShrink: 0 }} />
                  These risks will be submitted to the <strong style={{ color: 'var(--text-primary)' }}>Risk Manager</strong> for validation and control assessment.
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>You can track the status of your submitted risks on your dashboard.</span>
                  <button
                    onClick={handleSubmit}
                    style={{
                      padding: '10px 24px', borderRadius: '10px', border: 'none',
                      background: 'linear-gradient(135deg, #4ab0de, #8b5cf6)',
                      color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '8px',
                    }}
                  >
                    <Check size={16} /> Submit {reviewRisks.length} Risks for Review
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
