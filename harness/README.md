# Agent Team Harness — Dry-run CLI 最小版

> LYN-1150 / LYN-1179 交付物。所有命令保持 **dry-run**，不写飞书、候选人系统、外部 API。

## 范围选择与取舍说明

本版实现 **progress-manifest + privacy-check** 两个脚本的组合，原因：

| 候选脚本 | 优先级 | 取舍说明 |
|---|---|---|
| `progress-manifest` | ✅ 首选 | LYN-437 已沉淀完整验收口径（5 列格式、9 个字段）；是 v0.3 进展数据自动化的前置；风险最低 |
| `privacy-check` | ✅ 首选 | 任何真实 harness 运行的准入门槛；不通过不应进入外部触达；可在 dry-run 阶段单独运行 |
| `tool-candidate` | 次优 | 依赖 run-messages 聚合，目前 issue 体量不足触发；可作为后续扩展 |
| `run-digest` | 次优 | 需要 run-messages API；当前 harness issue 运行记录不丰富，样例质量低 |
| `retro-extract` | 次优 | 需要完整 case 闭环；当前没有真实 case done 状态 |

## 脚本清单

```
harness/
├── README.md                         # 本文件
├── harness-progress-manifest.js      # progress-manifest dry-run CLI（含在线模式）
├── harness-privacy-check.js          # privacy-check dry-run CLI
├── harness-tool-candidate.js         # tool-candidate dry-run CLI（骨架）
├── schemas/
│   ├── progress-manifest.schema.json # manifest 输出 schema
│   └── privacy-check.schema.json     # privacy 报告 schema
└── examples/
    ├── issues-input.json              # 离线 dry-run 用的本地样例输入
    ├── progress-manifest-sample.json  # 离线 dry-run 样例输出
    ├── progress-manifest-sample.md    # 离线 dry-run 样例 Markdown
    ├── online-manifest-sample.json    # 在线模式（LYN-36 parent）样例 JSON 输出
    ├── online-manifest-sample.md      # 在线模式（LYN-36 parent）样例 Markdown
    └── privacy-check-sample.json      # 隐私检查样例
```

## 使用方法

### progress-manifest

```bash
# 离线模式：从 JSON 文件读取
node harness/harness-progress-manifest.js \
  --input harness/examples/issues-input.json \
  --output json

# 离线模式：从 stdin 读取
cat harness/examples/issues-input.json | \
  node harness/harness-progress-manifest.js --input-stdin --output markdown

# ✅ 在线只读模式：从 Multica 实时读取 parent issue 树（LYN-1179 新增）
node harness/harness-progress-manifest.js \
  --issues 22cd2a15-9893-4a4f-9177-3ac65dd3abf0 \
  --output markdown

# 等价写法：identifier 也可作为 parent-id（通过 multica issue get 解析）
node harness/harness-progress-manifest.js \
  --issues LYN-36 \
  --output table

# 完整参数
node harness/harness-progress-manifest.js --help
```

> ✅ **在线模式（`--issues`）已实现（LYN-1179）。** 可直接从 Multica 读取 parent issue 下的所有子 issue 及其评论，生成等价的 progress-manifest 输出。
>
> **在线模式安全边界：**
> - 只读：仅调用 `multica issue list` / `multica issue get` / `multica issue comment list`
> - 不写入 Multica issue、评论、飞书、ATS/CRM 或任何外部系统
> - 需要 `multica` CLI 已安装且已登录（运行 `multica workspace get` 验证）
> - `--issues` 与 `--input` / `--input-stdin` 互斥；若同时指定，报错退出

### privacy-check

```bash
# 检查单条 issue 内容（从 stdin，当前推荐方式）
echo '{"title":"测试","description":"候选人李某"}' | \
  node harness/harness-privacy-check.js --input-stdin --output markdown

# 从 JSON 文件读取（离线模式）
node harness/harness-privacy-check.js \
  --input harness/examples/issues-input.json \
  --output json
```

> ℹ️ `privacy-check` 当前支持离线模式（`--input` / `--input-stdin`）。在线 `--issues` 模式已在 `harness-progress-manifest.js` 实现（LYN-1179）；`harness-privacy-check.js` 尚未集成在线拉取，如需在线检查，可先用 `--issues` 生成 manifest JSON 后再进行检查。

## 输入格式

### CLI 参数

| 参数 | 类型 | 实现状态 | 说明 |
|---|---|---|---|
| `--input` | path | ✅ 已实现 | 本地 JSON 文件（issue 数组，见 schema）|
| `--input-stdin` | flag | ✅ 已实现 | 从 stdin 读取 JSON |
| `--issues <parent-id>` | string | ✅ 已实现（LYN-1179）| 在线只读模式：UUID 或 identifier，读取 parent 下的 issue 树 |
| `--output` | enum | ✅ 已实现 | `json`（默认）\| `markdown` \| `table` |
| `--dry-run` | flag | ⛔ 未实现 | parser 中无此 flag；所有运行默认已是 dry-run，无需显式传入 |
| `--schema` | path | ⛔ 未实现 | 覆盖默认 schema 路径 — schema 路径在脚本内硬编码 |
| `--status-filter` | string | ⛔ 未实现 | 只处理指定状态（todo,in_progress,done 等）— 当前不支持在线过滤 |

### Issue 输入 JSON schema（最小字段）

```json
{
  "issues": [
    {
      "id": "uuid",
      "identifier": "LYN-xxx",
      "title": "...",
      "status": "todo|in_progress|done|blocked|in_review|backlog|cancelled",
      "description": "...",
      "assignee_id": "uuid|null",
      "assignee_type": "agent|user|null",
      "created_at": "ISO8601",
      "updated_at": "ISO8601",
      "parent_issue_id": "uuid|null",
      "labels": ["label-name"],
      "comments": [
        { "id": "uuid", "content": "...", "created_at": "ISO8601" }
      ]
    }
  ],
  "meta": {
    "generated_at": "ISO8601",
    "source": "multica-api|local-file",
    "dry_run": true
  }
}
```

## 输出格式

### progress-manifest 输出（5 列，符合 LYN-437 验收口径）

| 字段 | 来源 | 可信度 | 人工覆盖 | 禁止自动推断 |
|---|---|---|---|---|
| issue_count | multica issue list | HIGH | 否 | 否 |
| current_stage | LYN-76 latest comment | MEDIUM | ✅ 必须 | 阶段判断 |
| done | status=done 计数 | HIGH | 否 | 否 |
| doing | status=in_progress 计数 | HIGH | 否 | 否 |
| blocked | status=blocked 计数 | HIGH | 否 | 否 |
| decision_needed | labels 含 decision_needed | MEDIUM | ✅ 建议 | 否 |
| next_20min | LYN-76 comment 提取 | LOW | ✅ 必须 | 意图推断 |
| milestone_eta | 无稳定来源 | N/A | ✅ 必须 | 完全禁止 |
| updated_at | 脚本运行时间 | HIGH | 否 | 否 |

### privacy-check 输出（风险分级）

| 字段 | 说明 |
|---|---|
| `risk_level` | CLEAR / LOW / MEDIUM / HIGH / BLOCKED |
| `pii_signals` | 检测到的 PII 模式列表 |
| `external_action_signals` | 检测到的外部触达风险 |
| `real_candidate_signals` | 真实候选人数据风险 |
| `recommendation` | 建议动作（continue / review / block）|
| `source_ref` | 触发警告的字段和内容摘要 |

## privacy-check 状态等级与信号分类说明（LYN-1180 更新）

### 风险等级（risk_level）

`harness-privacy-check.js` 返回的 `risk_level` 含义如下：

| risk_level | exit code | 含义 | 建议动作 |
|---|---|---|---|
| `CLEAR` | 0 | 无任何信号 | 可继续 |
| `LOW` | 0 | 仅有 WARN 或 guardrail-mention 信号（否定/边界描述） | 人工确认后可继续 |
| `MEDIUM` | 1 | 有 actual-risk FAIL 但非 PII / 真实候选人 / 外部触达分类 | 需要人工审核 |
| `HIGH` | 1 | 保留给高风险但未达到阻断条件的扩展规则 | 必须人工介入 |
| `BLOCKED` | 2 | 有 actual-risk PII、真实候选人数据、外部触达或真实系统写入 FAIL 信号 | 必须停止，处理后再继续 |

> ⚠️ **`BLOCKED` 只表示检测到 actual-risk 阻断信号，不代表已发生真实外部动作。** 查看 `checks[].classification`、`raw_signals` 和 `source_ref[].excerpt` 判断命中证据。

### 信号分类（classification）— LYN-1180 新增

每条 finding 现在包含 `classification` 字段：

| classification | 含义 | 建议处理 |
|---|---|---|
| `actual-risk` | 实际 PII、真实候选人数据或外部触达行为，需立即处理 | 按 `status` 处理：FAIL = 必须修复并阻断，WARN = 建议修复 |
| `guardrail-mention` | 否定/禁止/边界声明，**常见 false-positive 来源** | 人工确认这是规则描述而非实际行为后，可继续 |

**guardrail-mention 典型案例**：
- "禁止写入飞书" → 触发 `ext_feishu_write` 但分类为 `guardrail-mention`
- "不接入真实候选人数据" → 触发 `cand_non_synthetic` 但分类为 `guardrail-mention`
- "验收标准：不触达真实候选人" → 触发多条规则但全部为 `guardrail-mention`

**actual-risk 典型案例**：
- "13812345678" / `candidate@redacted.invalid` / `linkedin.com/in/...` / `ou_xxx` 出现在文本中 → 分类为 `actual-risk`（这些标识本身有 `noNegationCheck`）
- "候选人王某曾在某公司负责推理平台" 且未标注 synthetic/mock/no_real_pii → 分类为 `actual-risk`
- "现在写入飞书文档" → 分类为 `actual-risk`
- "给客户发送推荐包" → 分类为 `actual-risk`

### 新增输出字段

每条 finding 现在包含：
- `classification`: `actual-risk` 或 `guardrail-mention`
- `raw_signals`: 规则匹配到的原始字符串（最多 2 条）
- `judgment_reason`: 判定理由
- `human_review`: 针对当前分类的人工复核建议
- `source_ref[].excerpt`: 改进的上下文摘要（含前后各 30-50 字符）

summary 现在包含：
- `actual_risk_count`: actual-risk FAIL 信号数量
- `guardrail_mention_count`: guardrail-mention 信号数量（false-positive 候选）

### 样例集

- `harness/examples/privacy-check-fp-examples.json`: 3 条 guardrail-mention + 2 条 actual-risk 合成样例
- `harness/examples/privacy-check-improvement-comparison.md`: 改进前后对比说明

## 安全边界

- 所有脚本默认 dry-run，不写任何外部系统
- 不采集、不存储真实 PII
- `milestone_eta` 字段永远标为人工覆盖，禁止自动推断
- `current_stage` 和 `next_20min` 标为 LOW/MEDIUM，必须人工覆盖后才能进入外部发布
- privacy-check BLOCKED 时，progress-manifest 不应对外发布
