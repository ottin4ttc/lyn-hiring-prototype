'use client';

/**
 * Workbench 4: Recommendation Pack
 * Interactive: mark approved / return with actual onClick handlers updating local state.
 * Blocked external actions bound to canonical disabled_external_action data.
 *
 * Fix: CandidateCard is extracted as a module-level component (not inline)
 * to prevent React from remounting it on every parent render — which previously
 * caused the returned-queue section to flicker or disappear after interaction.
 * After clicking "Return for Revision", the candidate immediately appears in the
 * "Returned Pack Queue" section and remains visible with full decision_log and reason.
 */

import { useState, useCallback } from 'react';
import { useSimulator } from '@/hooks/useSimulator';
import { REVIEW_STATUS_LABELS } from '@/data/mock-cases';
import { Nav } from '@/components/Nav';
import { StageBadge } from '@/components/StageBadge';
import { BlockedAction } from '@/components/BlockedAction';
import type { HiringCase, WorkflowCaseState } from '@/data/mock-cases';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PackDecisionEntry {
  id: string;
  candidateId: string;
  caseId: string;
  packId?: string;
  action: 'approved' | 'returned';
  reason: string;
  at: string;
  review_status_snapshot: string;
}

type CandWithMeta = {
  id: string;
  code: string;
  fit_score: number;
  score_breakdown: { technical: number; leadership: number; culture_fit: number; growth_potential: number };
  stage_run: Array<{ stage: string; status: string; review_status: string; started_at: string; completed_at?: string; reviewer?: string }>;
  decision_log: Array<{ stage: string; decision: string; reason: string; by: string; at: string }>;
  evidence_refs: Array<{ type: string; label: string; summary: string }>;
  risk_flags: Array<{ level: string; label: string; detail: string }>;
  disabled_external_actions: Array<{ action_type: string; state: string; label: string; reason: string }>;
  recommendation_pack_id?: string;
  caseTitle: string;
  caseRole: string;
  clientCode: string;
  caseId: string;
  caseState: WorkflowCaseState;
  caseDecisionDelta?: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildCandList(cases: HiringCase[]): CandWithMeta[] {
  return cases.flatMap((c) =>
    c.candidates
      .filter((cand) => {
        const lastStage = cand.stage_run.at(-1)?.stage;
        const lastStatus = cand.stage_run.at(-1)?.status;
        // Include candidates at recommendation stages OR returned/rejected at any pack-related stage
        const atPackStage = lastStage && ['Recommendation Pack', 'Client Feedback', 'Learning Artifact'].includes(lastStage);
        const isReturnedFromPack = lastStatus === 'returned' || cand.stage_run.some(
          (sr) => sr.stage === 'Recommendation Pack' && (sr.status === 'returned' || sr.review_status === 'rejected')
        );
        return atPackStage || isReturnedFromPack;
      })
      .map((cand) => ({
        ...cand,
        caseTitle: c.title,
        caseRole: c.role,
        clientCode: c.client_code,
        caseId: c.id,
        caseState: c.current_state,
        caseDecisionDelta: c.decision_delta,
      }))
  );
}

// ── CandidateCard (module-level, not inline) ──────────────────────────────────
// Must be defined outside RecommendationPack to prevent React from treating it
// as a new component type on every parent render, which would cause remounting
// and loss of section state.

interface CandidateCardProps {
  cand: CandWithMeta;
  packDecisions: PackDecisionEntry[];
  reasonInputs: Record<string, string>;
  onSetReason: (key: string, val: string) => void;
  onAddDecision: (
    candidateId: string,
    caseId: string,
    packId: string | undefined,
    action: 'approved' | 'returned',
    reason: string,
    reviewStatusSnapshot: string,
  ) => void;
}

function getEffectiveStatusForCand(
  cand: CandWithMeta,
  packDecisions: PackDecisionEntry[],
): 'active' | 'returned' | 'approved' {
  const decisions = packDecisions.filter((d) => d.candidateId === cand.id);
  if (decisions.length > 0) {
    const latest = decisions[decisions.length - 1];
    return latest.action === 'returned' ? 'returned' : 'approved';
  }
  // Fall back to seed data status
  const lastStageRun = cand.stage_run.at(-1);
  if (lastStageRun?.status === 'returned' || lastStageRun?.review_status === 'rejected') return 'returned';
  return 'active';
}

function CandidateCard({
  cand,
  packDecisions,
  reasonInputs,
  onSetReason,
  onAddDecision,
}: CandidateCardProps) {
  const lastRun = cand.stage_run.at(-1);
  const reviewInfo = lastRun ? REVIEW_STATUS_LABELS[lastRun.review_status as keyof typeof REVIEW_STATUS_LABELS] : null;
  const candPackDecisions = packDecisions.filter((d) => d.candidateId === cand.id);
  const latestDecision = candPackDecisions.length > 0 ? candPackDecisions[candPackDecisions.length - 1] : undefined;
  const reasonKey = `rpack-${cand.id}`;
  const effectiveStatus = getEffectiveStatusForCand(cand, packDecisions);

  // Returned reason: local decision first, then seed data (case-level decision_delta or last decision_log return entry)
  const returnedReason = latestDecision?.reason
    ?? cand.caseDecisionDelta
    ?? cand.decision_log.find((d) => d.decision === 'return')?.reason
    ?? '推荐包已退回';

  return (
    <div className={`bg-white rounded-xl border overflow-hidden ${
      effectiveStatus === 'returned' ? 'border-orange-300' :
      effectiveStatus === 'approved' ? 'border-green-300' :
      'border-slate-200'
    }`}>
      {/* Returned Banner — always visible when status is returned */}
      {effectiveStatus === 'returned' && (
        <div className="bg-orange-50 border-b border-orange-200 px-6 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <span className="text-orange-700 font-semibold text-sm block mb-1">↩ [RETURNED] 推荐包需修订</span>
              <span className="text-orange-600 text-xs block">原因: {returnedReason}</span>
              {cand.caseState && (
                <span className="text-orange-400 text-xs block mt-0.5">case_state: {cand.caseState}</span>
              )}
            </div>
            {latestDecision && (
              <span className="text-orange-400 text-xs shrink-0">{new Date(latestDecision.at).toLocaleString()}</span>
            )}
          </div>
          {/* Return decision_log entries */}
          {cand.decision_log.filter((d) => d.decision === 'return').map((log, i) => (
            <div key={i} className="mt-2 bg-orange-100 rounded px-2 py-1 text-xs text-orange-700">
              <span className="font-medium">[{log.stage}] {log.decision}</span> — {log.reason}
              <span className="text-orange-400 ml-1">({log.by} · {log.at})</span>
            </div>
          ))}
        </div>
      )}

      {/* Approved Banner */}
      {effectiveStatus === 'approved' && latestDecision && (
        <div className="bg-green-50 border-b border-green-200 px-6 py-2 flex items-center gap-3">
          <span className="text-green-700 font-semibold text-sm">✓ [APPROVED] 已标记通过</span>
          <span className="text-green-600 text-xs">reason: {latestDecision.reason}</span>
          <span className="text-green-400 text-xs ml-auto">{new Date(latestDecision.at).toLocaleString()}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100 px-6 py-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h2 className="text-lg font-bold text-slate-900 font-mono">{cand.code}</h2>
              {cand.recommendation_pack_id && (
                <span className="text-xs font-mono text-slate-400 bg-white/60 px-2 py-0.5 rounded border border-slate-200">
                  {cand.recommendation_pack_id}
                </span>
              )}
              {reviewInfo && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${reviewInfo.color}`}>
                  {reviewInfo.label}
                </span>
              )}
              <span className="text-xs text-slate-400 bg-white/60 px-2 py-0.5 rounded border border-slate-200">
                {cand.caseState}
              </span>
            </div>
            <p className="text-sm text-slate-600">{cand.caseRole} · {cand.caseTitle}</p>
            <p className="text-xs text-slate-400 mt-1">Client: {cand.clientCode}</p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-black text-orange-500">
              {cand.fit_score === 0 ? '—' : cand.fit_score}
            </div>
            <div className="text-xs text-slate-400 mb-1">Composite Fit</div>
            {lastRun && <StageBadge stage={lastRun.stage as Parameters<typeof StageBadge>[0]['stage']} />}
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Stage Run */}
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Stage History</h3>
          <div className="flex flex-wrap gap-1">
            {cand.stage_run.map((sr, i) => (
              <span key={i} className="flex items-center gap-1">
                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                  sr.status === 'completed' ? 'bg-green-100 text-green-700' :
                  sr.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                  sr.status === 'blocked' ? 'bg-red-100 text-red-700' :
                  sr.status === 'returned' ? 'bg-orange-100 text-orange-700' :
                  'bg-slate-100 text-slate-500'
                }`}>
                  {sr.stage}
                </span>
                {/* show review_status for returned/rejected stages */}
                {(sr.status === 'returned' || sr.review_status === 'rejected') && (
                  <span className="text-xs text-orange-500 font-mono">({sr.review_status})</span>
                )}
                {i < cand.stage_run.length - 1 && <span className="text-slate-300 text-xs">›</span>}
              </span>
            ))}
          </div>
        </div>

        {/* Score Summary */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {Object.entries(cand.score_breakdown).map(([k, v]) => (
            <div key={k} className="bg-slate-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-slate-700">{v === 0 ? '—' : v}</div>
              <div className="text-xs text-slate-400 mt-0.5">{
                k === 'technical' ? 'Technical' :
                k === 'leadership' ? 'Leadership' :
                k === 'culture_fit' ? 'Culture Fit' : 'Growth'
              }</div>
            </div>
          ))}
        </div>

        {/* Evidence Summary */}
        {cand.evidence_refs.length > 0 && (
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Evidence Summary</h3>
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

        {/* Risk Flags */}
        {cand.risk_flags.length > 0 && (
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Risk Flags</h3>
            {cand.risk_flags.map((rf, i) => (
              <div key={i} className={`text-xs px-2 py-1.5 rounded mb-1 ${
                rf.level === 'high' ? 'bg-red-50 text-red-700' :
                rf.level === 'medium' ? 'bg-amber-50 text-amber-700' :
                'bg-slate-50 text-slate-600'
              }`}>
                <span className="font-semibold">⚑ {rf.label}:</span> {rf.detail}
              </div>
            ))}
          </div>
        )}

        {/* Full Decision Log — always visible, shows return/reject entries prominently */}
        {cand.decision_log.length > 0 && (
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Decision Log ({cand.decision_log.length} entries)
            </h3>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {cand.decision_log.map((log, i) => (
                <div key={i} className={`text-xs flex gap-2 rounded px-1.5 py-1 ${
                  log.decision === 'return' ? 'bg-orange-50 text-orange-700 border border-orange-100' :
                  log.decision === 'reject' ? 'bg-red-50 text-red-700 border border-red-100' :
                  'text-slate-600'
                }`}>
                  <span className="text-slate-300 shrink-0">•</span>
                  <span>
                    <span className="font-medium text-slate-700">[{log.stage}]</span>{' '}
                    <span className={
                      log.decision === 'advance' ? 'text-green-600 font-semibold' :
                      log.decision === 'return' ? 'text-orange-600 font-semibold' :
                      log.decision === 'reject' ? 'text-red-600 font-semibold' :
                      log.decision === 'hold' ? 'text-amber-600 font-semibold' :
                      'text-slate-500'
                    }>{log.decision}</span>
                    {' — '}{log.reason}
                    <span className="text-slate-400 ml-1">({log.by} · {log.at})</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Disabled External Actions from canonical data */}
        {cand.disabled_external_actions.length > 0 && (
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Blocked External Actions
            </h3>
            <div className="flex flex-wrap gap-2">
              {cand.disabled_external_actions.map((dea, i) => (
                <BlockedAction key={i} label={dea.label} reason={dea.reason} />
              ))}
            </div>
          </div>
        )}

        {/* Interactive Controls */}
        <div className="border-t border-slate-100 pt-4">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Human Control Point (local state)
          </h3>
          <div className="flex flex-wrap gap-2 items-center mb-3">
            <input
              type="text"
              placeholder="Decision reason (optional)"
              value={reasonInputs[reasonKey] ?? ''}
              onChange={(e) => onSetReason(reasonKey, e.target.value)}
              className="text-xs border border-slate-200 rounded px-2 py-1.5 w-52 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
            <button
              onClick={() =>
                onAddDecision(
                  cand.id,
                  cand.caseId,
                  cand.recommendation_pack_id,
                  'approved',
                  reasonInputs[reasonKey] || 'Pack marked as reviewed and approved',
                  lastRun?.review_status ?? 'unknown',
                )
              }
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              ✓ Mark Approved (local)
            </button>
            <button
              onClick={() =>
                onAddDecision(
                  cand.id,
                  cand.caseId,
                  cand.recommendation_pack_id,
                  'returned',
                  reasonInputs[reasonKey] || 'Pack returned for revision',
                  lastRun?.review_status ?? 'unknown',
                )
              }
              className="px-3 py-1.5 text-sm bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
            >
              ↩ Return for Revision
            </button>
            {/* Submit to client – always blocked */}
            <BlockedAction label="Submit to Client" reason="Submission to real client is disabled in prototype" />
          </div>

          {/* Pack Decision Log — always visible after first interaction */}
          {candPackDecisions.length > 0 && (
            <div className="bg-orange-50 rounded-lg p-3 border border-orange-100">
              <p className="text-xs font-semibold text-orange-700 mb-2">
                Pack Decision Log – {candPackDecisions.length} entr{candPackDecisions.length === 1 ? 'y' : 'ies'}
              </p>
              <div className="space-y-1">
                {candPackDecisions.map((entry) => (
                  <div key={entry.id} className="text-xs flex gap-2 text-slate-700 bg-white/60 rounded px-2 py-1">
                    <span className={
                      entry.action === 'approved' ? 'text-green-600 font-semibold shrink-0' : 'text-orange-600 font-semibold shrink-0'
                    }>
                      {entry.action === 'approved' ? '✓' : '↩'} {entry.action}
                    </span>
                    {entry.packId && (
                      <span className="font-mono text-slate-400">[{entry.packId}]</span>
                    )}
                    <span className="flex-1">{entry.reason}</span>
                    <span className="text-slate-400 shrink-0">
                      {new Date(entry.at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Page Component ────────────────────────────────────────────────────────────

export default function RecommendationPack() {
  const { state } = useSimulator();
  const [packDecisions, setPackDecisions] = useState<PackDecisionEntry[]>([]);
  const [reasonInputs, setReasonInputs] = useState<Record<string, string>>({});

  const allCands = buildCandList(state.cases);

  const handleSetReason = useCallback((key: string, val: string) => {
    setReasonInputs((prev) => ({ ...prev, [key]: val }));
  }, []);

  const handleAddDecision = useCallback((
    candidateId: string,
    caseId: string,
    packId: string | undefined,
    action: PackDecisionEntry['action'],
    reason: string,
    reviewStatusSnapshot: string,
  ) => {
    const entry: PackDecisionEntry = {
      id: Math.random().toString(36).slice(2, 10),
      candidateId,
      caseId,
      packId,
      action,
      reason,
      at: new Date().toISOString(),
      review_status_snapshot: reviewStatusSnapshot,
    };
    setPackDecisions((prev) => [...prev, entry]);
  }, []);

  const activeCands = allCands.filter((c) => getEffectiveStatusForCand(c, packDecisions) === 'active');
  const returnedCands = allCands.filter((c) => getEffectiveStatusForCand(c, packDecisions) === 'returned');
  const approvedCands = allCands.filter((c) => getEffectiveStatusForCand(c, packDecisions) === 'approved');

  return (
    <>
      <Nav />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Recommendation Pack</h1>
          <p className="text-slate-500 text-sm mt-1">
            Workbench 4 / 5 · Approve or return recommendation packs. Returned candidates remain visible in the revision queue.
          </p>
          <p className="text-xs text-slate-400 mt-1">
            共 {allCands.length} 个候选人 · 已退回: {returnedCands.length} · 已批准: {approvedCands.length} · 待审核: {activeCands.length}
          </p>
        </div>

        {/* Global blocked actions banner */}
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <h2 className="text-sm font-semibold text-red-700 mb-2">⛔ External Actions Disabled (Prototype Boundary)</h2>
          <p className="text-xs text-red-600 mb-3">
            All candidate outreach, client submission, and email actions are blocked in this simulation prototype.
          </p>
          <div className="flex flex-wrap gap-2">
            <BlockedAction label="Send Recommendation Pack" />
            <BlockedAction label="Send Client Email" />
            <BlockedAction label="Write to Lark Base" />
            <BlockedAction label="Create External Task" />
            <BlockedAction label="Candidate Outreach" />
          </div>
        </div>

        {/* ── Returned Pack Queue ──────────────────────────────────────────── */}
        {/* Always shown when there are returned candidates (including seed data: case-006) */}
        {returnedCands.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-base font-semibold text-orange-700">↩ Returned Pack Queue</h2>
              <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-medium">
                {returnedCands.length} candidate{returnedCands.length > 1 ? 's' : ''} need revision
              </span>
              <span className="text-xs text-slate-400">(退回原因、review_status 和 decision_log 见各卡片)</span>
            </div>
            <div className="space-y-4">
              {returnedCands.map((cand) => (
                <CandidateCard
                  key={cand.id}
                  cand={cand}
                  packDecisions={packDecisions}
                  reasonInputs={reasonInputs}
                  onSetReason={handleSetReason}
                  onAddDecision={handleAddDecision}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Approved Queue ──────────────────────────────────────────────── */}
        {approvedCands.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-base font-semibold text-green-700">✓ Approved Packs</h2>
              <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-medium">
                {approvedCands.length} approved
              </span>
            </div>
            <div className="space-y-4">
              {approvedCands.map((cand) => (
                <CandidateCard
                  key={cand.id}
                  cand={cand}
                  packDecisions={packDecisions}
                  reasonInputs={reasonInputs}
                  onSetReason={handleSetReason}
                  onAddDecision={handleAddDecision}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Active Packs (pending review) ────────────────────────────────── */}
        <div>
          {activeCands.length > 0 && (
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-base font-semibold text-slate-700">📋 Active Packs – Pending Review</h2>
              <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                {activeCands.length} pending
              </span>
            </div>
          )}
          {activeCands.length === 0 && returnedCands.length === 0 && approvedCands.length === 0 && (
            <div className="text-center py-16 text-slate-400">No candidates at recommendation stage</div>
          )}
          <div className="space-y-6">
            {activeCands.map((cand) => (
              <CandidateCard
                key={cand.id}
                cand={cand}
                packDecisions={packDecisions}
                reasonInputs={reasonInputs}
                onSetReason={handleSetReason}
                onAddDecision={handleAddDecision}
              />
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
