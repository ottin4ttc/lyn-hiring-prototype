'use client';
/**
 * Workbench 5: Learning Loop
 * Interactive: add mock_feedback with decision_delta, source_stage_run_ids, decision_log_refs
 */
import { MOCK_CASES } from '@/data/mock-cases';
import { Nav } from '@/components/Nav';
import { StageBadge } from '@/components/StageBadge';
import { useState } from 'react';
import type { MockFeedback, WorkflowCase } from '@/data/mock-cases';

function FeedbackChain({ feedbacks }: { feedbacks: MockFeedback[] }) {
  if (feedbacks.length === 0) return <p className="text-xs text-slate-400">暂无反馈记录</p>;
  return (
    <div className="space-y-2">
      {feedbacks.map((fb, i) => (
        <div key={fb.id || i} className="bg-white border border-slate-200 rounded-lg p-3 text-xs">
          <div className="flex items-start justify-between mb-1">
            <span className="font-mono text-slate-400">{fb.id}</span>
            <span className="text-slate-400">{fb.submitted_by} · {fb.submitted_at}</span>
          </div>
          <p className="text-slate-700 mb-2">{fb.feedback_text}</p>
          <div className="bg-amber-50 border border-amber-100 rounded p-2 mb-2">
            <span className="text-amber-700 font-semibold">decision_delta: </span>
            <span className="text-amber-800">{fb.decision_delta}</span>
          </div>
          {fb.source_stage_run_ids.length > 0 && (
            <div className="text-slate-400">
              <span className="font-medium">source_stage_run_ids: </span>
              {fb.source_stage_run_ids.join(', ')}
            </div>
          )}
          {fb.decision_log_refs.length > 0 && (
            <div className="text-slate-400">
              <span className="font-medium">decision_log_refs: </span>
              {fb.decision_log_refs.join(', ')}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function FeedbackForm({ onSubmit }: { onSubmit: (fb: MockFeedback) => void }) {
  const [text, setText] = useState('');
  const [delta, setDelta] = useState('');
  const [stageRunIds, setStageRunIds] = useState('');
  const [logRefs, setLogRefs] = useState('');

  const handleSubmit = () => {
    if (!text.trim() || !delta.trim()) return;
    const fb: MockFeedback = {
      id: `fb-local-${Date.now()}`,
      feedback_text: text,
      decision_delta: delta,
      source_stage_run_ids: stageRunIds.split(',').map(s => s.trim()).filter(Boolean),
      decision_log_refs: logRefs.split(',').map(s => s.trim()).filter(Boolean),
      submitted_at: new Date().toISOString(),
      submitted_by: 'SIM-USER',
    };
    onSubmit(fb);
    setText(''); setDelta(''); setStageRunIds(''); setLogRefs('');
  };

  return (
    <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
      <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">提交新反馈（本地模拟）</h4>
      <div>
        <label className="text-xs text-slate-500 block mb-1">feedback_text *</label>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={2}
          className="w-full text-xs border border-slate-200 rounded p-2 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
          placeholder="描述本次招聘流程的观察..."
        />
      </div>
      <div>
        <label className="text-xs text-slate-500 block mb-1">decision_delta * （流程改进建议）</label>
        <input
          value={delta}
          onChange={e => setDelta(e.target.value)}
          className="w-full text-xs border border-slate-200 rounded p-2 focus:outline-none focus:ring-1 focus:ring-blue-400"
          placeholder="例：将背调提前到 Shortlist 阶段并行"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-500 block mb-1">source_stage_run_ids（逗号分隔）</label>
          <input
            value={stageRunIds}
            onChange={e => setStageRunIds(e.target.value)}
            className="w-full text-xs border border-slate-200 rounded p-2 focus:outline-none focus:ring-1 focus:ring-blue-400"
            placeholder="stage-run-001, stage-run-002"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">decision_log_refs（逗号分隔）</label>
          <input
            value={logRefs}
            onChange={e => setLogRefs(e.target.value)}
            className="w-full text-xs border border-slate-200 rounded p-2 focus:outline-none focus:ring-1 focus:ring-blue-400"
            placeholder="2024-03-10, 2024-03-18"
          />
        </div>
      </div>
      <button
        onClick={handleSubmit}
        disabled={!text.trim() || !delta.trim()}
        className="px-4 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-slate-200 disabled:text-slate-400 transition-colors"
      >
        提交反馈
      </button>
    </div>
  );
}

type ArtifactItem = {
  cand: WorkflowCase['candidates'][0];
  caseTitle: string;
  caseRole: string;
  feedbacks: MockFeedback[];
};

export default function LearningLoop() {
  const [allFeedbacks, setAllFeedbacks] = useState<Record<string, MockFeedback[]>>(() => {
    const init: Record<string, MockFeedback[]> = {};
    MOCK_CASES.forEach(c => {
      c.candidates.forEach(cand => {
        if (cand.learning_artifact) {
          init[cand.id] = [...cand.learning_artifact.mock_feedbacks];
        }
      });
    });
    return init;
  });

  const artifacts: ArtifactItem[] = MOCK_CASES.flatMap(c =>
    c.candidates
      .filter(cand => cand.learning_artifact)
      .map(cand => ({
        cand,
        caseTitle: c.title,
        caseRole: c.role,
        feedbacks: allFeedbacks[cand.id] ?? [],
      }))
  );

  const addFeedback = (candId: string, fb: MockFeedback) => {
    setAllFeedbacks(prev => ({ ...prev, [candId]: [...(prev[candId] ?? []), fb] }));
  };

  return (
    <>
      <Nav />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Learning Loop</h1>
          <p className="text-slate-500 text-sm mt-1">工作台 5 / 5 · Learning Artifact + mock_feedback 反馈沉淀链路</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="text-3xl font-black text-slate-800">{MOCK_CASES.length}</div>
            <div className="text-sm text-slate-500 mt-1">总 Cases</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="text-3xl font-black text-slate-800">
              {MOCK_CASES.flatMap(c => c.candidates).length}
            </div>
            <div className="text-sm text-slate-500 mt-1">候选人总数</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="text-3xl font-black text-green-600">{artifacts.length}</div>
            <div className="text-sm text-slate-500 mt-1">Learning Artifacts</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="text-3xl font-black text-blue-600">
              {Object.values(allFeedbacks).reduce((sum, arr) => sum + arr.length, 0)}
            </div>
            <div className="text-sm text-slate-500 mt-1">累计反馈</div>
          </div>
        </div>

        {artifacts.length === 0 && (
          <div className="text-center py-16 text-slate-400">暂无 Learning Artifact</div>
        )}

        <div className="space-y-8">
          {artifacts.map(({ cand, caseTitle, caseRole, feedbacks }) => {
            const art = cand.learning_artifact!;
            return (
              <div key={cand.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100 px-6 py-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">
                          Learning Artifact
                        </span>
                        <span className="text-xs text-slate-400 font-mono">{cand.code}</span>
                        <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">
                          {art.learning_type}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-slate-800">{caseRole} · {caseTitle}</p>
                    </div>
                    <StageBadge stage={cand.current_stage} />
                  </div>
                </div>

                <div className="p-6">
                  {/* Artifact Fields */}
                  <div className="grid md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-blue-50 rounded-xl p-4">
                      <div className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">💡 洞察</div>
                      <p className="text-sm text-slate-700">{art.insight}</p>
                    </div>
                    <div className="bg-violet-50 rounded-xl p-4">
                      <div className="text-xs font-semibold text-violet-600 uppercase tracking-wide mb-2">🔁 模式</div>
                      <p className="text-sm text-slate-700">{art.pattern}</p>
                    </div>
                    <div className="bg-amber-50 rounded-xl p-4">
                      <div className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-2">✅ 建议动作</div>
                      <p className="text-sm text-slate-700">{art.suggested_action}</p>
                    </div>
                  </div>

                  {/* Automation Opportunity */}
                  <div className="bg-slate-50 rounded-lg p-3 mb-6 text-xs">
                    <span className="font-semibold text-slate-600">automation_opportunity: </span>
                    <span className="text-slate-700">{art.automation_opportunity}</span>
                  </div>

                  {/* Feedback Chain */}
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-slate-700 mb-3">
                      mock_feedback 反馈链路 ({feedbacks.length})
                    </h3>
                    <FeedbackChain feedbacks={feedbacks} />
                  </div>

                  {/* Add Feedback Form */}
                  <FeedbackForm onSubmit={(fb) => addFeedback(cand.id, fb)} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Pattern Library */}
        {artifacts.length > 0 && (
          <div className="mt-10">
            <h2 className="text-lg font-bold text-slate-800 mb-4">模式库</h2>
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">模式</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">类型</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">来源</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">洞察</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">反馈数</th>
                  </tr>
                </thead>
                <tbody>
                  {artifacts.map(({ cand, feedbacks }, i) => (
                    <tr key={cand.id} className={i % 2 === 0 ? '' : 'bg-slate-50/50'}>
                      <td className="px-4 py-3 font-medium text-violet-700">{cand.learning_artifact!.pattern}</td>
                      <td className="px-4 py-3 text-xs text-blue-600">{cand.learning_artifact!.learning_type}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs font-mono">{cand.code}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{cand.learning_artifact!.insight}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">
                          {feedbacks.length}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
