/**
 * Workbench 5: Learning Loop
 * 展示所有候选人的 learning artifact 和洞察
 */
import { MOCK_CASES } from '@/data/mock-cases';
import { Nav } from '@/components/Nav';
import { StageBadge } from '@/components/StageBadge';

export default function LearningLoop() {
  const artifacts = MOCK_CASES.flatMap((c) =>
    c.candidates
      .filter((cand) => cand.learning_artifact)
      .map((cand) => ({
        ...cand,
        artifact: cand.learning_artifact!,
        caseTitle: c.title,
        caseRole: c.role,
      }))
  );

  return (
    <>
      <Nav />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Learning Loop</h1>
          <p className="text-slate-500 text-sm mt-1">工作台 5 / 5 · Learning Artifact — 从每个 case 中提炼的招聘洞察</p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="text-3xl font-black text-slate-800">{MOCK_CASES.length}</div>
            <div className="text-sm text-slate-500 mt-1">活跃 Cases</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="text-3xl font-black text-slate-800">
              {MOCK_CASES.flatMap((c) => c.candidates).length}
            </div>
            <div className="text-sm text-slate-500 mt-1">候选人总数</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="text-3xl font-black text-green-600">{artifacts.length}</div>
            <div className="text-sm text-slate-500 mt-1">Learning Artifacts</div>
          </div>
        </div>

        {artifacts.length === 0 && (
          <div className="text-center py-16 text-slate-400">暂无 Learning Artifact</div>
        )}

        <div className="space-y-6">
          {artifacts.map((item) => (
            <div key={item.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100 px-6 py-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">
                        Learning Artifact
                      </span>
                      <span className="text-xs text-slate-400 font-mono">{item.code}</span>
                    </div>
                    <h2 className="text-sm font-semibold text-slate-800">{item.name}</h2>
                    <p className="text-xs text-slate-500 mt-0.5">{item.caseRole} · {item.caseTitle}</p>
                  </div>
                  <StageBadge stage={item.current_stage} />
                </div>
              </div>

              <div className="p-6 grid md:grid-cols-3 gap-6">
                <div className="bg-blue-50 rounded-xl p-4">
                  <div className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">💡 洞察</div>
                  <p className="text-sm text-slate-700">{item.artifact.insight}</p>
                </div>
                <div className="bg-violet-50 rounded-xl p-4">
                  <div className="text-xs font-semibold text-violet-600 uppercase tracking-wide mb-2">🔁 模式</div>
                  <p className="text-sm text-slate-700">{item.artifact.pattern}</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-4">
                  <div className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-2">✅ 建议动作</div>
                  <p className="text-sm text-slate-700">{item.artifact.suggested_action}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pattern Library */}
        <div className="mt-10">
          <h2 className="text-lg font-bold text-slate-800 mb-4">模式库（本轮 Mock）</h2>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">模式</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">来源</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">洞察</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">建议</th>
                </tr>
              </thead>
              <tbody>
                {artifacts.map((item, i) => (
                  <tr key={item.id} className={i % 2 === 0 ? '' : 'bg-slate-50/50'}>
                    <td className="px-4 py-3 font-medium text-violet-700">{item.artifact.pattern}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{item.code}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{item.artifact.insight}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{item.artifact.suggested_action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}
