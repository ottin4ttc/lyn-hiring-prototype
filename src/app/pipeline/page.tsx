/**
 * Workbench 2: Pipeline Board
 * 看板式展示所有候选人所处阶段
 */
import { MOCK_CASES, STAGE_ORDER, type Candidate, type Stage } from '@/data/mock-cases';
import { Nav } from '@/components/Nav';
import { StageBadge } from '@/components/StageBadge';
import Link from 'next/link';

function ScoreBar({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-slate-400 w-20 shrink-0">{label}</span>
      <div className="flex-1 bg-slate-100 rounded-full h-1.5">
        <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${value}%` }} />
      </div>
      <span className="text-slate-500 w-6 text-right">{value}</span>
    </div>
  );
}

export default function PipelineBoard() {
  // flatten all candidates across all cases
  const allCandidates: Array<{ candidate: Candidate; caseTitle: string; caseId: string }> = [];
  MOCK_CASES.forEach((c) => {
    c.candidates.forEach((cand) => {
      allCandidates.push({ candidate: cand, caseTitle: c.title, caseId: c.id });
    });
  });

  const byStage: Record<Stage, typeof allCandidates> = {} as Record<Stage, typeof allCandidates>;
  STAGE_ORDER.forEach((s) => { byStage[s] = []; });
  allCandidates.forEach((item) => {
    byStage[item.candidate.current_stage].push(item);
  });

  return (
    <>
      <Nav />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Pipeline Board</h1>
          <p className="text-slate-500 text-sm mt-1">工作台 2 / 5 · 看板视图 — 候选人阶段分布</p>
        </div>

        <div className="overflow-x-auto">
          <div className="flex gap-4 min-w-max pb-4">
            {STAGE_ORDER.map((stage) => (
              <div key={stage} className="w-64 shrink-0">
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                    <StageBadge stage={stage} />
                    <span className="text-xs text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">
                      {byStage[stage].length}
                    </span>
                  </div>
                  <div className="p-3 space-y-3">
                    {byStage[stage].length === 0 && (
                      <p className="text-xs text-slate-300 text-center py-4">—</p>
                    )}
                    {byStage[stage].map(({ candidate, caseTitle }) => (
                      <div key={candidate.id} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-slate-700">{candidate.name}</span>
                          <span className="text-xs text-slate-400">{candidate.code}</span>
                        </div>
                        <p className="text-xs text-slate-400 mb-2 truncate">{caseTitle}</p>
                        <div className="flex items-center gap-1 mb-2">
                          <span className="text-xs text-slate-500">Fit:</span>
                          <span className={`text-xs font-bold ${
                            candidate.fit_score >= 85 ? 'text-green-600' :
                            candidate.fit_score >= 70 ? 'text-amber-600' : 'text-red-500'
                          }`}>
                            {candidate.fit_score}
                          </span>
                        </div>
                        <ScoreBar value={candidate.score_breakdown.technical} label="Tech" />
                        <ScoreBar value={candidate.score_breakdown.leadership} label="Lead" />
                        <div className="mt-2">
                          <Link
                            href={`/evidence?cand=${candidate.id}`}
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            查看证据 →
                          </Link>
                        </div>
                        {candidate.risk_flags.length > 0 && (
                          <div className="mt-2 flex gap-1 flex-wrap">
                            {candidate.risk_flags.map((rf, i) => (
                              <span key={i} className={`text-xs px-1.5 py-0.5 rounded ${
                                rf.level === 'high' ? 'bg-red-100 text-red-600' :
                                rf.level === 'medium' ? 'bg-amber-100 text-amber-600' :
                                'bg-slate-100 text-slate-500'
                              }`}>
                                ⚑ {rf.label}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
