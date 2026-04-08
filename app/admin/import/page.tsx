'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import {
  Download, Upload, CheckCircle, AlertTriangle, AlertCircle,
  ArrowRight, ArrowLeft, Sparkles, FileSpreadsheet, X, Check,
} from 'lucide-react';

const STEPS = ['Template', 'Upload & Preview', 'Validation', 'Field Mapping', 'Confirm'];

const TEMPLATE_FIELDS = [
  { name: 'Risk ID', required: true }, { name: 'Risk Title', required: true },
  { name: 'Risk Category', required: true }, { name: 'Description', required: true },
  { name: 'Likelihood (1–5)', required: true }, { name: 'Impact (1–5)', required: true },
  { name: 'Risk Owner Email', required: true }, { name: 'Department', required: true },
  { name: 'Review Date', required: true }, { name: 'Risk Appetite', required: true },
  { name: 'Treatment Plan', required: false }, { name: 'Control Type', required: false },
  { name: 'Residual Score', required: false }, { name: 'Notes', required: false },
];

const SAMPLE_DATA = [
  { id: 'RSK-001', title: 'Unauthorised Data Access', cat: 'Technology', dept: 'Finance', l: 3, i: 4, score: 12, owner: 'j.ali@nhg.ae', valid: true },
  { id: 'RSK-002', title: 'Vendor Contract Expiry', cat: 'Third-party', dept: 'IT', l: 4, i: 3, score: 12, owner: 's.hassan@nhg.ae', valid: true },
  { id: 'RSK-003', title: 'ERP System Downtime', cat: 'Technology', dept: 'Operations', l: 7, i: 5, score: null, owner: 'm.karimi@nhg.ae', valid: false, error: 'Likelihood=7 out of range (1–5)' },
  { id: 'RSK-004', title: 'Regulatory Compliance Gap', cat: 'Compliance', dept: 'Legal', l: 2, i: 5, score: 10, owner: 'j.doe@oldcorp.com', valid: true, warn: 'Email not in directory' },
  { id: 'RSK-005', title: 'FX Exposure – USD/AED', cat: 'Financial', dept: 'Treasury', l: 3, i: 3, score: 9, owner: 'a.rashid@nhg.ae', valid: true },
];

const FIELD_MAP = [
  { src: 'Risk ID', target: 'Risk ID (required)', conf: 100 },
  { src: 'Risk Title', target: 'Risk Title (required)', conf: 100 },
  { src: 'Risk Category', target: 'Risk Category (required)', conf: 100 },
  { src: 'Description', target: 'Risk Description (required)', conf: 98 },
  { src: 'Likelihood (1–5)', target: 'Likelihood Score (required)', conf: 99 },
  { src: 'Impact (1–5)', target: 'Impact Score (required)', conf: 99 },
  { src: 'Risk Score', target: 'Calculated Risk Score', conf: 97 },
  { src: 'Risk Owner Email', target: 'Risk Owner (required)', conf: 99 },
  { src: 'Department', target: 'Department (required)', conf: 100 },
  { src: 'Review Date', target: 'Next Review Date (required)', conf: 96 },
  { src: 'Risk Appetite', target: 'Risk Appetite (required)', conf: 94 },
];

const VALIDATION_ISSUES = [
  { row: 4, id: 'RSK-003', issue: 'Likelihood = 7 · Valid range: 1–5\nRisk Appetite "VERY HIGH" not in approved list', type: 'error' as const, fix: 'Set Likelihood to 5 (max) and Risk Appetite to "High"' },
  { row: 5, id: 'RSK-004', issue: 'Owner email j.doe@oldcorp.com not in NHG directory', type: 'warn' as const, fix: 'Assign risk.admin@nhg.ae as interim owner' },
  { row: 3, id: 'RSK-002', issue: 'Review date 15/03/2026 is in the past', type: 'warn' as const, fix: 'Auto-set to 30/06/2026 (next quarter end)' },
];

export default function BulkImportPage() {
  const [step, setStep] = useState(0);
  const [uploaded, setUploaded] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importDone, setImportDone] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fixedRows, setFixedRows] = useState<Set<number>>(new Set());

  const goNext = () => {
    if (step === 1 && !uploaded) { setUploaded(true); }
    if (step < 4) setStep(step + 1);
  };
  const goBack = () => { if (step > 0) setStep(step - 1); };

  const runImport = () => {
    setImporting(true);
    let p = 0;
    const iv = setInterval(() => {
      p += Math.floor(Math.random() * 10) + 5;
      if (p > 100) p = 100;
      setProgress(p);
      if (p >= 100) { clearInterval(iv); setImporting(false); setImportDone(true); }
    }, 80);
  };

  const applyFix = (idx: number) => {
    setFixedRows(prev => new Set(prev).add(idx));
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', overflow: 'hidden' }}>
      <Sidebar role="admin" />
      <main style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="animate-fade-up">
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Bulk Risk Import</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
            Import risks from Excel — AI validates, maps fields, and previews before committing
          </p>
        </div>

        {/* Stepper */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer' }} onClick={() => i <= step && setStep(i)}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '12px', fontWeight: 700,
                  background: i < step ? 'rgba(16,185,129,0.15)' : i === step ? 'linear-gradient(135deg, #4ab0de, #8b5cf6)' : 'var(--bg-card)',
                  border: i < step ? '2px solid #10b981' : i === step ? 'none' : '2px solid var(--border-color)',
                  color: i < step ? '#10b981' : i === step ? '#fff' : 'var(--text-muted)',
                }}>
                  {i < step ? <Check size={14} /> : i + 1}
                </div>
                <span style={{ fontSize: '10px', color: i === step ? 'var(--accent-cyan)' : 'var(--text-muted)', fontWeight: i === step ? 600 : 400, whiteSpace: 'nowrap' }}>{s}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ flex: 1, height: '2px', background: i < step ? '#10b981' : 'var(--border-color)', margin: '0 8px', marginBottom: '20px' }} />
              )}
            </div>
          ))}
        </div>

        {/* Step 0: Template */}
        {step === 0 && (
          <div className="risk-card" style={{ padding: '22px' }}>
            <div style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(74,176,222,0.1))', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '10px', padding: '14px', marginBottom: '18px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}><Sparkles size={14} /> AI Recommendation</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Use the Standard Risk Register template — it captures all 10 required fields aligned to the NHG three-lines-of-defence governance model and CBUAE audit requirements.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', padding: '18px', background: 'var(--bg-secondary)', border: '1px solid rgba(74,176,222,0.35)', borderRadius: '10px', marginBottom: '16px' }}>
              <div style={{ width: '52px', height: '64px', background: 'linear-gradient(135deg, #1d7640, #155230)', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FileSpreadsheet size={20} color="#fff" />
                <span style={{ fontSize: '9px', fontWeight: 700, color: '#fff', marginTop: '2px' }}>XLSX</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '4px' }}>Standard Risk Register — NHG Template v1.2</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>10 required fields · 4 optional fields · Excel (.xlsx)</div>
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                  {TEMPLATE_FIELDS.map(f => (
                    <span key={f.name} style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, background: f.required ? 'rgba(16,185,129,0.1)' : 'rgba(139,92,246,0.1)', color: f.required ? '#10b981' : '#8b5cf6', border: `1px solid ${f.required ? 'rgba(16,185,129,0.25)' : 'rgba(139,92,246,0.2)'}` }}>
                      {f.name}
                    </span>
                  ))}
                </div>
              </div>
              <button className="btn-primary" style={{ flexShrink: 0 }}><Download size={14} /> Download</button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
              <button className="btn-primary" onClick={goNext}>I&apos;ve filled my template <ArrowRight size={14} /></button>
            </div>
          </div>
        )}

        {/* Step 1: Upload */}
        {step === 1 && (
          <div className="risk-card" style={{ padding: '22px' }}>
            {!uploaded ? (
              <div onClick={() => setUploaded(true)} style={{
                border: '2px dashed var(--border-color)', borderRadius: '12px', padding: '40px', textAlign: 'center', cursor: 'pointer', marginBottom: '18px', transition: 'all 0.2s',
              }}>
                <Upload size={32} style={{ color: 'var(--text-muted)', marginBottom: '10px' }} />
                <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '6px' }}>Drag your completed Excel file here</div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>or click to browse · Max 10 MB</div>
                <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginTop: '10px' }}>
                  {['.xlsx', '.xls', '.csv'].map(f => <span key={f} style={{ padding: '2px 9px', borderRadius: '20px', fontSize: '11px', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>{f}</span>)}
                </div>
              </div>
            ) : (
              <>
                <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '10px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
                  <CheckCircle size={20} color="#10b981" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 700 }}>NHG_Risk_Register_Q1_2026.xlsx</div>
                    <div style={{ fontSize: '12px', color: '#10b981' }}>52 rows detected · 3 sheets · 1.1 MB</div>
                  </div>
                  <button onClick={() => setUploaded(false)} style={{ fontSize: '11px', color: 'var(--text-muted)', cursor: 'pointer', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '3px 9px', background: 'none', fontFamily: 'inherit' }}>Remove</button>
                </div>

                {/* Preview table */}
                <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '8px' }}>Preview — showing first 5 rows</div>
                <div style={{ overflowX: 'auto', marginBottom: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <table className="risk-table">
                    <thead>
                      <tr><th>#</th><th>Risk ID</th><th>Title</th><th>Category</th><th>Dept</th><th>L</th><th>I</th><th>Score</th><th>Owner</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {SAMPLE_DATA.map((r, i) => (
                        <tr key={i}>
                          <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                          <td style={{ fontWeight: 600, color: r.valid ? '#10b981' : '#ef4444' }}>{r.id}</td>
                          <td>{r.title}</td>
                          <td>{r.cat}</td>
                          <td>{r.dept}</td>
                          <td style={{ textAlign: 'center', color: !r.valid ? '#ef4444' : undefined, fontWeight: !r.valid ? 700 : undefined }}>{r.l}{!r.valid && r.l > 5 ? ' ⚠' : ''}</td>
                          <td style={{ textAlign: 'center' }}>{r.i}</td>
                          <td style={{ textAlign: 'center', fontWeight: 700, color: r.score && r.score >= 12 ? '#ef4444' : r.score && r.score >= 6 ? '#f59e0b' : undefined }}>{r.score ?? '—'}</td>
                          <td style={{ color: r.warn ? '#f59e0b' : undefined }}>{r.owner}{r.warn ? ' ⚠' : ''}</td>
                          <td>{r.valid ? <span style={{ color: '#10b981', fontSize: '11px' }}>✓ Valid</span> : <span style={{ color: '#ef4444', fontSize: '11px' }}>✗ Error</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
              <button className="btn-secondary" onClick={goBack}><ArrowLeft size={14} /> Back</button>
              <button className="btn-primary" onClick={goNext} disabled={!uploaded}>Analyse & Validate <ArrowRight size={14} /></button>
            </div>
          </div>
        )}

        {/* Step 2: Validation */}
        {step === 2 && (
          <div className="risk-card" style={{ padding: '22px' }}>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '18px', flexWrap: 'wrap' }}>
              <span style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, background: 'rgba(16,185,129,0.12)', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}><CheckCircle size={12} /> 49 rows valid</span>
              <span style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, background: 'rgba(245,158,11,0.12)', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '6px' }}><AlertTriangle size={12} /> 2 warnings</span>
              <span style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, background: 'rgba(239,68,68,0.12)', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}><AlertCircle size={12} /> 1 error</span>
              <span style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, background: 'rgba(139,92,246,0.12)', color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '6px' }}><Sparkles size={12} /> 3 AI fixes ready</span>
            </div>

            <div style={{ overflowX: 'auto', marginBottom: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <table className="risk-table">
                <thead><tr><th style={{ width: '50px' }}>Row</th><th style={{ width: '100px' }}>Risk ID</th><th>Issue</th><th style={{ width: '100px' }}>Status</th><th>AI Fix</th></tr></thead>
                <tbody>
                  {VALIDATION_ISSUES.map((v, i) => (
                    <tr key={i}>
                      <td style={{ color: 'var(--text-muted)' }}>{v.row}</td>
                      <td style={{ fontWeight: 600 }}>{v.id}</td>
                      <td style={{ fontSize: '12px', whiteSpace: 'pre-line' }}>{v.issue}</td>
                      <td>
                        <span style={{ padding: '2px 8px', borderRadius: '5px', fontSize: '10px', fontWeight: 700, background: v.type === 'error' ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)', color: v.type === 'error' ? '#ef4444' : '#f59e0b' }}>
                          {v.type === 'error' ? '✗ Error' : '⚠ Warning'}
                        </span>
                      </td>
                      <td>
                        {fixedRows.has(i) ? (
                          <div style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '5px', padding: '6px 10px', fontSize: '11px', color: '#8b5cf6', lineHeight: 1.5 }}>
                            <Sparkles size={10} style={{ display: 'inline', marginRight: '4px' }} /> {v.fix}
                          </div>
                        ) : (
                          <button onClick={() => applyFix(i)} style={{ fontSize: '10px', padding: '3px 9px', borderRadius: '4px', border: '1px solid rgba(139,92,246,0.4)', background: 'rgba(139,92,246,0.1)', color: '#8b5cf6', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>
                            <Sparkles size={10} style={{ display: 'inline', marginRight: '3px' }} /> Fix
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
              <button className="btn-secondary" style={{ fontSize: '12px', padding: '7px 14px' }} onClick={() => setFixedRows(new Set([0, 1, 2]))}>
                <Sparkles size={12} /> Apply all AI fixes
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
              <button className="btn-secondary" onClick={goBack}><ArrowLeft size={14} /> Back</button>
              <button className="btn-primary" onClick={goNext}>Map fields <ArrowRight size={14} /></button>
            </div>
          </div>
        )}

        {/* Step 3: Field Mapping */}
        {step === 3 && (
          <div className="risk-card" style={{ padding: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>AI Field Mapping</h3>
              <span style={{ fontSize: '13px', color: '#10b981' }}>✓ 11 of 11 columns matched</span>
            </div>

            <div style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(74,176,222,0.1))', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '10px', padding: '14px', marginBottom: '18px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}><Sparkles size={14} /> AI Mapping Insight</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                All 11 columns matched at 94–100% confidence — the template headers exactly match NHG registry field names. No manual remapping needed.
              </div>
            </div>

            <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', overflow: 'hidden', marginBottom: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 28px 1fr 80px', gap: '10px', padding: '8px 14px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)' }}>
                <div>Your Excel column</div><div></div><div>Registry field</div><div>Confidence</div>
              </div>
              {FIELD_MAP.map(f => (
                <div key={f.src} style={{ display: 'grid', gridTemplateColumns: '1fr 28px 1fr 80px', gap: '10px', padding: '9px 14px', alignItems: 'center', borderBottom: '1px solid rgba(42,42,90,0.5)' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, background: 'var(--bg-secondary)', padding: '5px 9px', borderRadius: '5px' }}>{f.src}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>→</div>
                  <div style={{ fontSize: '12px', padding: '5px 8px', border: '1px solid rgba(16,185,129,0.4)', borderRadius: '5px', background: 'rgba(16,185,129,0.06)', color: '#10b981' }}>{f.target}</div>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: f.conf >= 97 ? '#10b981' : '#f59e0b' }}>{f.conf}%</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
              <button className="btn-secondary" onClick={goBack}><ArrowLeft size={14} /> Back</button>
              <button className="btn-primary" onClick={goNext}>Review & Confirm <ArrowRight size={14} /></button>
            </div>
          </div>
        )}

        {/* Step 4: Confirm */}
        {step === 4 && (
          <div className="risk-card" style={{ padding: '22px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '22px' }}>
              {[
                { label: 'Rows to import', value: '49', color: '#10b981' },
                { label: 'Rows skipped', value: '1', color: '#ef4444' },
                { label: 'Flagged for review', value: '2', color: '#f59e0b' },
                { label: 'Fields mapped', value: '11/11', color: 'var(--text-primary)' },
              ].map(s => (
                <div key={s.label} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '30px', fontWeight: 700, color: s.color, marginBottom: '4px' }}>{s.value}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', overflow: 'hidden', marginBottom: '18px' }}>
              {[
                ['Lifecycle state', 'Draft → auto-submit to Pending Review'],
                ['Duplicate handling', 'Skip duplicates (by Risk ID)'],
                ['Target register', 'NHG Enterprise Risk Registry 2026'],
                ['Notify risk owners', 'Yes – email digest on assignment'],
                ['Flagged rows', 'Import with ⚠ flag · RM notified'],
                ['Audit trail', 'Enabled · logged as Bulk Import'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '11px 16px', borderBottom: '1px solid var(--border-color)', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                  <span style={{ fontWeight: 600 }}>{v}</span>
                </div>
              ))}
            </div>

            {importing && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>Importing risks into registry…</div>
                <div style={{ height: '4px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: 'linear-gradient(135deg, #4ab0de, #8b5cf6)', borderRadius: '4px', width: `${progress}%`, transition: 'width 0.25s' }} />
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Processing row {Math.min(Math.round(progress * 49 / 100), 49)} of 49…</div>
              </div>
            )}

            {importDone && (
              <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '10px', padding: '16px 18px', marginBottom: '16px' }}>
                <p style={{ fontSize: '14px', fontWeight: 700, color: '#10b981', margin: '0 0 3px' }}>✓ 49 risks imported successfully — now in Pending Review</p>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Import ID: IMP-20260324-0041 · 2 risks flagged for RM review · RSK-003 skipped</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-secondary" onClick={goBack} disabled={importing}><ArrowLeft size={14} /> Back</button>
                <button className="btn-secondary" onClick={() => setStep(0)} disabled={importing}><X size={14} /> Cancel</button>
              </div>
              {!importDone ? (
                <button className="btn-primary" onClick={runImport} disabled={importing}>
                  {importing ? 'Importing…' : 'Import 49 risks'}
                </button>
              ) : (
                <button className="btn-primary" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }} onClick={() => setStep(0)}>
                  Done ✓
                </button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
