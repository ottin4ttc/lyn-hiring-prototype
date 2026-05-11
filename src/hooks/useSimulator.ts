'use client';
import { useState, useCallback } from 'react';
import type { WorkflowCase, Stage, StageRunStatus, ReviewStatus, DecisionLog, StageRun } from '@/data/mock-cases';
import { STAGE_ORDER } from '@/data/mock-cases';

export function useSimulator(initialCases: WorkflowCase[]) {
  const [cases, setCases] = useState<WorkflowCase[]>(initialCases);

  const advanceStage = useCallback((caseId: string, candidateId: string, reason: string, by: string) => {
    const now = new Date().toISOString();
    setCases(prev => prev.map(c => {
      if (c.id !== caseId) return c;
      return {
        ...c,
        candidates: c.candidates.map(cand => {
          if (cand.id !== candidateId) return cand;
          const currentIdx = STAGE_ORDER.indexOf(cand.current_stage);
          if (currentIdx >= STAGE_ORDER.length - 1) return cand;
          const nextStage = STAGE_ORDER[currentIdx + 1] as Stage;
          const newDecision: DecisionLog = { stage: cand.current_stage, decision: 'advance', reason, by, at: now };
          const updatedRuns: StageRun[] = [
            ...cand.stage_runs.map(sr =>
              sr.stage === cand.current_stage
                ? { ...sr, status: 'completed' as StageRunStatus, completed_at: now, review_status: 'approved' as ReviewStatus }
                : sr
            ),
            { stage: nextStage, status: 'in_progress' as StageRunStatus, review_status: 'pending_review' as ReviewStatus, started_at: now },
          ];
          return { ...cand, current_stage: nextStage, stage_runs: updatedRuns, decision_log: [...cand.decision_log, newDecision] };
        }),
      };
    }));
  }, []);

  const returnStage = useCallback((caseId: string, candidateId: string, reason: string, by: string) => {
    const now = new Date().toISOString();
    setCases(prev => prev.map(c => {
      if (c.id !== caseId) return c;
      return {
        ...c,
        candidates: c.candidates.map(cand => {
          if (cand.id !== candidateId) return cand;
          const currentIdx = STAGE_ORDER.indexOf(cand.current_stage);
          if (currentIdx <= 0) return cand;
          const prevStage = STAGE_ORDER[currentIdx - 1] as Stage;
          const newDecision: DecisionLog = { stage: cand.current_stage, decision: 'reject', reason: `[RETURNED] ${reason}`, by, at: now };
          return {
            ...cand,
            current_stage: prevStage,
            stage_runs: cand.stage_runs.map(sr =>
              sr.stage === cand.current_stage
                ? { ...sr, status: 'returned' as StageRunStatus, completed_at: now, review_status: 'returned' as ReviewStatus }
                : sr
            ),
            decision_log: [...cand.decision_log, newDecision],
          };
        }),
      };
    }));
  }, []);

  const blockStage = useCallback((caseId: string, candidateId: string, reason: string, by: string) => {
    const now = new Date().toISOString();
    setCases(prev => prev.map(c => {
      if (c.id !== caseId) return c;
      return {
        ...c,
        current_state: 'blocked' as StageRunStatus,
        candidates: c.candidates.map(cand => {
          if (cand.id !== candidateId) return cand;
          const newDecision: DecisionLog = { stage: cand.current_stage, decision: 'hold', reason: `[BLOCKED] ${reason}`, by, at: now };
          return {
            ...cand,
            stage_runs: cand.stage_runs.map(sr =>
              sr.stage === cand.current_stage ? { ...sr, status: 'blocked' as StageRunStatus, notes: reason } : sr
            ),
            decision_log: [...cand.decision_log, newDecision],
          };
        }),
      };
    }));
  }, []);

  const approveReview = useCallback((caseId: string, candidateId: string, by: string) => {
    const now = new Date().toISOString();
    setCases(prev => prev.map(c => {
      if (c.id !== caseId) return c;
      return {
        ...c,
        review_status: 'approved' as ReviewStatus,
        candidates: c.candidates.map(cand => {
          if (cand.id !== candidateId) return cand;
          const newDecision: DecisionLog = { stage: cand.current_stage, decision: 'advance', reason: '[APPROVED] 审核通过', by, at: now };
          return {
            ...cand,
            stage_runs: cand.stage_runs.map(sr =>
              sr.stage === cand.current_stage
                ? { ...sr, review_status: 'approved' as ReviewStatus, reviewer: by, completed_at: now }
                : sr
            ),
            decision_log: [...cand.decision_log, newDecision],
          };
        }),
      };
    }));
  }, []);

  const rejectReview = useCallback((caseId: string, candidateId: string, reason: string, by: string) => {
    const now = new Date().toISOString();
    setCases(prev => prev.map(c => {
      if (c.id !== caseId) return c;
      return {
        ...c,
        review_status: 'returned' as ReviewStatus,
        candidates: c.candidates.map(cand => {
          if (cand.id !== candidateId) return cand;
          const newDecision: DecisionLog = { stage: cand.current_stage, decision: 'reject', reason: `[REJECTED] ${reason}`, by, at: now };
          return {
            ...cand,
            stage_runs: cand.stage_runs.map(sr =>
              sr.stage === cand.current_stage
                ? { ...sr, review_status: 'rejected' as ReviewStatus, reviewer: by, completed_at: now }
                : sr
            ),
            decision_log: [...cand.decision_log, newDecision],
          };
        }),
      };
    }));
  }, []);

  return { cases, advanceStage, returnStage, blockStage, approveReview, rejectReview };
}
