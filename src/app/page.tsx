'use client';
/**
 * Workbench 1: Case Simulator
 * Interactive — advance/return/block stages, approve/reject review, local decision_log
 */
import { MOCK_CASES, STAGE_ORDER } from '@/data/mock-cases';
import { useSimulator } from '@/hooks/useSimulator';
import { Nav } from '@/components/Nav';
import { StageBadge } from '@/components/StageBadge';
import { useState } from 'react';
import type { WorkflowCase, StageRunStatus, ReviewStatus } from '@/data/mock-cases';

function stateColor(s: StageRunStatus) {
  return s === 'completed' ? 'bg-green-100 text-green-700'
       : s === 'in_progress' ? 'bg-blue-100 text-blue-700'
       : s === 'blocked' ? 'bg-red-100 text-red-700'
       : s === 'returned' ? 'bg-amber-100 text-amber-700'
       : s === 'needs_human_review' ? 'bg-purple-100 text-purple-700'
       : 'bg-slate-100 text-slate-500';
}

function reviewColor(r: ReviewStatus) {
  return r === 'approved' ? 'bg-green-100 text-green-700'
       : r === 'returned' || r === 'rejected' ? 'bg-red-100 text-red-700'
       : r === 'needs_revision' ? 'bg-amber-100 text-amber-700'
       : 'bg-slate-100 text-slate-500';
}

function StageRunRow({ run }: { run: import('@/data/mock-cases').StageRun }) {
  return (
    <div className="flex items-center gap-2 text-xs py-1 border-b border-slate-50 last:border-0">
      <StageBadge stage={run.stage} />
      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${stateColor(run.status)}`}>{run.status}</span>
      <span className={`px-1.5 py-0.5 rounded text-xs ${reviewColor(run.review_status)}`}>{run.review_status}</span>
      {run.reviewer && <span className="text-slate-400">by {run.reviewer}</span>}
      {run.notes && <span className="text-slate-400 italic truncate max-w-[200px]">{run.notes}</span>}
    </div>
  );
}

export default function CaseSimulator() {
  const { cases, advanceStage, returnStage, blockStage, approveReview } = useSimulator(MOCK_CASES);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [actionBy] = useState('SIM-USER');

  return (
    <>
      <Nav />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Case Simulator</h1>
          <p className="text-slate-500 text-sm mt-1">工作台 1 / 5 · 可交互状态机 — 推进/退回/阻塞阶段，审核决策留痕</p>
        </div>

        {/* Stage Flow */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">状态流转</p>
          <div className="flex flex-wrap gap-2 items-center">
            {STAGE_ORDER.map((stage, i) => (
              <span key={stage} className="flex items-center gap-1">
                <StageBadge stage={stage} />
                {i < STAGE_ORDER.length - 1 && <span className="text-slate-300 text-xs">→</span>}
              </span>
            ))}
          </div>
        </div>

        {/* Cases */}
        <div className="space-y-4">
          {cases.map((c: WorkflowCase) => (
            <div key={c.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {/* Case Header */}
              <div
                className="px-6 py-4 cursor-pointer hover:bg-slate-50 flex items-start justify-between"
                onClick={() => setExpanded(expanded === c.id ? null : c.id)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-mono text-slate-400">{c.identifier}</span>
                    <h3 className="font-semibold text-slate-800 text-sm">{c.title}</h3>
                    {c.anomaly_type && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">
                        ⚠ {c.anomaly_type}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs text-slate-500">{c.role} · {c.client_code}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stateColor(c.current_state)}`}>
                      state: {c.current_state}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${reviewColor(c.review_status)}`}>
                      review: {c.review_status}
                    </span>
                    <StageBadge stage={c.current_stage} />
                    <span className="text-xs text-green-600 font-medium bg-green-50 px-1.5 py-0.5 rounded">
                      synthetic={String(c.synthetic)} · {c.privacy_status}
                    </span>
                  </div>
                </div>
                <span className="text-slate-400 text-xs ml-4">{expanded === c.id ? '▲' : '▼'}</span>
              </div>

              {/* Expanded: candidates */}
              {expanded === c.id && (
                <div className="border-t border-slate-100 divide-y divide-slate-50">
                  {c.candidates.map(cand => (
                    <div key={cand.id} className="px-6 py-4">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="font-mono text-sm font-bold text-slate-700">{cand.code}</span>
                        <span className="text-xs text-slate-400">fit: {cand.fit_score}</span>
                        <StageBadge stage={cand.current_stage} />
                        <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                          {cand.privacy_status} · pii={String(cand.pii_fields_present)}
                        </span>
                      </div>

                      {/* Stage Runs */}
                      <div className="mb-3 bg-slate-50 rounded-lg p-3">
                        <p className="text-xs font-semibold text-slate-500 mb-2">Stage Runs</p>
                        {cand.stage_runs.map((sr, i) => <StageRunRow key={i} run={sr} />)}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 flex-wrap mb-3">
                        <button
                          onClick={() => advanceStage(c.id, cand.id, '模拟推进', actionBy)}
                          className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                        >
                          推进阶段 →
                        </button>
                        <button
                          onClick={() => returnStage(c.id, cand.id, '模拟退回', actionBy)}
                          className="px-3 py-1.5 text-xs bg-amber-500 text-white rounded hover:bg-amber-600 transition-colors"
                        >
                          ← 退回阶段
                        </button>
                        <button
                          onClick={() => blockStage(c.id, cand.id, '模拟阻塞', actionBy)}
                          className="px-3 py-1.5 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                        >
                          ⛔ 阻塞
                        </button>
                        <button
                          onClick={() => approveReview(c.id, cand.id, actionBy)}
                          className="px-3 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                        >
                          ✓ 批准审核
                        </button>
                      </div>

                      {/* Decision Log */}
                      <div>
                        <p className="text-xs font-semibold text-slate-500 mb-2">决策日志 ({cand.decision_log.length})</p>
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                          {cand.decision_log.map((log, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs">
                              <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                                log.decision === 'advance' ? 'bg-green-500' :
                                log.decision === 'reject'  ? 'bg-red-500' :
                                log.decision === 'hold'    ? 'bg-amber-500' : 'bg-slate-300'
                              }`} />
                              <span className="text-slate-500">
                                <span className="font-medium text-slate-700">[{log.stage}]</span>{' '}
                                <span className={log.decision === 'advance' ? 'text-green-600' : log.decision === 'reject' ? 'text-red-600' : 'text-amber-600'}>
                                  {log.decision}
                                </span>{' '}
                                — {log.reason}
                                <span className="text-slate-400 ml-1">{log.by} · {log.at}</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
