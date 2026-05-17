#!/usr/bin/env node
/**
 * harness-progress-manifest.js
 * LYN-1150: Agent Team Harness dry-run — progress-manifest 生成器
 *
 * 符合 LYN-437 验收口径：
 * - 5 列输出：指标名称 | 来源 | 可信度 | 人工覆盖 | 禁止自动推断
 * - 9 个最小字段：issue_count / current_stage / done / doing / blocked /
 *   decision_needed / next_20min / milestone_eta / updated_at
 * - dry-run only：不写任何外部系统
 *
 * Usage:
 *   node harness-progress-manifest.js --input <json-file> [--output json|markdown|table]
 *   cat issues.json | node harness-progress-manifest.js --input-stdin [--output markdown]
 */

'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ─── CLI arg parsing ────────────────────────────────────────────────────────
function parseArgs(argv) {
  const args = {
    input: null,
    inputStdin: false,
    output: 'json',
    help: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') { args.help = true; }
    else if (a === '--input' && argv[i + 1]) { args.input = argv[++i]; }
    else if (a === '--input-stdin') { args.inputStdin = true; }
    else if (a === '--output' && argv[i + 1]) { args.output = argv[++i]; }
  }
  return args;
}

function printHelp() {
  console.log(`
harness-progress-manifest.js — LYN-1150 dry-run CLI

Options:
  --input <path>      读取 issue JSON 文件（见 README 输入格式）
  --input-stdin       从 stdin 读取 JSON
  --output <format>   输出格式：json（默认）| markdown | table
  --help              显示帮助

输出格式（符合 LYN-437 验收口径，5 列）：
  指标/区块名称 | 来源 issue/comment | 自动生成可信度 | 人工覆盖字段 | 禁止自动推断

安全边界：
  - 所有操作为 dry-run，不写外部系统
  - milestone_eta 永远禁止自动推断
  - current_stage / next_20min 标为 manual_override=true
`);
}

// ─── Status counters ─────────────────────────────────────────────────────────
const STATUS_MAP = {
  done: 'done',
  in_progress: 'doing',
  in_review: 'in_review',
  blocked: 'blocked',
  todo: 'todo',
  backlog: 'backlog',
  cancelled: 'cancelled',
};

function countByStatus(issues) {
  const counts = {};
  for (const issue of issues) {
    const s = issue.status || 'unknown';
    counts[s] = (counts[s] || 0) + 1;
  }
  return counts;
}

// ─── current_stage extraction ────────────────────────────────────────────────
// Tries to extract current stage from LYN-76 (progress hub) latest comment
function extractCurrentStage(issues) {
  // Find LYN-76 or any issue with "进展中枢" in title
  const hubIssue = issues.find(
    (i) => i.identifier === 'LYN-76' || (i.title && i.title.includes('进展中枢'))
  );

  if (!hubIssue) {
    return {
      value: '[无法自动提取：未找到 LYN-76 进展中枢 issue]',
      source_ref: [],
      confidence: 'N/A',
      manual_override: true,
      auto_infer_forbidden: false,
      note: '需要人工填写当前阶段结论',
    };
  }

  // Try latest comment first
  const comments = hubIssue.comments || [];
  const latestComment = comments.sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  )[0];

  if (latestComment) {
    // Extract first sentence / 本轮结论 section
    const content = latestComment.content || '';
    const conclusionMatch = content.match(/本轮结论[：:]\s*([^\n]{0,150})/);
    const firstLine = content.split('\n').find((l) => l.trim().length > 10) || '';
    const extracted = conclusionMatch ? conclusionMatch[1].trim() : firstLine.slice(0, 120);

    return {
      value: extracted || '[评论内容无法解析为阶段结论]',
      source_ref: [
        {
          type: 'comment',
          id: latestComment.id,
          identifier: hubIssue.identifier,
          field: 'content',
          excerpt: content.slice(0, 150),
        },
      ],
      confidence: 'MEDIUM',
      manual_override: true,
      auto_infer_forbidden: false,
      note: '来自进展中枢最新评论首句；必须人工确认后才能对外发布',
    };
  }

  // Fall back to description
  const desc = hubIssue.description || '';
  return {
    value: desc.slice(0, 100) || '[描述为空]',
    source_ref: [
      {
        type: 'issue',
        id: hubIssue.id,
        identifier: hubIssue.identifier,
        field: 'description',
        excerpt: desc.slice(0, 100),
      },
    ],
    confidence: 'LOW',
    manual_override: true,
    auto_infer_forbidden: false,
    note: '从 issue description 提取，可信度低；必须人工覆盖',
  };
}

// ─── decision_needed detection ───────────────────────────────────────────────
function detectDecisionNeeded(issues) {
  const matches = issues.filter(
    (i) =>
      (i.labels || []).some(
        (l) => typeof l === 'string' && l.toLowerCase().includes('decision')
      ) ||
      (i.status === 'blocked') ||
      (i.title && (i.title.includes('确认') || i.title.includes('决策') || i.title.includes('Decision')))
  );

  return {
    value: matches.length,
    source_ref: matches.map((i) => ({
      type: 'issue',
      id: i.id,
      identifier: i.identifier,
      field: 'labels+status+title',
      excerpt: i.title ? i.title.slice(0, 80) : '',
    })),
    confidence: matches.length === 0 ? 'HIGH' : 'MEDIUM',
    manual_override: matches.length > 0,
    auto_infer_forbidden: false,
    note: matches.length > 0 ? '含 decision 标签、blocked 状态或包含"确认/决策"关键词的 issue；建议人工确认是否还有未标注的决策点' : '未检测到明确决策需求信号',
  };
}

// ─── next_20min extraction ────────────────────────────────────────────────────
function extractNext20min(issues) {
  const hubIssue = issues.find(
    (i) => i.identifier === 'LYN-76' || (i.title && i.title.includes('进展中枢'))
  );

  if (!hubIssue) {
    return {
      value: '[无法自动提取：未找到进展中枢]',
      source_ref: [],
      confidence: 'N/A',
      manual_override: true,
      auto_infer_forbidden: false,
      note: '必须人工填写',
    };
  }

  const comments = (hubIssue.comments || []).sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );
  const latestComment = comments[0];

  if (latestComment) {
    const content = latestComment.content || '';
    // Look for "Next 20min" or "下一步" sections
    const nextMatch = content.match(/(?:Next 20min|下一步|接下来)[：:\s]*([^\n]{0,200})/i);
    if (nextMatch) {
      return {
        value: nextMatch[1].trim(),
        source_ref: [
          {
            type: 'comment',
            id: latestComment.id,
            identifier: hubIssue.identifier,
            field: 'content',
            excerpt: nextMatch[0].slice(0, 150),
          },
        ],
        confidence: 'LOW',
        manual_override: true,
        auto_infer_forbidden: false,
        note: '从进展中枢最新评论提取"下一步"关键词后内容；仅供参考，必须人工确认',
      };
    }
  }

  // Check todo/in_progress issues as fallback
  const active = issues
    .filter((i) => i.status === 'todo' || i.status === 'in_progress')
    .slice(0, 3);

  return {
    value: active.map((i) => i.identifier + ': ' + (i.title || '').slice(0, 50)).join('; ') || '[无活跃任务]',
    source_ref: active.map((i) => ({
      type: 'issue',
      id: i.id,
      identifier: i.identifier,
      field: 'status',
      excerpt: (i.title || '').slice(0, 80),
    })),
    confidence: 'LOW',
    manual_override: true,
    auto_infer_forbidden: false,
    note: '从 todo/in_progress 任务列表推断，不代表真实 Next 20min 计划；必须人工覆盖',
  };
}

// ─── Build manifest ──────────────────────────────────────────────────────────
function buildManifest(data) {
  const issues = data.issues || [];
  const source = data.meta ? data.meta.source : 'local-file';
  const now = new Date().toISOString();

  // Filter out cancelled for active counts
  const activeIssues = issues.filter((i) => i.status !== 'cancelled');
  const counts = countByStatus(issues);

  const doneIssues = issues.filter((i) => i.status === 'done');
  const doingIssues = issues.filter((i) => i.status === 'in_progress');
  const blockedIssues = issues.filter((i) => i.status === 'blocked');
  const inReviewIssues = issues.filter((i) => i.status === 'in_review');

  return {
    meta: {
      generated_at: now,
      dry_run: true,
      source: source,
      issues_scanned: issues.length,
      schema_version: 'v1',
      warnings: [
        'current_stage, next_20min, milestone_eta 均标为 manual_override=true，不可直接对外发布',
        '此为 dry-run 输出，不写入任何外部系统',
      ],
    },
    manifest: {
      issue_count: {
        value: activeIssues.length,
        source_ref: [
          {
            type: 'issue',
            field: 'status',
            excerpt: `共扫描 ${issues.length} 条 issue，其中 ${activeIssues.length} 条非取消`,
          },
        ],
        confidence: 'HIGH',
        manual_override: false,
        auto_infer_forbidden: false,
        note: '直接从 issue 状态统计，排除 cancelled',
      },
      current_stage: extractCurrentStage(issues),
      done: {
        value: doneIssues.length,
        source_ref: doneIssues.map((i) => ({
          type: 'issue',
          id: i.id,
          identifier: i.identifier,
          field: 'status',
          excerpt: (i.title || '').slice(0, 80),
        })),
        confidence: 'HIGH',
        manual_override: false,
        auto_infer_forbidden: false,
        note: 'status=done 直接计数',
      },
      doing: {
        value: doingIssues.length,
        source_ref: doingIssues.map((i) => ({
          type: 'issue',
          id: i.id,
          identifier: i.identifier,
          field: 'status',
          excerpt: (i.title || '').slice(0, 80),
        })),
        confidence: 'HIGH',
        manual_override: false,
        auto_infer_forbidden: false,
        note: 'status=in_progress 直接计数',
      },
      in_review: {
        value: inReviewIssues.length,
        source_ref: inReviewIssues.map((i) => ({
          type: 'issue',
          id: i.id,
          identifier: i.identifier,
          field: 'status',
          excerpt: (i.title || '').slice(0, 80),
        })),
        confidence: 'HIGH',
        manual_override: false,
        auto_infer_forbidden: false,
        note: 'status=in_review 直接计数',
      },
      blocked: {
        value: blockedIssues.length,
        source_ref: blockedIssues.map((i) => ({
          type: 'issue',
          id: i.id,
          identifier: i.identifier,
          field: 'status',
          excerpt: (i.title || '').slice(0, 80),
        })),
        confidence: 'HIGH',
        manual_override: false,
        auto_infer_forbidden: false,
        note: 'status=blocked 直接计数',
      },
      decision_needed: detectDecisionNeeded(issues),
      next_20min: extractNext20min(issues),
      milestone_eta: {
        value: null,
        source_ref: [],
        confidence: 'N/A',
        manual_override: true,
        auto_infer_forbidden: true,
        note: '⛔ 禁止自动推断。Multica issue 不包含足够可信的时间预估字段；此字段必须由项目负责人手动填写。',
      },
      updated_at: {
        value: now,
        source_ref: [
          { type: 'static', field: 'script_run_time', excerpt: `脚本运行时间 ${now}` },
        ],
        confidence: 'HIGH',
        manual_override: false,
        auto_infer_forbidden: false,
        note: '页面更新时间 = 脚本运行时间',
      },
    },
  };
}

// ─── Output formatters ────────────────────────────────────────────────────────
function toMarkdown(result) {
  const { meta, manifest } = result;
  const lines = [];
  lines.push(`# Progress Manifest — Dry-run Report`);
  lines.push(`\n> **⚠️ dry-run** — 不写入任何外部系统。以下标注 \`manual_override=true\` 的字段必须经人工覆盖后才能对外发布。`);
  lines.push(`\n生成时间：${meta.generated_at} | 扫描 issue：${meta.issues_scanned} 条 | 来源：${meta.source}\n`);
  lines.push(`## 告警`);
  for (const w of meta.warnings || []) { lines.push(`- ⚠️ ${w}`); }

  lines.push(`\n## Manifest（符合 LYN-437 验收口径）\n`);
  lines.push(`| 指标/区块名称 | 当前值 | 来源 issue/comment | 可信度 | 人工覆盖 | 禁止自动推断 |`);
  lines.push(`|---|---|---|---|---|---|`);

  const FIELD_LABELS = {
    issue_count: '项目 issue 总数（非取消）',
    current_stage: '当前阶段结论',
    done: 'Done 完成数',
    doing: 'Doing 进行中',
    in_review: 'In Review 审核中',
    blocked: 'Blocked 阻塞数',
    decision_needed: 'Decision Needed 决策待定',
    next_20min: 'Next 20min 下一步',
    milestone_eta: 'Milestone ETA 里程碑预计时间',
    updated_at: '页面更新时间',
  };

  for (const [key, field] of Object.entries(manifest)) {
    const label = FIELD_LABELS[key] || key;
    const value =
      field.value === null ? '⛔ 禁止推断' : String(field.value).slice(0, 80);
    const sources = (field.source_ref || [])
      .slice(0, 3)
      .map((s) => s.identifier || s.type)
      .join(', ') || '—';
    const override = field.manual_override ? '✅ 必须' : '否';
    const forbidden = field.auto_infer_forbidden ? '⛔ 禁止' : '否';
    lines.push(`| ${label} | ${value} | ${sources} | ${field.confidence} | ${override} | ${forbidden} |`);
  }

  lines.push(`\n## 字段详情\n`);
  for (const [key, field] of Object.entries(manifest)) {
    lines.push(`### ${FIELD_LABELS[key] || key}`);
    lines.push(`- **值：** ${field.value === null ? '(null — 禁止推断)' : field.value}`);
    lines.push(`- **可信度：** ${field.confidence}`);
    lines.push(`- **人工覆盖：** ${field.manual_override ? '✅ 是' : '否'}`);
    lines.push(`- **禁止自动推断：** ${field.auto_infer_forbidden ? '⛔ 是' : '否'}`);
    if (field.note) lines.push(`- **注：** ${field.note}`);
    if (field.source_ref && field.source_ref.length > 0) {
      lines.push(`- **来源：**`);
      for (const s of field.source_ref.slice(0, 5)) {
        const ref = [s.identifier || s.type, s.field].filter(Boolean).join(' > ');
        const excerpt = s.excerpt ? ` — "${s.excerpt.slice(0, 100)}"` : '';
        lines.push(`  - ${ref}${excerpt}`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

function toTable(result) {
  const { manifest } = result;
  const rows = [];
  rows.push('指标/区块名称\t当前值\t可信度\t人工覆盖\t禁止推断\t来源');
  rows.push('─'.repeat(120));
  for (const [key, field] of Object.entries(manifest)) {
    const value = field.value === null ? '⛔ 禁止推断' : String(field.value).slice(0, 60);
    const sources = (field.source_ref || []).slice(0, 2).map((s) => s.identifier || s.type).join(', ') || '—';
    rows.push(
      `${key}\t${value}\t${field.confidence}\t${field.manual_override ? '✅' : '否'}\t${field.auto_infer_forbidden ? '⛔' : '否'}\t${sources}`
    );
  }
  return rows.join('\n');
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function readStdin() {
  return new Promise((resolve) => {
    let buf = '';
    const rl = readline.createInterface({ input: process.stdin });
    rl.on('line', (line) => { buf += line + '\n'; });
    rl.on('close', () => resolve(buf));
  });
}

async function main() {
  const args = parseArgs(process.argv);

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  let rawData;
  try {
    if (args.inputStdin) {
      rawData = await readStdin();
    } else if (args.input) {
      rawData = fs.readFileSync(path.resolve(args.input), 'utf8');
    } else {
      // Use built-in sample data for demo
      const samplePath = path.join(__dirname, 'examples', 'issues-input.json');
      if (fs.existsSync(samplePath)) {
        rawData = fs.readFileSync(samplePath, 'utf8');
      } else {
        console.error('Error: 请提供 --input <file> 或 --input-stdin，或创建 examples/issues-input.json\n');
        printHelp();
        process.exit(1);
      }
    }
  } catch (err) {
    console.error('Error reading input:', err.message);
    process.exit(1);
  }

  let data;
  try {
    data = JSON.parse(rawData);
    // Support array input as well
    if (Array.isArray(data)) {
      data = { issues: data, meta: { source: 'local-file', dry_run: true } };
    }
  } catch (err) {
    console.error('Error parsing JSON:', err.message);
    process.exit(1);
  }

  const result = buildManifest(data);

  switch (args.output) {
    case 'markdown':
      console.log(toMarkdown(result));
      break;
    case 'table':
      console.log(toTable(result));
      break;
    default:
      console.log(JSON.stringify(result, null, 2));
  }
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
