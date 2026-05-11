'use client';

/**
 * Workbench 4: Recommendation Pack
 * Interactive: mark approved / return with actual onClick handlers updating local state.
 * Blocked external actions bound to canonical disabled_external_action data.
 */

import { useState } from 'react';
import { useSimulator } from '@/hooks/useSimulator';
import { REVIEW_STATUS_LABELS } from '@/data/mock-cases';
import { Nav } from '@/components/Nav';
import { StageBadge } from '@/components/StageBadge';
import { BlockedAction } from '@/components/BlockedAction';

interface PackDecisionEntry {
  id: string;
  candidateId: string;
  packId?: string;
  action: 'approved' | 'returned';
  reason: string;
  at: string;
}

export default function RecommendationPack() {
  const { state } = useSimulator();
  const [packDecisions, setPackDecisions] = useState<PackDecisionEntry[]>([]);
  const [reasonInputs, setReasonInputs] = useState<Record<string, string>>({});

  const recoCandidates = state.cases.flatMap((c) =>
    c.candidates
      .filter((cand) => {
        const lastStage = cand.stage_run.at(-1)?.stage;
        return lastStage && ['Recommendation Pack', 'Client Feedback', 'Learning Artifact'].includes(lastStage);
      })
      .map((cand) => ({
        ...cand,
        caseTitle: c.title,
        caseRole: c.role,
        clientCode: c.client_code,
        caseId: c.id,
      }))
  );

  function getReason(key: string) {
    return reasonInputs[key] ?? '';
  }

  function setReason(key: string, val: string) {
    setReasonInputs((prev) => ({ ...prev, [key]: val }));
  }

  function addPackDecision(
    candidateId: string,
    packId: string | undefined,
    action: PackDecisionEntry['action'],
    reason: string,
  ) {
    const entry: PackDecisionEntry = {
      id: Math.random().toString(36).slice(2, 10),
      candidateId,
      packId,
      action,
      reason,
      at: new Date().toISOString(),
    };
    setPackDecisions((prev) => [...prev, entry]);
  }

  function getCandPackDecisions(candidateId: string) {
    return packDecisions.filter((d) => d.candidateId === candidateId);
  }

  return (
    <>
      <Nav />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Recommendation Pack</h1>
          <p className="text-slate-500 text-sm mt-1">
            Workbench 4 / 5 · Approve or return recommendation packs. External delivery actions are disabled.
          </p>
        </div>

        {/* Global blocked actions banner */}
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <h2 className="text-sm font-semibold text-red-700 mb-2">⛔ External Actions Disabled (Prototype Boundary)</h2>
          <p className="text-xs text-red-600 mb-3">
            All candidate outreach, client submission, and email actions are blocked in this simulation prototype.
          </p>
          <div className="flex flex-wrap gap-2">
            <BlockedAction label="Send Recommendation Pack" />
            <BlockedAction label="Send Client Email" />
            <BlockedAction label="Write to Lark Base" />
            <BlockedAction label="Create External Task" />
            <BlockedAction label="Candidate Outreach" />
          </div>
        </div>

        {recoCandidates.length === 0 && (
          <div className="text-center py-16 text-slate-400">No candidates at recommendation stage</div>
        )}

        <div className="space-y-6">
          {recoCandidates.map((cand) => {
            const lastRun = cand.stage_run.at(-1);
            const reviewInfo = lastRun ? REVIEW_STATUS_LABELS[lastRun.review_status] : null;
            const candPackDecisions = getCandPackDecisions(cand.id);
            const reasonKey = `rpack-${cand.id}`;

            return (
              <div key={cand.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100 px-6 py-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-1 flex-wrap">
                        <h2 className="text-lg font-bold text-slate-900 font-mono">{cand.code}</h2>
                        {cand.recommendation_pack_id && (
                          <span className="text-xs font-mono text-slate-400 bg-white/60 px-2 py-0.5 rounded border border-slate-200">
                            {cand.recommendation_pack_id}
                          </span>
                        )}
                        {reviewInfo && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${reviewInfo.color}`}>
                            {reviewInfo.label}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600">{cand.caseRole} · {cand.caseTitle}</p>
                      <p className="text-xs text-slate-400 mt-1">Client: {cand.clientCode}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-4xl font-black text-orange-500">
                        {cand.fit_score === 0 ? '—' : cand.fit_score}
                      </div>
                      <div className="text-xs text-slate-400 mb-1">Composite Fit</div>
                      {lastRun && <StageBadge stage={lastRun.stage} />}
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  {/* Stage Run */}
                  <div className="mb-4">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Stage History</h3>
                    <div className="flex flex-wrap gap-1">
                      {cand.stage_run.map((sr, i) => (
                        <span key={i} className="flex items-center gap-1">
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                            sr.status === 'completed' ? 'bg-green-100 text-green-700' :
                            sr.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                            sr.status === 'blocked' ? 'bg-red-100 text-red-700' :
                            sr.status === 'returned' ? 'bg-orange-100 text-orange-700' :
                            'bg-slate-100 text-slate-500'
                          }`}>
                            {sr.stage}
                          </span>
                          {i < cand.stage_run.length - 1 && <span className="text-slate-300 text-xs">›</span>}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Score Summary */}
                  <div className="grid grid-cols-4 gap-3 mb-4">
                    {Object.entries(cand.score_breakdown).map(([k, v]) => (
                      <div key={k} className="bg-slate-50 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-slate-700">{v === 0 ? '—' : v}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{
                          k === 'technical' ? 'Technical' :
                          k === 'leadership' ? 'Leadership' :
                          k === 'culture_fit' ? 'Culture Fit' : 'Growth'
                        }</div>
                      </div>
                    ))}
                  </div>

                  {/* Evidence Summary */}
                  {cand.evidence_refs.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Evidence Summary</h3>
                      <div className="space-y-1">
                        {cand.evidence_refs.map((ref, i) => (
                          <div key={i} className="text-xs text-slate-600 flex gap-2">
                            <span className="text-slate-300">•</span>
                            <span><span className="font-medium">{ref.label}:</span> {ref.summary}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Disabled External Actions from canonical data */}
                  {cand.disabled_external_actions.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                        Blocked External Actions
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {cand.disabled_external_actions.map((dea, i) => (
                          <BlockedAction key={i} label={dea.label} reason={dea.reason} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Interactive Controls */}
                  <div className="border-t border-slate-100 pt-4">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                      Human Control Point (local state)
                    </h3>
                    <div className="flex flex-wrap gap-2 items-center mb-3">
                      <input
                        type="text"
                        placeholder="Decision reason (optional)"
                        value={getReason(reasonKey)}
                        onChange={(e) => setReason(reasonKey, e.target.value)}
                        className="text-xs border border-slate-200 rounded px-2 py-1.5 w-52 focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
                      <button
                        onClick={() =>
                          addPackDecision(
                            cand.id,
                            cand.recommendation_pack_id,
                            'approved',
                            getReason(reasonKey) || 'Pack marked as reviewed and approved',
                          )
                        }
                        className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      >
                        ✓ Mark Approved (local)
                      </button>
                      <button
                        onClick={() =>
                          addPackDecision(
                            cand.id,
                            cand.recommendation_pack_id,
                            'returned',
                            getReason(reasonKey) || 'Pack returned for revision',
                          )
                        }
                        className="px-3 py-1.5 text-sm bg-slate-200 text-slate-600 rounded hover:bg-slate-300 transition-colors"
                      >
                        ↩ Return for Revision
                      </button>
                      {/* Submit to client – always blocked */}
                      <BlockedAction label="Submit to Client" reason="Submission to real client is disabled in prototype" />
                    </div>

                    {/* Local Pack Decision Log */}
                    {candPackDecisions.length > 0 && (
                      <div className="bg-blue-50 rounded-lg p-3">
                        <p className="text-xs font-semibold text-blue-700 mb-2">
                          Pack Decision Log ({candPackDecisions.length} entries)
                        </p>
                        <div className="space-y-1">
                          {candPackDecisions.map((entry) => (
                            <div key={entry.id} className="text-xs flex gap-2 text-slate-700">
                              <span className={
                                entry.action === 'approved' ? 'text-green-600 font-semibold' : 'text-orange-600 font-semibold'
                              }>
                                {entry.action === 'approved' ? '✓' : '↩'} {entry.action}
                              </span>
                              {entry.packId && (
                                <span className="font-mono text-slate-400">[{entry.packId}]</span>
                              )}
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
              </div>
            );
          })}
        </div>
      </main>
    </>
  );
}
