'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import {
  Database, FileSpreadsheet, Globe, Plus, RefreshCw, Settings, Trash2, X,
  CheckCircle, AlertTriangle, Sparkles,
} from 'lucide-react';

interface Repo {
  id: string; name: string; type: 'db' | 'excel' | 'api'; icon: typeof Database;
  description: string; status: 'connected' | 'indexed' | 'live' | 'auth_required';
  statusColor: string; statusLabel: string;
}

const REPOS: Repo[] = [
  { id: '1', name: 'Enterprise Risk DB (PostgreSQL)', type: 'db', icon: Database, description: 'Internal · risk-db.nhg.ae:5432 · 14,820 records · Last sync: 2h ago', status: 'connected', statusColor: '#10b981', statusLabel: 'Connected' },
  { id: '2', name: 'Q1 2026 Risk Register (Excel)', type: 'excel', icon: FileSpreadsheet, description: 'Upload · 247 rows · Uploaded Mar 24, 2026 · Version 3', status: 'indexed', statusColor: '#10b981', statusLabel: 'Indexed' },
  { id: '3', name: 'SEC EDGAR – Full-Text Search API', type: 'api', icon: Globe, description: 'REST API · secsearch.sec.gov/search · Filings, disclosures · Polling: 6h', status: 'live', statusColor: '#10b981', statusLabel: 'Live' },
  { id: '4', name: 'Bayanat.ae – UAE Open Data', type: 'api', icon: Globe, description: 'REST API · bayanat.ae · Government datasets · Polling: 24h', status: 'auth_required', statusColor: '#f59e0b', statusLabel: 'Auth required' },
];

const PRESETS = [
  { id: 'sec', label: 'SEC EDGAR', badge: 'US Regulatory', desc: 'Full-text search · Filings & disclosures', color: '#4ab0de' },
  { id: 'bayanat', label: 'Bayanat.ae', badge: 'UAE Gov', desc: 'UAE Open Data Portal · Government datasets', color: '#10b981' },
  { id: 'sca', label: 'SCA UAE', badge: 'UAE Regulator', desc: 'Securities & Commodities Authority', color: '#10b981' },
  { id: 'custom', label: 'Custom REST API', badge: '', desc: 'Any REST endpoint · Define manually', color: '#6b7280' },
];

export default function RepositoriesPage() {
  const [showForm, setShowForm] = useState(false);
  const [srcType, setSrcType] = useState<'db' | 'excel' | 'api'>('db');
  const [selPreset, setSelPreset] = useState('');
  const [connStatus, setConnStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle');
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const testConnection = () => {
    setConnStatus('testing');
    setTimeout(() => { setConnStatus(Math.random() > 0.3 ? 'ok' : 'error'); }, 1800);
  };

  const inputStyle: React.CSSProperties = { width: '100%', padding: '9px 12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'inherit', outline: 'none' };

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', overflow: 'hidden' }}>
      <Sidebar role="admin" />
      <main style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="animate-fade-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Repositories</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>Connect external data sources — databases, Excel files, and REST API integrations</p>
          </div>
          <button className="btn-primary" style={{ fontSize: '12px' }} onClick={() => setShowForm(true)}><Plus size={14} /> Add repository</button>
        </div>

        {!showForm ? (
          <div className="animate-fade-up-1">
            <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '12px' }}>Connected sources ({REPOS.length})</div>
            {REPOS.map(repo => {
              const Icon = repo.icon;
              return (
                <div key={repo.id} className="risk-card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: `${repo.statusColor}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={20} color={repo.statusColor} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '2px' }}>{repo.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{repo.description}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: '12px' }}>
                    <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: repo.statusColor }} />
                    <span style={{ fontSize: '12px', fontWeight: 600, color: repo.statusColor }}>{repo.statusLabel}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button className="btn-secondary" style={{ fontSize: '11px', padding: '5px 11px' }} onClick={() => showToast('Configuration opened')}><Settings size={12} /> Configure</button>
                    <button className="btn-secondary" style={{ fontSize: '11px', padding: '5px 11px' }} onClick={() => showToast('Syncing...')}><RefreshCw size={12} /> Sync</button>
                  </div>
                </div>
              );
            })}
            <div onClick={() => setShowForm(true)} className="risk-card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', borderStyle: 'dashed' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', border: '1.5px dashed var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '18px', color: 'var(--text-muted)' }}>+</div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)' }}>Add another data source</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Database, Excel upload, or REST API</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="risk-card" style={{ padding: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>Add Repository</h3>
              <button className="btn-secondary" style={{ fontSize: '11px', padding: '5px 10px' }} onClick={() => { setShowForm(false); setConnStatus('idle'); }}><X size={12} /> Cancel</button>
            </div>

            {/* Source type selector */}
            <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '10px' }}>Connection type</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
              {[
                { type: 'db' as const, icon: Database, label: 'Database', desc: 'PostgreSQL, MySQL, SQL Server' },
                { type: 'excel' as const, icon: FileSpreadsheet, label: 'Excel / CSV', desc: 'Upload .xlsx, .xls or .csv' },
                { type: 'api' as const, icon: Globe, label: 'REST API', desc: 'Any REST endpoint – JSON / XML' },
              ].map(s => (
                <div key={s.type} onClick={() => setSrcType(s.type)} style={{
                  background: 'var(--bg-secondary)', border: `1px solid ${srcType === s.type ? 'var(--accent-cyan)' : 'var(--border-color)'}`,
                  borderRadius: '10px', padding: '16px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s',
                }}>
                  <s.icon size={24} style={{ color: srcType === s.type ? 'var(--accent-cyan)' : 'var(--text-muted)', marginBottom: '8px' }} />
                  <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '4px' }}>{s.label}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{s.desc}</div>
                </div>
              ))}
            </div>

            <div style={{ height: '1px', background: 'var(--border-color)', margin: '16px 0' }} />

            {/* DB form */}
            {srcType === 'db' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div><label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '5px' }}>Repository name *</label><input style={inputStyle} placeholder="e.g. NHG Enterprise Risk DB" /></div>
                  <div><label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '5px' }}>Database type *</label><select style={inputStyle}><option>PostgreSQL</option><option>MySQL</option><option>SQL Server</option><option>Oracle</option></select></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div><label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '5px' }}>Host *</label><input style={inputStyle} placeholder="risk-db.nhg.ae" /></div>
                  <div><label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '5px' }}>Port</label><input style={inputStyle} placeholder="5432" /></div>
                  <div><label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '5px' }}>Database *</label><input style={inputStyle} placeholder="riskdb_prod" /></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div><label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '5px' }}>Username</label><input style={inputStyle} placeholder="readonly_user" /></div>
                  <div><label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '5px' }}>Password</label><input style={inputStyle} type="password" placeholder="••••••••" /></div>
                </div>
              </>
            )}

            {/* Excel form */}
            {srcType === 'excel' && (
              <>
                <div style={{ marginBottom: '12px' }}><label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '5px' }}>Repository name *</label><input style={inputStyle} placeholder="e.g. Q2 2026 Risk Register" /></div>
                <div style={{ border: '2px dashed var(--border-color)', borderRadius: '10px', padding: '32px', textAlign: 'center', marginBottom: '12px', cursor: 'pointer' }}>
                  <div style={{ fontSize: '28px', marginBottom: '8px' }}>📁</div>
                  <div style={{ fontSize: '13px' }}><strong>Drag file here</strong> or click to browse</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Max 10 MB · .xlsx .xls .csv</div>
                </div>
              </>
            )}

            {/* API form */}
            {srcType === 'api' && (
              <>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '10px' }}>Preset integrations</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '16px' }}>
                  {PRESETS.map(p => (
                    <div key={p.id} onClick={() => setSelPreset(p.id)} style={{
                      background: 'var(--bg-secondary)', border: `1px solid ${selPreset === p.id ? 'var(--accent-cyan)' : 'var(--border-color)'}`,
                      borderRadius: '8px', padding: '12px', cursor: 'pointer',
                    }}>
                      {p.badge && <span style={{ display: 'inline-block', fontSize: '9px', padding: '1px 6px', borderRadius: '3px', fontWeight: 700, marginBottom: '5px', background: `${p.color}18`, color: p.color }}>{p.badge}</span>}
                      <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '3px' }}>{p.label}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.desc}</div>
                    </div>
                  ))}
                </div>
                <div style={{ height: '1px', background: 'var(--border-color)', margin: '16px 0' }} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div><label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '5px' }}>Repository name *</label><input style={inputStyle} placeholder="e.g. SEC EDGAR Filings" /></div>
                  <div><label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '5px' }}>Auth type</label><select style={inputStyle}><option>No authentication</option><option>API Key</option><option>Bearer token</option><option>OAuth 2.0</option></select></div>
                </div>
                <div style={{ marginBottom: '12px' }}><label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '5px' }}>Base URL *</label><input style={inputStyle} placeholder="https://efts.sec.gov/LATEST/search-index?q={query}" /></div>
              </>
            )}

            <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
              <button className="btn-secondary" style={{ fontSize: '12px' }} onClick={testConnection}><RefreshCw size={12} /> Test connection</button>
              {srcType === 'api' && <button className="btn-secondary" style={{ fontSize: '12px', background: 'linear-gradient(135deg,rgba(139,92,246,0.2),rgba(74,176,222,0.2))', color: 'var(--accent-cyan)', borderColor: 'rgba(139,92,246,0.4)' }}><Sparkles size={12} /> AI map fields</button>}
            </div>

            {connStatus !== 'idle' && (
              <div style={{
                borderRadius: '8px', padding: '10px 14px', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px',
                background: connStatus === 'ok' ? 'rgba(16,185,129,0.08)' : connStatus === 'error' ? 'rgba(239,68,68,0.08)' : 'rgba(139,92,246,0.08)',
                border: `1px solid ${connStatus === 'ok' ? 'rgba(16,185,129,0.25)' : connStatus === 'error' ? 'rgba(239,68,68,0.25)' : 'rgba(139,92,246,0.25)'}`,
                color: connStatus === 'ok' ? '#10b981' : connStatus === 'error' ? '#ef4444' : '#8b5cf6',
              }}>
                {connStatus === 'testing' && <><RefreshCw size={12} className="animate-spin" /> Testing connection…</>}
                {connStatus === 'ok' && <><CheckCircle size={12} /> Connection successful — schema detected</>}
                {connStatus === 'error' && <><AlertTriangle size={12} /> Connection failed — check credentials</>}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
              <button className="btn-secondary" onClick={() => { setShowForm(false); setConnStatus('idle'); }}>Cancel</button>
              <button className="btn-primary" onClick={() => { setShowForm(false); setConnStatus('idle'); showToast('Repository saved'); }}>Save repository</button>
            </div>
          </div>
        )}
      </main>

      {toast && (
        <div style={{ position: 'fixed', top: '70px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(74,176,222,0.15)', border: '1px solid rgba(74,176,222,0.4)', color: 'var(--accent-cyan)', padding: '8px 18px', borderRadius: '7px', fontSize: '12px', fontWeight: 600, zIndex: 9999, backdropFilter: 'blur(8px)' }}>
          {toast}
        </div>
      )}
    </div>
  );
}
