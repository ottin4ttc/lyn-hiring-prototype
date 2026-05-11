'use client';

/**
 * Workbench 2: Pipeline Board
 * Kanban view grouped by workflow_case.current_state.
 * Each card shows review_status badge.
 */

import { useSimulator } from '@/hooks/useSimulator';
import { WORKFLOW_STATE_LABELS, REVIEW_STATUS_LABELS } from '@/data/mock-cases';
import type { WorkflowCaseState } from '@/data/mock-cases';
import { Nav } from '@/components/Nav';
import { StageBadge } from '@/components/StageBadge';
import Link from 'next/link';

const STATE_ORDER: WorkflowCaseState[] = [
  'active',
  'needs_human_review',
  'blocked',
  'returned',
  'rejected',
  'privacy_violation',
  'stale_mock_data',
  'external_action_attempt',
  'closed',
];

function ScoreBar({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-slate-400 w-16 shrink-0">{label}</span>
      <div className="flex-1 bg-slate-100 rounded-full h-1.5">
        <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${value}%` }} />
      </div>
      <span className="text-slate-500 w-6 text-right">{value}</span>
    </div>
  );
}

export default function PipelineBoard() {
  const { state } = useSimulator();

  // Group cases by workflow_case.current_state
  const byState: Record<WorkflowCaseState, typeof state.cases> = {} as Record<WorkflowCaseState, typeof state.cases>;
  STATE_ORDER.forEach((s) => { byState[s] = []; });
  state.cases.forEach((c) => {
    if (byState[c.current_state]) {
      byState[c.current_state].push(c);
    }
  });

  return (
    <>
      <Nav />
      <main className="max-w-full px-4 py-8">
        <div className="mb-6 max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-slate-900">Pipeline Board</h1>
          <p className="text-slate-500 text-sm mt-1">
            Workbench 2 / 5 · Kanban view by <code className="text-xs bg-slate-100 px-1 rounded">workflow_case.current_state</code>
          </p>
        </div>

        <div className="overflow-x-auto">
          <div className="flex gap-4 min-w-max pb-4">
            {STATE_ORDER.map((stateKey) => {
              const stateInfo = WORKFLOW_STATE_LABELS[stateKey];
              const cases = byState[stateKey];

              return (
                <div key={stateKey} className="w-72 shrink-0">
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stateInfo.color}`}>
                        {stateInfo.label}
                      </span>
                      <span className="text-xs text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">
                        {cases.length}
                      </span>
                    </div>
                    <div className="p-3 space-y-3">
                      {cases.length === 0 && (
                        <p className="text-xs text-slate-300 text-center py-4">—</p>
                      )}
                      {cases.map((c) => {
                        const reviewInfo = REVIEW_STATUS_LABELS[c.review_status];
                        return (
                          <div key={c.id} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                            {/* Case header */}
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <p className="text-xs font-semibold text-slate-700 leading-tight">{c.title}</p>
                                <p className="text-xs text-slate-400 mt-0.5">{c.client_code} · {c.role}</p>
                              </div>
                            </div>

                            {/* review_status badge */}
                            <div className="mb-2">
                              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${reviewInfo.color}`}>
                                {reviewInfo.label}
                              </span>
                            </div>

                            {/* Current stage */}
                            <div className="mb-2 flex items-center gap-1">
                              <span className="text-xs text-slate-400">Stage:</span>
                              <StageBadge stage={c.current_stage} />
                            </div>

                            {/* Candidates */}
                            <div className="space-y-2">
                              {c.candidates.map((cand) => {
                                const lastRun = cand.stage_run.at(-1);
                                const candReviewInfo = lastRun ? REVIEW_STATUS_LABELS[lastRun.review_status] : null;
                                return (
                                  <div key={cand.id} className="bg-white rounded p-2 border border-slate-100">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-xs font-medium text-slate-700">{cand.code}</span>
                                      <span className={`text-xs font-bold ${
                                        cand.fit_score >= 85 ? 'text-green-600' :
                                        cand.fit_score >= 70 ? 'text-amber-600' : 'text-red-500'
                                      }`}>
                                        {cand.fit_score === 0 ? 'N/A' : cand.fit_score}
                                      </span>
                                    </div>
                                    {candReviewInfo && (
                                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${candReviewInfo.color}`}>
                                        {candReviewInfo.label}
                                      </span>
                                    )}
                                    <div className="mt-1.5 space-y-0.5">
                                      <ScoreBar value={cand.score_breakdown.technical} label="Tech" />
                                      <ScoreBar value={cand.score_breakdown.leadership} label="Lead" />
                                    </div>
                                    {cand.risk_flags.length > 0 && (
                                      <div className="mt-1.5 flex gap-1 flex-wrap">
                                        {cand.risk_flags.map((rf, i) => (
                                          <span key={i} className={`text-xs px-1 py-0.5 rounded ${
                                            rf.level === 'high' ? 'bg-red-100 text-red-600' :
                                            rf.level === 'medium' ? 'bg-amber-100 text-amber-600' :
                                            'bg-slate-100 text-slate-500'
                                          }`}>
                                            ⚑ {rf.label}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                    <div className="mt-1.5">
                                      <Link
                                        href={`/evidence?cand=${cand.id}`}
                                        className="text-xs text-blue-600 hover:text-blue-800"
                                      >
                                        Evidence →
                                      </Link>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </>
  );
}
