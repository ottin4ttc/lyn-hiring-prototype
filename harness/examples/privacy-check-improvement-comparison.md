# Privacy-check 改进前后对比 — LYN-1180

## 问题描述

**改进前**：privacy-check 对否定句、禁止条款、边界描述的识别过于宽泛，导致 false-positive BLOCKED，Reviewer 难以区分"这是规则描述"还是"实际违规"。

**改进后**：新增 `classification` 字段，将信号分为 `actual-risk`（需立即处理）和 `guardrail-mention`（否定/边界描述，常见 false-positive），并提供判定理由和人工复核建议。

---

## 对比示例 1：边界声明文本

**输入**：
```
验收标准：不接入真实候选人数据，不触达真实候选人，不写入任何外部系统（飞书/CRM/ATS）。
```

| 指标 | 改进前 | 改进后 |
|---|---|---|
| risk_level | `BLOCKED` | `LOW` |
| recommendation | `block` | `review` |
| 外部触达信号状态 | `FAIL` | `WARN（guardrail-mention）` |
| 真实候选人信号状态 | `FAIL` | `WARN（guardrail-mention）` |
| 判定理由 | ❌ 无 | ✅ "匹配内容处于否定语境，判断为 guardrail-mention" |
| 人工复核建议 | ❌ 无 | ✅ "这是对该行为的禁止描述，还是确实正在发生该动作？" |

**结论**：改进后正确识别为 false-positive，风险等级从 BLOCKED 降至 LOW，不再误阻断流程。

---

## 对比示例 2：实际 PII（真实手机号）

**输入**：
```
候选人王某的手机号是 13812345678，请直接联系。
```

| 指标 | 改进前 | 改进后 |
|---|---|---|
| risk_level | `BLOCKED` | `BLOCKED` |
| pii_cn_mobile 状态 | `FAIL` | `FAIL（actual-risk）` |
| classification | ❌ 无字段 | ✅ `actual-risk` |
| raw_signals | ❌ 无 | ✅ `["13812345678"]` |

**结论**：真实 PII 仍被正确检测并升级为 FAIL/BLOCKED，未因改进而漏报。

---

## 对比示例 2b：实际邮箱、LinkedIn 与真实候选人描述

**输入**：
```
候选人王某曾在某大型模型公司负责推理平台，可通过 candidate@redacted.invalid 或 linkedin.com/in/synthetic-person-123 联系。
```

| 指标 | 改进前 | 改进后 |
|---|---|---|
| risk_level | `LOW` | `BLOCKED` |
| pii_email 状态 | `WARN` | `FAIL（actual-risk）` |
| pii_linkedin_url 状态 | `WARN` | `FAIL（actual-risk）` |
| pii_real_name_pattern 状态 | `WARN` | `FAIL（actual-risk）` |
| cand_non_synthetic 状态 | `WARN`，无 excerpt | `FAIL（actual-risk）`，带 `raw_signals` + `source_ref.excerpt` |

**结论**：真实邮箱、LinkedIn URL、真实候选人描述和非合成候选人数据不因 false-positive 降噪而放行。

---

## 对比示例 3：实际飞书写入

**输入**：
```
已完成候选人评估，现在写入飞书文档 ID doc-xxx-001，同时给客户发送推荐包。
```

| 指标 | 改进前 | 改进后 |
|---|---|---|
| risk_level | `BLOCKED` | `BLOCKED` |
| ext_feishu_write 状态 | `FAIL` | `FAIL（actual-risk）` |
| ext_client_visible 状态 | `FAIL` | `FAIL（actual-risk）` |

**结论**：实际飞书写入和客户可见内容外发仍触发 BLOCKED，红线未被放松。

---

## 改进摘要

| 改进点 | 说明 |
|---|---|
| `classification` 字段 | 每条 finding 标注 `actual-risk` 或 `guardrail-mention` |
| `raw_signals` 字段 | 记录规则匹配到的原始字符串（最多 2 条） |
| `judgment_reason` 字段 | 说明为何判定为该分类 |
| `human_review` 字段 | 针对当前分类的差异化人工复核建议 |
| `source_ref.excerpt` 改进 | 现在包含匹配上下文（前后各 30-50 字符），而非只输出匹配串本身 |
| `guardrail_mention_count` 摘要 | summary 新增 false-positive 候选计数 |
| `actual_risk_count` 摘要 | summary 新增实际违规信号计数 |
| markdown 输出改进 | 独立区分 actual-risk 表格 vs guardrail-mention 表格，并给出说明 |
| 否定前缀检测 | 新增 `classifySignal()` 函数，检测前 60 字符内的否定前缀 |

## 安全红线验证

✅ **未因改进而漏报的情况**：
- 真实手机号（`noNegationCheck: true`）：始终为 actual-risk
- 真实邮件地址（`noNegationCheck: true`）：始终为 actual-risk  
- 真实身份证号（`noNegationCheck: true`）：始终为 actual-risk
- LinkedIn URL（`noNegationCheck: true`）：始终为 actual-risk
- 实际飞书写入（无否定前缀）：始终为 actual-risk FAIL

✅ **人工复核入口保留**：
- `guardrail-mention` 信号状态降级为 WARN，而非直接 PASS
- 所有 `guardrail-mention` 都有 `human_review` 字段要求人工确认
- `recommendation` 为 `review`，不会自动放行
