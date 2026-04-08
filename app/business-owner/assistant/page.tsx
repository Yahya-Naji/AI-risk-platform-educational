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
  Sparkles,
  Shield,
  AlertTriangle,
  BookOpen,
  HelpCircle,
  Zap,
  Radio,
} from 'lucide-react';
import MarkdownRenderer from '@/components/MarkdownRenderer';

type ConnectionState = 'disconnected' | 'connecting' | 'connected';

interface LogEntry {
  id: string;
  type: 'system' | 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

export default function AssistantPage() {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [isMuted, setIsMuted] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [assistantSpeaking, setAssistantSpeaking] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, currentTranscript]);

  const addLog = useCallback((type: LogEntry['type'], text: string) => {
    setLogs((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, type, text, timestamp: new Date() }]);
  }, []);

  const connect = useCallback(async () => {
    if (connectionState === 'connecting') return;
    setConnectionState('connecting');
    addLog('system', 'Requesting microphone access...');

    try {
      // Get ephemeral token
      const tokenRes = await fetch('/api/realtime');
      if (!tokenRes.ok) throw new Error('Failed to get session token');
      const data = await tokenRes.json();
      const ephemeralKey = data.client_secret?.value;
      if (!ephemeralKey) throw new Error('No ephemeral key returned');

      addLog('system', 'Session created. Connecting to OpenAI Realtime...');

      // Create peer connection
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      // Set up audio playback
      const audioEl = document.createElement('audio');
      audioEl.autoplay = true;
      audioRef.current = audioEl;

      pc.ontrack = (e) => {
        audioEl.srcObject = e.streams[0];
      };

      // Get microphone
      const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = ms;
      pc.addTrack(ms.getTracks()[0]);

      // Create data channel for events
      const dc = pc.createDataChannel('oai-events');
      dcRef.current = dc;

      dc.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data);
          handleRealtimeEvent(event);
        } catch {
          // ignore parse errors
        }
      };

      dc.onopen = () => {
        addLog('system', 'Voice channel open. Start speaking!');
        setConnectionState('connected');
      };

      dc.onclose = () => {
        addLog('system', 'Voice channel closed.');
        disconnect();
      };

      // Create and set local offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Send offer to OpenAI Realtime API
      const sdpRes = await fetch(
        'https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${ephemeralKey}`,
            'Content-Type': 'application/sdp',
          },
          body: offer.sdp,
        }
      );

      if (!sdpRes.ok) throw new Error('Failed to connect to Realtime API');

      const answerSdp = await sdpRes.text();
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

      addLog('system', 'Connected to RiskAI Voice Assistant.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Connection failed';
      addLog('system', `Error: ${msg}`);
      setConnectionState('disconnected');
      cleanup();
    }
  }, [connectionState, addLog]);

  const handleRealtimeEvent = useCallback((event: Record<string, unknown>) => {
    const type = event.type as string;

    if (type === 'response.audio_transcript.delta') {
      const delta = (event as Record<string, string>).delta || '';
      setCurrentTranscript((prev) => prev + delta);
      setAssistantSpeaking(true);
    } else if (type === 'response.audio_transcript.done') {
      const transcript = (event as Record<string, string>).transcript || '';
      if (transcript.trim()) {
        addLog('assistant', transcript.trim());
      }
      setCurrentTranscript('');
      setAssistantSpeaking(false);
    } else if (type === 'conversation.item.input_audio_transcription.completed') {
      const transcript = (event as Record<string, string>).transcript || '';
      if (transcript.trim()) {
        addLog('user', transcript.trim());
      }
    } else if (type === 'input_audio_buffer.speech_started') {
      setAssistantSpeaking(false);
    }
  }, [addLog]);

  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.srcObject = null;
      audioRef.current = null;
    }
    dcRef.current = null;
  }, []);

  const disconnect = useCallback(() => {
    cleanup();
    setConnectionState('disconnected');
    setCurrentTranscript('');
    setAssistantSpeaking(false);
    addLog('system', 'Disconnected.');
  }, [cleanup, addLog]);

  const toggleMute = useCallback(() => {
    if (streamRef.current) {
      const track = streamRef.current.getAudioTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        setIsMuted(!track.enabled);
      }
    }
  }, []);

  const quickPrompts = [
    { icon: Shield, label: 'How do I report a risk?', color: '#4ab0de' },
    { icon: AlertTriangle, label: 'Explain risk scoring', color: '#f59e0b' },
    { icon: BookOpen, label: 'What are risk categories?', color: '#8b5cf6' },
    { icon: HelpCircle, label: 'UAE compliance basics', color: '#10b981' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <Sidebar role="business-owner" />

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--border-color)' }}>
          <div className="animate-fade-up" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '14px',
                background: 'linear-gradient(135deg, #4ab0de 0%, #8b5cf6 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 20px rgba(74,176,222,0.3)',
              }}>
                <Bot size={24} color="#fff" />
              </div>
              <div>
                <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Voice Assistant
                  <span style={{
                    fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '6px',
                    background: 'rgba(139,92,246,0.15)', color: '#8b5cf6',
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                  }}>
                    <Sparkles size={10} /> AI Powered
                  </span>
                </h1>
                <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                  Talk to RiskAI about risk management, platform guidance, and UAE compliance
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: connectionState === 'connected' ? '#10b981' : connectionState === 'connecting' ? '#f59e0b' : 'var(--text-muted)',
                display: 'inline-block',
              }} className={connectionState === 'connected' ? 'pulse-dot' : ''} />
              <span style={{ fontSize: '12px', fontWeight: 600, color: connectionState === 'connected' ? '#10b981' : 'var(--text-muted)' }}>
                {connectionState === 'connected' ? 'Live' : connectionState === 'connecting' ? 'Connecting...' : 'Offline'}
              </span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {connectionState === 'disconnected' ? (
            /* Landing State */
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '32px', padding: '40px' }}>
              {/* Voice Orb */}
              <div className="animate-fade-up" style={{ position: 'relative' }}>
                <div style={{
                  width: '140px', height: '140px', borderRadius: '50%',
                  background: 'radial-gradient(circle at 30% 30%, rgba(74,176,222,0.2), rgba(139,92,246,0.1) 60%, transparent)',
                  border: '2px solid rgba(74,176,222,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  position: 'relative',
                }}>
                  <div style={{
                    width: '90px', height: '90px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, rgba(74,176,222,0.15), rgba(139,92,246,0.15))',
                    border: '1px solid rgba(74,176,222,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Mic size={32} style={{ color: 'var(--accent-cyan)', opacity: 0.8 }} />
                  </div>
                </div>
              </div>

              <div className="animate-fade-up-1" style={{ textAlign: 'center', maxWidth: '460px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 8px' }}>Start a Voice Conversation</h2>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
                  Ask questions about risk management, get platform guidance, or learn about UAE compliance — all by voice.
                </p>
              </div>

              {/* Quick Prompts */}
              <div className="animate-fade-up-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', maxWidth: '480px', width: '100%' }}>
                {quickPrompts.map((p) => {
                  const Icon = p.icon;
                  return (
                    <div key={p.label} style={{
                      padding: '12px 14px', borderRadius: '10px',
                      background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                      display: 'flex', alignItems: 'center', gap: '10px',
                      fontSize: '12px', color: 'var(--text-secondary)',
                    }}>
                      <Icon size={16} style={{ color: p.color, flexShrink: 0 }} />
                      {p.label}
                    </div>
                  );
                })}
              </div>

              {/* Connect Button */}
              <button
                className="animate-fade-up-3"
                onClick={connect}
                style={{
                  padding: '14px 36px', borderRadius: '14px', border: 'none',
                  background: 'linear-gradient(135deg, #4ab0de, #8b5cf6)',
                  color: '#fff', fontSize: '15px', fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '10px',
                  boxShadow: '0 4px 24px rgba(74,176,222,0.3)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 32px rgba(74,176,222,0.4)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 24px rgba(74,176,222,0.3)';
                }}
              >
                <Phone size={18} /> Start Voice Session
              </button>
            </div>
          ) : (
            /* Active Session */
            <>
              {/* Transcript Log */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {logs.map((log) => (
                  <div key={log.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    {log.type === 'system' ? (
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '4px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Zap size={11} style={{ opacity: 0.5 }} /> {log.text}
                      </div>
                    ) : log.type === 'assistant' ? (
                      <>
                        <div style={{
                          width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0,
                          background: 'linear-gradient(135deg, #4ab0de, #8b5cf6)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Bot size={14} color="#fff" />
                        </div>
                        <div style={{
                          maxWidth: '75%', padding: '10px 14px', borderRadius: '12px 12px 12px 4px',
                          background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                        }}>
                          <MarkdownRenderer content={log.text} />
                        </div>
                      </>
                    ) : (
                      <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                        <div style={{
                          maxWidth: '75%', padding: '10px 14px', borderRadius: '12px 12px 4px 12px',
                          background: 'linear-gradient(135deg, #4ab0de, #8b5cf6)',
                          fontSize: '13px', lineHeight: 1.6,
                        }}>
                          {log.text}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Live Transcript */}
                {currentTranscript && (
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0,
                      background: 'linear-gradient(135deg, #4ab0de, #8b5cf6)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Bot size={14} color="#fff" />
                    </div>
                    <div style={{
                      maxWidth: '75%', padding: '10px 14px', borderRadius: '12px 12px 12px 4px',
                      background: 'var(--bg-card)', border: '1px solid rgba(74,176,222,0.3)',
                      fontSize: '13px', lineHeight: 1.6, color: 'var(--text-secondary)',
                    }}>
                      {currentTranscript}
                      <span style={{ opacity: 0.5, animation: 'blink 1s infinite' }}>|</span>
                    </div>
                  </div>
                )}

                <div ref={logsEndRef} />
              </div>

              {/* Voice Controls */}
              <div style={{
                padding: '20px 28px', borderTop: '1px solid var(--border-color)',
                background: 'var(--bg-secondary)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px',
              }}>
                {/* Voice Visualizer */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '3px', height: '32px',
                }}>
                  {assistantSpeaking ? (
                    Array.from({ length: 12 }).map((_, i) => (
                      <div key={i} style={{
                        width: '3px', borderRadius: '3px',
                        background: 'linear-gradient(to top, #4ab0de, #8b5cf6)',
                        animation: `voiceBar 0.6s ease-in-out infinite alternate`,
                        animationDelay: `${i * 0.05}s`,
                        height: '8px',
                      }} />
                    ))
                  ) : connectionState === 'connected' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                      <Radio size={14} style={{ color: '#10b981' }} /> Listening...
                    </div>
                  ) : (
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Connecting...</div>
                  )}
                </div>

                {/* Control Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <button
                    onClick={toggleMute}
                    style={{
                      width: '48px', height: '48px', borderRadius: '50%',
                      background: isMuted ? 'rgba(239,68,68,0.15)' : 'var(--bg-card)',
                      color: isMuted ? '#ef4444' : 'var(--text-secondary)',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: `1px solid ${isMuted ? 'rgba(239,68,68,0.3)' : 'var(--border-color)'}`,
                      transition: 'all 0.2s',
                    }}
                    title={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                  </button>

                  <button
                    onClick={disconnect}
                    style={{
                      width: '56px', height: '56px', borderRadius: '50%', border: 'none',
                      background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                      color: '#fff', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 4px 20px rgba(239,68,68,0.3)',
                      transition: 'transform 0.2s',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
                    title="End session"
                  >
                    <PhoneOff size={22} />
                  </button>

                  <button
                    onClick={() => {
                      if (audioRef.current) audioRef.current.muted = !audioRef.current.muted;
                    }}
                    style={{
                      width: '48px', height: '48px', borderRadius: '50%',
                      background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                      color: 'var(--text-secondary)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.2s',
                    }}
                    title="Toggle speaker"
                  >
                    <Volume2 size={20} />
                  </button>
                </div>

                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Powered by OpenAI Realtime API
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      <style jsx>{`
        @keyframes voiceBar {
          0% { height: 4px; }
          100% { height: 28px; }
        }
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
