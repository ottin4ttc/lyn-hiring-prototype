/**
 * SYNTHETIC / NO_REAL_PII
 * All data is entirely fictional.
 * No real candidates, companies, or personal data.
 * All names are codes (CAND-A1 etc.). synthetic: true on all records.
 */

// ── Types ──────────────────────────────────────────────────────────────────────

export type Stage =
  | 'Need'
  | 'Role Profile'
  | 'Talent Map'
  | 'Longlist'
  | 'Shortlist'
  | 'Recommendation Pack'
  | 'Client Feedback'
  | 'Learning Artifact';

export type StageRunStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'blocked'
  | 'returned';

export type ReviewStatus =
  | 'pending_review'
  | 'approved'
  | 'needs_human_review'
  | 'rejected'
  | 'overridden';

export type PrivacyStatus = 'no_real_pii' | 'pii_present' | 'privacy_violation';

export type SourceStatus = 'synthetic_simulation' | 'real_data' | 'anonymized';

export type WorkflowCaseState =
  | 'pending'
  | 'active'
  | 'blocked'
  | 'needs_human_review'
  | 'returned'
  | 'rejected'
  | 'to_confirm'
  | 'privacy_violation'
  | 'stale_mock_data'
  | 'external_action_attempt'
  | 'closed';

export type LearningType =
  | 'IC-to-Manager transition'
  | 'Scarce-talent pipeline'
  | 'Founder-fit dependency'
  | 'industry-switch risk'
  | 'anomaly-escalation'
  | 'full-pipeline-completion';

export type AutomationOpportunity =
  | 'auto-advance-longlist'
  | 'auto-score-resume'
  | 'flag-stale-feedback'
  | 'detect-privacy-breach'
  | 'none';

export interface StageRun {
  stage: Stage;
  status: StageRunStatus;
  review_status: ReviewStatus;
  started_at: string;
  completed_at?: string;
  reviewer?: string;
}

export interface DisabledExternalAction {
  action_type:
    | 'send_email'
    | 'feishu_write'
    | 'create_external_task'
    | 'submit_recommendation'
    | 'candidate_outreach'
    | 'client_notification';
  state: 'blocked';
  label: string;
  reason: string;
}

export interface ScoreBreakdown {
  technical: number;
  leadership: number;
  culture_fit: number;
  growth_potential: number;
}

export interface EvidenceRef {
  type: 'interview_note' | 'resume_signal' | 'reference_check' | 'project_record';
  label: string;
  summary: string;
}

export interface DecisionLog {
  stage: Stage;
  decision: 'advance' | 'hold' | 'reject' | 'pending' | 'override' | 'return';
  reason: string;
  by: string;
  at: string;
}

export interface RiskFlag {
  level: 'low' | 'medium' | 'high';
  label: string;
  detail: string;
}

export interface LearningArtifact {
  insight: string;
  pattern: string;
  suggested_action: string;
}

export interface MockFeedback {
  id: string;
  source: string;
  content: string;
  decision_delta: 'positive' | 'negative' | 'neutral';
  stage_run_ids: string[];
  decision_log_refs: string[];
  submitted_at: string;
}

export interface Candidate {
  /** Synthetic flag - must always be true */
  synthetic: true;
  privacy_status: PrivacyStatus;
  source_status: SourceStatus;
  pii_fields_present: false;

  id: string;
  /** Anonymous code only - NO real names */
  code: string;
  fit_score: number;
  score_breakdown: ScoreBreakdown;
  evidence_refs: EvidenceRef[];
  risk_flags: RiskFlag[];
  stage_run: StageRun[];
  decision_log: DecisionLog[];
  disabled_external_actions: DisabledExternalAction[];
  mock_feedback?: MockFeedback[];
  learning_artifact?: LearningArtifact;
  learning_type?: LearningType;
  automation_opportunity?: AutomationOpportunity;
  recommendation_pack_id?: string;
}

export interface WorkflowCase {
  id: string;
  title: string;
  role: string;
  client_code: string;
  /** Canonical workflow state machine state */
  current_state: WorkflowCaseState;
  /** Which pipeline stage the case is currently in */
  current_stage: Stage;
  review_status: ReviewStatus;
  privacy_status: PrivacyStatus;
  source_status: SourceStatus;
  candidates: Candidate[];
  created_at: string;
  decision_delta?: string;
}

export interface HiringCase extends WorkflowCase {}

// ── Mock Data ──────────────────────────────────────────────────────────────────

export const MOCK_CASES: HiringCase[] = [
  // ── CASE 000: PENDING case – not yet started ────────────────────────────────
  {
    id: 'case-000',
    title: '[SYNTHETIC] Head of Marketing – B2B SaaS (Pending Start)',
    role: 'Head of Marketing',
    client_code: 'CLIENT-KAPPA',
    current_state: 'pending',
    current_stage: 'Need',
    review_status: 'pending_review',
    privacy_status: 'no_real_pii',
    source_status: 'synthetic_simulation',
    created_at: '2024-04-01',
    candidates: [
      {
        synthetic: true,
        privacy_status: 'no_real_pii',
        source_status: 'synthetic_simulation',
        pii_fields_present: false,
        id: 'cand-k1',
        code: 'CAND-K1',
        fit_score: 0,
        score_breakdown: { technical: 0, leadership: 0, culture_fit: 0, growth_potential: 0 },
        stage_run: [
          { stage: 'Need', status: 'pending', review_status: 'pending_review', started_at: '2024-04-01' },
        ],
        decision_log: [
          { stage: 'Need', decision: 'pending', reason: 'Case created; awaiting recruiter to start intake process', by: 'SYSTEM', at: '2024-04-01' },
        ],
        evidence_refs: [],
        risk_flags: [],
        disabled_external_actions: [
          { action_type: 'candidate_outreach', state: 'blocked', label: 'Contact Candidate', reason: 'External outreach disabled in prototype' },
        ],
        learning_type: 'IC-to-Manager transition',
        automation_opportunity: 'none',
      },
    ],
  },

  // ── CASE 001: Head of Product – active, at Shortlist ──────────────────────
  {
    id: 'case-001',
    title: '[SYNTHETIC] Head of Product – FinTech Scale-up',
    role: 'Head of Product',
    client_code: 'CLIENT-ALPHA',
    current_state: 'active',
    current_stage: 'Shortlist',
    review_status: 'pending_review',
    privacy_status: 'no_real_pii',
    source_status: 'synthetic_simulation',
    created_at: '2024-03-01',
    candidates: [
      {
        synthetic: true,
        privacy_status: 'no_real_pii',
        source_status: 'synthetic_simulation',
        pii_fields_present: false,
        id: 'cand-a1',
        code: 'CAND-A1',
        fit_score: 87,
        score_breakdown: { technical: 82, leadership: 90, culture_fit: 88, growth_potential: 85 },
        stage_run: [
          { stage: 'Need', status: 'completed', review_status: 'approved', started_at: '2024-03-01', completed_at: '2024-03-02' },
          { stage: 'Role Profile', status: 'completed', review_status: 'approved', started_at: '2024-03-02', completed_at: '2024-03-04' },
          { stage: 'Talent Map', status: 'completed', review_status: 'approved', started_at: '2024-03-04', completed_at: '2024-03-07' },
          { stage: 'Longlist', status: 'completed', review_status: 'approved', started_at: '2024-03-08', completed_at: '2024-03-10', reviewer: 'RECRUITER-A' },
          { stage: 'Shortlist', status: 'in_progress', review_status: 'pending_review', started_at: '2024-03-11', reviewer: 'RECRUITER-A' },
        ],
        decision_log: [
          { stage: 'Longlist', decision: 'advance', reason: 'Strong product methodology, solid B2B experience', by: 'RECRUITER-A', at: '2024-03-10' },
          { stage: 'Shortlist', decision: 'pending', reason: 'Awaiting second round interview', by: 'RECRUITER-A', at: '2024-03-18' },
        ],
        evidence_refs: [
          { type: 'interview_note', label: 'Round 1 Notes', summary: 'Clear product roadmap thinking, awareness of fintech compliance requirements' },
          { type: 'resume_signal', label: 'Resume Signal', summary: 'Led 0→1 product launch with 3x GMV growth' },
        ],
        risk_flags: [
          { level: 'low', label: 'Management Level Jump', detail: 'First time as Head-level manager from IC background' },
        ],
        disabled_external_actions: [
          { action_type: 'candidate_outreach', state: 'blocked', label: 'Contact Candidate', reason: 'External outreach disabled in prototype' },
          { action_type: 'send_email', state: 'blocked', label: 'Send Interview Invite', reason: 'Email disabled in prototype' },
        ],
        learning_type: 'IC-to-Manager transition',
        automation_opportunity: 'auto-advance-longlist',
        learning_artifact: {
          insight: 'Strong IC-background candidates typically need 3-6 months adjustment when taking on first manager role',
          pattern: 'IC-to-Manager transition',
          suggested_action: 'Recommend scheduling shadowing session with CPO',
        },
      },
      {
        synthetic: true,
        privacy_status: 'no_real_pii',
        source_status: 'synthetic_simulation',
        pii_fields_present: false,
        id: 'cand-a2',
        code: 'CAND-A2',
        fit_score: 74,
        score_breakdown: { technical: 70, leadership: 80, culture_fit: 72, growth_potential: 76 },
        stage_run: [
          { stage: 'Need', status: 'completed', review_status: 'approved', started_at: '2024-03-01', completed_at: '2024-03-02' },
          { stage: 'Role Profile', status: 'completed', review_status: 'approved', started_at: '2024-03-02', completed_at: '2024-03-04' },
          { stage: 'Talent Map', status: 'completed', review_status: 'approved', started_at: '2024-03-04', completed_at: '2024-03-07' },
          { stage: 'Longlist', status: 'in_progress', review_status: 'pending_review', started_at: '2024-03-08', reviewer: 'RECRUITER-B' },
        ],
        decision_log: [
          { stage: 'Longlist', decision: 'hold', reason: 'Industry background weaker, awaiting additional case studies', by: 'RECRUITER-B', at: '2024-03-12' },
        ],
        evidence_refs: [
          { type: 'resume_signal', label: 'Resume Signal', summary: '5 years ecommerce PM, limited fintech experience' },
        ],
        risk_flags: [
          { level: 'medium', label: 'Industry Switch Risk', detail: 'FinTech compliance knowledge needs rapid ramp-up' },
        ],
        disabled_external_actions: [
          { action_type: 'candidate_outreach', state: 'blocked', label: 'Request More Materials', reason: 'External outreach disabled in prototype' },
        ],
        learning_type: 'industry-switch risk',
        automation_opportunity: 'auto-score-resume',
      },
    ],
  },

  // ── CASE 002: Engineering Manager – at Recommendation Pack ────────────────
  {
    id: 'case-002',
    title: '[SYNTHETIC] Engineering Manager – AI Infrastructure',
    role: 'Engineering Manager',
    client_code: 'CLIENT-BETA',
    current_state: 'active',
    current_stage: 'Recommendation Pack',
    review_status: 'approved',
    privacy_status: 'no_real_pii',
    source_status: 'synthetic_simulation',
    created_at: '2024-02-15',
    candidates: [
      {
        synthetic: true,
        privacy_status: 'no_real_pii',
        source_status: 'synthetic_simulation',
        pii_fields_present: false,
        id: 'cand-b1',
        code: 'CAND-B1',
        fit_score: 92,
        recommendation_pack_id: 'rpack-b1-001',
        score_breakdown: { technical: 95, leadership: 88, culture_fit: 90, growth_potential: 94 },
        stage_run: [
          { stage: 'Need', status: 'completed', review_status: 'approved', started_at: '2024-02-15', completed_at: '2024-02-16' },
          { stage: 'Role Profile', status: 'completed', review_status: 'approved', started_at: '2024-02-16', completed_at: '2024-02-18' },
          { stage: 'Talent Map', status: 'completed', review_status: 'approved', started_at: '2024-02-18', completed_at: '2024-02-20' },
          { stage: 'Longlist', status: 'completed', review_status: 'approved', started_at: '2024-02-20', completed_at: '2024-02-22', reviewer: 'RECRUITER-C' },
          { stage: 'Shortlist', status: 'completed', review_status: 'approved', started_at: '2024-02-23', completed_at: '2024-03-01', reviewer: 'RECRUITER-C' },
          { stage: 'Recommendation Pack', status: 'completed', review_status: 'approved', started_at: '2024-03-02', completed_at: '2024-03-10', reviewer: 'RECRUITER-C' },
        ],
        decision_log: [
          { stage: 'Longlist', decision: 'advance', reason: 'Strong distributed systems background', by: 'RECRUITER-C', at: '2024-02-22' },
          { stage: 'Shortlist', decision: 'advance', reason: 'All three interview rounds excellent', by: 'RECRUITER-C', at: '2024-03-01' },
          { stage: 'Recommendation Pack', decision: 'advance', reason: 'Highest composite score, recommended for submission', by: 'RECRUITER-C', at: '2024-03-10' },
        ],
        evidence_refs: [
          { type: 'interview_note', label: 'Technical Interview Notes', summary: 'Perfect system design score, led 20+ person engineering team' },
          { type: 'reference_check', label: 'Reference Check Result', summary: 'Former manager highly rated technical judgment and team cohesion' },
          { type: 'project_record', label: 'Project Record', summary: 'Led training platform scale-up from 500 to 5000 GPUs' },
        ],
        risk_flags: [],
        disabled_external_actions: [
          { action_type: 'submit_recommendation', state: 'blocked', label: 'Submit Recommendation Pack to Client', reason: 'External submission disabled in prototype' },
          { action_type: 'client_notification', state: 'blocked', label: 'Notify CLIENT-BETA', reason: 'Client notifications disabled in prototype' },
        ],
        mock_feedback: [
          {
            id: 'fb-b1-001',
            source: 'RECRUITER-C',
            content: 'Strong candidate, recommend immediate submission',
            decision_delta: 'positive',
            stage_run_ids: ['cand-b1-stage-rpack'],
            decision_log_refs: ['cand-b1-dl-002'],
            submitted_at: '2024-03-10T10:00:00Z',
          },
        ],
        learning_type: 'Scarce-talent pipeline',
        automation_opportunity: 'flag-stale-feedback',
        learning_artifact: {
          insight: 'Top-tier AI Infra EM candidates are extremely scarce, pipeline build cycle typically >45 days',
          pattern: 'Scarce-talent pipeline',
          suggested_action: 'Recommend starting backup pipeline immediately to avoid offer-stage attrition',
        },
      },
    ],
  },

  // ── CASE 003: Chief of Staff – at Client Feedback ─────────────────────────
  {
    id: 'case-003',
    title: '[SYNTHETIC] Chief of Staff – Series C Startup',
    role: 'Chief of Staff',
    client_code: 'CLIENT-GAMMA',
    current_state: 'needs_human_review',
    current_stage: 'Client Feedback',
    review_status: 'needs_human_review',
    privacy_status: 'no_real_pii',
    source_status: 'synthetic_simulation',
    created_at: '2024-01-20',
    candidates: [
      {
        synthetic: true,
        privacy_status: 'no_real_pii',
        source_status: 'synthetic_simulation',
        pii_fields_present: false,
        id: 'cand-c1',
        code: 'CAND-C1',
        fit_score: 81,
        score_breakdown: { technical: 75, leadership: 86, culture_fit: 84, growth_potential: 80 },
        stage_run: [
          { stage: 'Need', status: 'completed', review_status: 'approved', started_at: '2024-01-20', completed_at: '2024-01-22' },
          { stage: 'Role Profile', status: 'completed', review_status: 'approved', started_at: '2024-01-22', completed_at: '2024-01-25' },
          { stage: 'Talent Map', status: 'completed', review_status: 'approved', started_at: '2024-01-25', completed_at: '2024-01-30' },
          { stage: 'Longlist', status: 'completed', review_status: 'approved', started_at: '2024-02-01', completed_at: '2024-02-05', reviewer: 'RECRUITER-D' },
          { stage: 'Shortlist', status: 'completed', review_status: 'approved', started_at: '2024-02-06', completed_at: '2024-02-10', reviewer: 'RECRUITER-D' },
          { stage: 'Recommendation Pack', status: 'completed', review_status: 'approved', started_at: '2024-02-11', completed_at: '2024-02-20', reviewer: 'RECRUITER-D' },
          { stage: 'Client Feedback', status: 'in_progress', review_status: 'needs_human_review', started_at: '2024-03-01', reviewer: 'CLIENT-GAMMA' },
        ],
        decision_log: [
          { stage: 'Shortlist', decision: 'advance', reason: 'Outstanding cross-functional coordination ability', by: 'RECRUITER-D', at: '2024-02-10' },
          { stage: 'Recommendation Pack', decision: 'advance', reason: 'Submitted for client review', by: 'RECRUITER-D', at: '2024-02-20' },
          { stage: 'Client Feedback', decision: 'pending', reason: 'Awaiting founder feedback – salary expectations 15% above budget', by: 'CLIENT-GAMMA', at: '2024-03-05' },
        ],
        evidence_refs: [
          { type: 'interview_note', label: 'Founder Interview Summary', summary: 'Clear framework for OKR system and cross-department communication' },
        ],
        risk_flags: [
          { level: 'medium', label: 'Salary Expectations Above Budget', detail: 'Candidate expects 15% above client budget, negotiation required' },
        ],
        disabled_external_actions: [
          { action_type: 'candidate_outreach', state: 'blocked', label: 'Negotiate Offer Terms', reason: 'External outreach disabled in prototype' },
          { action_type: 'client_notification', state: 'blocked', label: 'Send Follow-up to Client', reason: 'Client notifications disabled in prototype' },
        ],
        learning_type: 'Founder-fit dependency',
        automation_opportunity: 'flag-stale-feedback',
        learning_artifact: {
          insight: 'CoS role has extremely high subjective weight on "founder working style match", client feedback cycles are long',
          pattern: 'Founder-fit dependency',
          suggested_action: 'Pre-align scoring dimensions with founder to reduce subjective ambiguity',
        },
      },
    ],
  },

  // ── CASE 004: FULL PIPELINE – all 8 stages completed ─────────────────────
  {
    id: 'case-004',
    title: '[SYNTHETIC] VP Engineering – Deep Tech Startup (Full Pipeline)',
    role: 'VP Engineering',
    client_code: 'CLIENT-DELTA',
    current_state: 'closed',
    current_stage: 'Learning Artifact',
    review_status: 'approved',
    privacy_status: 'no_real_pii',
    source_status: 'synthetic_simulation',
    created_at: '2024-01-01',
    candidates: [
      {
        synthetic: true,
        privacy_status: 'no_real_pii',
        source_status: 'synthetic_simulation',
        pii_fields_present: false,
        id: 'cand-d1',
        code: 'CAND-D1',
        fit_score: 96,
        recommendation_pack_id: 'rpack-d1-001',
        score_breakdown: { technical: 98, leadership: 95, culture_fit: 94, growth_potential: 97 },
        stage_run: [
          { stage: 'Need', status: 'completed', review_status: 'approved', started_at: '2024-01-01', completed_at: '2024-01-03' },
          { stage: 'Role Profile', status: 'completed', review_status: 'approved', started_at: '2024-01-03', completed_at: '2024-01-06' },
          { stage: 'Talent Map', status: 'completed', review_status: 'approved', started_at: '2024-01-06', completed_at: '2024-01-10' },
          { stage: 'Longlist', status: 'completed', review_status: 'approved', started_at: '2024-01-10', completed_at: '2024-01-15', reviewer: 'RECRUITER-E' },
          { stage: 'Shortlist', status: 'completed', review_status: 'approved', started_at: '2024-01-15', completed_at: '2024-01-25', reviewer: 'RECRUITER-E' },
          { stage: 'Recommendation Pack', status: 'completed', review_status: 'approved', started_at: '2024-01-25', completed_at: '2024-02-01', reviewer: 'RECRUITER-E' },
          { stage: 'Client Feedback', status: 'completed', review_status: 'approved', started_at: '2024-02-01', completed_at: '2024-02-10', reviewer: 'CLIENT-DELTA' },
          { stage: 'Learning Artifact', status: 'completed', review_status: 'approved', started_at: '2024-02-10', completed_at: '2024-02-15', reviewer: 'RECRUITER-E' },
        ],
        decision_log: [
          { stage: 'Need', decision: 'advance', reason: 'Requirement validated with client', by: 'RECRUITER-E', at: '2024-01-03' },
          { stage: 'Role Profile', decision: 'advance', reason: 'Profile locked with hiring committee', by: 'RECRUITER-E', at: '2024-01-06' },
          { stage: 'Talent Map', decision: 'advance', reason: 'Talent landscape mapped, 3 viable candidates identified', by: 'RECRUITER-E', at: '2024-01-10' },
          { stage: 'Longlist', decision: 'advance', reason: 'CAND-D1 ranked #1 in longlist pool', by: 'RECRUITER-E', at: '2024-01-15' },
          { stage: 'Shortlist', decision: 'advance', reason: 'All 4 rounds passed with flying colors', by: 'RECRUITER-E', at: '2024-01-25' },
          { stage: 'Recommendation Pack', decision: 'advance', reason: 'Pack approved and ready for client submission', by: 'RECRUITER-E', at: '2024-02-01' },
          { stage: 'Client Feedback', decision: 'advance', reason: 'Client expressed strong interest, offer extended', by: 'CLIENT-DELTA', at: '2024-02-10' },
          { stage: 'Learning Artifact', decision: 'advance', reason: 'Learning artifact finalized and committed to pattern library', by: 'RECRUITER-E', at: '2024-02-15' },
        ],
        evidence_refs: [
          { type: 'interview_note', label: 'Technical Design Round', summary: 'Architecture proposal was best in cohort – clear trade-off reasoning' },
          { type: 'interview_note', label: 'Leadership Round', summary: 'Described scaling team from 8 to 60 engineers over 18 months' },
          { type: 'reference_check', label: 'Reference Check', summary: 'Two references independently rated "best technical hire of their career"' },
          { type: 'project_record', label: 'Open Source Contribution', summary: 'Core contributor to widely-used ML inference framework' },
        ],
        risk_flags: [],
        disabled_external_actions: [
          { action_type: 'send_email', state: 'blocked', label: 'Send Offer Letter', reason: 'External email disabled in prototype' },
          { action_type: 'feishu_write', state: 'blocked', label: 'Write to Lark Base', reason: 'Feishu write disabled in prototype' },
        ],
        mock_feedback: [
          {
            id: 'fb-d1-001',
            source: 'RECRUITER-E',
            content: 'Candidate exceeded all benchmarks across all 8 stages',
            decision_delta: 'positive',
            stage_run_ids: ['cand-d1-stage-learning'],
            decision_log_refs: ['cand-d1-dl-007', 'cand-d1-dl-008'],
            submitted_at: '2024-02-15T14:00:00Z',
          },
          {
            id: 'fb-d1-002',
            source: 'CLIENT-DELTA',
            content: 'Best candidate we have seen in 3 years of searching for this role',
            decision_delta: 'positive',
            stage_run_ids: ['cand-d1-stage-cf'],
            decision_log_refs: ['cand-d1-dl-007'],
            submitted_at: '2024-02-10T16:30:00Z',
          },
        ],
        learning_type: 'full-pipeline-completion',
        automation_opportunity: 'auto-advance-longlist',
        learning_artifact: {
          insight: 'Full 8-stage pipeline for VP Eng roles averages 45 days when client is engaged early and scoring rubric is locked before Talent Map',
          pattern: 'full-pipeline-completion',
          suggested_action: 'Publish this case as the gold-standard timeline template for deep-tech VP searches',
        },
      },
    ],
  },

  // ── CASE 005: BLOCKED case ─────────────────────────────────────────────────
  {
    id: 'case-005',
    title: '[SYNTHETIC] Head of Sales – SaaS (Blocked at Shortlist)',
    role: 'Head of Sales',
    client_code: 'CLIENT-EPSILON',
    current_state: 'blocked',
    current_stage: 'Shortlist',
    review_status: 'needs_human_review',
    privacy_status: 'no_real_pii',
    source_status: 'synthetic_simulation',
    created_at: '2024-03-10',
    candidates: [
      {
        synthetic: true,
        privacy_status: 'no_real_pii',
        source_status: 'synthetic_simulation',
        pii_fields_present: false,
        id: 'cand-e1',
        code: 'CAND-E1',
        fit_score: 65,
        score_breakdown: { technical: 55, leadership: 72, culture_fit: 68, growth_potential: 65 },
        stage_run: [
          { stage: 'Need', status: 'completed', review_status: 'approved', started_at: '2024-03-10', completed_at: '2024-03-12' },
          { stage: 'Role Profile', status: 'completed', review_status: 'approved', started_at: '2024-03-12', completed_at: '2024-03-14' },
          { stage: 'Talent Map', status: 'completed', review_status: 'approved', started_at: '2024-03-14', completed_at: '2024-03-18' },
          { stage: 'Longlist', status: 'completed', review_status: 'approved', started_at: '2024-03-18', completed_at: '2024-03-20', reviewer: 'RECRUITER-F' },
          { stage: 'Shortlist', status: 'blocked', review_status: 'needs_human_review', started_at: '2024-03-21', reviewer: 'RECRUITER-F' },
        ],
        decision_log: [
          { stage: 'Shortlist', decision: 'hold', reason: 'Background check flagged discrepancy in employment dates – requires human review before proceeding', by: 'RECRUITER-F', at: '2024-03-22' },
        ],
        evidence_refs: [
          { type: 'resume_signal', label: 'Employment History Signal', summary: 'Discrepancy between stated dates and reference data – 6-month gap unaccounted for' },
        ],
        risk_flags: [
          { level: 'high', label: 'Background Check Discrepancy', detail: 'Employment timeline inconsistency requires human adjudication before advancing' },
        ],
        disabled_external_actions: [
          { action_type: 'candidate_outreach', state: 'blocked', label: 'Contact Candidate for Clarification', reason: 'External outreach disabled in prototype' },
          { action_type: 'create_external_task', state: 'blocked', label: 'Create Background Check Task', reason: 'External task creation disabled in prototype' },
        ],
        learning_type: 'anomaly-escalation',
        automation_opportunity: 'detect-privacy-breach',
      },
    ],
  },

  // ── CASE 006: RETURNED / REJECTED case ────────────────────────────────────
  {
    id: 'case-006',
    title: '[SYNTHETIC] CFO – Pre-IPO Company (Returned for Revision)',
    role: 'CFO',
    client_code: 'CLIENT-ZETA',
    current_state: 'returned',
    current_stage: 'Recommendation Pack',
    review_status: 'rejected',
    privacy_status: 'no_real_pii',
    source_status: 'synthetic_simulation',
    created_at: '2024-02-01',
    decision_delta: 'Client returned pack citing insufficient IPO-readiness evidence',
    candidates: [
      {
        synthetic: true,
        privacy_status: 'no_real_pii',
        source_status: 'synthetic_simulation',
        pii_fields_present: false,
        id: 'cand-f1',
        code: 'CAND-F1',
        fit_score: 72,
        score_breakdown: { technical: 80, leadership: 70, culture_fit: 65, growth_potential: 73 },
        stage_run: [
          { stage: 'Need', status: 'completed', review_status: 'approved', started_at: '2024-02-01', completed_at: '2024-02-03' },
          { stage: 'Role Profile', status: 'completed', review_status: 'approved', started_at: '2024-02-03', completed_at: '2024-02-06' },
          { stage: 'Talent Map', status: 'completed', review_status: 'approved', started_at: '2024-02-06', completed_at: '2024-02-10' },
          { stage: 'Longlist', status: 'completed', review_status: 'approved', started_at: '2024-02-10', completed_at: '2024-02-15', reviewer: 'RECRUITER-G' },
          { stage: 'Shortlist', status: 'completed', review_status: 'approved', started_at: '2024-02-15', completed_at: '2024-02-22', reviewer: 'RECRUITER-G' },
          { stage: 'Recommendation Pack', status: 'returned', review_status: 'rejected', started_at: '2024-02-22', completed_at: '2024-03-01', reviewer: 'CLIENT-ZETA' },
        ],
        decision_log: [
          { stage: 'Shortlist', decision: 'advance', reason: 'Strong finance background, advanced to pack', by: 'RECRUITER-G', at: '2024-02-22' },
          { stage: 'Recommendation Pack', decision: 'return', reason: 'Client returned: insufficient IPO-readiness evidence, recommends re-sourcing', by: 'CLIENT-ZETA', at: '2024-03-01' },
        ],
        evidence_refs: [
          { type: 'interview_note', label: 'CFO Panel Interview', summary: 'Strong operational finance, but IPO experience limited to one transaction' },
          { type: 'resume_signal', label: 'Track Record', summary: 'Managed $200M P&L but no public company experience' },
        ],
        risk_flags: [
          { level: 'high', label: 'IPO Experience Gap', detail: 'Client specifically needs 2+ IPO completions; candidate has 1' },
        ],
        disabled_external_actions: [
          { action_type: 'submit_recommendation', state: 'blocked', label: 'Resubmit Revised Pack', reason: 'External submission disabled in prototype' },
        ],
        learning_type: 'anomaly-escalation',
        automation_opportunity: 'flag-stale-feedback',
      },
    ],
  },

  // ── CASE 007: PRIVACY VIOLATION case ──────────────────────────────────────
  {
    id: 'case-007',
    title: '[SYNTHETIC] General Counsel – Healthcare (Privacy Violation Detected)',
    role: 'General Counsel',
    client_code: 'CLIENT-ETA',
    current_state: 'privacy_violation',
    current_stage: 'Longlist',
    review_status: 'needs_human_review',
    privacy_status: 'privacy_violation',
    source_status: 'synthetic_simulation',
    created_at: '2024-03-05',
    candidates: [
      {
        synthetic: true,
        privacy_status: 'privacy_violation',
        source_status: 'synthetic_simulation',
        pii_fields_present: false,
        id: 'cand-g1',
        code: 'CAND-G1',
        fit_score: 0,
        score_breakdown: { technical: 0, leadership: 0, culture_fit: 0, growth_potential: 0 },
        stage_run: [
          { stage: 'Need', status: 'completed', review_status: 'approved', started_at: '2024-03-05', completed_at: '2024-03-07' },
          { stage: 'Role Profile', status: 'completed', review_status: 'approved', started_at: '2024-03-07', completed_at: '2024-03-09' },
          { stage: 'Talent Map', status: 'completed', review_status: 'approved', started_at: '2024-03-09', completed_at: '2024-03-12' },
          { stage: 'Longlist', status: 'blocked', review_status: 'needs_human_review', started_at: '2024-03-12', reviewer: 'SYSTEM' },
        ],
        decision_log: [
          { stage: 'Longlist', decision: 'hold', reason: 'SYSTEM ALERT: Possible PII detected in candidate submission – halted for human review', by: 'SYSTEM-GUARD', at: '2024-03-13' },
        ],
        evidence_refs: [],
        risk_flags: [
          { level: 'high', label: 'Privacy Violation Alert', detail: 'System detected potential inclusion of real patient data in candidate submission; all processing halted pending review' },
        ],
        disabled_external_actions: [
          { action_type: 'candidate_outreach', state: 'blocked', label: 'Any Candidate Action', reason: 'All actions blocked pending privacy review' },
          { action_type: 'feishu_write', state: 'blocked', label: 'Any Write Action', reason: 'Write actions blocked pending privacy review' },
          { action_type: 'send_email', state: 'blocked', label: 'Any Email Action', reason: 'Email actions blocked pending privacy review' },
        ],
        learning_type: 'anomaly-escalation',
        automation_opportunity: 'detect-privacy-breach',
      },
    ],
  },

  // ── CASE 008: STALE MOCK DATA case ────────────────────────────────────────
  {
    id: 'case-008',
    title: '[SYNTHETIC] Head of Design – Consumer App (Stale Data)',
    role: 'Head of Design',
    client_code: 'CLIENT-THETA',
    current_state: 'stale_mock_data',
    current_stage: 'Shortlist',
    review_status: 'pending_review',
    privacy_status: 'no_real_pii',
    source_status: 'synthetic_simulation',
    created_at: '2023-10-01',
    candidates: [
      {
        synthetic: true,
        privacy_status: 'no_real_pii',
        source_status: 'synthetic_simulation',
        pii_fields_present: false,
        id: 'cand-h1',
        code: 'CAND-H1',
        fit_score: 78,
        score_breakdown: { technical: 72, leadership: 76, culture_fit: 82, growth_potential: 80 },
        stage_run: [
          { stage: 'Need', status: 'completed', review_status: 'approved', started_at: '2023-10-01', completed_at: '2023-10-03' },
          { stage: 'Role Profile', status: 'completed', review_status: 'approved', started_at: '2023-10-03', completed_at: '2023-10-06' },
          { stage: 'Talent Map', status: 'completed', review_status: 'approved', started_at: '2023-10-06', completed_at: '2023-10-10' },
          { stage: 'Longlist', status: 'completed', review_status: 'approved', started_at: '2023-10-10', completed_at: '2023-10-15', reviewer: 'RECRUITER-H' },
          { stage: 'Shortlist', status: 'in_progress', review_status: 'pending_review', started_at: '2023-10-15', reviewer: 'RECRUITER-H' },
        ],
        decision_log: [
          { stage: 'Shortlist', decision: 'pending', reason: 'Interview scheduled but no follow-up recorded – case flagged as stale (>90 days inactive)', by: 'SYSTEM-MONITOR', at: '2024-01-15' },
        ],
        evidence_refs: [
          { type: 'resume_signal', label: 'Portfolio Review', summary: 'Strong visual design portfolio, consumer app experience at 3 notable companies' },
        ],
        risk_flags: [
          { level: 'medium', label: 'Stale Data Warning', detail: 'Last activity >90 days ago. Candidate availability and interest unconfirmed.' },
        ],
        disabled_external_actions: [
          { action_type: 'candidate_outreach', state: 'blocked', label: 'Re-engage Candidate', reason: 'External outreach disabled in prototype' },
        ],
        learning_type: 'anomaly-escalation',
        automation_opportunity: 'flag-stale-feedback',
      },
    ],
  },

  // ── CASE 010: TO_CONFIRM case – awaiting human confirmation ──────────────
  {
    id: 'case-010',
    title: '[SYNTHETIC] VP Product – EdTech Series B (To Confirm)',
    role: 'VP Product',
    client_code: 'CLIENT-LAMBDA',
    current_state: 'to_confirm',
    current_stage: 'Shortlist',
    review_status: 'pending_review',
    privacy_status: 'no_real_pii',
    source_status: 'synthetic_simulation',
    created_at: '2024-03-20',
    candidates: [
      {
        synthetic: true,
        privacy_status: 'no_real_pii',
        source_status: 'synthetic_simulation',
        pii_fields_present: false,
        id: 'cand-j1',
        code: 'CAND-J1',
        fit_score: 83,
        score_breakdown: { technical: 80, leadership: 84, culture_fit: 86, growth_potential: 82 },
        stage_run: [
          { stage: 'Need', status: 'completed', review_status: 'approved', started_at: '2024-03-20', completed_at: '2024-03-22' },
          { stage: 'Role Profile', status: 'completed', review_status: 'approved', started_at: '2024-03-22', completed_at: '2024-03-25' },
          { stage: 'Talent Map', status: 'completed', review_status: 'approved', started_at: '2024-03-25', completed_at: '2024-03-28' },
          { stage: 'Longlist', status: 'completed', review_status: 'approved', started_at: '2024-03-28', completed_at: '2024-04-01', reviewer: 'RECRUITER-J' },
          { stage: 'Shortlist', status: 'in_progress', review_status: 'pending_review', started_at: '2024-04-01', reviewer: 'RECRUITER-J' },
        ],
        decision_log: [
          { stage: 'Longlist', decision: 'advance', reason: 'Strong EdTech + product background', by: 'RECRUITER-J', at: '2024-04-01' },
          { stage: 'Shortlist', decision: 'pending', reason: 'TO CONFIRM: Client has not confirmed equity structure after Series B close; offer terms require human confirmation before advancing', by: 'RECRUITER-J', at: '2024-04-02' },
        ],
        evidence_refs: [
          { type: 'interview_note', label: 'Product Strategy Interview', summary: 'Strong K-12 market insight; clear roadmap for 0-to-1 expansion' },
          { type: 'resume_signal', label: 'Resume Signal', summary: '3 successful consumer ed products, 2M+ MAU at peak' },
        ],
        risk_flags: [
          { level: 'medium', label: 'Offer Terms Unconfirmed', detail: 'Equity package needs client confirmation before shortlist advance; blocking promotion until confirmed' },
        ],
        disabled_external_actions: [
          { action_type: 'candidate_outreach', state: 'blocked', label: 'Advance Offer Discussion', reason: 'External outreach disabled in prototype' },
          { action_type: 'client_notification', state: 'blocked', label: 'Confirm Equity with Client', reason: 'Client notifications disabled in prototype' },
        ],
        learning_type: 'Founder-fit dependency',
        automation_opportunity: 'flag-stale-feedback',
      },
    ],
  },

  // ── CASE 009: EXTERNAL ACTION ATTEMPT case ────────────────────────────────
  {
    id: 'case-009',
    title: '[SYNTHETIC] CTO – Fintech Unicorn (External Action Attempted)',
    role: 'CTO',
    client_code: 'CLIENT-IOTA',
    current_state: 'external_action_attempt',
    current_stage: 'Recommendation Pack',
    review_status: 'needs_human_review',
    privacy_status: 'no_real_pii',
    source_status: 'synthetic_simulation',
    created_at: '2024-02-20',
    candidates: [
      {
        synthetic: true,
        privacy_status: 'no_real_pii',
        source_status: 'synthetic_simulation',
        pii_fields_present: false,
        id: 'cand-i1',
        code: 'CAND-I1',
        fit_score: 89,
        recommendation_pack_id: 'rpack-i1-001',
        score_breakdown: { technical: 92, leadership: 87, culture_fit: 85, growth_potential: 90 },
        stage_run: [
          { stage: 'Need', status: 'completed', review_status: 'approved', started_at: '2024-02-20', completed_at: '2024-02-22' },
          { stage: 'Role Profile', status: 'completed', review_status: 'approved', started_at: '2024-02-22', completed_at: '2024-02-25' },
          { stage: 'Talent Map', status: 'completed', review_status: 'approved', started_at: '2024-02-25', completed_at: '2024-02-28' },
          { stage: 'Longlist', status: 'completed', review_status: 'approved', started_at: '2024-02-28', completed_at: '2024-03-03', reviewer: 'RECRUITER-I' },
          { stage: 'Shortlist', status: 'completed', review_status: 'approved', started_at: '2024-03-03', completed_at: '2024-03-10', reviewer: 'RECRUITER-I' },
          { stage: 'Recommendation Pack', status: 'blocked', review_status: 'needs_human_review', started_at: '2024-03-10', reviewer: 'RECRUITER-I' },
        ],
        decision_log: [
          { stage: 'Recommendation Pack', decision: 'hold', reason: 'SYSTEM: Unauthorized external submission attempt intercepted – requires human approval before any client-facing action', by: 'SYSTEM-GUARD', at: '2024-03-11' },
        ],
        evidence_refs: [
          { type: 'interview_note', label: 'CTO Technical Assessment', summary: 'Exceptional architecture thinking, deep ML infrastructure expertise' },
          { type: 'reference_check', label: 'Reference: Previous CEO', summary: 'Led successful Series B through D technical scaling' },
        ],
        risk_flags: [
          { level: 'high', label: 'External Action Attempt Blocked', detail: 'An automated process attempted to send recommendation pack without human approval. Halted by safety guard.' },
        ],
        disabled_external_actions: [
          { action_type: 'submit_recommendation', state: 'blocked', label: 'Submit to Client (Blocked – Awaiting Approval)', reason: 'Previous unauthorized attempt detected; human approval required' },
          { action_type: 'client_notification', state: 'blocked', label: 'Notify Client', reason: 'All notifications suspended pending review' },
          { action_type: 'send_email', state: 'blocked', label: 'Send Any Email', reason: 'Email suspended pending review' },
        ],
        learning_type: 'anomaly-escalation',
        automation_opportunity: 'none',
      },
    ],
  },
];

export const STAGE_ORDER: Stage[] = [
  'Need',
  'Role Profile',
  'Talent Map',
  'Longlist',
  'Shortlist',
  'Recommendation Pack',
  'Client Feedback',
  'Learning Artifact',
];

export const WORKFLOW_STATE_LABELS: Record<WorkflowCaseState, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-slate-100 text-slate-500' },
  active: { label: 'Active', color: 'bg-green-100 text-green-700' },
  blocked: { label: 'Blocked', color: 'bg-red-100 text-red-700' },
  needs_human_review: { label: 'Needs Human Review', color: 'bg-amber-100 text-amber-700' },
  returned: { label: 'Returned', color: 'bg-orange-100 text-orange-700' },
  rejected: { label: 'Rejected', color: 'bg-red-200 text-red-800' },
  to_confirm: { label: 'To Confirm', color: 'bg-yellow-100 text-yellow-700' },
  privacy_violation: { label: 'Privacy Violation', color: 'bg-purple-100 text-purple-700' },
  stale_mock_data: { label: 'Stale Mock Data', color: 'bg-slate-100 text-slate-600' },
  external_action_attempt: { label: 'External Action Attempt', color: 'bg-rose-100 text-rose-700' },
  closed: { label: 'Closed', color: 'bg-slate-200 text-slate-500' },
};

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, { label: string; color: string }> = {
  pending_review: { label: 'Pending Review', color: 'bg-blue-100 text-blue-700' },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-700' },
  needs_human_review: { label: 'Needs Human Review', color: 'bg-amber-100 text-amber-700' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-600' },
  overridden: { label: 'Overridden', color: 'bg-violet-100 text-violet-700' },
};
