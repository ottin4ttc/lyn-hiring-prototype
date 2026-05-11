'use client';
/**
 * Workbench 2: Pipeline Board
 * Groups cases by workflow_case.current_state; shows review_status badge per card
 */
import { MOCK_CASES } from '@/data/mock-cases';
import { useSimulator } from '@/hooks/useSimulator';
import { Nav } from '@/components/Nav';
import { StageBadge } from '@/components/StageBadge';
import { useState } from 'react';
import type { StageRunStatus, ReviewStatus, WorkflowCase } from '@/data/mock-cases';

const STATE_COLUMNS: StageRunStatus[] = [
  'in_progress', 'pending', 'needs_human_review', 'blocked', 'returned', 'completed',
];

const STATE_LABEL: Record<StageRunStatus, string> = {
  pending:            '待启动',
  in_progress:        '进行中',
  completed:          '已完成',
  blocked:            '已阻塞',
  returned:           '已退回',
  needs_human_review: '待人工审查',
};

function stateColor(s: StageRunStatus) {
  return s === 'completed'          ? 'bg-green-100 text-green-700 border-green-200'
       : s === 'in_progress'        ? 'bg-blue-100 text-blue-700 border-blue-200'
       : s === 'blocked'            ? 'bg-red-100 text-red-700 border-red-200'
       : s === 'returned'           ? 'bg-amber-100 text-amber-700 border-amber-200'
       : s === 'needs_human_review' ? 'bg-purple-100 text-purple-700 border-purple-200'
       : 'bg-slate-100 text-slate-500 border-slate-200';
}

function reviewBadge(r: ReviewStatus) {
  const cls = r === 'approved' ? 'bg-green-100 text-green-700'
            : r === 'returned' || r === 'rejected' ? 'bg-red-100 text-red-700'
            : r === 'needs_revision' ? 'bg-amber-100 text-amber-700'
            : 'bg-slate-100 text-slate-400';
  return <span className={`text-xs px-1.5 py-0.5 rounded ${cls}`}>{r}</span>;
}

function CaseCard({ wc }: { wc: WorkflowCase }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-3 text-xs">
      <div className="flex items-center justify-between mb-1 cursor-pointer" onClick={() => setOpen(o => !o)}>
        <span className="font-mono text-slate-500">{wc.identifier}</span>
        {wc.anomaly_type && (
          <span className="bg-red-50 text-red-500 px-1.5 py-0.5 rounded text-xs">⚠ {wc.anomaly_type}</span>
        )}
      </div>
      <p className="font-medium text-slate-700 leading-snug mb-1">{wc.role}</p>
      <div className="flex items-center gap-1 flex-wrap mb-1">
        <StageBadge stage={wc.current_stage} />
        {reviewBadge(wc.review_status)}
      </div>
      <p className="text-slate-400">{wc.client_code} · {wc.candidates.length} 候选人</p>

      {open && (
        <div className="mt-2 space-y-1 border-t border-slate-100 pt-2">
          {wc.candidates.map(cand => (
            <div key={cand.id} className="flex items-center gap-2">
              <span className="font-mono text-slate-600">{cand.code}</span>
              <StageBadge stage={cand.current_stage} />
              <span className={`px-1 py-0.5 rounded text-xs ${
                cand.privacy_status === 'no_real_pii' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
              }`}>{cand.privacy_status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PipelineBoard() {
  const { cases } = useSimulator(MOCK_CASES);

  const byState: Record<StageRunStatus, WorkflowCase[]> = {} as Record<StageRunStatus, WorkflowCase[]>;
  STATE_COLUMNS.forEach(s => { byState[s] = []; });
  cases.forEach(c => { byState[c.current_state]?.push(c); });

  return (
    <>
      <Nav />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Pipeline Board</h1>
          <p className="text-slate-500 text-sm mt-1">工作台 2 / 5 · 按 workflow_case.current_state 分列，含 review_status 标记</p>
        </div>

        <div className="overflow-x-auto">
          <div className="flex gap-4 min-w-max pb-4">
            {STATE_COLUMNS.map(state => (
              <div key={state} className="w-56 shrink-0">
                <div className={`rounded-xl border overflow-hidden ${stateColor(state)}`}>
                  <div className="px-3 py-2 border-b flex items-center justify-between">
                    <span className="text-xs font-semibold">{STATE_LABEL[state]}</span>
                    <span className="text-xs bg-white/60 rounded-full px-1.5 py-0.5">{byState[state].length}</span>
                  </div>
                  <div className="p-2 space-y-2 bg-white">
                    {byState[state].length === 0 && (
                      <p className="text-xs text-slate-300 text-center py-3">—</p>
                    )}
                    {byState[state].map(wc => <CaseCard key={wc.id} wc={wc} />)}
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
