'use client';

/**
 * Workbench 5: Learning Loop
 * Interactive: add mock_feedback with decision_delta, sourced from stage_run_ids and decision_log_refs.
 * Shows full feedback chain (local state only).
 */

import { useState } from 'react';
import { useSimulator } from '@/hooks/useSimulator';
import type { MockFeedback } from '@/data/mock-cases';
import { Nav } from '@/components/Nav';
import { StageBadge } from '@/components/StageBadge';

export default function LearningLoop() {
  const { state, addFeedback } = useSimulator();
  const [feedbackForms, setFeedbackForms] = useState<Record<string, {
    source: string;
    content: string;
    decision_delta: 'positive' | 'negative' | 'neutral';
    stage_run_ids: string;
    decision_log_refs: string;
  }>>({});

  const artifacts = state.cases.flatMap((c) =>
    c.candidates
      .filter((cand) => cand.learning_artifact)
      .map((cand) => ({
        ...cand,
        artifact: cand.learning_artifact!,
        caseTitle: c.title,
        caseRole: c.role,
        caseId: c.id,
      }))
  );

  function getForm(key: string) {
    return feedbackForms[key] ?? {
      source: '',
      content: '',
      decision_delta: 'neutral' as const,
      stage_run_ids: '',
      decision_log_refs: '',
    };
  }

  function setFormField(
    key: string,
    field: string,
    value: string,
  ) {
    setFeedbackForms((prev) => ({
      ...prev,
      [key]: {
        ...getForm(key),
        [field]: value,
      },
    }));
  }

  function submitFeedback(caseId: string, candidateId: string, key: string) {
    const form = getForm(key);
    if (!form.content.trim()) return;
    const feedback: Omit<MockFeedback, 'id'> = {
      source: form.source || 'SIM-USER',
      content: form.content,
      decision_delta: form.decision_delta,
      stage_run_ids: form.stage_run_ids ? form.stage_run_ids.split(',').map((s) => s.trim()) : [],
      decision_log_refs: form.decision_log_refs ? form.decision_log_refs.split(',').map((s) => s.trim()) : [],
      submitted_at: new Date().toISOString(),
    };
    addFeedback(caseId, candidateId, feedback);
    // Reset form
    setFeedbackForms((prev) => ({
      ...prev,
      [key]: { source: '', content: '', decision_delta: 'neutral', stage_run_ids: '', decision_log_refs: '' },
    }));
  }

  // Gather all feedback across all candidates for the feedback chain view
  const allFeedback: Array<MockFeedback & { candidateCode: string; caseTitle: string }> = state.cases.flatMap((c) =>
    c.candidates.flatMap((cand) =>
      (cand.mock_feedback ?? []).map((fb) => ({
        ...fb,
        candidateCode: cand.code,
        caseTitle: c.title,
      }))
    )
  );

  return (
    <>
      <Nav />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Learning Loop</h1>
          <p className="text-slate-500 text-sm mt-1">
            Workbench 5 / 5 · Add mock feedback with decision_delta. Full feedback chain shown below.
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="text-3xl font-black text-slate-800">{state.cases.length}</div>
            <div className="text-sm text-slate-500 mt-1">Active Cases</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="text-3xl font-black text-slate-800">
              {state.cases.flatMap((c) => c.candidates).length}
            </div>
            <div className="text-sm text-slate-500 mt-1">Total Candidates</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="text-3xl font-black text-green-600">{artifacts.length}</div>
            <div className="text-sm text-slate-500 mt-1">Learning Artifacts</div>
          </div>
        </div>

        {artifacts.length === 0 && (
          <div className="text-center py-16 text-slate-400">No Learning Artifacts</div>
        )}

        {/* Artifacts + Feedback Add Forms */}
        <div className="space-y-6">
          {artifacts.map((item) => {
            const formKey = `fb-${item.id}`;
            const form = getForm(formKey);
            const allCandFeedback = item.mock_feedback ?? [];

            return (
              <div key={item.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100 px-6 py-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">
                          Learning Artifact
                        </span>
                        <span className="text-xs text-slate-400 font-mono">{item.code}</span>
                        {item.learning_type && (
                          <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">
                            {item.learning_type}
                          </span>
                        )}
                        {item.automation_opportunity && item.automation_opportunity !== 'none' && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                            Auto: {item.automation_opportunity}
                          </span>
                        )}
                      </div>
                      <h2 className="text-sm font-semibold text-slate-800">{item.code}</h2>
                      <p className="text-xs text-slate-500 mt-0.5">{item.caseRole} · {item.caseTitle}</p>
                    </div>
                    {item.stage_run.at(-1) && (
                      <StageBadge stage={item.stage_run.at(-1)!.stage} />
                    )}
                  </div>
                </div>

                <div className="p-6">
                  {/* Artifact Details */}
                  <div className="grid md:grid-cols-3 gap-6 mb-6">
                    <div className="bg-blue-50 rounded-xl p-4">
                      <div className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">💡 Insight</div>
                      <p className="text-sm text-slate-700">{item.artifact.insight}</p>
                    </div>
                    <div className="bg-violet-50 rounded-xl p-4">
                      <div className="text-xs font-semibold text-violet-600 uppercase tracking-wide mb-2">🔁 Pattern</div>
                      <p className="text-sm text-slate-700">{item.artifact.pattern}</p>
                    </div>
                    <div className="bg-amber-50 rounded-xl p-4">
                      <div className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-2">✅ Suggested Action</div>
                      <p className="text-sm text-slate-700">{item.artifact.suggested_action}</p>
                    </div>
                  </div>

                  {/* Existing Feedback Chain */}
                  {allCandFeedback.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-slate-700 mb-3">
                        Feedback Chain ({allCandFeedback.length})
                      </h3>
                      <div className="space-y-2">
                        {allCandFeedback.map((fb) => (
                          <div key={fb.id} className={`rounded-lg p-3 border text-xs ${
                            fb.decision_delta === 'positive' ? 'bg-green-50 border-green-200' :
                            fb.decision_delta === 'negative' ? 'bg-red-50 border-red-200' :
                            'bg-slate-50 border-slate-200'
                          }`}>
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className={`font-semibold px-1.5 py-0.5 rounded-full ${
                                fb.decision_delta === 'positive' ? 'bg-green-100 text-green-700' :
                                fb.decision_delta === 'negative' ? 'bg-red-100 text-red-700' :
                                'bg-slate-100 text-slate-600'
                              }`}>
                                {fb.decision_delta}
                              </span>
                              <span className="text-slate-500 font-medium">{fb.source}</span>
                              <span className="text-slate-400 ml-auto">
                                {new Date(fb.submitted_at).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-slate-700 mb-1">{fb.content}</p>
                            {fb.stage_run_ids.length > 0 && (
                              <p className="text-slate-400">
                                Stage run refs: {fb.stage_run_ids.join(', ')}
                              </p>
                            )}
                            {fb.decision_log_refs.length > 0 && (
                              <p className="text-slate-400">
                                Decision log refs: {fb.decision_log_refs.join(', ')}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Add Feedback Form */}
                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                    <h3 className="text-sm font-semibold text-slate-700 mb-3">Add Mock Feedback (local state)</h3>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">Source</label>
                        <input
                          type="text"
                          placeholder="e.g. RECRUITER-A"
                          value={form.source}
                          onChange={(e) => setFormField(formKey, 'source', e.target.value)}
                          className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">Decision Delta</label>
                        <select
                          value={form.decision_delta}
                          onChange={(e) => setFormField(formKey, 'decision_delta', e.target.value)}
                          className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                        >
                          <option value="positive">positive</option>
                          <option value="neutral">neutral</option>
                          <option value="negative">negative</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">Stage Run IDs (comma-separated)</label>
                        <input
                          type="text"
                          placeholder="e.g. sr-001, sr-002"
                          value={form.stage_run_ids}
                          onChange={(e) => setFormField(formKey, 'stage_run_ids', e.target.value)}
                          className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">Decision Log Refs (comma-separated)</label>
                        <input
                          type="text"
                          placeholder="e.g. dl-001, dl-002"
                          value={form.decision_log_refs}
                          onChange={(e) => setFormField(formKey, 'decision_log_refs', e.target.value)}
                          className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                        />
                      </div>
                    </div>
                    <div className="mb-3">
                      <label className="text-xs text-slate-500 mb-1 block">Feedback Content</label>
                      <textarea
                        placeholder="Enter feedback content..."
                        value={form.content}
                        onChange={(e) => setFormField(formKey, 'content', e.target.value)}
                        rows={3}
                        className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white resize-none"
                      />
                    </div>
                    <button
                      disabled={!form.content.trim()}
                      onClick={() => submitFeedback(item.caseId, item.id, formKey)}
                      className="px-4 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      + Add Feedback Entry
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Full Feedback Chain Across All Candidates */}
        <div className="mt-10">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Full Feedback Chain (All Candidates)</h2>
          {allFeedback.length === 0 ? (
            <div className="text-center py-8 text-slate-400 bg-white rounded-xl border border-slate-200">
              No feedback submitted yet
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Candidate</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Case</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Source</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Delta</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Content</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {allFeedback.map((fb, i) => (
                    <tr key={fb.id} className={i % 2 === 0 ? '' : 'bg-slate-50/50'}>
                      <td className="px-4 py-3 font-mono font-medium text-slate-700">{fb.candidateCode}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{fb.caseTitle}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{fb.source}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                          fb.decision_delta === 'positive' ? 'bg-green-100 text-green-700' :
                          fb.decision_delta === 'negative' ? 'bg-red-100 text-red-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {fb.decision_delta}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs max-w-xs truncate">{fb.content}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs">
                        {new Date(fb.submitted_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pattern Library */}
        <div className="mt-8">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Pattern Library (This Mock Run)</h2>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Pattern</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Candidate</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Insight</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Suggestion</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Automation</th>
                </tr>
              </thead>
              <tbody>
                {artifacts.map((item, i) => (
                  <tr key={item.id} className={i % 2 === 0 ? '' : 'bg-slate-50/50'}>
                    <td className="px-4 py-3 font-medium text-violet-700">{item.artifact.pattern}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs font-mono">{item.code}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{item.artifact.insight}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{item.artifact.suggested_action}</td>
                    <td className="px-4 py-3 text-xs">
                      {item.automation_opportunity && item.automation_opportunity !== 'none' ? (
                        <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                          {item.automation_opportunity}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
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
