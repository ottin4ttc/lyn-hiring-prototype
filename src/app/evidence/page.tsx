'use client';

/**
 * Workbench 3: Candidate Evidence Panel
 * Interactive: approve, hold, reject/override evidence.
 * All actions write to local decision_log state with timestamp.
 */

import { useState } from 'react';
import { useSimulator } from '@/hooks/useSimulator';
import { REVIEW_STATUS_LABELS } from '@/data/mock-cases';
import type { ReviewStatus } from '@/data/mock-cases';
import { Nav } from '@/components/Nav';
import { StageBadge } from '@/components/StageBadge';

function ScoreRadar({ breakdown }: {
  breakdown: { technical: number; leadership: number; culture_fit: number; growth_potential: number };
}) {
  const dims = [
    { key: 'technical', label: 'Technical Depth', value: breakdown.technical },
    { key: 'leadership', label: 'Leadership', value: breakdown.leadership },
    { key: 'culture_fit', label: 'Culture Fit', value: breakdown.culture_fit },
    { key: 'growth_potential', label: 'Growth Potential', value: breakdown.growth_potential },
  ];
  return (
    <div className="grid grid-cols-2 gap-3">
      {dims.map((d) => (
        <div key={d.key} className="bg-slate-50 rounded-lg p-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-600">{d.label}</span>
            <span className={`font-bold ${d.value >= 85 ? 'text-green-600' : d.value >= 70 ? 'text-amber-600' : 'text-red-500'}`}>
              {d.value === 0 ? 'N/A' : d.value}
            </span>
          </div>
          <div className="bg-slate-200 rounded-full h-2">
            <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${d.value}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

interface LocalDecisionEntry {
  id: string;
  candidateId: string;
  action: 'approve' | 'hold' | 'reject' | 'override';
  reason: string;
  at: string;
}

export default function EvidencePanel() {
  const { state } = useSimulator();
  const [localDecisions, setLocalDecisions] = useState<LocalDecisionEntry[]>([]);
  const [reasonInputs, setReasonInputs] = useState<Record<string, string>>({});

  const allCandidates = state.cases.flatMap((c) =>
    c.candidates.map((cand) => ({
      ...cand,
      caseTitle: c.title,
      caseRole: c.role,
      caseId: c.id,
    }))
  );

  function getReason(key: string) {
    return reasonInputs[key] ?? '';
  }

  function setReason(key: string, val: string) {
    setReasonInputs((prev) => ({ ...prev, [key]: val }));
  }

  function addDecision(
    candidateId: string,
    action: LocalDecisionEntry['action'],
    reason?: string,
  ) {
    const entry: LocalDecisionEntry = {
      id: Math.random().toString(36).slice(2, 10),
      candidateId,
      action,
      reason: reason || `${action} (no reason provided)`,
      at: new Date().toISOString(),
    };
    setLocalDecisions((prev) => [...prev, entry]);
  }

  function getCandDecisions(candidateId: string) {
    return localDecisions.filter((d) => d.candidateId === candidateId);
  }

  return (
    <>
      <Nav />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Candidate Evidence Panel</h1>
          <p className="text-slate-500 text-sm mt-1">
            Workbench 3 / 5 · Approve, hold, or reject evidence. All decisions are local state only.
          </p>
        </div>

        <div className="space-y-8">
          {allCandidates.map((cand) => {
            const lastRun = cand.stage_run.at(-1);
            const candDecisions = getCandDecisions(cand.id);
            const reasonKey = `reason-${cand.id}`;

            return (
              <div key={cand.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {/* Header */}
                <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
                  <div className="flex flex-wrap items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h2 className="text-lg font-bold text-slate-900 font-mono">{cand.code}</h2>
                        <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                          {cand.caseRole} · {cand.caseTitle}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {lastRun && (
                          <>
                            <StageBadge stage={lastRun.stage} />
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${REVIEW_STATUS_LABELS[lastRun.review_status].color}`}>
                              {REVIEW_STATUS_LABELS[lastRun.review_status].label}
                            </span>
                          </>
                        )}
                        <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded border border-green-200">
                          synthetic: true · no_real_pii
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-black text-blue-600">
                        {cand.fit_score === 0 ? '—' : cand.fit_score}
                      </div>
                      <div className="text-xs text-slate-400">Fit Score</div>
                    </div>
                  </div>
                </div>

                <div className="p-6 grid md:grid-cols-2 gap-6">
                  {/* Score Breakdown */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-3">Score Dimensions</h3>
                    <ScoreRadar breakdown={cand.score_breakdown} />
                  </div>

                  {/* Evidence Refs */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-3">
                      Evidence References ({cand.evidence_refs.length})
                    </h3>
                    {cand.evidence_refs.length === 0 ? (
                      <p className="text-xs text-slate-400">No evidence records</p>
                    ) : (
                      <div className="space-y-2">
                        {cand.evidence_refs.map((ref, i) => (
                          <div key={i} className="border border-slate-100 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium text-slate-600">{ref.label}</span>
                              <span className="text-xs text-slate-400 bg-slate-100 rounded px-1">{ref.type}</span>
                            </div>
                            <p className="text-xs text-slate-500">{ref.summary}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Stage Run history */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-3">Stage History</h3>
                    <div className="space-y-1.5">
                      {cand.stage_run.map((sr, i) => {
                        const reviewInfo = REVIEW_STATUS_LABELS[sr.review_status];
                        return (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <StageBadge stage={sr.stage} />
                            <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${
                              sr.status === 'completed' ? 'bg-green-100 text-green-700' :
                              sr.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                              sr.status === 'blocked' ? 'bg-red-100 text-red-700' :
                              sr.status === 'returned' ? 'bg-orange-100 text-orange-700' :
                              'bg-slate-100 text-slate-500'
                            }`}>
                              {sr.status}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${reviewInfo.color}`}>
                              {reviewInfo.label}
                            </span>
                            {sr.reviewer && <span className="text-slate-400">by {sr.reviewer}</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Risk Flags */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-3">Risk Flags</h3>
                    {cand.risk_flags.length === 0 ? (
                      <p className="text-xs text-green-600">✓ No risk flags</p>
                    ) : (
                      <div className="space-y-2">
                        {cand.risk_flags.map((rf, i) => (
                          <div key={i} className={`rounded-lg p-3 border ${
                            rf.level === 'high' ? 'bg-red-50 border-red-200' :
                            rf.level === 'medium' ? 'bg-amber-50 border-amber-200' :
                            'bg-slate-50 border-slate-200'
                          }`}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-xs font-bold uppercase ${
                                rf.level === 'high' ? 'text-red-600' :
                                rf.level === 'medium' ? 'text-amber-600' : 'text-slate-500'
                              }`}>{rf.level}</span>
                              <span className="text-xs font-medium text-slate-700">{rf.label}</span>
                            </div>
                            <p className="text-xs text-slate-500">{rf.detail}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Interactive Evidence Actions */}
                <div className="border-t border-slate-200 px-6 py-4">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Evidence Review Actions (local state)</h3>
                  <div className="flex flex-wrap gap-2 items-center mb-3">
                    <input
                      type="text"
                      placeholder="Decision reason (optional)"
                      value={getReason(reasonKey)}
                      onChange={(e) => setReason(reasonKey, e.target.value)}
                      className="text-xs border border-slate-200 rounded px-2 py-1.5 w-52 focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                    <button
                      onClick={() => addDecision(cand.id, 'approve', getReason(reasonKey) || 'Evidence approved')}
                      className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                    >
                      ✓ Approve Evidence
                    </button>
                    <button
                      onClick={() => addDecision(cand.id, 'hold', getReason(reasonKey) || 'Evidence on hold')}
                      className="px-3 py-1.5 text-sm bg-amber-500 text-white rounded hover:bg-amber-600 transition-colors"
                    >
                      ⏸ Hold
                    </button>
                    <button
                      onClick={() => addDecision(cand.id, 'reject', getReason(reasonKey) || 'Evidence rejected')}
                      className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                    >
                      ✗ Reject/Override
                    </button>
                  </div>

                  {/* Local Decision Log */}
                  {candDecisions.length > 0 && (
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs font-semibold text-slate-500 mb-2">
                        Local Decision Log ({candDecisions.length})
                      </p>
                      <div className="space-y-1">
                        {candDecisions.map((entry) => (
                          <div key={entry.id} className="text-xs flex gap-2 text-slate-600">
                            <span className={
                              entry.action === 'approve' ? 'text-green-600' :
                              entry.action === 'reject' ? 'text-red-600' :
                              entry.action === 'hold' ? 'text-amber-600' :
                              'text-violet-600'
                            }>
                              ● {entry.action}
                            </span>
                            <span>{entry.reason}</span>
                            <span className="text-slate-400 ml-auto shrink-0">
                              {new Date(entry.at).toLocaleTimeString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </>
  );
}
