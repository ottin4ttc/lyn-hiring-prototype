'use client';
/**
 * Workbench 3: Candidate Evidence Panel
 * Interactive: approve / hold / reject evidence, decision_log留痕
 */
import { MOCK_CASES } from '@/data/mock-cases';
import { useSimulator } from '@/hooks/useSimulator';
import { Nav } from '@/components/Nav';
import { StageBadge } from '@/components/StageBadge';

export default function EvidencePanel() {
  const { cases, approveReview, rejectReview, blockStage } = useSimulator(MOCK_CASES);

  const allCandidates = cases.flatMap(c =>
    c.candidates.map(cand => ({ ...cand, caseId: c.id, caseTitle: c.title, caseRole: c.role }))
  );

  return (
    <>
      <Nav />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Candidate Evidence Panel</h1>
          <p className="text-slate-500 text-sm mt-1">工作台 3 / 5 · 证据审核 — 批准/Hold/拒绝，决策留痕</p>
        </div>

        <div className="space-y-8">
          {allCandidates.map(cand => (
            <div key={cand.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {/* Header */}
              <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
                <div className="flex flex-wrap items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <h2 className="text-lg font-bold text-slate-900 font-mono">{cand.code}</h2>
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                        cand.privacy_status === 'no_real_pii' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {cand.privacy_status}
                      </span>
                      <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">
                        synthetic={String(cand.synthetic)} · pii={String(cand.pii_fields_present)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500">{cand.caseRole} · {cand.caseTitle}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-black text-blue-600">{cand.fit_score || '—'}</div>
                    <div className="text-xs text-slate-400">Fit Score</div>
                    <div className="mt-1"><StageBadge stage={cand.current_stage} /></div>
                  </div>
                </div>
              </div>

              <div className="p-6 grid md:grid-cols-2 gap-6">
                {/* Score Breakdown */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">评分维度</h3>
                  {Object.entries(cand.score_breakdown).map(([k, v]) => (
                    <div key={k} className="flex items-center gap-2 text-xs mb-2">
                      <span className="text-slate-400 w-24 shrink-0">{
                        k === 'technical' ? '技术深度' :
                        k === 'leadership' ? '领导力' :
                        k === 'culture_fit' ? '文化契合' : '成长潜力'
                      }</span>
                      <div className="flex-1 bg-slate-100 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${v}%` }} />
                      </div>
                      <span className="text-slate-500 w-6 text-right">{v}</span>
                    </div>
                  ))}
                </div>

                {/* Evidence Refs */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">证据参考 ({cand.evidence_refs.length})</h3>
                  {cand.evidence_refs.length === 0
                    ? <p className="text-xs text-slate-400">暂无证据记录</p>
                    : <div className="space-y-2">
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
                  }
                </div>

                {/* Risk Flags */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">风险标记</h3>
                  {cand.risk_flags.length === 0
                    ? <p className="text-xs text-green-600">✓ 无风险标记</p>
                    : <div className="space-y-2">
                        {cand.risk_flags.map((rf, i) => (
                          <div key={i} className={`rounded-lg p-3 border ${
                            rf.level === 'high'   ? 'bg-red-50 border-red-200' :
                            rf.level === 'medium' ? 'bg-amber-50 border-amber-200' :
                            'bg-slate-50 border-slate-200'
                          }`}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-xs font-bold uppercase ${
                                rf.level === 'high' ? 'text-red-600' : rf.level === 'medium' ? 'text-amber-600' : 'text-slate-500'
                              }`}>{rf.level}</span>
                              <span className="text-xs font-medium text-slate-700">{rf.label}</span>
                            </div>
                            <p className="text-xs text-slate-500">{rf.detail}</p>
                          </div>
                        ))}
                      </div>
                  }
                </div>

                {/* Evidence Review Actions */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">证据审核操作</h3>
                  <div className="flex gap-2 flex-wrap mb-4">
                    <button
                      onClick={() => approveReview(cand.caseId, cand.id, 'REVIEWER-01')}
                      className="px-3 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                    >
                      ✓ 批准证据
                    </button>
                    <button
                      onClick={() => blockStage(cand.caseId, cand.id, '证据不足，暂缓', 'REVIEWER-01')}
                      className="px-3 py-1.5 text-xs bg-amber-500 text-white rounded hover:bg-amber-600 transition-colors"
                    >
                      ⏸ Hold
                    </button>
                    <button
                      onClick={() => rejectReview(cand.caseId, cand.id, '证据不满足推进条件', 'REVIEWER-01')}
                      className="px-3 py-1.5 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                    >
                      ✗ 拒绝/Override
                    </button>
                  </div>

                  {/* Decision Log */}
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">决策日志</h3>
                  <div className="space-y-1 max-h-36 overflow-y-auto">
                    {cand.decision_log.map((log, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                          log.decision === 'advance' ? 'bg-green-500' :
                          log.decision === 'reject'  ? 'bg-red-500' :
                          log.decision === 'hold'    ? 'bg-amber-500' : 'bg-slate-300'
                        }`} />
                        <div>
                          <span className="font-medium text-slate-700">[{log.stage}]</span>{' '}
                          <span className={
                            log.decision === 'advance' ? 'text-green-600' :
                            log.decision === 'reject'  ? 'text-red-600' :
                            log.decision === 'hold'    ? 'text-amber-600' : 'text-slate-400'
                          }>{log.decision}</span>{' '}
                          <span className="text-slate-500">— {log.reason}</span>
                          <div className="text-slate-400 mt-0.5">{log.by} · {log.at}</div>
                        </div>
                      </div>
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
