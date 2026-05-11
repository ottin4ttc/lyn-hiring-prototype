/**
 * SYNTHETIC / NO_REAL_PII
 * All data below is entirely fictional.
 * No real candidates, companies, or personal data.
 */

export type Stage =
  | 'Need'
  | 'Role Profile'
  | 'Talent Map'
  | 'Longlist'
  | 'Shortlist'
  | 'Recommendation Pack'
  | 'Client Feedback'
  | 'Learning Artifact';

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

export interface LearningArtifact {
  insight: string;
  pattern: string;
  suggested_action: string;
}

export interface Candidate {
  id: string;
  name: string; // [SYNTHETIC]
  code: string; // internal code, no PII link
  fit_score: number;
  score_breakdown: ScoreBreakdown;
  evidence_refs: EvidenceRef[];
  risk_flags: RiskFlag[];
  current_stage: Stage;
  stage_run: Stage[];
  decision_log: DecisionLog[];
  learning_artifact?: LearningArtifact;
}

export interface HiringCase {
  id: string;
  title: string;
  role: string;
  client_code: string; // [SYNTHETIC] no real client name
  status: 'active' | 'closed' | 'on_hold';
  current_stage: Stage;
  candidates: Candidate[];
  created_at: string;
}

// ── Mock Data ──────────────────────────────────────────────────────────────────

export const MOCK_CASES: HiringCase[] = [
  {
    id: 'case-001',
    title: '[SYNTHETIC] Head of Product – FinTech Scale-up',
    role: 'Head of Product',
    client_code: 'CLIENT-ALPHA',
    status: 'active',
    current_stage: 'Shortlist',
    created_at: '2024-03-01',
    candidates: [
      {
        id: 'cand-001',
        name: '[SYNTHETIC] Zhang Wei',
        code: 'CAND-001',
        fit_score: 87,
        score_breakdown: { technical: 82, leadership: 90, culture_fit: 88, growth_potential: 85 },
        current_stage: 'Shortlist',
        stage_run: ['Need', 'Role Profile', 'Talent Map', 'Longlist', 'Shortlist'],
        decision_log: [
          { stage: 'Longlist', decision: 'advance', reason: '强产品方法论，B 端经验丰富', by: 'Recruiter-A', at: '2024-03-10' },
          { stage: 'Shortlist', decision: 'pending', reason: '待二面', by: 'Recruiter-A', at: '2024-03-18' },
        ],
        evidence_refs: [
          { type: 'interview_note', label: '一面记录', summary: '清晰的产品路线图能力，对 fintech compliance 有认知' },
          { type: 'resume_signal', label: '履历信号', summary: '曾主导 0→1 产品上线，GMV 增长 3x' },
        ],
        risk_flags: [
          { level: 'low', label: '管理层级跨越', detail: '从 PM 到 Head，首次担任此级别管理职' },
        ],
        learning_artifact: {
          insight: '强 IC 背景候选人在首次管理岗适应期通常需要 3-6 个月',
          pattern: 'IC-to-Manager transition',
          suggested_action: '建议安排与 CPO 的 shadowing session',
        },
      },
      {
        id: 'cand-002',
        name: '[SYNTHETIC] Li Mei',
        code: 'CAND-002',
        fit_score: 74,
        score_breakdown: { technical: 70, leadership: 80, culture_fit: 72, growth_potential: 76 },
        current_stage: 'Longlist',
        stage_run: ['Need', 'Role Profile', 'Talent Map', 'Longlist'],
        decision_log: [
          { stage: 'Longlist', decision: 'hold', reason: '行业背景较弱，待补充案例', by: 'Recruiter-B', at: '2024-03-12' },
        ],
        evidence_refs: [
          { type: 'resume_signal', label: '履历信号', summary: '电商 PM 5 年，金融行业经验有限' },
        ],
        risk_flags: [
          { level: 'medium', label: '行业迁移风险', detail: 'FinTech 合规知识需快速补强' },
        ],
      },
    ],
  },
  {
    id: 'case-002',
    title: '[SYNTHETIC] Engineering Manager – AI Infrastructure',
    role: 'Engineering Manager',
    client_code: 'CLIENT-BETA',
    status: 'active',
    current_stage: 'Recommendation Pack',
    created_at: '2024-02-15',
    candidates: [
      {
        id: 'cand-003',
        name: '[SYNTHETIC] Wang Fang',
        code: 'CAND-003',
        fit_score: 92,
        score_breakdown: { technical: 95, leadership: 88, culture_fit: 90, growth_potential: 94 },
        current_stage: 'Recommendation Pack',
        stage_run: ['Need', 'Role Profile', 'Talent Map', 'Longlist', 'Shortlist', 'Recommendation Pack'],
        decision_log: [
          { stage: 'Longlist', decision: 'advance', reason: '分布式系统背景强', by: 'Recruiter-C', at: '2024-02-20' },
          { stage: 'Shortlist', decision: 'advance', reason: '三轮面试均优', by: 'Recruiter-C', at: '2024-03-01' },
          { stage: 'Recommendation Pack', decision: 'advance', reason: '综合评分最高，推荐提交', by: 'Recruiter-C', at: '2024-03-10' },
        ],
        evidence_refs: [
          { type: 'interview_note', label: '技术面记录', summary: '系统设计题满分，带过 20+ 人技术团队' },
          { type: 'reference_check', label: '背调结果', summary: '前主管高度评价其技术判断力和团队凝聚力' },
          { type: 'project_record', label: '项目记录', summary: '主导训练平台从 500 GPU 扩展至 5000 GPU' },
        ],
        risk_flags: [],
        learning_artifact: {
          insight: 'AI infra 方向顶尖 EM 候选人极度稀缺，pipeline 建立周期通常 >45 天',
          pattern: 'Scarce-talent pipeline',
          suggested_action: '建议同步启动备选 pipeline，避免 offer 阶段流失',
        },
      },
    ],
  },
  {
    id: 'case-003',
    title: '[SYNTHETIC] Chief of Staff – Series C Startup',
    role: 'Chief of Staff',
    client_code: 'CLIENT-GAMMA',
    status: 'active',
    current_stage: 'Client Feedback',
    created_at: '2024-01-20',
    candidates: [
      {
        id: 'cand-004',
        name: '[SYNTHETIC] Chen Jia',
        code: 'CAND-004',
        fit_score: 81,
        score_breakdown: { technical: 75, leadership: 86, culture_fit: 84, growth_potential: 80 },
        current_stage: 'Client Feedback',
        stage_run: ['Need', 'Role Profile', 'Talent Map', 'Longlist', 'Shortlist', 'Recommendation Pack', 'Client Feedback'],
        decision_log: [
          { stage: 'Shortlist', decision: 'advance', reason: '跨职能协调能力突出', by: 'Recruiter-D', at: '2024-02-10' },
          { stage: 'Recommendation Pack', decision: 'advance', reason: '提交客户审阅', by: 'Recruiter-D', at: '2024-02-20' },
          { stage: 'Client Feedback', decision: 'pending', reason: '等待创始人反馈', by: 'CLIENT-GAMMA', at: '2024-03-05' },
        ],
        evidence_refs: [
          { type: 'interview_note', label: '创始人面谈摘要', summary: '对 OKR 体系和跨部门沟通有清晰框架' },
        ],
        risk_flags: [
          { level: 'medium', label: '期望薪资偏高', detail: '要求高于客户预算 15%，需谈判' },
        ],
        learning_artifact: {
          insight: 'CoS 职位对"匹配创始人工作风格"的主观权重极高，客户反馈周期长',
          pattern: 'Founder-fit dependency',
          suggested_action: '提前与创始人对齐打分维度，减少主观模糊',
        },
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
