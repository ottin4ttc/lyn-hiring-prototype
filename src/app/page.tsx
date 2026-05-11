/**
 * Workbench 1: Case Simulator
 * 展示所有 mock case 及状态流转概览
 */
import { MOCK_CASES, STAGE_ORDER } from '@/data/mock-cases';
import { Nav } from '@/components/Nav';
import { StageBadge } from '@/components/StageBadge';
import Link from 'next/link';

export default function CaseSimulator() {
  return (
    <>
      <Nav />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Case Simulator</h1>
          <p className="text-slate-500 text-sm mt-1">工作台 1 / 5 · 浏览所有 mock 招聘 Case 及状态流转</p>
        </div>

        {/* Stage Flow Diagram */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">状态流转</h2>
          <div className="flex flex-wrap gap-2 items-center">
            {STAGE_ORDER.map((stage, i) => (
              <span key={stage} className="flex items-center gap-2">
                <StageBadge stage={stage} />
                {i < STAGE_ORDER.length - 1 && <span className="text-slate-300">→</span>}
              </span>
            ))}
          </div>
        </div>

        {/* Cases Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {MOCK_CASES.map((c) => (
            <div key={c.id} className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  c.status === 'active' ? 'bg-green-100 text-green-700' :
                  c.status === 'closed' ? 'bg-slate-100 text-slate-500' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  {c.status}
                </span>
                <span className="text-xs text-slate-400">{c.client_code}</span>
              </div>
              <h3 className="font-semibold text-slate-800 text-sm leading-snug mb-2">{c.title}</h3>
              <p className="text-xs text-slate-500 mb-3">职位: {c.role}</p>
              <div className="mb-3">
                <span className="text-xs text-slate-400 mr-2">当前阶段:</span>
                <StageBadge stage={c.current_stage} />
              </div>
              <div className="text-xs text-slate-500">
                {c.candidates.length} 位候选人
              </div>
              <div className="mt-4 flex gap-2">
                <Link
                  href={`/pipeline?case=${c.id}`}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  查看 Pipeline →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
