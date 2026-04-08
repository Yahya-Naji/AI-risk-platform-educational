'use client';

import Sidebar from '@/components/Sidebar';
import { useState } from 'react';
import { GitBranch, Shield, ArrowRight, ChevronDown } from 'lucide-react';

type FlowView = 'risk' | 'task';

interface FlowNode {
  id: string;
  label: string;
  sub: string;
  actor: 'bo' | 'rm' | 'system' | 'committee';
  type?: 'start' | 'end' | 'decision' | 'step';
}

interface FlowConnection {
  from: string;
  to: string;
  label?: string;
  style?: 'normal' | 'dashed';
}

const actorStyle: Record<string, { bg: string; border: string; dot: string; name: string }> = {
  bo: { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.35)', dot: '#10b981', name: 'Business Owner' },
  rm: { bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.35)', dot: '#8b5cf6', name: 'Risk Manager' },
  system: { bg: 'rgba(74,176,222,0.08)', border: 'rgba(74,176,222,0.35)', dot: '#4ab0de', name: 'System / AI' },
  committee: { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.35)', dot: '#ef4444', name: 'Risk Committee' },
};

const riskNodes: FlowNode[] = [
  { id: 'draft', label: 'Draft', sub: 'BO creates risk entry', actor: 'bo', type: 'start' },
  { id: 'pending', label: 'Pending Review', sub: 'BO submits for validation', actor: 'bo' },
  { id: 'review', label: 'Under Review', sub: 'RM validates the risk', actor: 'rm' },
  { id: 'decision', label: 'Decision', sub: 'RM decides next step', actor: 'rm', type: 'decision' },
  { id: 'accepted', label: 'Accepted', sub: 'No controls needed', actor: 'rm' },
  { id: 'controls', label: 'Propose Controls', sub: 'RM assigns controls & tasks', actor: 'rm' },
  { id: 'mitigating', label: 'Mitigating', sub: 'BO implements tasks', actor: 'bo' },
  { id: 'monitored', label: 'Monitored', sub: 'System tracks KRIs', actor: 'system' },
  { id: 'escalated', label: 'Escalated', sub: 'To risk committee', actor: 'committee' },
  { id: 'closed', label: 'Closed', sub: 'RM approves closure', actor: 'rm', type: 'end' },
];

const riskConnections: FlowConnection[] = [
  { from: 'draft', to: 'pending' },
  { from: 'pending', to: 'review' },
  { from: 'review', to: 'decision' },
  { from: 'decision', to: 'accepted', label: 'Accept' },
  { from: 'decision', to: 'controls', label: 'Mitigate' },
  { from: 'decision', to: 'review', label: 'Revise', style: 'dashed' },
  { from: 'controls', to: 'mitigating' },
  { from: 'mitigating', to: 'monitored' },
  { from: 'monitored', to: 'escalated', label: 'Appetite breached', style: 'dashed' },
  { from: 'monitored', to: 'closed' },
  { from: 'accepted', to: 'closed' },
  { from: 'escalated', to: 'controls', label: 'Re-treat', style: 'dashed' },
];

const taskNodes: FlowNode[] = [
  { id: 'open', label: 'Open', sub: 'System creates from control', actor: 'system', type: 'start' },
  { id: 'progress', label: 'In Progress', sub: 'BO implements control', actor: 'bo' },
  { id: 'overdue', label: 'Overdue', sub: 'Auto-flagged past due', actor: 'system' },
  { id: 'evidence', label: 'Pending Evidence', sub: 'BO uploads documentation', actor: 'bo' },
  { id: 'under_review', label: 'Under Review', sub: 'RM reviews evidence', actor: 'rm' },
  { id: 'task_decision', label: 'Decision', sub: 'RM approves or rejects', actor: 'rm', type: 'decision' },
  { id: 'completed', label: 'Completed', sub: 'RM confirms control done', actor: 'rm', type: 'end' },
];

const taskConnections: FlowConnection[] = [
  { from: 'open', to: 'progress' },
  { from: 'progress', to: 'overdue', label: 'Past due', style: 'dashed' },
  { from: 'progress', to: 'evidence' },
  { from: 'evidence', to: 'under_review' },
  { from: 'under_review', to: 'task_decision' },
  { from: 'task_decision', to: 'completed', label: 'Approved' },
  { from: 'task_decision', to: 'progress', label: 'Gaps found', style: 'dashed' },
];

function NodeBox({ node }: { node: FlowNode }) {
  const actor = actorStyle[node.actor];
  const isDecision = node.type === 'decision';

  if (isDecision) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{
          width: '100px', height: '100px', transform: 'rotate(45deg)',
          background: 'rgba(245,158,11,0.06)', border: '2px solid rgba(245,158,11,0.3)',
          borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ transform: 'rotate(-45deg)', textAlign: 'center' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#f59e0b' }}>{node.label}</div>
          </div>
        </div>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '8px' }}>{node.sub}</div>
      </div>
    );
  }

  return (
    <div style={{
      padding: '12px 20px', borderRadius: '10px', textAlign: 'center', minWidth: '180px', maxWidth: '220px',
      background: actor.bg, border: `1.5px solid ${actor.border}`,
      boxShadow: node.type === 'start' ? `0 0 16px ${actor.dot}20` : node.type === 'end' ? `0 0 16px ${actor.dot}20` : 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '3px' }}>
        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: actor.dot }} />
        <span style={{ fontSize: '13px', fontWeight: 700, color: actor.dot }}>{node.label}</span>
      </div>
      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{node.sub}</div>
    </div>
  );
}

function Arrow({ label, dashed }: { label?: string; dashed?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2px 0' }}>
      <div style={{
        width: '2px', height: label ? '20px' : '24px',
        background: dashed ? 'repeating-linear-gradient(to bottom, var(--text-muted) 0, var(--text-muted) 4px, transparent 4px, transparent 8px)' : 'var(--border-color)',
      }} />
      {label && (
        <span style={{
          fontSize: '9px', fontWeight: 600, color: 'var(--text-muted)', padding: '2px 8px',
          background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '4px',
          whiteSpace: 'nowrap',
        }}>{label}</span>
      )}
      <ChevronDown size={12} style={{ color: 'var(--text-muted)', margin: '-2px 0' }} />
    </div>
  );
}

export default function WorkflowsPage() {
  const [view, setView] = useState<FlowView>('risk');
  const nodes = view === 'risk' ? riskNodes : taskNodes;
  const connections = view === 'risk' ? riskConnections : taskConnections;

  // Build main flow (linear path)
  const mainPath = view === 'risk'
    ? ['draft', 'pending', 'review', 'decision', 'controls', 'mitigating', 'monitored', 'closed']
    : ['open', 'progress', 'evidence', 'under_review', 'task_decision', 'completed'];

  const sideNodes = view === 'risk'
    ? [
        { nodeId: 'accepted', attachAfter: 'decision', side: 'left' as const, connectionLabel: 'Accept' },
        { nodeId: 'escalated', attachAfter: 'monitored', side: 'right' as const, connectionLabel: 'Appetite breached' },
      ]
    : [
        { nodeId: 'overdue', attachAfter: 'progress', side: 'right' as const, connectionLabel: 'Past due' },
      ];

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', overflow: 'hidden' }}>
      <Sidebar role="admin" />

      <main style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="animate-fade-up">
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <GitBranch size={22} style={{ color: 'var(--accent-cyan)' }} /> Workflows
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
            Platform lifecycle workflows for risks and tasks
          </p>
        </div>

        {/* Toggle */}
        <div className="animate-fade-up-1" style={{ display: 'flex', gap: '8px' }}>
          {[
            { key: 'risk' as FlowView, label: 'Risk Lifecycle', icon: Shield },
            { key: 'task' as FlowView, label: 'Task Lifecycle', icon: ArrowRight },
          ].map((t) => (
            <button key={t.key} onClick={() => setView(t.key)}
              style={{
                padding: '10px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 600,
                background: view === t.key ? 'rgba(74,176,222,0.15)' : 'var(--bg-card)',
                color: view === t.key ? 'var(--accent-cyan)' : 'var(--text-muted)',
                border: view === t.key ? '1px solid rgba(74,176,222,0.3)' : '1px solid var(--border-color)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
              }}>
              <t.icon size={16} /> {t.label}
            </button>
          ))}
        </div>

        {/* Legend */}
        <div className="animate-fade-up-1" style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          {Object.entries(actorStyle).map(([, val]) => (
            <div key={val.name} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: val.dot }} />
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{val.name}</span>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '20px', height: '2px', background: 'repeating-linear-gradient(to right, var(--text-muted) 0, var(--text-muted) 4px, transparent 4px, transparent 8px)' }} />
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Alternative path</span>
          </div>
        </div>

        {/* Flow diagram */}
        <div className="risk-card animate-fade-up-2" style={{ padding: '40px 24px', overflow: 'auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
            {mainPath.map((nodeId, idx) => {
              const node = nodes.find(n => n.id === nodeId);
              if (!node) return null;

              // Check for side nodes
              const sideNode = sideNodes.find(s => s.attachAfter === nodeId);
              // Find connection to this node
              const conn = connections.find(c => c.from === (idx > 0 ? mainPath[idx - 1] : '') && c.to === nodeId);

              return (
                <div key={nodeId} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  {idx > 0 && <Arrow label={conn?.label} dashed={conn?.style === 'dashed'} />}

                  {/* Node with optional side branches */}
                  {sideNode ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                      {sideNode.side === 'left' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <NodeBox node={nodes.find(n => n.id === sideNode.nodeId)!} />
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '9px', color: 'var(--text-muted)', padding: '2px 6px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '4px' }}>{sideNode.connectionLabel}</span>
                            <div style={{ width: '30px', height: '2px', background: 'var(--border-color)' }} />
                          </div>
                        </div>
                      )}
                      <NodeBox node={node} />
                      {sideNode.side === 'right' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <div style={{ width: '30px', height: '2px', background: 'repeating-linear-gradient(to right, var(--text-muted) 0, var(--text-muted) 4px, transparent 4px, transparent 8px)' }} />
                            <span style={{ fontSize: '9px', color: 'var(--text-muted)', padding: '2px 6px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '4px' }}>{sideNode.connectionLabel}</span>
                          </div>
                          <NodeBox node={nodes.find(n => n.id === sideNode.nodeId)!} />
                        </div>
                      )}
                    </div>
                  ) : (
                    <NodeBox node={node} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer label */}
          <div style={{ marginTop: '28px', textAlign: 'center' }}>
            <div style={{ display: 'inline-block', padding: '10px 24px', borderRadius: '8px', background: 'var(--bg-primary)', border: '1px dashed var(--border-color)' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {view === 'risk' ? 'Risk Lifecycle' : 'Risk \u2192 Control \u2192 Task'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                {view === 'risk' ? 'End-to-end risk management from identification to closure' : 'Task completion updates linked risk\u2019s residual score'}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
