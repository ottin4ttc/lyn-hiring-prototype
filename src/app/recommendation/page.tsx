/**
 * Workbench 4: Recommendation Pack
 * 展示已进入推荐阶段的候选人，外发动作已禁用
 */
import { MOCK_CASES } from '@/data/mock-cases';
import { Nav } from '@/components/Nav';
import { StageBadge } from '@/components/StageBadge';
import { BlockedAction } from '@/components/BlockedAction';

export default function RecommendationPack() {
  const recoCandidates = MOCK_CASES.flatMap((c) =>
    c.candidates
      .filter((cand) =>
        ['Recommendation Pack', 'Client Feedback', 'Learning Artifact'].includes(cand.current_stage)
      )
      .map((cand) => ({ ...cand, caseTitle: c.title, caseRole: c.role, clientCode: c.client_code }))
  );

  return (
    <>
      <Nav />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Recommendation Pack</h1>
          <p className="text-slate-500 text-sm mt-1">工作台 4 / 5 · 推荐包预览 — 所有外发动作在原型中已禁用</p>
        </div>

        {/* Disabled actions banner */}
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <h2 className="text-sm font-semibold text-red-700 mb-2">⛔ 外部动作已禁用（模拟原型边界）</h2>
          <div className="flex flex-wrap gap-2">
            <BlockedAction label="外发推荐包" />
            <BlockedAction label="发送客户邮件" />
            <BlockedAction label="飞书 Base 写入" />
            <BlockedAction label="创建外部任务" />
            <BlockedAction label="候选人触达" />
          </div>
        </div>

        {recoCandidates.length === 0 && (
          <div className="text-center py-16 text-slate-400">暂无处于推荐阶段的候选人</div>
        )}

        <div className="space-y-6">
          {recoCandidates.map((cand) => (
            <div key={cand.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100 px-6 py-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h2 className="text-lg font-bold text-slate-900">{cand.name}</h2>
                      <span className="text-xs font-mono text-slate-400 bg-white/60 px-2 py-0.5 rounded">{cand.code}</span>
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
                {/* Stage Run */}
                <div className="mb-4">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">经历阶段</h3>
                  <div className="flex flex-wrap gap-1">
                    {cand.stage_run.map((s, i) => (
                      <span key={i} className="flex items-center gap-1">
                        <StageBadge stage={s} />
                        {i < cand.stage_run.length - 1 && <span className="text-slate-300 text-xs">→</span>}
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

                {/* Simulate Actions */}
                <div className="border-t border-slate-100 pt-4">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">人工控制点</h3>
                  <div className="flex gap-2 flex-wrap">
                    <button className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                      ✓ 标记审核通过（本地）
                    </button>
                    <button className="px-3 py-1.5 text-sm bg-slate-200 text-slate-600 rounded hover:bg-slate-300 transition-colors">
                      ↩ 退回修改
                    </button>
                    <BlockedAction label="提交给客户" />
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
