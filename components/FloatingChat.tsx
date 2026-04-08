'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Mic, MicOff, Bot, Phone, PhoneOff, Volume2, Radio } from 'lucide-react';
import { usePathname } from 'next/navigation';
import MarkdownRenderer from '@/components/MarkdownRenderer';

/* eslint-disable @typescript-eslint/no-explicit-any */
interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

type CallState = 'idle' | 'connecting' | 'active';
type Tab = 'chat' | 'call';

export default function FloatingChat() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('chat');

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const pathname = usePathname();

  // Call state (WebRTC / OpenAI Realtime)
  const [callState, setCallState] = useState<CallState>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [callLogs, setCallLogs] = useState<Message[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [assistantSpeaking, setAssistantSpeaking] = useState(false);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const callLogsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  useEffect(() => {
    callLogsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [callLogs, currentTranscript]);

  const getContext = () => {
    const p = pathname || '';
    if (p.includes('/risk-manager/dashboard')) return 'User is a Risk Manager on the Risk Intelligence Dashboard — they can see risk stats, heat maps, control adequacy, and high-priority risks. Help them interpret data and prioritize.';
    if (p.includes('/risk-manager/registry')) return 'User is a Risk Manager on the Risk Registry — a table of all organizational risks with scores, categories, statuses. Help with filtering, understanding risk levels, or specific risks.';
    if (p.includes('/risk-manager/tasks')) return 'User is a Risk Manager on Task Review — they review and validate tasks submitted by Business Owners, checking evidence and assessments.';
    if (p.includes('/risk-manager/review')) return 'User is a Risk Manager reviewing a specific risk — validating details, assigning controls, creating tasks for Business Owners.';
    if (p.includes('/risk-manager')) return 'User is a Risk Manager. They validate risks, assign controls, review tasks, and oversee the risk lifecycle.';
    if (p.includes('/business-owner/tasks/')) return 'User is a Business Owner viewing a specific task detail — they fill in control effectiveness, gaps, recommendations, and upload evidence.';
    if (p.includes('/business-owner/tasks')) return 'User is a Business Owner viewing their task list — tasks assigned to them for control implementation and evidence upload.';
    if (p.includes('/business-owner/dashboard')) return 'User is a Business Owner on their Dashboard — seeing task stats, overdue alerts, and high-priority risks in their department.';
    if (p.includes('/business-owner/report-risk')) return 'User is a Business Owner reporting a new risk using the AI copilot — help them describe the risk clearly.';
    if (p.includes('/business-owner')) return 'User is a Business Owner. They report risks, complete assigned tasks with evidence, and track their department risks.';
    if (p.includes('/chief-risk-manager/dashboard')) return 'User is a Chief Risk Manager on the enterprise dashboard — overseeing all Risk Managers, monitoring performance, and reviewing organization-wide risk posture.';
    if (p.includes('/chief-risk-manager')) return 'User is a Chief Risk Manager overseeing enterprise risk across all departments and Risk Managers.';
    if (p.includes('/executive/dashboard')) return 'User is an Executive Board member viewing the strategic risk dashboard — cross-filtering risks, viewing heat maps, entity exposure, and board-level KRIs.';
    if (p.includes('/executive')) return 'User is an Executive Board member focused on strategic risk oversight and board-level reporting.';
    if (p.includes('/admin')) return 'User is a System Administrator managing users, workflows, bulk imports, form builder, and data repositories.';
    return 'User is on the RiskAI platform. RiskAI is an enterprise risk management platform for National Holding Group / Bloom Holding (UAE). It covers risk identification, validation, control assignment, task management, and board reporting.';
  };

  // ── Chat functions ──
  const sendMessage = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/risk-manager/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `[Context: ${getContext()}]\n\n${msg}`,
          history: messages.slice(-6).map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.message || 'Sorry, I could not process that.' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Please try again.' }]);
    }
    setLoading(false);
  };

  const toggleVoice = () => {
    if (listening) { recognitionRef.current?.stop(); setListening(false); return; }
    const W = window as any;
    const Ctor = W.SpeechRecognition || W.webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = 'en-US'; rec.interimResults = false; rec.maxAlternatives = 1;
    rec.onresult = (e: any) => { const t = e.results[0][0].transcript; setInput(t); sendMessage(t); };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec; rec.start(); setListening(true);
  };

  // ── Call functions (OpenAI Realtime WebRTC) ──
  const addCallLog = useCallback((role: Message['role'], content: string) => {
    setCallLogs(prev => [...prev, { role, content }]);
  }, []);

  const handleRealtimeEvent = useCallback((event: any) => {
    const type = event.type as string;
    if (type === 'response.audio_transcript.delta') {
      setCurrentTranscript(prev => prev + (event.delta || ''));
      setAssistantSpeaking(true);
    } else if (type === 'response.audio_transcript.done') {
      if (event.transcript?.trim()) addCallLog('assistant', event.transcript.trim());
      setCurrentTranscript(''); setAssistantSpeaking(false);
    } else if (type === 'conversation.item.input_audio_transcription.completed') {
      if (event.transcript?.trim()) addCallLog('user', event.transcript.trim());
    } else if (type === 'input_audio_buffer.speech_started') {
      setAssistantSpeaking(false);
    }
  }, [addCallLog]);

  const cleanupCall = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null;
    pcRef.current?.close(); pcRef.current = null;
    if (audioRef.current) { audioRef.current.srcObject = null; audioRef.current = null; }
    dcRef.current = null;
  }, []);

  const startCall = useCallback(async () => {
    if (callState === 'connecting') return;
    setCallState('connecting');
    addCallLog('system', 'Connecting to Yehya Voice...');
    try {
      const tokenRes = await fetch('/api/realtime');
      if (!tokenRes.ok) throw new Error('Failed to get session token');
      const data = await tokenRes.json();
      const key = data.client_secret?.value;
      if (!key) throw new Error('No ephemeral key');

      const pc = new RTCPeerConnection(); pcRef.current = pc;
      const audioEl = document.createElement('audio'); audioEl.autoplay = true; audioRef.current = audioEl;
      pc.ontrack = e => { audioEl.srcObject = e.streams[0]; };

      const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = ms; pc.addTrack(ms.getTracks()[0]);

      const dc = pc.createDataChannel('oai-events'); dcRef.current = dc;
      dc.onmessage = e => { try { handleRealtimeEvent(JSON.parse(e.data)); } catch { /* */ } };
      dc.onopen = () => { addCallLog('system', 'Connected! Start speaking.'); setCallState('active'); };
      dc.onclose = () => { endCall(); };

      const offer = await pc.createOffer(); await pc.setLocalDescription(offer);
      const sdpRes = await fetch('https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/sdp' },
        body: offer.sdp,
      });
      if (!sdpRes.ok) throw new Error('Realtime API connection failed');
      await pc.setRemoteDescription({ type: 'answer', sdp: await sdpRes.text() });
      addCallLog('system', 'Voice channel active.');
    } catch (err) {
      addCallLog('system', `Error: ${err instanceof Error ? err.message : 'Connection failed'}`);
      setCallState('idle'); cleanupCall();
    }
  }, [callState, addCallLog, handleRealtimeEvent, cleanupCall]);

  const endCall = useCallback(() => {
    cleanupCall(); setCallState('idle'); setCurrentTranscript(''); setAssistantSpeaking(false);
    addCallLog('system', 'Call ended.');
  }, [cleanupCall, addCallLog]);

  const toggleMute = useCallback(() => {
    const track = streamRef.current?.getAudioTracks()[0];
    if (track) { track.enabled = !track.enabled; setIsMuted(!track.enabled); }
  }, []);

  const quickPrompts = ['High priority risks', 'Overdue tasks', 'How to report a risk', 'Control effectiveness'];

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button onClick={() => setOpen(true)} style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 9998,
          width: '58px', height: '58px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #4ab0de 0%, #8b5cf6 100%)',
          border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 24px rgba(74,176,222,0.45)', transition: 'transform 0.2s',
        }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
        >
          <MessageCircle size={26} color="#fff" />
        </button>
      )}

      {/* Chat panel — bigger */}
      {open && (
        <div style={{
          position: 'fixed', bottom: '20px', right: '20px', zIndex: 9998,
          width: '440px', height: '640px', borderRadius: '18px',
          background: 'var(--bg-card)', border: '1px solid var(--border-color)',
          boxShadow: '0 16px 56px rgba(0,0,0,0.45)', display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding: '14px 16px', background: 'linear-gradient(135deg, #4ab0de 0%, #8b5cf6 100%)',
            display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0,
          }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bot size={20} color="#fff" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>Ask Yehya</div>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)' }}>
                {tab === 'call' && callState === 'active' ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', animation: 'pulseDot 2s infinite' }} />
                    Voice call active
                  </span>
                ) : 'AI Risk Assistant'}
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{
              background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '8px',
              width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}><X size={15} color="#fff" /></button>
          </div>

          {/* Tabs: Chat / Call */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', flexShrink: 0 }}>
            {([
              { key: 'chat' as Tab, label: 'Chat', icon: MessageCircle },
              { key: 'call' as Tab, label: 'Voice Call', icon: Phone },
            ]).map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                flex: 1, padding: '10px', fontSize: '12px', fontWeight: tab === t.key ? 700 : 500,
                color: tab === t.key ? 'var(--accent-cyan)' : 'var(--text-muted)',
                background: 'none', border: 'none',
                borderBottom: tab === t.key ? '2px solid var(--accent-cyan)' : '2px solid transparent',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              }}>
                <t.icon size={13} /> {t.label}
                {t.key === 'call' && callState === 'active' && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />}
              </button>
            ))}
          </div>

          {/* ── CHAT TAB ── */}
          {tab === 'chat' && (
            <>
              <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {messages.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '24px 16px', color: 'var(--text-muted)' }}>
                    <Bot size={36} style={{ opacity: 0.3, marginBottom: '10px' }} />
                    <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-secondary)' }}>Hi, I&apos;m Yehya!</div>
                    <div style={{ fontSize: '12px', lineHeight: 1.5, marginBottom: '14px' }}>
                      Your AI risk assistant. Ask me about risks, controls, tasks, or anything on the platform.
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center' }}>
                      {quickPrompts.map(q => (
                        <button key={q} onClick={() => sendMessage(q)} style={{
                          padding: '6px 12px', borderRadius: '16px', fontSize: '11px', fontWeight: 500,
                          background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                          color: 'var(--accent-cyan)', cursor: 'pointer',
                        }}>{q}</button>
                      ))}
                    </div>
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div key={i} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                    <div style={{
                      padding: '10px 14px', borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                      background: msg.role === 'user' ? 'linear-gradient(135deg, #4ab0de 0%, #8b5cf6 100%)' : 'var(--bg-primary)',
                      border: msg.role === 'assistant' ? '1px solid var(--border-color)' : 'none',
                      fontSize: '13px', lineHeight: 1.6,
                      color: msg.role === 'user' ? '#fff' : 'var(--text-secondary)',
                    }}>
                      {msg.role === 'assistant' ? <MarkdownRenderer content={msg.content} /> : msg.content}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div style={{ alignSelf: 'flex-start', padding: '10px 14px', borderRadius: '14px 14px 14px 4px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', fontSize: '12px', color: 'var(--text-muted)' }}>
                    <span style={{ display: 'inline-flex', gap: '3px' }}>
                      {[0, 1, 2].map(d => <span key={d} style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--accent-cyan)', animation: 'typing 1.4s infinite', animationDelay: `${d * 0.2}s` }} />)}
                    </span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
              <div style={{ padding: '12px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                <button onClick={toggleVoice} style={{
                  width: '36px', height: '36px', borderRadius: '8px',
                  background: listening ? 'rgba(239,68,68,0.15)' : 'var(--bg-primary)',
                  border: `1px solid ${listening ? 'rgba(239,68,68,0.3)' : 'var(--border-color)'}`,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  {listening ? <MicOff size={15} color="#ef4444" /> : <Mic size={15} color="var(--text-muted)" />}
                </button>
                <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }}
                  placeholder={listening ? 'Listening...' : 'Ask Yehya anything...'}
                  style={{
                    flex: 1, padding: '10px 14px', borderRadius: '8px',
                    background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'inherit', outline: 'none',
                  }}
                  onFocus={e => { e.target.style.borderColor = 'var(--accent-cyan)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--border-color)'; }}
                />
                <button onClick={() => sendMessage()} disabled={!input.trim() || loading} style={{
                  width: '36px', height: '36px', borderRadius: '8px',
                  background: input.trim() ? 'linear-gradient(135deg, #4ab0de, #8b5cf6)' : 'var(--bg-primary)',
                  border: input.trim() ? 'none' : '1px solid var(--border-color)',
                  cursor: input.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Send size={15} color={input.trim() ? '#fff' : 'var(--text-muted)'} />
                </button>
              </div>
            </>
          )}

          {/* ── CALL TAB ── */}
          {tab === 'call' && (
            <>
              {/* Call UI */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Call visual */}
                <div style={{ padding: '24px', textAlign: 'center', flexShrink: 0 }}>
                  <div style={{
                    width: '80px', height: '80px', borderRadius: '50%', margin: '0 auto 14px',
                    background: callState === 'active'
                      ? 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(74,176,222,0.2))'
                      : 'linear-gradient(135deg, rgba(74,176,222,0.1), rgba(139,92,246,0.1))',
                    border: `2px solid ${callState === 'active' ? '#10b981' : 'var(--border-color)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    animation: assistantSpeaking ? 'pulseDot 1.5s infinite' : 'none',
                  }}>
                    {callState === 'active' ? <Volume2 size={32} color="#10b981" /> : <Radio size={32} color="var(--text-muted)" />}
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>
                    {callState === 'idle' && 'Ready to call'}
                    {callState === 'connecting' && 'Connecting...'}
                    {callState === 'active' && (assistantSpeaking ? 'Yehya is speaking...' : 'Listening...')}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {callState === 'idle' ? 'Tap the call button to start a voice conversation' : 'Real-time voice with AI'}
                  </div>

                  {/* Call controls */}
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '16px' }}>
                    {callState === 'idle' ? (
                      <button onClick={startCall} style={{
                        width: '52px', height: '52px', borderRadius: '50%',
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 16px rgba(16,185,129,0.4)', transition: 'transform 0.2s',
                      }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
                      >
                        <Phone size={22} color="#fff" />
                      </button>
                    ) : (
                      <>
                        <button onClick={toggleMute} style={{
                          width: '44px', height: '44px', borderRadius: '50%',
                          background: isMuted ? 'rgba(239,68,68,0.15)' : 'var(--bg-primary)',
                          border: `1px solid ${isMuted ? 'rgba(239,68,68,0.3)' : 'var(--border-color)'}`,
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {isMuted ? <MicOff size={18} color="#ef4444" /> : <Mic size={18} color="var(--text-secondary)" />}
                        </button>
                        <button onClick={endCall} style={{
                          width: '52px', height: '52px', borderRadius: '50%',
                          background: '#ef4444', border: 'none', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: '0 4px 16px rgba(239,68,68,0.4)',
                        }}>
                          <PhoneOff size={22} color="#fff" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Call transcript log */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '0 14px 14px', borderTop: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '10px 0 6px' }}>Conversation Log</div>
                  {callLogs.length === 0 && !currentTranscript && (
                    <div style={{ textAlign: 'center', padding: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>
                      Call transcript will appear here
                    </div>
                  )}
                  {callLogs.map((log, i) => (
                    <div key={i} style={{
                      padding: '8px 12px', marginBottom: '6px', borderRadius: '8px', fontSize: '12px', lineHeight: 1.5,
                      background: log.role === 'system' ? 'transparent' : log.role === 'user' ? 'rgba(74,176,222,0.08)' : 'var(--bg-primary)',
                      border: log.role === 'system' ? 'none' : '1px solid var(--border-color)',
                      color: log.role === 'system' ? 'var(--text-muted)' : 'var(--text-secondary)',
                      fontStyle: log.role === 'system' ? 'italic' : 'normal',
                    }}>
                      {log.role !== 'system' && (
                        <div style={{ fontSize: '10px', fontWeight: 700, color: log.role === 'user' ? 'var(--accent-cyan)' : '#8b5cf6', marginBottom: '2px' }}>
                          {log.role === 'user' ? 'You' : 'Yehya'}
                        </div>
                      )}
                      {log.role === 'assistant' ? <MarkdownRenderer content={log.content} /> : log.content}
                    </div>
                  ))}
                  {currentTranscript && (
                    <div style={{ padding: '8px 12px', marginBottom: '6px', borderRadius: '8px', fontSize: '12px', background: 'var(--bg-primary)', border: '1px solid rgba(139,92,246,0.3)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      <div style={{ fontSize: '10px', fontWeight: 700, color: '#8b5cf6', marginBottom: '2px' }}>Yehya</div>
                      {currentTranscript}
                      <span style={{ display: 'inline-flex', gap: '2px', marginLeft: '4px', verticalAlign: 'middle' }}>
                        {[0, 1, 2].map(d => <span key={d} style={{ width: '3px', height: '3px', borderRadius: '50%', background: '#8b5cf6', animation: 'typing 1.4s infinite', animationDelay: `${d * 0.2}s` }} />)}
                      </span>
                    </div>
                  )}
                  <div ref={callLogsEndRef} />
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
