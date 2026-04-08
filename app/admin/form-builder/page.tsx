'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import {
  GripVertical, Eye, EyeOff, Trash2, Lock, Sparkles, Plus,
  Type, Hash, Calendar, User, ToggleLeft, Zap, AlignLeft, ChevronDown,
} from 'lucide-react';

interface Field {
  id: string; label: string; type: string; required: boolean; locked: boolean;
  visible: boolean; system: boolean; placeholder?: string; hint?: string;
  options?: string; formula?: string; min?: string; max?: string;
}

const TYPE_ICONS: Record<string, typeof Type> = { text: Type, textarea: AlignLeft, select: ChevronDown, number: Hash, date: Calendar, user: User, toggle: ToggleLeft, auto: Zap };
const TYPE_LABELS: Record<string, string> = { text: 'Text', textarea: 'Textarea', select: 'Dropdown', number: 'Number', date: 'Date', user: 'User picker', toggle: 'Toggle', auto: 'Auto-calc' };
const TYPE_COLORS: Record<string, string> = { text: '#4ab0de', textarea: '#ef4444', select: '#8b5cf6', number: '#10b981', date: '#f59e0b', user: '#ec4899', toggle: '#6366f1', auto: '#6b7280' };

const RISK_FIELDS: Field[] = [
  { id: 'rf1', label: 'Risk Title', type: 'text', required: true, locked: true, visible: true, system: false, placeholder: 'e.g. Unauthorised data access', hint: 'Short descriptive title' },
  { id: 'rf2', label: 'Risk Category', type: 'select', required: true, locked: true, visible: true, system: false, options: 'Technology|Financial|Compliance|Third-party|Strategic|Operational', hint: 'NHG approved taxonomy' },
  { id: 'rf3', label: 'Description', type: 'textarea', required: true, locked: false, visible: true, system: false, placeholder: 'Describe the risk…', hint: 'Max 500 characters' },
  { id: 'rf4', label: 'Likelihood (1–5)', type: 'number', required: true, locked: true, visible: true, system: false, min: '1', max: '5', hint: '1=Rare · 5=Almost certain' },
  { id: 'rf5', label: 'Impact (1–5)', type: 'number', required: true, locked: true, visible: true, system: false, min: '1', max: '5', hint: '1=Insignificant · 5=Catastrophic' },
  { id: 'rf6', label: 'Risk Score', type: 'auto', required: false, locked: true, visible: true, system: true, formula: 'Likelihood × Impact', hint: 'Auto-calculated' },
  { id: 'rf7', label: 'Risk Owner', type: 'user', required: true, locked: true, visible: true, system: false, placeholder: 'Search by name…', hint: 'Active NHG user' },
  { id: 'rf8', label: 'Department', type: 'select', required: true, locked: true, visible: true, system: false, options: 'Finance|IT|Legal|Operations|HR|Treasury|Compliance' },
  { id: 'rf9', label: 'Review Date', type: 'date', required: true, locked: false, visible: true, system: false, hint: 'Must be future date' },
  { id: 'rfa', label: 'Risk Appetite', type: 'select', required: true, locked: false, visible: true, system: false, options: 'Low|Medium|High' },
  { id: 'rfb', label: 'Treatment Plan', type: 'textarea', required: false, locked: false, visible: true, system: false, placeholder: 'How will this be mitigated?' },
  { id: 'rfc', label: 'Control Type', type: 'select', required: false, locked: false, visible: true, system: false, options: 'Preventive|Detective|Corrective|Directive' },
  { id: 'rfd', label: 'Notes', type: 'textarea', required: false, locked: false, visible: true, system: false, placeholder: 'Any additional context…' },
];

const TASK_FIELDS: Field[] = [
  { id: 'tf1', label: 'Task Title', type: 'text', required: true, locked: true, visible: true, system: false },
  { id: 'tf2', label: 'Control Type', type: 'select', required: true, locked: true, visible: true, system: false, options: 'Preventive|Detective|Corrective|Directive' },
  { id: 'tf3', label: 'Priority', type: 'select', required: true, locked: false, visible: true, system: false, options: 'Critical|High|Medium|Low' },
  { id: 'tf4', label: 'Assigned To', type: 'user', required: true, locked: true, visible: true, system: false },
  { id: 'tf5', label: 'Due Date', type: 'date', required: true, locked: true, visible: true, system: false },
  { id: 'tf6', label: 'Description', type: 'textarea', required: false, locked: false, visible: true, system: false },
  { id: 'tf7', label: 'Evidence Required', type: 'toggle', required: false, locked: false, visible: true, system: false },
  { id: 'tf8', label: 'Related Risk', type: 'auto', required: false, locked: true, visible: true, system: true, formula: 'Linked from risk' },
  { id: 'tf9', label: 'Notes', type: 'textarea', required: false, locked: false, visible: true, system: false },
];

let idSeq = 200;

export default function FormBuilderPage() {
  const [curForm, setCurForm] = useState<'risk' | 'task'>('risk');
  const [riskFields, setRiskFields] = useState<Field[]>(RISK_FIELDS);
  const [taskFields, setTaskFields] = useState<Field[]>(TASK_FIELDS);
  const [selId, setSelId] = useState<string | null>(null);
  const [rpMode, setRpMode] = useState<'config' | 'preview'>('config');
  const [toast, setToast] = useState<string | null>(null);

  const fields = curForm === 'risk' ? riskFields : taskFields;
  const setFields = curForm === 'risk' ? setRiskFields : setTaskFields;
  const selField = fields.find(f => f.id === selId) || null;

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const addField = (type: string) => {
    const id = `cust${++idSeq}`;
    const f: Field = { id, label: `New ${TYPE_LABELS[type]} field`, type, required: false, locked: false, visible: true, system: false, placeholder: '', hint: '', options: type === 'select' ? 'Option 1|Option 2|Option 3' : '' };
    setFields(prev => [...prev, f]);
    setSelId(id);
    showToast('Field added');
  };

  const toggleVis = (id: string) => { setFields(prev => prev.map(f => f.id === id ? { ...f, visible: !f.visible } : f)); };
  const deleteField = (id: string) => {
    const f = fields.find(x => x.id === id);
    if (f?.locked) { showToast('System fields cannot be deleted'); return; }
    setFields(prev => prev.filter(f => f.id !== id));
    if (selId === id) setSelId(null);
    showToast('Field deleted');
  };

  const moveField = (fromIdx: number, toIdx: number) => {
    setFields(prev => {
      const arr = [...prev];
      const [removed] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, removed);
      return arr;
    });
  };

  const updateField = (id: string, updates: Partial<Field>) => {
    setFields(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
    showToast('Field updated');
  };

  const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 10px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '7px', color: 'var(--text-primary)', fontSize: '12px', fontFamily: 'inherit', outline: 'none' };

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', overflow: 'hidden' }}>
      <Sidebar role="admin" />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Topbar */}
        <div style={{ padding: '14px 22px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: '17px', fontWeight: 700, margin: 0 }}>Form Builder</h1>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>Customise Risk and Task submission forms</p>
          </div>
          <button className="btn-secondary" style={{ fontSize: '11px', padding: '6px 12px' }} onClick={() => showToast('Form reset to defaults')}>Reset to default</button>
          <button className="btn-primary" style={{ fontSize: '11px', padding: '6px 12px' }} onClick={() => showToast('Form published — changes live for all users')}>Save & publish</button>
        </div>

        {/* Form tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', padding: '0 22px', flexShrink: 0 }}>
          {(['risk', 'task'] as const).map(f => (
            <button key={f} onClick={() => { setCurForm(f); setSelId(null); }} style={{
              padding: '11px 18px', fontSize: '13px', fontWeight: curForm === f ? 700 : 500,
              color: curForm === f ? 'var(--accent-cyan)' : 'var(--text-muted)',
              background: 'none', border: 'none', borderBottom: curForm === f ? '2px solid var(--accent-cyan)' : '2px solid transparent',
              cursor: 'pointer', marginBottom: '-1px',
            }}>
              {f === 'risk' ? '⚠️ Risk Form' : '✅ Task Form'} ({(f === 'risk' ? riskFields : taskFields).length})
            </button>
          ))}
        </div>

        {/* 3-column layout */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '220px 1fr 300px', overflow: 'hidden' }}>
          {/* LEFT: Field palette */}
          <div style={{ borderRight: '1px solid var(--border-color)', padding: '14px', overflowY: 'auto' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '10px' }}>Add field</div>
            {Object.entries(TYPE_LABELS).map(([type, label]) => {
              const Icon = TYPE_ICONS[type] || Type;
              return (
                <div key={type} onClick={() => addField(type)} style={{
                  display: 'flex', alignItems: 'center', gap: '9px', padding: '8px 10px',
                  background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px',
                  marginBottom: '5px', cursor: 'pointer', fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)',
                  transition: 'all 0.2s',
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--accent-cyan)'; (e.currentTarget as HTMLDivElement).style.color = 'var(--accent-cyan)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-color)'; (e.currentTarget as HTMLDivElement).style.color = 'var(--text-secondary)'; }}
                >
                  <Icon size={14} /> {label}
                </div>
              );
            })}
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '12px', lineHeight: 1.5 }}>
              Click a field type to add it. Drag rows in the center to reorder.
            </div>
          </div>

          {/* CENTER: Field list */}
          <div style={{ padding: '18px', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
              <span style={{ fontSize: '14px', fontWeight: 700 }}>{curForm === 'risk' ? 'Risk' : 'Task'} Form Fields</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{fields.length} fields · {fields.filter(f => f.visible).length} visible</span>
            </div>
            {fields.map((f, idx) => {
              const Icon = TYPE_ICONS[f.type] || Type;
              const color = TYPE_COLORS[f.type] || '#4ab0de';
              const isSel = f.id === selId;
              return (
                <div key={f.id} onClick={() => { setSelId(f.id); setRpMode('config'); }} style={{
                  display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 13px',
                  background: 'var(--bg-card)', border: `1px solid ${isSel ? 'var(--accent-cyan)' : 'var(--border-color)'}`,
                  borderRadius: '10px', marginBottom: '6px', cursor: 'default',
                  opacity: f.visible ? 1 : 0.45,
                  boxShadow: isSel ? '0 0 0 3px rgba(74,176,222,0.12)' : undefined,
                  transition: 'all 0.15s',
                }}>
                  <GripVertical size={14} style={{ color: 'var(--text-muted)', cursor: 'grab', flexShrink: 0 }}
                    onMouseDown={() => {/* drag handle placeholder */}}
                  />
                  <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={13} color={color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {f.label}
                      {f.system && <span style={{ padding: '1px 5px', borderRadius: '3px', fontSize: '9px', fontWeight: 700, background: 'rgba(74,176,222,0.12)', color: '#4ab0de' }}>system</span>}
                      {f.locked && !f.system && <Lock size={9} color="var(--text-muted)" />}
                      {!f.visible && <span style={{ padding: '1px 5px', borderRadius: '3px', fontSize: '9px', fontWeight: 700, background: 'rgba(106,106,138,0.15)', color: 'var(--text-muted)' }}>hidden</span>}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', gap: '8px', marginTop: '2px' }}>
                      <span>{TYPE_LABELS[f.type]}</span>
                      <span style={{ padding: '0 5px', borderRadius: '3px', fontSize: '9px', fontWeight: 700, background: f.required ? 'rgba(239,68,68,0.15)' : 'rgba(106,106,138,0.15)', color: f.required ? '#ef4444' : 'var(--text-muted)' }}>{f.required ? 'Required' : 'Optional'}</span>
                      {f.formula && <span style={{ color: '#4ab0de', fontSize: '9px' }}>{f.formula}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                    <button onClick={e => { e.stopPropagation(); toggleVis(f.id); }} style={{ width: '24px', height: '24px', borderRadius: '4px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                      {f.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                    </button>
                    {!f.locked && (
                      <button onClick={e => { e.stopPropagation(); deleteField(f.id); }} style={{ width: '24px', height: '24px', borderRadius: '4px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                        <Trash2 size={12} />
                      </button>
                    )}
                    {idx > 0 && (
                      <button onClick={e => { e.stopPropagation(); moveField(idx, idx - 1); }} style={{ width: '24px', height: '24px', borderRadius: '4px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '11px' }}>↑</button>
                    )}
                    {idx < fields.length - 1 && (
                      <button onClick={e => { e.stopPropagation(); moveField(idx, idx + 1); }} style={{ width: '24px', height: '24px', borderRadius: '4px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '11px' }}>↓</button>
                    )}
                  </div>
                </div>
              );
            })}
            <div onClick={() => addField('text')} style={{
              border: '1.5px dashed var(--border-color)', borderRadius: '8px', padding: '14px', textAlign: 'center',
              fontSize: '12px', color: 'var(--text-muted)', cursor: 'pointer', marginTop: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            }}>
              <Plus size={14} /> Add field
            </div>
          </div>

          {/* RIGHT: Config / Preview */}
          <div style={{ borderLeft: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', flexShrink: 0 }}>
              {(['config', 'preview'] as const).map(m => (
                <button key={m} onClick={() => setRpMode(m)} style={{
                  flex: 1, padding: '10px', fontSize: '12px', fontWeight: 600,
                  color: rpMode === m ? 'var(--accent-cyan)' : 'var(--text-muted)',
                  background: 'none', border: 'none', borderBottom: rpMode === m ? '2px solid var(--accent-cyan)' : '2px solid transparent',
                  cursor: 'pointer', marginBottom: '-1px', textAlign: 'center',
                }}>
                  {m === 'config' ? 'Field config' : 'Live preview'}
                </button>
              ))}
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>
              {rpMode === 'config' ? (
                selField ? (
                  <div>
                    <div style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(74,176,222,0.1))', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '8px', padding: '10px', marginBottom: '14px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}><Sparkles size={12} /> AI tip</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        {selField.type === 'number' ? 'Use the NHG likelihood/impact scale definitions in the hint so Business Owners rate consistently.' : 'Keep field labels short and descriptive for consistent data entry across departments.'}
                      </div>
                    </div>
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '5px' }}>Field label *</label>
                      <input value={selField.label} onChange={e => updateField(selField.id, { label: e.target.value })} style={inputStyle} disabled={selField.system} />
                    </div>
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '5px' }}>Field type</label>
                      <select value={selField.type} onChange={e => updateField(selField.id, { type: e.target.value })} style={inputStyle} disabled={selField.locked}>
                        {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </div>
                    {selField.hint !== undefined && (
                      <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '5px' }}>Help text</label>
                        <input value={selField.hint || ''} onChange={e => updateField(selField.id, { hint: e.target.value })} style={inputStyle} />
                      </div>
                    )}
                    {selField.type === 'select' && (
                      <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '5px' }}>Options (one per line)</label>
                        <textarea value={(selField.options || '').split('|').join('\n')} onChange={e => updateField(selField.id, { options: e.target.value.split('\n').filter(Boolean).join('|') })} rows={4} style={{ ...inputStyle, resize: 'vertical', minHeight: '60px' }} />
                      </div>
                    )}
                    <div style={{ height: '1px', background: 'var(--border-color)', margin: '14px 0' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {[
                        { key: 'required', label: 'Required field', val: selField.required, disabled: selField.locked },
                        { key: 'visible', label: 'Visible on form', val: selField.visible, disabled: false },
                      ].map(tog => (
                        <div key={tog.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: tog.disabled ? 0.4 : 1 }}>
                          <div onClick={() => !tog.disabled && updateField(selField.id, { [tog.key]: !tog.val })} style={{
                            width: '32px', height: '17px', borderRadius: '20px', cursor: tog.disabled ? 'not-allowed' : 'pointer',
                            background: tog.val ? 'var(--accent-cyan)' : 'var(--border-color)', position: 'relative', transition: 'background 0.15s', flexShrink: 0,
                          }}>
                            <div style={{ width: '13px', height: '13px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '2px', left: tog.val ? '17px' : '2px', transition: 'left 0.13s', boxShadow: '0 1px 2px rgba(0,0,0,0.3)' }} />
                          </div>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{tog.label}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ height: '1px', background: 'var(--border-color)', margin: '14px 0' }} />
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      {!selField.locked && <button className="btn-secondary" style={{ fontSize: '11px', padding: '5px 10px', color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }} onClick={() => deleteField(selField.id)}>Delete</button>}
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '32px', marginBottom: '10px' }}>👆</div>
                    <div style={{ fontSize: '12px', lineHeight: 1.8 }}>Select a field to configure it, or click a type on the left to add one.</div>
                  </div>
                )
              ) : (
                /* Live preview */
                <div style={{ background: 'var(--bg-primary)', borderRadius: '10px', overflow: 'hidden' }}>
                  <div style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)', padding: '12px 16px', fontSize: '13px', fontWeight: 700 }}>
                    {curForm === 'risk' ? '⚠️ Report New Risk' : '✅ New Task'} <span style={{ fontSize: '10px', fontWeight: 400, color: 'var(--text-muted)', marginLeft: '4px' }}>— as user sees it</span>
                  </div>
                  <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {fields.filter(f => f.visible).map(f => (
                      <div key={f.id}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {f.label} {f.required && <span style={{ color: '#ef4444' }}>*</span>}
                        </div>
                        {f.type === 'textarea' ? (
                          <textarea placeholder={f.placeholder || ''} readOnly style={{ ...inputStyle, minHeight: '50px', resize: 'none' }} />
                        ) : f.type === 'select' ? (
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {(f.options || '').split('|').filter(Boolean).map((o, i) => (
                              <span key={i} style={{ padding: '4px 10px', borderRadius: '5px', fontSize: '11px', border: `1px solid ${i === 0 ? 'var(--accent-cyan)' : 'var(--border-color)'}`, color: i === 0 ? 'var(--accent-cyan)' : 'var(--text-muted)', background: i === 0 ? 'rgba(74,176,222,0.08)' : 'var(--bg-card)' }}>{o}</span>
                            ))}
                          </div>
                        ) : f.type === 'auto' ? (
                          <div style={{ ...inputStyle, background: 'rgba(74,176,222,0.08)', borderColor: 'rgba(74,176,222,0.25)', color: 'var(--accent-cyan)', fontWeight: 700, textAlign: 'center' }}>{f.formula || 'Auto-calculated'}</div>
                        ) : f.type === 'toggle' ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '7px' }}>
                            <div style={{ width: '28px', height: '15px', borderRadius: '20px', background: 'var(--border-color)', position: 'relative' }}>
                              <div style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '2px', left: '2px' }} />
                            </div>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{f.label}</span>
                          </div>
                        ) : f.type === 'number' ? (
                          <div style={{ display: 'flex', gap: '4px' }}>
                            {Array.from({ length: parseInt(f.max || '5') - parseInt(f.min || '1') + 1 }, (_, i) => i + parseInt(f.min || '1')).map(v => (
                              <div key={v} style={{ width: '28px', height: '28px', borderRadius: '6px', background: v <= 2 ? 'rgba(245,158,11,0.15)' : 'var(--bg-card)', border: `1px solid ${v <= 2 ? 'rgba(245,158,11,0.4)' : 'var(--border-color)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: v <= 2 ? '#f59e0b' : 'var(--text-muted)' }}>{v}</div>
                            ))}
                          </div>
                        ) : (
                          <input placeholder={f.placeholder || ''} readOnly style={inputStyle} />
                        )}
                        {f.hint && <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px' }}>{f.hint}</div>}
                      </div>
                    ))}
                    <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '4px', opacity: 0.5, cursor: 'not-allowed' }}>Submit</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: '70px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(74,176,222,0.15)', border: '1px solid rgba(74,176,222,0.4)', color: 'var(--accent-cyan)', padding: '8px 18px', borderRadius: '7px', fontSize: '12px', fontWeight: 600, zIndex: 9999, backdropFilter: 'blur(8px)' }}>
          {toast}
        </div>
      )}
    </div>
  );
}
