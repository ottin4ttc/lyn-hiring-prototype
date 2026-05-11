'use client';

/**
 * useSimulator – local simulation state for the hiring workflow prototype.
 * All state mutations stay client-side only. No real API calls.
 */

import { useReducer, useCallback } from 'react';
import type {
  HiringCase,
  Candidate,
  Stage,
  StageRun,
  StageRunStatus,
  ReviewStatus,
  WorkflowCaseState,
  DecisionLog,
  MockFeedback,
} from '@/data/mock-cases';
import { MOCK_CASES, STAGE_ORDER } from '@/data/mock-cases';

// ── State ─────────────────────────────────────────────────────────────────────

export interface SimDecisionEntry {
  id: string;
  caseId: string;
  candidateId: string;
  stage: Stage;
  action: 'advance' | 'return' | 'block' | 'approve' | 'reject' | 'hold' | 'override';
  reason: string;
  by: string;
  at: string;
}

export interface SimState {
  cases: HiringCase[];
  decisionLog: SimDecisionEntry[];
  feedbackLog: MockFeedback[];
}

// ── Actions ───────────────────────────────────────────────────────────────────

export type SimAction =
  | { type: 'ADVANCE_STAGE'; caseId: string; candidateId: string; by?: string; reason?: string }
  | { type: 'RETURN_STAGE'; caseId: string; candidateId: string; by?: string; reason?: string }
  | { type: 'BLOCK_STAGE'; caseId: string; candidateId: string; by?: string; reason?: string }
  | { type: 'APPROVE_CANDIDATE'; caseId: string; candidateId: string; by?: string; reason?: string }
  | { type: 'REJECT_CANDIDATE'; caseId: string; candidateId: string; by?: string; reason?: string }
  | { type: 'HOLD_CANDIDATE'; caseId: string; candidateId: string; by?: string; reason?: string }
  | { type: 'OVERRIDE_DECISION'; caseId: string; candidateId: string; by?: string; reason?: string }
  | {
      type: 'ADD_FEEDBACK';
      caseId: string;
      candidateId: string;
      feedback: Omit<MockFeedback, 'id'>;
    }
  | { type: 'SET_CASE_STATE'; caseId: string; newState: WorkflowCaseState };

// ── Helpers ───────────────────────────────────────────────────────────────────

function now(): string {
  return new Date().toISOString();
}

function makeId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function updateCandidate(
  cases: HiringCase[],
  caseId: string,
  candidateId: string,
  updater: (c: Candidate) => Candidate,
): HiringCase[] {
  return cases.map((c) => {
    if (c.id !== caseId) return c;
    return {
      ...c,
      candidates: c.candidates.map((cand) =>
        cand.id === candidateId ? updater(cand) : cand,
      ),
    };
  });
}

function updateCurrentStageRun(
  stageRun: StageRun[],
  status: StageRunStatus,
  review_status: ReviewStatus,
): StageRun[] {
  if (stageRun.length === 0) return stageRun;
  return stageRun.map((sr, i) =>
    i === stageRun.length - 1
      ? { ...sr, status, review_status, completed_at: status !== 'in_progress' ? now() : sr.completed_at }
      : sr,
  );
}

function advanceToNextStage(cand: Candidate): Candidate {
  const currentStage = cand.stage_run[cand.stage_run.length - 1]?.stage;
  const currentIndex = currentStage ? STAGE_ORDER.indexOf(currentStage) : -1;
  const nextStage = STAGE_ORDER[currentIndex + 1];
  if (!nextStage) return cand; // already at end

  const updatedRuns = updateCurrentStageRun(cand.stage_run, 'completed', 'approved');
  const newRun: StageRun = {
    stage: nextStage,
    status: 'in_progress',
    review_status: 'pending_review',
    started_at: now(),
  };
  return { ...cand, stage_run: [...updatedRuns, newRun] };
}

// ── Reducer ───────────────────────────────────────────────────────────────────

function reducer(state: SimState, action: SimAction): SimState {
  const ts = now();
  const actor = 'SIM-USER';

  switch (action.type) {
    case 'ADVANCE_STAGE': {
      const newEntry: SimDecisionEntry = {
        id: makeId(),
        caseId: action.caseId,
        candidateId: action.candidateId,
        stage:
          state.cases
            .find((c) => c.id === action.caseId)
            ?.candidates.find((ca) => ca.id === action.candidateId)
            ?.stage_run.at(-1)?.stage ?? 'Need',
        action: 'advance',
        reason: action.reason ?? 'Advanced via simulator',
        by: action.by ?? actor,
        at: ts,
      };
      return {
        ...state,
        cases: updateCandidate(state.cases, action.caseId, action.candidateId, (cand) =>
          advanceToNextStage(cand),
        ),
        decisionLog: [...state.decisionLog, newEntry],
      };
    }

    case 'RETURN_STAGE': {
      const newEntry: SimDecisionEntry = {
        id: makeId(),
        caseId: action.caseId,
        candidateId: action.candidateId,
        stage:
          state.cases
            .find((c) => c.id === action.caseId)
            ?.candidates.find((ca) => ca.id === action.candidateId)
            ?.stage_run.at(-1)?.stage ?? 'Need',
        action: 'return',
        reason: action.reason ?? 'Returned for revision',
        by: action.by ?? actor,
        at: ts,
      };
      return {
        ...state,
        cases: updateCandidate(state.cases, action.caseId, action.candidateId, (cand) => ({
          ...cand,
          stage_run: updateCurrentStageRun(cand.stage_run, 'returned', 'rejected'),
        })),
        decisionLog: [...state.decisionLog, newEntry],
      };
    }

    case 'BLOCK_STAGE': {
      const newEntry: SimDecisionEntry = {
        id: makeId(),
        caseId: action.caseId,
        candidateId: action.candidateId,
        stage:
          state.cases
            .find((c) => c.id === action.caseId)
            ?.candidates.find((ca) => ca.id === action.candidateId)
            ?.stage_run.at(-1)?.stage ?? 'Need',
        action: 'block',
        reason: action.reason ?? 'Stage blocked',
        by: action.by ?? actor,
        at: ts,
      };
      return {
        ...state,
        cases: updateCandidate(state.cases, action.caseId, action.candidateId, (cand) => ({
          ...cand,
          stage_run: updateCurrentStageRun(cand.stage_run, 'blocked', 'needs_human_review'),
        })),
        decisionLog: [...state.decisionLog, newEntry],
      };
    }

    case 'APPROVE_CANDIDATE': {
      const newEntry: SimDecisionEntry = {
        id: makeId(),
        caseId: action.caseId,
        candidateId: action.candidateId,
        stage:
          state.cases
            .find((c) => c.id === action.caseId)
            ?.candidates.find((ca) => ca.id === action.candidateId)
            ?.stage_run.at(-1)?.stage ?? 'Need',
        action: 'approve',
        reason: action.reason ?? 'Approved by reviewer',
        by: action.by ?? actor,
        at: ts,
      };
      return {
        ...state,
        cases: updateCandidate(state.cases, action.caseId, action.candidateId, (cand) => ({
          ...cand,
          stage_run: updateCurrentStageRun(cand.stage_run, 'completed', 'approved'),
        })),
        decisionLog: [...state.decisionLog, newEntry],
      };
    }

    case 'REJECT_CANDIDATE': {
      const newEntry: SimDecisionEntry = {
        id: makeId(),
        caseId: action.caseId,
        candidateId: action.candidateId,
        stage:
          state.cases
            .find((c) => c.id === action.caseId)
            ?.candidates.find((ca) => ca.id === action.candidateId)
            ?.stage_run.at(-1)?.stage ?? 'Need',
        action: 'reject',
        reason: action.reason ?? 'Rejected',
        by: action.by ?? actor,
        at: ts,
      };
      return {
        ...state,
        cases: updateCandidate(state.cases, action.caseId, action.candidateId, (cand) => ({
          ...cand,
          stage_run: updateCurrentStageRun(cand.stage_run, 'returned', 'rejected'),
        })),
        decisionLog: [...state.decisionLog, newEntry],
      };
    }

    case 'HOLD_CANDIDATE': {
      const newEntry: SimDecisionEntry = {
        id: makeId(),
        caseId: action.caseId,
        candidateId: action.candidateId,
        stage:
          state.cases
            .find((c) => c.id === action.caseId)
            ?.candidates.find((ca) => ca.id === action.candidateId)
            ?.stage_run.at(-1)?.stage ?? 'Need',
        action: 'hold',
        reason: action.reason ?? 'Placed on hold',
        by: action.by ?? actor,
        at: ts,
      };
      return {
        ...state,
        cases: updateCandidate(state.cases, action.caseId, action.candidateId, (cand) => ({
          ...cand,
          stage_run: updateCurrentStageRun(cand.stage_run, 'in_progress', 'pending_review'),
        })),
        decisionLog: [...state.decisionLog, newEntry],
      };
    }

    case 'OVERRIDE_DECISION': {
      const newEntry: SimDecisionEntry = {
        id: makeId(),
        caseId: action.caseId,
        candidateId: action.candidateId,
        stage:
          state.cases
            .find((c) => c.id === action.caseId)
            ?.candidates.find((ca) => ca.id === action.candidateId)
            ?.stage_run.at(-1)?.stage ?? 'Need',
        action: 'override',
        reason: action.reason ?? 'Decision overridden',
        by: action.by ?? actor,
        at: ts,
      };
      return {
        ...state,
        cases: updateCandidate(state.cases, action.caseId, action.candidateId, (cand) => ({
          ...cand,
          stage_run: updateCurrentStageRun(cand.stage_run, 'completed', 'overridden'),
        })),
        decisionLog: [...state.decisionLog, newEntry],
      };
    }

    case 'ADD_FEEDBACK': {
      const newFeedback: MockFeedback = {
        ...action.feedback,
        id: makeId(),
      };
      return {
        ...state,
        cases: updateCandidate(state.cases, action.caseId, action.candidateId, (cand) => ({
          ...cand,
          mock_feedback: [...(cand.mock_feedback ?? []), newFeedback],
        })),
        feedbackLog: [...state.feedbackLog, newFeedback],
      };
    }

    case 'SET_CASE_STATE': {
      return {
        ...state,
        cases: state.cases.map((c) =>
          c.id === action.caseId ? { ...c, current_state: action.newState } : c,
        ),
      };
    }

    default:
      return state;
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useSimulator() {
  const [state, dispatch] = useReducer(reducer, {
    cases: MOCK_CASES,
    decisionLog: [],
    feedbackLog: [],
  });

  const advanceStage = useCallback(
    (caseId: string, candidateId: string, reason?: string) =>
      dispatch({ type: 'ADVANCE_STAGE', caseId, candidateId, reason }),
    [],
  );

  const returnStage = useCallback(
    (caseId: string, candidateId: string, reason?: string) =>
      dispatch({ type: 'RETURN_STAGE', caseId, candidateId, reason }),
    [],
  );

  const blockStage = useCallback(
    (caseId: string, candidateId: string, reason?: string) =>
      dispatch({ type: 'BLOCK_STAGE', caseId, candidateId, reason }),
    [],
  );

  const approveCandidate = useCallback(
    (caseId: string, candidateId: string, reason?: string) =>
      dispatch({ type: 'APPROVE_CANDIDATE', caseId, candidateId, reason }),
    [],
  );

  const rejectCandidate = useCallback(
    (caseId: string, candidateId: string, reason?: string) =>
      dispatch({ type: 'REJECT_CANDIDATE', caseId, candidateId, reason }),
    [],
  );

  const holdCandidate = useCallback(
    (caseId: string, candidateId: string, reason?: string) =>
      dispatch({ type: 'HOLD_CANDIDATE', caseId, candidateId, reason }),
    [],
  );

  const overrideDecision = useCallback(
    (caseId: string, candidateId: string, reason?: string) =>
      dispatch({ type: 'OVERRIDE_DECISION', caseId, candidateId, reason }),
    [],
  );

  const addFeedback = useCallback(
    (caseId: string, candidateId: string, feedback: Omit<MockFeedback, 'id'>) =>
      dispatch({ type: 'ADD_FEEDBACK', caseId, candidateId, feedback }),
    [],
  );

  const setCaseState = useCallback(
    (caseId: string, newState: WorkflowCaseState) =>
      dispatch({ type: 'SET_CASE_STATE', caseId, newState }),
    [],
  );

  // Selectors
  const getCandidateCurrentStage = useCallback(
    (caseId: string, candidateId: string): Stage | undefined => {
      const c = state.cases.find((c) => c.id === caseId);
      const cand = c?.candidates.find((ca) => ca.id === candidateId);
      return cand?.stage_run.at(-1)?.stage;
    },
    [state.cases],
  );

  const getCandidateCurrentStageRun = useCallback(
    (caseId: string, candidateId: string): StageRun | undefined => {
      const c = state.cases.find((c) => c.id === caseId);
      const cand = c?.candidates.find((ca) => ca.id === candidateId);
      return cand?.stage_run.at(-1);
    },
    [state.cases],
  );

  const getDecisionLogForCandidate = useCallback(
    (caseId: string, candidateId: string): SimDecisionEntry[] =>
      state.decisionLog.filter(
        (e) => e.caseId === caseId && e.candidateId === candidateId,
      ),
    [state.decisionLog],
  );

  const canAdvance = useCallback(
    (caseId: string, candidateId: string): boolean => {
      const c = state.cases.find((c) => c.id === caseId);
      const cand = c?.candidates.find((ca) => ca.id === candidateId);
      if (!cand) return false;
      const lastRun = cand.stage_run.at(-1);
      if (!lastRun) return false;
      if (lastRun.status === 'blocked' || lastRun.status === 'returned') return false;
      const currentIndex = STAGE_ORDER.indexOf(lastRun.stage);
      return currentIndex < STAGE_ORDER.length - 1;
    },
    [state.cases],
  );

  return {
    state,
    dispatch,
    // Actions
    advanceStage,
    returnStage,
    blockStage,
    approveCandidate,
    rejectCandidate,
    holdCandidate,
    overrideDecision,
    addFeedback,
    setCaseState,
    // Selectors
    getCandidateCurrentStage,
    getCandidateCurrentStageRun,
    getDecisionLogForCandidate,
    canAdvance,
  };
}
