'use client';
/**
 * Workbench 4: Recommendation Pack
 * Interactive: approve/return with local state留痕; external actions bound to canonical DisabledExternalAction data
 */
import { MOCK_CASES } from '@/data/mock-cases';
import { useSimulator } from '@/hooks/useSimulator';
import { Nav } from '@/components/Nav';
import { StageBadge } from '@/components/StageBadge';
import type { DisabledExternalAction } from '@/data/mock-cases';

function BlockedActionButton({ action }: { action: DisabledExternalAction }) {
  return (
    <button
      disabled
      title={action.reason}
      className="px-3 py-1.5 text-xs bg-slate-100 text-slate-400 rounded border border-slate-200 cursor-not-allowed line-through"
    >
      🚫 {action.action_type.replace(/_/g, ' ')}
    </button>
  );
}

export default function RecommendationPack() {
  const { cases, approveReview, returnStage } = useSimulator(MOCK_CASES);

  const recoCandidates = cases.flatMap(c =>
    c.candidates
      .filter(cand => ['Recommendation Pack', 'Client Feedback', 'Learning Artifact'].includes(cand.current_stage))
      .map(cand => ({ ...cand, caseId: c.id, caseTitle: c.title, caseRole: c.role, clientCode: c.client_code }))
  );

  return (
    <>
      <Nav />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Recommendation Pack</h1>
          <p className="text-slate-500 text-sm mt-1">工作台 4 / 5 · 推荐包预览 — 外部动作来自 canonical disabled_external_actions 数据</p>
        </div>

        {/* Disabled Actions Banner */}
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <h2 className="text-sm font-semibold text-red-700 mb-2">⛔ 外部动作已禁用（canonical disabled_external_actions）</h2>
          <p className="text-xs text-red-500 mb-3">以下禁用项来自数据层 DisabledExternalAction 对象，action_type + state=&apos;blocked&apos; 可验证</p>
          <div className="flex flex-wrap gap-2">
            {MOCK_CASES[0].candidates[0].disabled_external_actions.map((a, i) => (
              <BlockedActionButton key={i} action={a} />
            ))}
          </div>
        </div>

        {recoCandidates.length === 0 && (
          <div className="text-center py-16 text-slate-400">暂无处于推荐阶段的候选人</div>
        )}

        <div className="space-y-6">
          {recoCandidates.map(cand => (
            <div key={cand.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100 px-6 py-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <h2 className="text-lg font-bold font-mono text-slate-900">{cand.code}</h2>
                      <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">
                        synthetic=true · {cand.privacy_status}
                      </span>
                      {cand.recommendation_pack_id && (
                        <span className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded font-mono">
                          pack: {cand.recommendation_pack_id}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600">{cand.caseRole} · {cand.caseTitle}</p>
                    <p className="text-xs text-slate-400 mt-1">客户: {cand.clientCode}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-black text-orange-500">{cand.fit_score}</div>
                    <div className="text-xs text-slate-400 mb-1">综合 Fit</div>
                    <StageBadge stage={cand.current_stage} />
                  </div>
                </div>
              </div>

              <div className="p-6">
                {/* Stage Runs */}
                <div className="mb-4">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Stage Runs</h3>
                  <div className="flex flex-wrap gap-1">
                    {cand.stage_runs.map((sr, i) => (
                      <span key={i} className="flex items-center gap-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          sr.status === 'completed'          ? 'bg-green-100 text-green-700' :
                          sr.status === 'in_progress'        ? 'bg-blue-100 text-blue-700' :
                          sr.status === 'blocked'            ? 'bg-red-100 text-red-700' :
                          sr.status === 'returned'           ? 'bg-amber-100 text-amber-700' :
                          sr.status === 'needs_human_review' ? 'bg-purple-100 text-purple-700' :
                          'bg-slate-100 text-slate-500'
                        }`}>{sr.stage}</span>
                        {i < cand.stage_runs.length - 1 && <span className="text-slate-300 text-xs">→</span>}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Score Summary */}
                <div className="grid grid-cols-4 gap-3 mb-4">
                  {Object.entries(cand.score_breakdown).map(([k, v]) => (
                    <div key={k} className="bg-slate-50 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-slate-700">{v}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{
                        k === 'technical' ? '技术' :
                        k === 'leadership' ? '领导力' :
                        k === 'culture_fit' ? '文化契合' : '成长潜力'
                      }</div>
                    </div>
                  ))}
                </div>

                {/* Evidence Summary */}
                {cand.evidence_refs.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">证据摘要</h3>
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

                {/* Internal Review Actions */}
                <div className="border-t border-slate-100 pt-4 mb-4">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">内部审核（模拟，留痕）</h3>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => approveReview(cand.caseId, cand.id, 'REVIEWER-01')}
                      className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      ✓ 标记审核通过（本地）
                    </button>
                    <button
                      onClick={() => returnStage(cand.caseId, cand.id, '推荐包需修订', 'REVIEWER-01')}
                      className="px-3 py-1.5 text-sm bg-slate-200 text-slate-600 rounded hover:bg-slate-300 transition-colors"
                    >
                      ↩ 退回修改
                    </button>
                  </div>
                </div>

                {/* Decision Log */}
                {cand.decision_log.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">决策留痕</h3>
                    <div className="space-y-1 max-h-32 overflow-y-auto bg-slate-50 rounded-lg p-3">
                      {cand.decision_log.map((log, i) => (
                        <div key={i} className="text-xs flex gap-2">
                          <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                            log.decision === 'advance' ? 'bg-green-500' :
                            log.decision === 'reject'  ? 'bg-red-500' :
                            log.decision === 'hold'    ? 'bg-amber-500' : 'bg-slate-300'
                          }`} />
                          <span className="text-slate-600">
                            <span className="font-medium">[{log.stage}]</span>{' '}
                            <span className={log.decision === 'advance' ? 'text-green-600' : log.decision === 'reject' ? 'text-red-600' : 'text-amber-600'}>
                              {log.decision}
                            </span>{' '}— {log.reason}
                            <span className="text-slate-400 ml-1">{log.by} · {log.at}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Disabled External Actions from data */}
                <div className="border-t border-slate-100 pt-4">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    外部动作（canonical disabled_external_actions · state=&apos;blocked&apos;）
                  </h3>
                  <div className="flex gap-2 flex-wrap">
                    {cand.disabled_external_actions.map((a, i) => (
                      <BlockedActionButton key={i} action={a} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
