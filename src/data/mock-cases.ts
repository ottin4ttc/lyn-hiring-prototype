/**
 * SYNTHETIC / NO_REAL_PII
 * All data is entirely fictional. No real candidates, companies, or personal data.
 * All candidates carry synthetic=true, privacy_status='no_real_pii', pii_fields_present=false.
 */

// ── Core enums / literals ──────────────────────────────────────────────────

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
  | 'returned'
  | 'needs_human_review';

export type ReviewStatus =
  | 'pending_review'
  | 'approved'
  | 'returned'
  | 'rejected'
  | 'needs_revision';

export type PrivacyStatus = 'no_real_pii' | 'privacy_violation' | 'pending_check';
export type SourceStatus  = 'synthetic_simulation' | 'stale_mock_data' | 'real_data_blocked';

export type ExternalActionType =
  | 'send_recommendation'
  | 'send_email'
  | 'feishu_write'
  | 'create_external_task'
  | 'candidate_contact';

export type AnomalyType =
  | 'blocked'
  | 'needs_human_review'
  | 'returned'
  | 'privacy_violation'
  | 'stale_mock_data'
  | 'external_action_attempt';

// ── Interfaces ────────────────────────────────────────────────────────────

export interface DisabledExternalAction {
  action_type: ExternalActionType;
  state: 'blocked';
  reason: string;
}

export interface StageRun {
  stage: Stage;
  status: StageRunStatus;
  review_status: ReviewStatus;
  started_at: string;
  completed_at?: string;
  reviewer?: string;
  notes?: string;
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
  decision: 'advance' | 'hold' | 'reject' | 'pending';
  reason: string;
  by: string;
  at: string;
}

export interface RiskFlag {
  level: 'low' | 'medium' | 'high';
  label: string;
  detail: string;
}

export interface MockFeedback {
  id: string;
  feedback_text: string;
  decision_delta: string;
  source_stage_run_ids: string[];
  decision_log_refs: string[];
  submitted_at: string;
  submitted_by: string;
}

export interface LearningArtifact {
  insight: string;
  pattern: string;
  suggested_action: string;
  learning_type: 'process_improvement' | 'candidate_pattern' | 'market_signal';
  automation_opportunity: string;
  mock_feedbacks: MockFeedback[];
}

export interface Candidate {
  id: string;
  code: string;
  synthetic: true;
  privacy_status: PrivacyStatus;
  source_status: SourceStatus;
  pii_fields_present: false;
  fit_score: number;
  score_breakdown: ScoreBreakdown;
  evidence_refs: EvidenceRef[];
  risk_flags: RiskFlag[];
  current_stage: Stage;
  stage_runs: StageRun[];
  decision_log: DecisionLog[];
  recommendation_pack_id?: string;
  learning_artifact?: LearningArtifact;
  disabled_external_actions: DisabledExternalAction[];
}

export interface WorkflowCase {
  id: string;
  identifier: string;
  title: string;
  role: string;
  client_code: string;
  synthetic: true;
  privacy_status: PrivacyStatus;
  source_status: SourceStatus;
  current_state: StageRunStatus;
  review_status: ReviewStatus;
  current_stage: Stage;
  candidates: Candidate[];
  created_at: string;
  anomaly_type?: AnomalyType;
}

// ── Constants ─────────────────────────────────────────────────────────────

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

// ── Helpers ───────────────────────────────────────────────────────────────

function completedRun(stage: Stage, started: string, completed: string, reviewer?: string): StageRun {
  return { stage, status: 'completed', review_status: 'approved', started_at: started, completed_at: completed, reviewer };
}

function inProgressRun(stage: Stage, started: string): StageRun {
  return { stage, status: 'in_progress', review_status: 'pending_review', started_at: started };
}

const DEFAULT_BLOCKED_ACTIONS: DisabledExternalAction[] = [
  { action_type: 'send_recommendation', state: 'blocked', reason: '推荐包外发在模拟原型中禁用，不产生真实副作用' },
  { action_type: 'send_email',          state: 'blocked', reason: '邮件发送在模拟原型中禁用' },
  { action_type: 'feishu_write',        state: 'blocked', reason: '飞书 Base 写入在模拟原型中禁用' },
  { action_type: 'create_external_task',state: 'blocked', reason: '创建外部任务在模拟原型中禁用' },
  { action_type: 'candidate_contact',   state: 'blocked', reason: '候选人真实触达在模拟原型中禁用' },
];

// ── Mock Cases ────────────────────────────────────────────────────────────

export const MOCK_CASES: WorkflowCase[] = [

  // ─── CASE-001: Active · Shortlist ────────────────────────────────────────
  {
    id: 'case-001',
    identifier: 'CASE-001',
    title: '[SYNTHETIC] Head of Product – FinTech Scale-up',
    role: 'Head of Product',
    client_code: 'CLIENT-ALPHA',
    synthetic: true,
    privacy_status: 'no_real_pii',
    source_status: 'synthetic_simulation',
    current_state: 'in_progress',
    review_status: 'pending_review',
    current_stage: 'Shortlist',
    created_at: '2024-03-01',
    candidates: [
      {
        id: 'cand-a1',
        code: 'CAND-A1',
        synthetic: true,
        privacy_status: 'no_real_pii',
        source_status: 'synthetic_simulation',
        pii_fields_present: false,
        fit_score: 87,
        score_breakdown: { technical: 82, leadership: 90, culture_fit: 88, growth_potential: 85 },
        current_stage: 'Shortlist',
        stage_runs: [
          completedRun('Need',          '2024-03-01', '2024-03-02', 'REC-01'),
          completedRun('Role Profile',  '2024-03-02', '2024-03-04', 'REC-01'),
          completedRun('Talent Map',    '2024-03-04', '2024-03-07', 'REC-01'),
          completedRun('Longlist',      '2024-03-07', '2024-03-10', 'REC-01'),
          inProgressRun('Shortlist',    '2024-03-10'),
        ],
        decision_log: [
          { stage: 'Longlist',  decision: 'advance', reason: '强产品方法论，B 端经验丰富', by: 'REC-01', at: '2024-03-10' },
          { stage: 'Shortlist', decision: 'pending', reason: '待二面确认', by: 'REC-01', at: '2024-03-18' },
        ],
        evidence_refs: [
          { type: 'interview_note', label: '一面记录', summary: '清晰的产品路线图能力，对合规有认知' },
          { type: 'resume_signal',  label: '履历信号', summary: '曾主导 0→1 产品上线，增长 3x' },
        ],
        risk_flags: [
          { level: 'low', label: '管理层级跨越', detail: '首次担任此级别管理职，适应期约 3-6 个月' },
        ],
        recommendation_pack_id: undefined,
        disabled_external_actions: DEFAULT_BLOCKED_ACTIONS,
      },
      {
        id: 'cand-a2',
        code: 'CAND-A2',
        synthetic: true,
        privacy_status: 'no_real_pii',
        source_status: 'synthetic_simulation',
        pii_fields_present: false,
        fit_score: 74,
        score_breakdown: { technical: 70, leadership: 80, culture_fit: 72, growth_potential: 76 },
        current_stage: 'Longlist',
        stage_runs: [
          completedRun('Need',        '2024-03-01', '2024-03-02', 'REC-02'),
          completedRun('Role Profile', '2024-03-02', '2024-03-04', 'REC-02'),
          completedRun('Talent Map',   '2024-03-04', '2024-03-07', 'REC-02'),
          { stage: 'Longlist', status: 'returned', review_status: 'returned', started_at: '2024-03-07', completed_at: '2024-03-12', reviewer: 'REC-02', notes: '行业背景较弱，待补充案例' },
        ],
        decision_log: [
          { stage: 'Longlist', decision: 'hold', reason: '行业背景较弱，待补充案例', by: 'REC-02', at: '2024-03-12' },
        ],
        evidence_refs: [
          { type: 'resume_signal', label: '履历信号', summary: '电商 PM 5 年，目标行业经验有限' },
        ],
        risk_flags: [
          { level: 'medium', label: '行业迁移风险', detail: '合规知识需快速补强' },
        ],
        disabled_external_actions: DEFAULT_BLOCKED_ACTIONS,
      },
    ],
  },

  // ─── CASE-002: Active · Recommendation Pack ──────────────────────────────
  {
    id: 'case-002',
    identifier: 'CASE-002',
    title: '[SYNTHETIC] Engineering Manager – AI Infrastructure',
    role: 'Engineering Manager',
    client_code: 'CLIENT-BETA',
    synthetic: true,
    privacy_status: 'no_real_pii',
    source_status: 'synthetic_simulation',
    current_state: 'in_progress',
    review_status: 'pending_review',
    current_stage: 'Recommendation Pack',
    created_at: '2024-02-15',
    candidates: [
      {
        id: 'cand-b1',
        code: 'CAND-B1',
        synthetic: true,
        privacy_status: 'no_real_pii',
        source_status: 'synthetic_simulation',
        pii_fields_present: false,
        fit_score: 92,
        score_breakdown: { technical: 95, leadership: 88, culture_fit: 90, growth_potential: 94 },
        current_stage: 'Recommendation Pack',
        stage_runs: [
          completedRun('Need',                '2024-02-15', '2024-02-16', 'REC-03'),
          completedRun('Role Profile',        '2024-02-16', '2024-02-18', 'REC-03'),
          completedRun('Talent Map',          '2024-02-18', '2024-02-21', 'REC-03'),
          completedRun('Longlist',            '2024-02-21', '2024-02-25', 'REC-03'),
          completedRun('Shortlist',           '2024-02-25', '2024-03-01', 'REC-03'),
          inProgressRun('Recommendation Pack','2024-03-01'),
        ],
        decision_log: [
          { stage: 'Longlist',            decision: 'advance', reason: '分布式系统背景强', by: 'REC-03', at: '2024-02-25' },
          { stage: 'Shortlist',           decision: 'advance', reason: '三轮面试均优', by: 'REC-03', at: '2024-03-01' },
          { stage: 'Recommendation Pack', decision: 'pending', reason: '推荐包草稿待审', by: 'REC-03', at: '2024-03-10' },
        ],
        evidence_refs: [
          { type: 'interview_note',  label: '技术面记录',  summary: '系统设计题满分，带过 20+ 人技术团队' },
          { type: 'reference_check', label: '背调结果',    summary: '前主管高度评价其技术判断力和团队凝聚力' },
          { type: 'project_record',  label: '项目记录',    summary: '主导训练平台从 500 GPU 扩展至 5000 GPU' },
        ],
        risk_flags: [],
        recommendation_pack_id: 'REC-PACK-B1-001',
        disabled_external_actions: DEFAULT_BLOCKED_ACTIONS,
      },
    ],
  },

  // ─── CASE-003: Active · Client Feedback ──────────────────────────────────
  {
    id: 'case-003',
    identifier: 'CASE-003',
    title: '[SYNTHETIC] Chief of Staff – Series C Startup',
    role: 'Chief of Staff',
    client_code: 'CLIENT-GAMMA',
    synthetic: true,
    privacy_status: 'no_real_pii',
    source_status: 'synthetic_simulation',
    current_state: 'in_progress',
    review_status: 'pending_review',
    current_stage: 'Client Feedback',
    created_at: '2024-01-20',
    candidates: [
      {
        id: 'cand-c1',
        code: 'CAND-C1',
        synthetic: true,
        privacy_status: 'no_real_pii',
        source_status: 'synthetic_simulation',
        pii_fields_present: false,
        fit_score: 81,
        score_breakdown: { technical: 75, leadership: 86, culture_fit: 84, growth_potential: 80 },
        current_stage: 'Client Feedback',
        stage_runs: [
          completedRun('Need',                '2024-01-20', '2024-01-21', 'REC-04'),
          completedRun('Role Profile',        '2024-01-21', '2024-01-24', 'REC-04'),
          completedRun('Talent Map',          '2024-01-24', '2024-01-28', 'REC-04'),
          completedRun('Longlist',            '2024-01-28', '2024-02-05', 'REC-04'),
          completedRun('Shortlist',           '2024-02-05', '2024-02-15', 'REC-04'),
          completedRun('Recommendation Pack', '2024-02-15', '2024-02-20', 'REC-04'),
          inProgressRun('Client Feedback',    '2024-02-20'),
        ],
        decision_log: [
          { stage: 'Shortlist',           decision: 'advance', reason: '跨职能协调能力突出', by: 'REC-04', at: '2024-02-15' },
          { stage: 'Recommendation Pack', decision: 'advance', reason: '提交客户审阅', by: 'REC-04', at: '2024-02-20' },
          { stage: 'Client Feedback',     decision: 'pending', reason: '等待创始人反馈', by: 'CLIENT-GAMMA', at: '2024-03-05' },
        ],
        evidence_refs: [
          { type: 'interview_note', label: '创始人面谈摘要', summary: '对 OKR 体系和跨部门沟通有清晰框架' },
        ],
        risk_flags: [
          { level: 'medium', label: '期望薪资偏高', detail: '要求高于客户预算 15%，需谈判' },
        ],
        recommendation_pack_id: 'REC-PACK-C1-001',
        disabled_external_actions: DEFAULT_BLOCKED_ACTIONS,
      },
    ],
  },

  // ─── CASE-004: COMPLETE · All 8 stages done ──────────────────────────────
  {
    id: 'case-004',
    identifier: 'CASE-004',
    title: '[SYNTHETIC] VP Engineering – B2B SaaS (COMPLETED)',
    role: 'VP Engineering',
    client_code: 'CLIENT-DELTA',
    synthetic: true,
    privacy_status: 'no_real_pii',
    source_status: 'synthetic_simulation',
    current_state: 'completed',
    review_status: 'approved',
    current_stage: 'Learning Artifact',
    created_at: '2023-11-01',
    candidates: [
      {
        id: 'cand-d1',
        code: 'CAND-D1',
        synthetic: true,
        privacy_status: 'no_real_pii',
        source_status: 'synthetic_simulation',
        pii_fields_present: false,
        fit_score: 95,
        score_breakdown: { technical: 96, leadership: 94, culture_fit: 93, growth_potential: 97 },
        current_stage: 'Learning Artifact',
        stage_runs: [
          completedRun('Need',                '2023-11-01', '2023-11-02', 'REC-05'),
          completedRun('Role Profile',        '2023-11-02', '2023-11-05', 'REC-05'),
          completedRun('Talent Map',          '2023-11-05', '2023-11-10', 'REC-05'),
          completedRun('Longlist',            '2023-11-10', '2023-11-18', 'REC-05'),
          completedRun('Shortlist',           '2023-11-18', '2023-11-28', 'REC-05'),
          completedRun('Recommendation Pack', '2023-11-28', '2023-12-05', 'REC-05'),
          completedRun('Client Feedback',     '2023-12-05', '2023-12-15', 'CLIENT-DELTA'),
          completedRun('Learning Artifact',   '2023-12-15', '2023-12-20', 'REC-05'),
        ],
        decision_log: [
          { stage: 'Longlist',            decision: 'advance', reason: '全栈工程背景 + 强管理经验', by: 'REC-05', at: '2023-11-18' },
          { stage: 'Shortlist',           decision: 'advance', reason: '四轮面试均通过', by: 'REC-05', at: '2023-11-28' },
          { stage: 'Recommendation Pack', decision: 'advance', reason: '最高综合评分，推荐提交', by: 'REC-05', at: '2023-12-05' },
          { stage: 'Client Feedback',     decision: 'advance', reason: '客户确认录用', by: 'CLIENT-DELTA', at: '2023-12-15' },
          { stage: 'Learning Artifact',   decision: 'advance', reason: '经验已提炼归档', by: 'REC-05', at: '2023-12-20' },
        ],
        evidence_refs: [
          { type: 'interview_note',  label: '系统设计面试', summary: '大规模分布式系统设计，获评优秀' },
          { type: 'reference_check', label: '背调', summary: '两位前主管均高度推荐' },
          { type: 'project_record',  label: '项目记录', summary: '带领团队完成核心平台重构，停机降低 99%' },
        ],
        risk_flags: [],
        recommendation_pack_id: 'REC-PACK-D1-001',
        learning_artifact: {
          insight: 'VP Eng 候选人若有大规模分布式系统亲身经历，最终录用率比无经历者高 2.4 倍',
          pattern: 'Hands-on-at-scale to VP conversion',
          suggested_action: '在 Talent Map 阶段优先筛选有 1000+ node 亲历的候选人',
          learning_type: 'candidate_pattern',
          automation_opportunity: '可在简历初筛阶段添加规模关键词自动打标',
          mock_feedbacks: [
            {
              id: 'fb-d1-01',
              feedback_text: '此次流程周期偏长（50 天），主要卡点在背调环节',
              decision_delta: '将背调启动时机从 Shortlist 后移到 Shortlist 中并行',
              source_stage_run_ids: ['stage-run-d1-longlist', 'stage-run-d1-shortlist'],
              decision_log_refs: ['2023-11-18', '2023-11-28'],
              submitted_at: '2023-12-21',
              submitted_by: 'REC-05',
            },
          ],
        },
        disabled_external_actions: DEFAULT_BLOCKED_ACTIONS,
      },
    ],
  },

  // ─── CASE-005: Anomaly · BLOCKED ─────────────────────────────────────────
  {
    id: 'case-005',
    identifier: 'CASE-005',
    title: '[SYNTHETIC] CMO – Consumer Brand (BLOCKED)',
    role: 'CMO',
    client_code: 'CLIENT-EPSILON',
    synthetic: true,
    privacy_status: 'no_real_pii',
    source_status: 'synthetic_simulation',
    current_state: 'blocked',
    review_status: 'needs_revision',
    current_stage: 'Shortlist',
    created_at: '2024-04-01',
    anomaly_type: 'blocked',
    candidates: [
      {
        id: 'cand-e1',
        code: 'CAND-E1',
        synthetic: true,
        privacy_status: 'no_real_pii',
        source_status: 'synthetic_simulation',
        pii_fields_present: false,
        fit_score: 68,
        score_breakdown: { technical: 60, leadership: 72, culture_fit: 70, growth_potential: 65 },
        current_stage: 'Shortlist',
        stage_runs: [
          completedRun('Need',        '2024-04-01', '2024-04-02', 'REC-06'),
          completedRun('Role Profile', '2024-04-02', '2024-04-05', 'REC-06'),
          completedRun('Talent Map',   '2024-04-05', '2024-04-09', 'REC-06'),
          completedRun('Longlist',     '2024-04-09', '2024-04-14', 'REC-06'),
          { stage: 'Shortlist', status: 'blocked', review_status: 'needs_revision', started_at: '2024-04-14', notes: '客户预算冻结，流程暂停' },
        ],
        decision_log: [
          { stage: 'Longlist',  decision: 'advance', reason: '品牌营销经验匹配',       by: 'REC-06', at: '2024-04-14' },
          { stage: 'Shortlist', decision: 'hold',    reason: '客户预算冻结，流程暂停', by: 'REC-06', at: '2024-04-20' },
        ],
        evidence_refs: [
          { type: 'resume_signal', label: '履历信号', summary: '消费品牌 CMO 8 年，多次主导品牌重塑' },
        ],
        risk_flags: [
          { level: 'high', label: '客户预算冻结', detail: '客户已通知预算暂停，流程无法推进' },
        ],
        disabled_external_actions: DEFAULT_BLOCKED_ACTIONS,
      },
    ],
  },

  // ─── CASE-006: Anomaly · NEEDS HUMAN REVIEW + privacy_violation ──────────
  {
    id: 'case-006',
    identifier: 'CASE-006',
    title: '[SYNTHETIC] CISO – Financial Institution (PRIVACY FLAG)',
    role: 'CISO',
    client_code: 'CLIENT-ZETA',
    synthetic: true,
    privacy_status: 'privacy_violation',
    source_status: 'synthetic_simulation',
    current_state: 'needs_human_review',
    review_status: 'pending_review',
    current_stage: 'Longlist',
    created_at: '2024-04-10',
    anomaly_type: 'needs_human_review',
    candidates: [
      {
        id: 'cand-f1',
        code: 'CAND-F1',
        synthetic: true,
        privacy_status: 'privacy_violation',
        source_status: 'synthetic_simulation',
        pii_fields_present: false,
        fit_score: 0,
        score_breakdown: { technical: 0, leadership: 0, culture_fit: 0, growth_potential: 0 },
        current_stage: 'Longlist',
        stage_runs: [
          completedRun('Need',        '2024-04-10', '2024-04-11', 'REC-07'),
          completedRun('Role Profile', '2024-04-11', '2024-04-13', 'REC-07'),
          { stage: 'Talent Map', status: 'needs_human_review', review_status: 'pending_review', started_at: '2024-04-13', notes: '[PRIVACY FLAG] 检测到疑似真实联系方式字段，流程暂停待人工审查' },
          { stage: 'Longlist',   status: 'blocked',            review_status: 'needs_revision',  started_at: '2024-04-14', notes: '等待隐私审查结论后继续' },
        ],
        decision_log: [
          { stage: 'Talent Map', decision: 'hold', reason: '[PRIVACY VIOLATION] 检测到疑似真实 PII 字段，已暂停流程，等待人工审查', by: 'SYSTEM', at: '2024-04-13' },
        ],
        evidence_refs: [],
        risk_flags: [
          { level: 'high', label: 'PRIVACY VIOLATION', detail: '数据源中检测到疑似真实联系方式，评分已清零，等待人工确认' },
        ],
        disabled_external_actions: DEFAULT_BLOCKED_ACTIONS,
      },
    ],
  },
];
