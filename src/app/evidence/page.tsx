/**
 * Workbench 3: Candidate Evidence Panel
 * 展示候选人证据、决策日志、风险标记
 */
import { MOCK_CASES } from '@/data/mock-cases';
import { Nav } from '@/components/Nav';
import { StageBadge } from '@/components/StageBadge';

function ScoreRadar({ breakdown }: { breakdown: { technical: number; leadership: number; culture_fit: number; growth_potential: number } }) {
  const dims = [
    { key: 'technical', label: '技术深度', value: breakdown.technical },
    { key: 'leadership', label: '领导力', value: breakdown.leadership },
    { key: 'culture_fit', label: '文化契合', value: breakdown.culture_fit },
    { key: 'growth_potential', label: '成长潜力', value: breakdown.growth_potential },
  ];
  return (
    <div className="grid grid-cols-2 gap-3">
      {dims.map((d) => (
        <div key={d.key} className="bg-slate-50 rounded-lg p-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-600">{d.label}</span>
            <span className={`font-bold ${d.value >= 85 ? 'text-green-600' : d.value >= 70 ? 'text-amber-600' : 'text-red-500'}`}>{d.value}</span>
          </div>
          <div className="bg-slate-200 rounded-full h-2">
            <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${d.value}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function EvidencePanel() {
  const allCandidates = MOCK_CASES.flatMap((c) =>
    c.candidates.map((cand) => ({ ...cand, caseTitle: c.title, caseRole: c.role }))
  );

  return (
    <>
      <Nav />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Candidate Evidence Panel</h1>
          <p className="text-slate-500 text-sm mt-1">工作台 3 / 5 · 候选人证据、评分维度、决策日志、风险标记</p>
        </div>

        <div className="space-y-8">
          {allCandidates.map((cand) => (
            <div key={cand.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {/* Header */}
              <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
                <div className="flex flex-wrap items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h2 className="text-lg font-bold text-slate-900">{cand.name}</h2>
                      <span className="text-xs text-slate-400 font-mono bg-slate-100 px-2 py-0.5 rounded">{cand.code}</span>
                    </div>
                    <p className="text-sm text-slate-500">{cand.caseRole} · {cand.caseTitle}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-black text-blue-600">{cand.fit_score}</div>
                    <div className="text-xs text-slate-400">Fit Score</div>
                    <div className="mt-1"><StageBadge stage={cand.current_stage} /></div>
                  </div>
                </div>
              </div>

              <div className="p-6 grid md:grid-cols-2 gap-6">
                {/* Score Breakdown */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">评分维度</h3>
                  <ScoreRadar breakdown={cand.score_breakdown} />
                </div>

                {/* Evidence Refs */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">证据参考 ({cand.evidence_refs.length})</h3>
                  {cand.evidence_refs.length === 0 && (
                    <p className="text-xs text-slate-400">暂无证据记录</p>
                  )}
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
                </div>

                {/* Decision Log */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">决策日志</h3>
                  <div className="space-y-2">
                    {cand.decision_log.map((log, i) => (
                      <div key={i} className="flex items-start gap-3 text-xs">
                        <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                          log.decision === 'advance' ? 'bg-green-500' :
                          log.decision === 'reject' ? 'bg-red-500' :
                          log.decision === 'hold' ? 'bg-amber-500' :
                          'bg-slate-300'
                        }`} />
                        <div>
                          <span className="font-medium text-slate-700">[{log.stage}]</span>{' '}
                          <span className={`${
                            log.decision === 'advance' ? 'text-green-600' :
                            log.decision === 'reject' ? 'text-red-600' :
                            log.decision === 'hold' ? 'text-amber-600' :
                            'text-slate-400'
                          }`}>{log.decision}</span>{' '}
                          <span className="text-slate-500">— {log.reason}</span>
                          <div className="text-slate-400 mt-0.5">{log.by} · {log.at}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Risk Flags */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">风险标记</h3>
                  {cand.risk_flags.length === 0 ? (
                    <p className="text-xs text-green-600">✓ 无风险标记</p>
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
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
