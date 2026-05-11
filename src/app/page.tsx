'use client';

/**
 * Workbench 1: Case Simulator
 * Interactive simulator with stage advancement, block, return, and decision log.
 * Supports ?expand=<caseId> URL param to auto-expand a specific case.
 */

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSimulator } from '@/hooks/useSimulator';
import { STAGE_ORDER, WORKFLOW_STATE_LABELS, REVIEW_STATUS_LABELS } from '@/data/mock-cases';
import type { Stage, StageRunStatus, ReviewStatus } from '@/data/mock-cases';
import { Nav } from '@/components/Nav';
import { StageBadge } from '@/components/StageBadge';
import Link from 'next/link';

function statusColor(status: StageRunStatus): string {
  switch (status) {
    case 'completed': return 'bg-green-100 text-green-700';
    case 'in_progress': return 'bg-blue-100 text-blue-700';
    case 'blocked': return 'bg-red-100 text-red-700';
    case 'returned': return 'bg-orange-100 text-orange-700';
    case 'pending': return 'bg-slate-100 text-slate-500';
    default: return 'bg-slate-100 text-slate-500';
  }
}

function reviewStatusBadge(review_status: ReviewStatus) {
  const info = REVIEW_STATUS_LABELS[review_status];
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${info.color}`}>
      {info.label}
    </span>
  );
}

function CaseSimulatorInner() {
  const {
    state,
    advanceStage,
    returnStage,
    blockStage,
    canAdvance,
    isPending,
    hasReviewableStage,
    rejectReview,
    returnReview,
    startCase,
    getDecisionLogForCandidate,
  } = useSimulator();
  const searchParams = useSearchParams();
  const expandParam = searchParams.get('expand');
  const [expandedCase, setExpandedCase] = useState<string | null>(expandParam);
  const [reasonInputs, setReasonInputs] = useState<Record<string, string>>({});

  // Auto-expand case from URL param
  useEffect(() => {
    if (expandParam) {
      setExpandedCase(expandParam);
      // Scroll to it after mount
      setTimeout(() => {
        document.getElementById(`case-${expandParam}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 200);
    }
  }, [expandParam]);

  function getReason(key: string) {
    return reasonInputs[key] ?? '';
  }

  function setReason(key: string, val: string) {
    setReasonInputs((prev) => ({ ...prev, [key]: val }));
  }

  return (
    <>
      <Nav />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Case Simulator</h1>
          <p className="text-slate-500 text-sm mt-1">
            Workbench 1 / 5 · Interactive simulation — advance, block, or return stages. All state is local only.
          </p>
        </div>

        {/* Stage Flow */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">Pipeline Stages</h2>
          <div className="flex flex-wrap gap-2 items-center">
            {STAGE_ORDER.map((stage, i) => (
              <span key={stage} className="flex items-center gap-2">
                <StageBadge stage={stage} />
                {i < STAGE_ORDER.length - 1 && <span className="text-slate-300">→</span>}
              </span>
            ))}
          </div>
        </div>

        {/* Cases */}
        <div className="space-y-4">
          {state.cases.map((c) => {
            const stateInfo = WORKFLOW_STATE_LABELS[c.current_state];
            const reviewInfo = REVIEW_STATUS_LABELS[c.review_status];
            const isExpanded = expandedCase === c.id;

            return (
              <div key={c.id} id={`case-${c.id}`} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {/* Case Header */}
                <div
                  className="px-6 py-4 flex items-start justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => setExpandedCase(isExpanded ? null : c.id)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stateInfo.color}`}>
                        {stateInfo.label}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${reviewInfo.color}`}>
                        {reviewInfo.label}
                      </span>
                      <span className="text-xs text-slate-400">{c.client_code}</span>
                    </div>
                    <h3 className="font-semibold text-slate-800 text-sm leading-snug">{c.title}</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      {c.candidates.length} candidate(s) · Current stage: <span className="font-medium">{c.current_stage}</span>
                    </p>
                  </div>
                  <div className="text-slate-400 ml-4">{isExpanded ? '▲' : '▼'}</div>
                </div>

                {/* Expanded Candidate Rows */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50 p-4 space-y-6">
                    {c.candidates.map((cand) => {
                      const simDecisions = getDecisionLogForCandidate(c.id, cand.id);
                      const lastRun = cand.stage_run.at(-1);
                      const candKey = `${c.id}-${cand.id}`;
                      const advanceable = canAdvance(c.id, cand.id);

                      return (
                        <div key={cand.id} className="bg-white rounded-lg border border-slate-200 p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <span className="font-mono text-sm font-bold text-slate-700">{cand.code}</span>
                              <span className="ml-2 text-xs text-slate-400">Fit: {cand.fit_score}</span>
                            </div>
                            {lastRun && (
                              <div className="flex items-center gap-2">
                                <StageBadge stage={lastRun.stage} />
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(lastRun.status)}`}>
                                  {lastRun.status}
                                </span>
                                {reviewStatusBadge(lastRun.review_status)}
                              </div>
                            )}
                          </div>

                          {/* Stage Run Timeline */}
                          <div className="mb-3">
                            <p className="text-xs font-semibold text-slate-500 mb-2">Stage Run</p>
                            <div className="flex flex-wrap gap-1">
                              {cand.stage_run.map((sr, i) => (
                                <div key={i} className="flex items-center gap-1">
                                  <div className="text-xs">
                                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${statusColor(sr.status)}`}>
                                      {sr.stage}
                                    </span>
                                  </div>
                                  {i < cand.stage_run.length - 1 && (
                                    <span className="text-slate-300 text-xs">›</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Action Controls */}
                          <div className="mb-3">
                            <p className="text-xs font-semibold text-slate-500 mb-2">Simulator Controls</p>
                            <div className="flex flex-wrap gap-2 items-center mb-2">
                              <input
                                type="text"
                                placeholder="Reason (optional)"
                                value={getReason(candKey)}
                                onChange={(e) => setReason(candKey, e.target.value)}
                                className="text-xs border border-slate-200 rounded px-2 py-1 w-48 focus:outline-none focus:ring-1 focus:ring-blue-400"
                              />
                              {/* Start button only for pending cases — starts case, sets active + writes stage_run + decision_log */}
                              {isPending(c.id) && (
                                <button
                                  onClick={() => startCase(c.id, cand.id, getReason(candKey) || 'Case started – intake initiated')}
                                  className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-semibold"
                                  title="将 case 标为 active，stage_run 写入 in_progress，decision_log 写入 advance 记录"
                                >
                                  🚀 Start Case
                                </button>
                              )}
                              <button
                                disabled={!advanceable}
                                onClick={() => advanceStage(c.id, cand.id, getReason(candKey) || undefined)}
                                className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                title="推进到下一阶段，写入 stage_run + decision_log"
                              >
                                ▶ Advance Stage
                              </button>
                              <button
                                onClick={() => returnStage(c.id, cand.id, getReason(candKey) || 'Returned for revision')}
                                className="px-3 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
                                title="将 stage_run 标为 returned，写入 decision_log"
                              >
                                ↩ Return
                              </button>
                              <button
                                onClick={() => blockStage(c.id, cand.id, getReason(candKey) || 'Stage blocked')}
                                className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                                title="将 stage_run 标为 blocked，写入 decision_log"
                              >
                                ⛔ Block
                              </button>
                            </div>
                            {/* Review controls – shown when stage is in_progress, pending_review, or needs_human_review */}
                            {hasReviewableStage(c.id, cand.id) && (
                              <div className="flex flex-wrap gap-2 items-center border-t border-slate-100 pt-2 mt-1 bg-amber-50 rounded-b px-2 pb-2">
                                <span className="text-xs text-amber-700 font-semibold w-full pt-1">审核操作（写入 stage_run + decision_log）</span>
                                <button
                                  onClick={() => returnReview(c.id, cand.id, getReason(candKey) || 'Returned for human revision')}
                                  className="px-3 py-1 text-xs bg-amber-500 text-white rounded hover:bg-amber-600 transition-colors"
                                  title="review_status → needs_human_review，stage_run 写入 returned，decision_log 写入 return"
                                >
                                  ↩ Return for Review
                                </button>
                                <button
                                  onClick={() => rejectReview(c.id, cand.id, getReason(candKey) || 'Review rejected')}
                                  className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                                  title="review_status → rejected，stage_run 写入 returned，decision_log 写入 reject"
                                >
                                  ✕ Reject Review
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Decision Log */}
                          <div>
                            <p className="text-xs font-semibold text-slate-500 mb-2">
                              Decision Log ({cand.decision_log.length + simDecisions.length} entries)
                            </p>
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                              {cand.decision_log.map((log, i) => (
                                <div key={`orig-${i}`} className="text-xs text-slate-600 flex gap-2">
                                  <span className="text-slate-300 shrink-0">•</span>
                                  <span>
                                    <span className="font-medium text-slate-700">[{log.stage}]</span>{' '}
                                    <span className={
                                      log.decision === 'advance' ? 'text-green-600' :
                                      log.decision === 'reject' ? 'text-red-600' :
                                      log.decision === 'hold' ? 'text-amber-600' :
                                      log.decision === 'return' ? 'text-orange-600' :
                                      'text-slate-500'
                                    }>{log.decision}</span>
                                    {' — '}{log.reason}
                                    <span className="text-slate-400 ml-1">({log.by} · {log.at})</span>
                                  </span>
                                </div>
                              ))}
                              {simDecisions.map((entry) => (
                                <div key={entry.id} className="text-xs text-blue-700 flex gap-2 bg-blue-50 rounded px-1.5 py-0.5">
                                  <span className="shrink-0">⚡</span>
                                  <span>
                                    <span className="font-medium">[{entry.stage}]</span>{' '}
                                    <span>{entry.action}</span>
                                    {' — '}{entry.reason}
                                    <span className="text-blue-400 ml-1">({entry.by} · {new Date(entry.at).toLocaleTimeString()})</span>
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div className="mt-2 flex gap-3">
                      <Link
                        href={`/pipeline?case=${c.id}`}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        View Pipeline Board →
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </>
  );
}

export default function CaseSimulator() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400">Loading...</div>}>
      <CaseSimulatorInner />
    </Suspense>
  );
}
