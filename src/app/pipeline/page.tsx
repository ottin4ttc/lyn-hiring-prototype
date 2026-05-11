'use client';

/**
 * Workbench 2: Pipeline Board
 * Kanban view grouped by workflow_case.current_state.
 * Each card shows review_status badge.
 * Anomaly/boundary states (to_confirm, stale_mock_data, external_action_attempt)
 * display explanatory callout banners for QA visibility.
 */

import { useSimulator } from '@/hooks/useSimulator';
import { WORKFLOW_STATE_LABELS, REVIEW_STATUS_LABELS } from '@/data/mock-cases';
import type { WorkflowCaseState } from '@/data/mock-cases';
import { Nav } from '@/components/Nav';
import { StageBadge } from '@/components/StageBadge';
import Link from 'next/link';

const STATE_ORDER: WorkflowCaseState[] = [
  'pending',
  'active',
  'to_confirm',
  'needs_human_review',
  'blocked',
  'returned',
  'rejected',
  'privacy_violation',
  'stale_mock_data',
  'external_action_attempt',
  'closed',
];

/** QA callout descriptions for anomaly/boundary states */
const STATE_QA_NOTES: Partial<Record<WorkflowCaseState, { icon: string; text: string; bg: string; textColor: string }>> = {
  to_confirm: {
    icon: '⚠️',
    text: 'QA: 等待人工确认 — 条件未满足前不得推进，需人工确认后方可继续流转。',
    bg: 'bg-yellow-50 border-yellow-200',
    textColor: 'text-yellow-800',
  },
  stale_mock_data: {
    icon: '🕰️',
    text: 'QA: 数据陈旧 — >90 天无活动，候选人意愿未确认。需人工重新确认后继续。',
    bg: 'bg-slate-100 border-slate-300',
    textColor: 'text-slate-600',
  },
  external_action_attempt: {
    icon: '🛡️',
    text: 'QA: 外部动作已拦截 — 系统检测到未授权外部提交尝试，所有外发动作已暂停，待人工审批。',
    bg: 'bg-rose-50 border-rose-200',
    textColor: 'text-rose-800',
  },
  privacy_violation: {
    icon: '🔒',
    text: 'QA: 隐私红线触发 — 检测到疑似真实 PII，处理已暂停，等待人工审查。',
    bg: 'bg-purple-50 border-purple-200',
    textColor: 'text-purple-800',
  },
  blocked: {
    icon: '⛔',
    text: 'QA: 已阻塞 — 当前阶段存在异常（如背调矛盾），需人工介入解除。',
    bg: 'bg-red-50 border-red-200',
    textColor: 'text-red-700',
  },
  returned: {
    icon: '↩',
    text: 'QA: 已退回修订 — 推荐包退回，decision_log 保留退回原因，可在 Recommendation Pack 工作台查看详情。',
    bg: 'bg-orange-50 border-orange-200',
    textColor: 'text-orange-700',
  },
};

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
          <p className="text-xs text-slate-400 mt-1">
            共 {state.cases.length} 个 case · 11 状态列（含 to_confirm / stale_mock_data / external_action_attempt 异常边界 case）
          </p>
        </div>

        <div className="overflow-x-auto">
          <div className="flex gap-4 min-w-max pb-4">
            {STATE_ORDER.map((stateKey) => {
              const stateInfo = WORKFLOW_STATE_LABELS[stateKey];
              const cases = byState[stateKey];
              const qaNote = STATE_QA_NOTES[stateKey];

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

                    {/* QA note banner for anomaly states */}
                    {qaNote && (
                      <div className={`mx-3 mt-3 px-3 py-2 rounded-lg border text-xs ${qaNote.bg} ${qaNote.textColor}`}>
                        <span className="font-bold mr-1">{qaNote.icon}</span>
                        {qaNote.text}
                      </div>
                    )}

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

                            {/* case-level decision_delta for returned cases */}
                            {c.decision_delta && (
                              <div className="mb-2 text-xs text-orange-700 bg-orange-50 rounded px-2 py-1 border border-orange-100">
                                ↩ {c.decision_delta}
                              </div>
                            )}

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
                                    {lastRun && (
                                      <div className="mb-1 flex gap-1 flex-wrap items-center">
                                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                                          lastRun.status === 'completed' ? 'bg-green-100 text-green-700' :
                                          lastRun.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                                          lastRun.status === 'blocked' ? 'bg-red-100 text-red-700' :
                                          lastRun.status === 'returned' ? 'bg-orange-100 text-orange-700' :
                                          'bg-slate-100 text-slate-500'
                                        }`}>
                                          {lastRun.stage} · {lastRun.status}
                                        </span>
                                      </div>
                                    )}
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
                                    {/* Latest decision log entry */}
                                    {cand.decision_log.length > 0 && (
                                      <div className="mt-1.5 text-xs text-slate-500 bg-slate-50 rounded px-1.5 py-1 border border-slate-100">
                                        <span className="font-medium">最近决策:</span>{' '}
                                        {cand.decision_log[cand.decision_log.length - 1].reason}
                                      </div>
                                    )}
                                    <div className="mt-1.5 flex gap-2">
                                      <Link
                                        href={`/evidence?cand=${cand.id}`}
                                        className="text-xs text-blue-600 hover:text-blue-800"
                                      >
                                        Evidence →
                                      </Link>
                                      <Link
                                        href={`/?expand=${c.id}`}
                                        className="text-xs text-slate-500 hover:text-slate-700"
                                      >
                                        Simulator →
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
