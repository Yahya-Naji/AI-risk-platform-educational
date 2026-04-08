'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import {
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Volume2,
  Bot,
  Send,
  Sparkles,
  MessageSquare,
  Radio,
  Zap,
  BarChart3,
  AlertTriangle,
  Shield,
  Users,
  Clock,
} from 'lucide-react';
import MarkdownRenderer from '@/components/MarkdownRenderer';

type Mode = 'chat' | 'voice';
type ConnectionState = 'disconnected' | 'connecting' | 'connected';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface VoiceLog {
  id: string;
  type: 'system' | 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

export default function RiskManagerAssistantPage() {
  const [mode, setMode] = useState<Mode>('chat');

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hello Ahmed! I'm your AI Risk Assistant with full access to the platform data. I can help you:\n\n- **Analyze risks** — ask about specific risks, patterns, or trends\n- **Prioritize reviews** — I'll tell you which risks need attention first\n- **Generate reports** — risk summaries by department, category, or level\n- **Suggest controls** — recommend mitigation strategies\n- **UAE compliance** — guidance on ADGM, DIFC, MOHRE regulations\n\nWhat would you like to know?",
      timestamp: new Date(),
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Voice state
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [isMuted, setIsMuted] = useState(false);
  const [voiceLogs, setVoiceLogs] = useState<VoiceLog[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [assistantSpeaking, setAssistantSpeaking] = useState(false);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const voiceEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mode === 'chat') chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    else voiceEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, voiceLogs, currentTranscript, mode]);

  // Chat handlers
  const handleChatSend = async () => {
    const msg = chatInput.trim();
    if (!msg || chatLoading) return;
    setChatInput('');

    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', content: msg, timestamp: new Date() };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatLoading(true);

    try {
      const history = chatMessages.filter((m) => m.id !== 'welcome').map((m) => ({ role: m.role, content: m.content }));
      const res = await fetch('/api/risk-manager/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, history }),
      });
      const data = await res.json();
      setChatMessages((prev) => [...prev, {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: data.message || 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      }]);
    } catch {
      setChatMessages((prev) => [...prev, {
        id: `e-${Date.now()}`,
        role: 'assistant',
        content: "I'm having trouble connecting. Please try again.",
        timestamp: new Date(),
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Voice handlers
  const addVoiceLog = useCallback((type: VoiceLog['type'], text: string) => {
    setVoiceLogs((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, type, text, timestamp: new Date() }]);
  }, []);

  const connectVoice = useCallback(async () => {
    if (connectionState === 'connecting') return;
    setConnectionState('connecting');
    addVoiceLog('system', 'Requesting microphone access...');

    try {
      const tokenRes = await fetch('/api/realtime');
      if (!tokenRes.ok) throw new Error('Failed to get session token');
      const data = await tokenRes.json();
      const ephemeralKey = data.client_secret?.value;
      if (!ephemeralKey) throw new Error('No ephemeral key returned');

      addVoiceLog('system', 'Connecting to OpenAI Realtime...');

      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      const audioEl = document.createElement('audio');
      audioEl.autoplay = true;
      audioRef.current = audioEl;
      pc.ontrack = (e) => { audioEl.srcObject = e.streams[0]; };

      const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = ms;
      pc.addTrack(ms.getTracks()[0]);

      const dc = pc.createDataChannel('oai-events');
      dcRef.current = dc;

      dc.onmessage = (e) => {
        try { handleRealtimeEvent(JSON.parse(e.data)); } catch { /* ignore */ }
      };
      dc.onopen = () => {
        addVoiceLog('system', 'Voice channel open. Start speaking!');
        setConnectionState('connected');
      };
      dc.onclose = () => { disconnectVoice(); };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpRes = await fetch(
        'https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17',
        { method: 'POST', headers: { Authorization: `Bearer ${ephemeralKey}`, 'Content-Type': 'application/sdp' }, body: offer.sdp }
      );
      if (!sdpRes.ok) throw new Error('Failed to connect');

      const answerSdp = await sdpRes.text();
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
      addVoiceLog('system', 'Connected to RiskAI Voice.');
    } catch (err) {
      addVoiceLog('system', `Error: ${err instanceof Error ? err.message : 'Connection failed'}`);
      setConnectionState('disconnected');
      cleanupVoice();
    }
  }, [connectionState, addVoiceLog]);

  const handleRealtimeEvent = useCallback((event: Record<string, unknown>) => {
    const type = event.type as string;
    if (type === 'response.audio_transcript.delta') {
      setCurrentTranscript((prev) => prev + ((event as Record<string, string>).delta || ''));
      setAssistantSpeaking(true);
    } else if (type === 'response.audio_transcript.done') {
      const t = (event as Record<string, string>).transcript || '';
      if (t.trim()) addVoiceLog('assistant', t.trim());
      setCurrentTranscript('');
      setAssistantSpeaking(false);
    } else if (type === 'conversation.item.input_audio_transcription.completed') {
      const t = (event as Record<string, string>).transcript || '';
      if (t.trim()) addVoiceLog('user', t.trim());
    } else if (type === 'input_audio_buffer.speech_started') {
      setAssistantSpeaking(false);
    }
  }, [addVoiceLog]);

  const cleanupVoice = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    if (audioRef.current) { audioRef.current.srcObject = null; audioRef.current = null; }
    dcRef.current = null;
  }, []);

  const disconnectVoice = useCallback(() => {
    cleanupVoice();
    setConnectionState('disconnected');
    setCurrentTranscript('');
    setAssistantSpeaking(false);
    addVoiceLog('system', 'Disconnected.');
  }, [cleanupVoice, addVoiceLog]);

  const toggleMute = useCallback(() => {
    if (streamRef.current) {
      const track = streamRef.current.getAudioTracks()[0];
      if (track) { track.enabled = !track.enabled; setIsMuted(!track.enabled); }
    }
  }, []);

  const quickPrompts = [
    { icon: BarChart3, label: 'Give me a risk summary', color: '#4ab0de' },
    { icon: AlertTriangle, label: 'Which risks need attention first?', color: '#f59e0b' },
    { icon: Shield, label: 'Show risks with no controls', color: '#8b5cf6' },
    { icon: Users, label: 'Risks by department', color: '#10b981' },
    { icon: Clock, label: 'Any overdue tasks?', color: '#ef4444' },
    { icon: Zap, label: 'UAE compliance gaps', color: '#ec4899' },
  ];

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', overflow: 'hidden' }}>
      <Sidebar role="risk-manager" />

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, #4ab0de, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(74,176,222,0.3)' }}>
              <Bot size={20} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: '18px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                AI Risk Assistant
                <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 7px', borderRadius: '5px', background: 'rgba(139,92,246,0.15)', color: '#8b5cf6', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  <Sparkles size={9} /> GPT-4o
                </span>
              </h1>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>Full access to platform data &middot; Analyze risks, generate reports, get recommendations</p>
            </div>
          </div>

          {/* Mode Toggle */}
          <div style={{ display: 'flex', borderRadius: '10px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
            <button onClick={() => setMode('chat')}
              style={{
                padding: '8px 16px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: 'none',
                background: mode === 'chat' ? 'rgba(74,176,222,0.15)' : 'transparent',
                color: mode === 'chat' ? 'var(--accent-cyan)' : 'var(--text-muted)',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}>
              <MessageSquare size={14} /> Chat
            </button>
            <button onClick={() => setMode('voice')}
              style={{
                padding: '8px 16px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: 'none',
                borderLeft: '1px solid var(--border-color)',
                background: mode === 'voice' ? 'rgba(139,92,246,0.15)' : 'transparent',
                color: mode === 'voice' ? '#8b5cf6' : 'var(--text-muted)',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}>
              <Mic size={14} /> Voice
              {connectionState === 'connected' && (
                <span className="pulse-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
              )}
            </button>
          </div>
        </div>

        {/* CHAT MODE */}
        {mode === 'chat' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {chatMessages.map((msg) => (
                <div key={msg.id}>
                  <div style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: '10px', alignItems: 'flex-start' }}>
                    {msg.role === 'assistant' && (
                      <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg, #4ab0de, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                        <Bot size={14} color="#fff" />
                      </div>
                    )}
                    <div style={{
                      maxWidth: '72%', padding: '12px 16px',
                      borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                      background: msg.role === 'user' ? 'linear-gradient(135deg, #4ab0de, #8b5cf6)' : 'var(--bg-card)',
                      border: msg.role === 'user' ? 'none' : '1px solid var(--border-color)',
                      fontSize: '13px',
                    }}>
                      {msg.role === 'assistant' ? <MarkdownRenderer content={msg.content} /> : msg.content}
                    </div>
                  </div>
                  <div style={{ textAlign: msg.role === 'user' ? 'right' : 'left', marginLeft: msg.role === 'assistant' ? '38px' : '0', fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px' }}>
                    {msg.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}

              {/* Quick Prompts (only show at start) */}
              {chatMessages.length <= 1 && (
                <div style={{ marginLeft: '38px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '4px' }}>
                  {quickPrompts.map((p) => {
                    const Icon = p.icon;
                    return (
                      <button key={p.label} onClick={() => { setChatInput(p.label); }}
                        style={{
                          padding: '10px 12px', borderRadius: '10px',
                          background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                          color: 'var(--text-secondary)', fontSize: '11px', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: '8px', textAlign: 'left',
                          transition: 'border-color 0.2s',
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = p.color; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-color)'; }}>
                        <Icon size={14} style={{ color: p.color, flexShrink: 0 }} />
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Loading */}
              {chatLoading && (
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
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-card)', flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '10px 14px' }}>
                <textarea ref={textareaRef} value={chatInput}
                  onChange={(e) => { setChatInput(e.target.value); if (textareaRef.current) { textareaRef.current.style.height = 'auto'; textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 100) + 'px'; } }}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend(); } }}
                  placeholder="Ask about risks, request reports, get recommendations..."
                  rows={1}
                  style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: '13px', resize: 'none', lineHeight: '1.5', fontFamily: 'inherit', maxHeight: '100px' }} />
                <button onClick={handleChatSend} disabled={!chatInput.trim() || chatLoading}
                  style={{
                    width: '36px', height: '36px', borderRadius: '10px', border: 'none',
                    background: chatInput.trim() && !chatLoading ? 'linear-gradient(135deg, #4ab0de, #8b5cf6)' : 'var(--border-color)',
                    color: '#fff', cursor: chatInput.trim() && !chatLoading ? 'pointer' : 'not-allowed',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VOICE MODE */}
        {mode === 'voice' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {connectionState === 'disconnected' ? (
              /* Landing */
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '28px', padding: '40px' }}>
                <div style={{ position: 'relative' }}>
                  <div style={{
                    width: '120px', height: '120px', borderRadius: '50%',
                    background: 'radial-gradient(circle at 30% 30%, rgba(74,176,222,0.2), rgba(139,92,246,0.1) 60%, transparent)',
                    border: '2px solid rgba(74,176,222,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <div style={{
                      width: '76px', height: '76px', borderRadius: '50%',
                      background: 'linear-gradient(135deg, rgba(74,176,222,0.15), rgba(139,92,246,0.15))',
                      border: '1px solid rgba(74,176,222,0.3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Mic size={28} style={{ color: 'var(--accent-cyan)', opacity: 0.8 }} />
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'center', maxWidth: '400px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px' }}>Voice Risk Assistant</h2>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
                    Talk to your AI assistant about risks, get instant analysis, and manage your portfolio by voice.
                  </p>
                </div>

                <button onClick={connectVoice}
                  style={{
                    padding: '12px 32px', borderRadius: '14px', border: 'none',
                    background: 'linear-gradient(135deg, #4ab0de, #8b5cf6)',
                    color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '8px',
                    boxShadow: '0 4px 24px rgba(74,176,222,0.3)',
                  }}>
                  <Phone size={16} /> Start Voice Session
                </button>
              </div>
            ) : (
              <>
                {/* Transcript */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {voiceLogs.map((log) => (
                    <div key={log.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                      {log.type === 'system' ? (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '3px 0', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Zap size={10} style={{ opacity: 0.5 }} /> {log.text}
                        </div>
                      ) : log.type === 'assistant' ? (
                        <>
                          <div style={{ width: '26px', height: '26px', borderRadius: '8px', flexShrink: 0, background: 'linear-gradient(135deg, #4ab0de, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Bot size={12} color="#fff" />
                          </div>
                          <div style={{ maxWidth: '75%', padding: '10px 14px', borderRadius: '12px 12px 12px 4px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', fontSize: '13px', lineHeight: 1.6 }}>
                            {log.text}
                          </div>
                        </>
                      ) : (
                        <div style={{ marginLeft: 'auto' }}>
                          <div style={{ maxWidth: '75%', padding: '10px 14px', borderRadius: '12px 12px 4px 12px', background: 'linear-gradient(135deg, #4ab0de, #8b5cf6)', fontSize: '13px', lineHeight: 1.6 }}>
                            {log.text}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {currentTranscript && (
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                      <div style={{ width: '26px', height: '26px', borderRadius: '8px', flexShrink: 0, background: 'linear-gradient(135deg, #4ab0de, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Bot size={12} color="#fff" />
                      </div>
                      <div style={{ maxWidth: '75%', padding: '10px 14px', borderRadius: '12px 12px 12px 4px', background: 'var(--bg-card)', border: '1px solid rgba(74,176,222,0.3)', fontSize: '13px', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                        {currentTranscript}<span style={{ opacity: 0.5, animation: 'blink 1s infinite' }}>|</span>
                      </div>
                    </div>
                  )}
                  <div ref={voiceEndRef} />
                </div>

                {/* Voice Controls */}
                <div style={{ padding: '18px 24px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
                  {/* Visualizer */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px', height: '28px' }}>
                    {assistantSpeaking ? (
                      Array.from({ length: 12 }).map((_, i) => (
                        <div key={i} style={{
                          width: '3px', borderRadius: '3px',
                          background: 'linear-gradient(to top, #4ab0de, #8b5cf6)',
                          animation: 'voiceBar 0.6s ease-in-out infinite alternate',
                          animationDelay: `${i * 0.05}s`, height: '6px',
                        }} />
                      ))
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--text-muted)' }}>
                        <Radio size={12} style={{ color: '#10b981' }} /> Listening...
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button onClick={toggleMute} title={isMuted ? 'Unmute' : 'Mute'}
                      style={{
                        width: '44px', height: '44px', borderRadius: '50%',
                        background: isMuted ? 'rgba(239,68,68,0.15)' : 'var(--bg-card)',
                        color: isMuted ? '#ef4444' : 'var(--text-secondary)', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: `1px solid ${isMuted ? 'rgba(239,68,68,0.3)' : 'var(--border-color)'}`,
                      }}>
                      {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                    </button>
                    <button onClick={disconnectVoice} title="End session"
                      style={{
                        width: '50px', height: '50px', borderRadius: '50%', border: 'none',
                        background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 16px rgba(239,68,68,0.3)',
                      }}>
                      <PhoneOff size={20} />
                    </button>
                    <button onClick={() => { if (audioRef.current) audioRef.current.muted = !audioRef.current.muted; }} title="Toggle speaker"
                      style={{
                        width: '44px', height: '44px', borderRadius: '50%',
                        background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                        color: 'var(--text-secondary)', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                      <Volume2 size={18} />
                    </button>
                  </div>

                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Powered by OpenAI Realtime API</div>
                </div>
              </>
            )}
          </div>
        )}
      </main>

      <style jsx>{`
        @keyframes voiceBar {
          0% { height: 4px; }
          100% { height: 24px; }
        }
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
