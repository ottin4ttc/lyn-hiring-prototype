# LYN-135 · v0.2 模拟原型前端

> ⚠️ **SYNTHETIC DATA ONLY** — 所有候选人、公司、数据均为虚构，无真实 PII。

## 工作台概览

| # | 工作台 | 路由 | 说明 |
|---|--------|------|------|
| 1 | Case Simulator | `/` | 浏览所有 mock Case，查看状态流转；支持启动/推进/退回/阻塞/审核 return/reject |
| 2 | Pipeline Board | `/pipeline` | 看板视图，按 `workflow_case.current_state` 分列（11 列） |
| 3 | Evidence Panel | `/evidence` | 候选人证据、评分、决策日志、风险标记，支持批准/Hold/拒绝 |
| 4 | Recommendation Pack | `/recommendation` | 推荐包预览；退回队列与决策日志留痕（外发动作已禁用） |
| 5 | Learning Loop | `/learning` | Learning Artifact 和模式库，支持提交新 feedback |

## 启动方式

```bash
# 安装依赖
npm install   # 或 pnpm install / yarn install

# 本地开发
npm run dev

# 访问
open http://localhost:3000
```

## 核心字段覆盖

- `stage_run` — 候选人经历的完整阶段列表（结构化对象含 status / review_status）
- `decision_log` — 每阶段决策及原因（含 by / at）
- `fit_score` — 综合 fit 分
- `score_breakdown` — 技术/领导力/文化/成长四维分
- `evidence_refs` — 证据引用（面试记录/简历信号/背调/项目）
- `risk_flags` — 风险标记（low/medium/high）
- `learning_artifact` — 洞察 + 模式 + 建议动作
- `mock_feedbacks` — feedback 反馈链路（含 decision_delta / source_stage_run_ids / decision_log_refs）
- `disabled_external_actions` — 枚举型 action_type + state='blocked' + reason
- `privacy_status` / `source_status` / `synthetic` / `pii_fields_present` — 隐私保护字段

## Mock Case 场景

| Case ID | 职位 | `current_state` | 当前阶段 | 场景说明 |
|---------|------|-----------------|---------|---------|
| case-000 | Head of Marketing | `pending` | Need | **QA: Pending 启动** — 未开始的 case，支持"🚀 Start Case"按钮启动 |
| case-001 | Head of Product | `active` | Shortlist | 正常进行中，含 IC-to-Manager 风险 |
| case-002 | Engineering Manager | `active` | Recommendation Pack | 推荐包已就绪，外发动作 blocked |
| case-003 | Chief of Staff | `needs_human_review` | Client Feedback | 客户反馈阶段，Founder fit 依赖 |
| case-004 | VP Engineering | `closed` | Learning Artifact | **完整 8 阶段全流程**，含 mock_feedback 和 learning artifact |
| case-005 | Head of Sales | `blocked` | Shortlist | **QA: Blocked** — 背调发现矛盾，blocked stage_run，需人工审核 |
| case-006 | CFO | `returned` | Recommendation Pack | **QA: Returned** — 推荐包被退回，decision_log 留痕，出现在"Returned Pack Queue" |
| case-007 | General Counsel | `privacy_violation` | Longlist | **QA: Privacy Violation** — 隐私触发，评分清零，所有动作 blocked |
| case-008 | Head of Design | `stale_mock_data` | Shortlist | **QA: Stale Mock Data** — >90 天无活动，数据陈旧警告 |
| case-009 | CTO | `external_action_attempt` | Recommendation Pack | **QA: External Action Attempt** — 非授权外部提交被拦截，系统安全守护 |
| case-010 | VP Product | `to_confirm` | Shortlist | **QA: To Confirm** — 客户 equity 条款待确认，人工确认前不得推进 |

## 工作台交互说明

### Case Simulator (`/`)
- **🚀 Start Case**：仅 `pending` case 显示，点击后将 case 标为 `active` 并写入 decision_log
- **▶ Advance Stage**：推进到下一阶段（blocked/returned 时禁用）
- **↩ Return**：将当前 stage_run 标为 `returned`
- **⛔ Block**：将当前 stage_run 标为 `blocked`
- **↩ Return for Review / ✕ Reject Review**：当阶段有待审核状态时显示，分别将 review_status 更新为 `needs_human_review` 或 `rejected`，写入 decision_log
- 所有操作即时写入本地 decision_log（蓝色 ⚡ 标记区分与 seed data）

### Pipeline Board (`/pipeline`)
- 11 列看板：`pending / active / to_confirm / needs_human_review / blocked / returned / rejected / privacy_violation / stale_mock_data / external_action_attempt / closed`
- 每张卡片展示 `review_status` badge、当前阶段、候选人 fit_score 和风险标记

### Recommendation Pack (`/recommendation`)
- **Returned Pack Queue**：退回候选人始终可见，顶部橙色横幅显示 `[RETURNED] 推荐包需修订` + reason + 时间戳
- **Approved Packs**：批准后独立分区展示，绿色横幅 + 决策日志
- **Active Packs**：待审核候选人
- 每次操作（批准/退回）即时写入 Pack Decision Log，带完整时间戳，始终可见

### Evidence Panel (`/evidence`)
- 批准/Hold/拒绝按钮各有独立 handler，写入 decision_log

### Learning Loop (`/learning`)
- 展示 `mock_feedback` 反馈链路（含 decision_delta / source refs）
- 内置表单可提交新 feedback，本地累计

## 安全边界（红线）

- ✅ 所有 mock 数据标记 `[SYNTHETIC] / no_real_pii`，`pii_fields_present: false`
- ✅ 所有候选人使用代号（CAND-A1 ~ CAND-K1），无真人式姓名
- 🚫 推荐包外发 — **disabled / blocked**
- 🚫 飞书 Base 写入 — **disabled / blocked**
- 🚫 客户/候选人触达 — **disabled / blocked**
- 🚫 自动创建 Agent/外部任务 — **disabled / blocked**
- 🚫 真实 API 调用 — **无任何 fetch/axios/外部 HTTP 请求**

## 依赖

- Next.js 15 (App Router)
- React 18
- Tailwind CSS
- TypeScript

## Issue

LYN-135 · 父任务 LYN-131
