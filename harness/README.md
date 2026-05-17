# Agent Team Harness — Dry-run CLI 最小版

> LYN-1150 交付物。所有命令保持 **dry-run**，不写飞书、候选人系统、外部 API。

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
├── README.md                    # 本文件
├── harness-progress-manifest.js # progress-manifest dry-run CLI
├── harness-privacy-check.js     # privacy-check dry-run CLI
├── harness-tool-candidate.js    # tool-candidate dry-run CLI（骨架）
├── schemas/
│   ├── progress-manifest.schema.json  # manifest 输出 schema
│   └── privacy-check.schema.json      # privacy 报告 schema
└── examples/
    ├── progress-manifest-sample.json  # LYN-36/76/1142/1146/437 dry-run 样例
    └── privacy-check-sample.json      # 同一批 issue 隐私检查样例
```

## 使用方法

### progress-manifest

```bash
# 从 JSON 文件读取（离线模式，当前唯一支持的输入方式）
node harness/harness-progress-manifest.js \
  --input harness/examples/issues-input.json \
  --output json

# 从 stdin 读取（离线模式）
cat harness/examples/issues-input.json | \
  node harness/harness-progress-manifest.js --input-stdin --output markdown

# 完整参数
node harness/harness-progress-manifest.js --help
```

> ⚠️ **当前版本仅支持离线模式（`--input` / `--input-stdin`）。** `--issues`、`--parent`、`--status-filter` 等直接从 Multica 读取的参数**尚未实现**，请勿在下游依赖这些参数。如需在线读取，请先用 `multica issue list` 导出 JSON，再作为 `--input` 输入。

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

> ⚠️ **当前版本仅支持离线模式（`--input` / `--input-stdin`）。** `--issues` 直接读取 Multica issue 的参数**尚未实现**。

## 输入格式

### CLI 参数

| 参数 | 类型 | 实现状态 | 说明 |
|---|---|---|---|
| `--input` | path | ✅ 已实现 | 本地 JSON 文件（issue 数组，见 schema）|
| `--input-stdin` | flag | ✅ 已实现 | 从 stdin 读取 JSON |
| `--schema` | path | ⛔ 未实现 | 覆盖默认 schema 路径 — parser 中无此参数，当前不支持；schema 路径在脚本内硬编码 |
| `--output` | enum | ✅ 已实现 | `json`（默认）\| `markdown` \| `table` |
| `--dry-run` | flag | ⛔ 未实现 | parser 中无此 flag；所有运行默认已是 dry-run，无需显式传入，传入不报错但不生效 |
| `--issues` | string | ⛔ 未实现 | 逗号分隔的 issue identifier（如 LYN-36,LYN-76）— 当前不支持在线读取 |
| `--parent` | string | ⛔ 未实现 | 父 issue id，只处理其子任务 — 当前不支持在线读取 |
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

## privacy-check exit code 说明

`harness-privacy-check.js` 返回的 `risk_level` 含义如下：

| risk_level | exit code | 含义 | 建议动作 |
|---|---|---|---|
| `CLEAR` | 0 | 未检测到任何 PII 或外部触达风险信号 | 可继续 |
| `LOW` | 0 | 低风险，可能是误报 | 人工确认后可继续 |
| `MEDIUM` | 1 | 中等风险，有可疑模式但非确定性违规 | 需要人工审核 |
| `HIGH` | 1 | 高风险，检测到明确的 PII 或外部触达信号 | 必须人工介入 |
| `BLOCKED` | 2 | **描述性红线触发**，匹配到"真实候选人"、真实邮箱、真实外部系统等语义模式 | 需要人工确认是否为真实违规或误判 |

> ⚠️ **`BLOCKED` ≠ 已发生真实违规。** `BLOCKED` 表示检测到描述性红线触发（如内容中出现"真实候选人"、邮箱地址等语义信号），需要**人工确认**是否确实存在 PII 或违规动作。常见的 false positive 包括：issue 讨论中明确说"禁止使用真实候选人"、"移除真实邮箱"等负向描述，也会匹配到同一规则。`BLOCKED` 的正确处理流程是：人工阅读 `source_ref` 中的 `excerpt` 字段，判断是否为实际风险，再决定是否继续。

## 安全边界

- 所有脚本默认 dry-run，不写任何外部系统
- 不采集、不存储真实 PII
- `milestone_eta` 字段永远标为人工覆盖，禁止自动推断
- `current_stage` 和 `next_20min` 标为 LOW/MEDIUM，必须人工覆盖后才能进入外部发布
- privacy-check BLOCKED 时，progress-manifest 不应对外发布
