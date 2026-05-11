# LYN-135 · v0.2 模拟原型前端

> ⚠️ **SYNTHETIC DATA ONLY** — 所有候选人、公司、数据均为虚构，无真实 PII。

## 工作台概览

| # | 工作台 | 路由 | 说明 |
|---|--------|------|------|
| 1 | Case Simulator | `/` | 浏览所有 mock Case，查看状态流转 |
| 2 | Pipeline Board | `/pipeline` | 看板视图，候选人阶段分布 |
| 3 | Evidence Panel | `/evidence` | 候选人证据、评分、决策日志、风险标记 |
| 4 | Recommendation Pack | `/recommendation` | 推荐包预览（外发动作已禁用） |
| 5 | Learning Loop | `/learning` | Learning Artifact 和模式库 |

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

- `stage_run` — 候选人经历的完整阶段列表
- `decision_log` — 每阶段决策及原因
- `fit_score` — 综合 fit 分
- `score_breakdown` — 技术/领导力/文化/成长四维分
- `evidence_refs` — 证据引用（面试记录/简历信号/背调/项目）
- `risk_flags` — 风险标记（low/medium/high）
- `learning_artifact` — 洞察 + 模式 + 建议动作

## Mock Case 场景

| Case | 职位 | 当前阶段 | 候选人数 |
|------|------|---------|---------|
| case-001 | Head of Product | Shortlist | 2 |
| case-002 | Engineering Manager | Recommendation Pack | 1 |
| case-003 | Chief of Staff | Client Feedback | 1 |

## 安全边界

- ✅ 所有 mock 数据标记 `[SYNTHETIC] / no_real_pii`
- 🚫 推荐包外发 — **disabled**
- 🚫 飞书 Base 写入 — **disabled**
- 🚫 客户/候选人触达 — **disabled**
- 🚫 自动创建 Agent/外部任务 — **disabled**

## 依赖

- Next.js 15 (App Router)
- React 18
- Tailwind CSS
- Lucide React

## Issue

LYN-135 · 父任务 LYN-131
