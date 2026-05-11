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

## Mock Case 场景（11 cases）

| Case ID | 职位 | `current_state` | 当前阶段 | 场景说明 |
|---------|------|-----------------|---------|---------|
| case-000 | Head of Marketing | `pending` | Need | **QA: Pending 启动** — 未开始的 case，支持"🚀 Start Case"按钮启动 |
| case-001 | Head of Product | `active` | Shortlist | 正常进行中，含 IC-to-Manager 风险，2 名候选人 |
| case-002 | Engineering Manager | `active` | Recommendation Pack | 推荐包已就绪，外发动作 blocked |
| case-003 | Chief of Staff | `needs_human_review` | Client Feedback | 客户反馈阶段，Founder fit 依赖，薪资超预算 |
| case-004 | VP Engineering | `closed` | Learning Artifact | **完整 8 阶段全流程**，含 mock_feedback 和 learning artifact |
| case-005 | Head of Sales | `blocked` | Shortlist | **QA: Blocked** — 背调发现矛盾，blocked stage_run，需人工审核 |
| case-006 | CFO | `returned` | Recommendation Pack | **QA: Returned** — 推荐包被退回（seed 数据），decision_log 留痕，页面加载即显示在 Returned Pack Queue |
| case-007 | General Counsel | `privacy_violation` | Longlist | **QA: Privacy Violation** — 隐私触发，评分清零，所有动作 blocked |
| case-008 | Head of Design | `stale_mock_data` | Shortlist | **QA: Stale Mock Data** — >90 天无活动，数据陈旧警告，Pipeline Board stale_mock_data 列有说明 |
| case-009 | CTO | `external_action_attempt` | Recommendation Pack | **QA: External Action Attempt** — 非授权外部提交被拦截，系统安全守护，Pipeline Board 对应列有说明 |
| case-010 | VP Product | `to_confirm` | Shortlist | **QA: To Confirm** — 客户 equity 条款待确认，人工确认前不得推进，Pipeline Board to_confirm 列有说明 |

## 工作台交互说明

### Case Simulator (`/`)

**可见 QA 操作入口：**
- **🚀 Start Case**（仅 `pending` case 显示）
  - 点击后：`current_state` → `active`，`stage_run.status` → `in_progress`，`decision_log` 写入 `advance` 记录
  - QA 验证路径：展开 case-000 → 输入原因（可选）→ 点击 Start Case → 验证 decision_log 蓝色 ⚡ 条目新增
- **▶ Advance Stage**（非 blocked/returned 时可用）
  - 写入当前阶段 `completed`，推进到下一阶段 `in_progress`，`decision_log` 写入 `advance`
- **↩ Return**
  - `stage_run.status` → `returned`，`review_status` → `rejected`，`decision_log` 写入 `return`
- **⛔ Block**
  - `stage_run.status` → `blocked`，`review_status` → `needs_human_review`，`decision_log` 写入 `block`
- **审核操作**（amber 底色区，当阶段为 `in_progress` / `pending_review` / `needs_human_review` 时显示）
  - **↩ Return for Review**：`review_status` → `needs_human_review`，`stage_run` → `returned`，`decision_log` 写入 `return`
  - **✕ Reject Review**：`review_status` → `rejected`，`stage_run` → `returned`，`decision_log` 写入 `reject`

**所有操作即时写入本地 decision_log（蓝色 ⚡ 标记区分 seed data）**

### Pipeline Board (`/pipeline`)

- **11 列看板**：`pending / active / to_confirm / needs_human_review / blocked / returned / rejected / privacy_violation / stale_mock_data / external_action_attempt / closed`
- **异常状态列（含 QA 说明横幅）**：
  - `to_confirm` 列：黄色说明横幅 + case-010 (VP Product) 卡片
  - `stale_mock_data` 列：灰色说明横幅 + case-008 (Head of Design) 卡片
  - `external_action_attempt` 列：红色说明横幅 + case-009 (CTO) 卡片
  - `privacy_violation` 列：紫色说明横幅 + case-007 (General Counsel) 卡片
  - `returned` 列：橙色说明横幅 + case-006 (CFO) 卡片，含 decision_delta
- 每张卡片展示：`review_status` badge、stage+status、`decision_log` 最近决策原因、风险标记

### Recommendation Pack (`/recommendation`)

**三分区显示（退回后候选人始终可见，不会消失）：**
- **↩ Returned Pack Queue**（页面顶部优先展示）
  - seed data: case-006 (CFO, cand-f1) 页面加载即在此区 — 橙色横幅显示 `[RETURNED] 推荐包需修订` + 退回原因 + `review_status`
  - decision_log 中所有 `return` 类型决策在横幅下方独立展示（橙色背景）
  - 完整 Decision Log 段落始终可见，`return`/`reject` 条目用橙色/红色高亮
  - 点击"↩ Return for Revision"后：候选人立即移入此区，Pack Decision Log 显示操作记录
- **✓ Approved Packs**：批准后独立分区，绿色横幅
- **📋 Active Packs – Pending Review**：待审核候选人
- 顶部统计：总数 / 已退回 / 已批准 / 待审核

**技术说明（修复）：** `CandidateCard` 已从内联函数提取为模块级组件，避免 React 每次渲染时将其视为新组件类型导致的重挂载问题（之前导致退回后候选人从列表消失）。

### Evidence Panel (`/evidence`)

- 批准/Hold/拒绝按钮各有独立 handler，写入 decision_log
- 支持 `?cand=<candidateId>` URL 参数直接定位候选人

### Learning Loop (`/learning`)

- 展示 `mock_feedback` 反馈链路（含 decision_delta / source refs）
- 内置表单可提交新 feedback，本地累计

## QA 验证步骤（逐项）

### Item 1: 可见 QA Cases — to_confirm / stale_mock_data / external_action_attempt

```
1. 打开 /pipeline
2. 找到 "To Confirm" 列 → 应有 case-010 (VP Product, CLIENT-LAMBDA)
   - 黄色说明横幅："QA: 等待人工确认"
   - 候选人卡片含 risk_flag: "Offer Terms Unconfirmed"
   - decision_log: "TO CONFIRM: Client has not confirmed equity structure..."
3. 找到 "Stale Mock Data" 列 → 应有 case-008 (Head of Design, CLIENT-THETA)
   - 灰色说明横幅："QA: 数据陈旧"
   - risk_flag: "Stale Data Warning (>90 days)"
4. 找到 "External Action Attempt" 列 → 应有 case-009 (CTO, CLIENT-IOTA)
   - 红色说明横幅："QA: 外部动作已拦截"
   - risk_flag: "External Action Attempt Blocked"
5. 打开 / (Case Simulator) → 展开 case-010 / case-008 / case-009 → 验证 decision_log 和 stage_run 内容
```

### Item 2: Case Simulator — 启动 pending case / 审核 return/reject 写入

```
1. 打开 / (Case Simulator)
2. 展开 case-000 (Head of Marketing, pending)
   - 应看到 "🚀 Start Case" 蓝色按钮（其他 case 无此按钮）
   - 输入原因 "测试启动" → 点击 Start Case
   - 验证：decision_log 出现蓝色 ⚡ 条目，action=advance，reason="测试启动"
   - 验证：stage_run 最后一项 status → in_progress
3. 展开任意 active case（如 case-001）
   - 应看到 amber 底色 "审核操作" 区域（当 stage in_progress 时显示）
   - 点击 "↩ Return for Review" → decision_log ⚡ 条目 action=return，review_status=needs_human_review
   - 点击 "✕ Reject Review" → decision_log ⚡ 条目 action=reject，review_status=rejected
   - 两者均写入 stage_run（通过 stage history timeline 可见 returned 标记）
```

### Item 3: Recommendation Pack — 退回留痕可见

```
1. 打开 /recommendation
2. 页面顶部应直接看到 "↩ Returned Pack Queue" 分区（seed data: case-006 CFO, cand-f1）
   - 橙色横幅：[RETURNED] 推荐包需修订
   - 退回原因："Client returned: insufficient IPO-readiness evidence..."
   - case_state: returned
   - Decision Log 中 return 条目用橙色高亮
3. 在 Active Packs 中找到任意候选人 → 输入原因 → 点击 "↩ Return for Revision"
   - 候选人立即移入 "Returned Pack Queue"（不消失！）
   - 橙色横幅显示原因 + 时间戳
   - Pack Decision Log 显示操作记录
4. 再次点击 "✓ Mark Approved" 同一候选人 → 移入 "Approved Packs" 分区
```

### Item 4: README 场景与验证说明

参见本文件"Mock Case 场景"表（11 cases）和"QA 验证步骤"各节。

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
