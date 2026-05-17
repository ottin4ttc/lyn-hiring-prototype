#!/usr/bin/env node
/**
 * harness-tool-candidate.js
 * LYN-1150: Agent Team Harness dry-run — tool-candidate 草稿生成器（骨架版）
 *
 * 当前状态：骨架 / 设计规范
 * 原因：tool-candidate 需要 run-messages 聚合，当前 harness issue 运行记录不足。
 * 触发条件（LYN-1142 规定）：
 *   - 同类动作重复 ≥ 3 次，且每次耗时 > 15 min
 *   - Reviewer 退回次数 ≥ 2 次指向同一输出类型
 *   - run failure 模式相同 ≥ 2 次
 *   - 人类修改轨迹 ≥ 2 次覆盖同一字段
 *
 * 待实现：从 multica issue runs + run-messages 提取触发信号
 *
 * dry-run only：不写任何外部系统
 */

'use strict';

// ─── Tool Candidate Schema ───────────────────────────────────────────────────
// 输出格式：tool_candidate draft
const TOOL_CANDIDATE_SCHEMA = {
  tool_candidate_id: 'tc_xxx',
  trigger: {
    type: 'repeated_action|reviewer_return|run_failure|human_override',
    count: 0,
    source_issues: [],
    source_runs: [],
    evidence_excerpt: '',
  },
  proposed_tool: {
    name: '',
    kind: 'template|script|cli|module|agent',
    description: '',
    inputs: [],
    outputs: [],
    estimated_reuse_frequency: 'unknown',
  },
  confidence: 'LOW',
  manual_override: true,
  auto_infer_forbidden: true,
  status: 'draft',
  note: '工具候选草稿，需要 Tool Builder 确认可行性和实现范围',
};

// ─── Trigger detection (stub) ─────────────────────────────────────────────────
function detectTriggers(data) {
  const issues = data.issues || [];
  const candidates = [];

  // Heuristic: issues with "重复" or "模板" mentions in comments
  for (const issue of issues) {
    const comments = issue.comments || [];
    for (const comment of comments) {
      const content = comment.content || '';
      if (/重复|模板|cli|script|自动化|每次都要/.test(content)) {
        candidates.push({
          ...TOOL_CANDIDATE_SCHEMA,
          tool_candidate_id: `tc_${issue.identifier}_${comment.id.slice(0, 8)}`,
          trigger: {
            type: 'repeated_action',
            count: 1,
            source_issues: [issue.identifier],
            source_runs: [],
            evidence_excerpt: content.slice(0, 200),
          },
          note: '[SKELETON] 触发信号从评论关键词启发式推断，可信度极低；需要接入 run-messages 才能准确检测',
        });
      }
    }
  }

  return candidates;
}

// ─── Main ────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const readline = require('readline');

function parseArgs(argv) {
  const args = { input: null, inputStdin: false, output: 'json', help: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--input' && argv[i + 1]) args.input = argv[++i];
    else if (a === '--input-stdin') args.inputStdin = true;
    else if (a === '--output' && argv[i + 1]) args.output = argv[++i];
  }
  return args;
}

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
    console.log(`
harness-tool-candidate.js — LYN-1150 dry-run CLI（骨架版）

状态：骨架 / 设计规范。当前仅做启发式关键词检测，需接入 run-messages 才可准确运行。

Options:
  --input <path>      读取 issue JSON 文件
  --input-stdin       从 stdin 读取 JSON
  --output json       输出格式（当前只支持 json）
  --help              显示帮助

触发条件（完整实现后）：
  - 同类动作重复 >= 3 次，且每次耗时 > 15min
  - Reviewer 退回次数 >= 2 次指向同一输出类型
  - run failure 模式相同 >= 2 次
  - 人类修改轨迹 >= 2 次覆盖同一字段
`);
    process.exit(0);
  }

  let rawData;
  try {
    if (args.inputStdin) {
      rawData = await readStdin();
    } else if (args.input) {
      rawData = fs.readFileSync(path.resolve(args.input), 'utf8');
    } else {
      const samplePath = path.join(__dirname, 'examples', 'issues-input.json');
      if (fs.existsSync(samplePath)) {
        rawData = fs.readFileSync(samplePath, 'utf8');
      } else {
        console.error('Error: 请提供 --input <file> 或 --input-stdin');
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
    if (Array.isArray(data)) {
      data = { issues: data, meta: { source: 'local-file', dry_run: true } };
    }
  } catch (err) {
    console.error('Error parsing JSON:', err.message);
    process.exit(1);
  }

  const candidates = detectTriggers(data);

  const result = {
    meta: {
      generated_at: new Date().toISOString(),
      dry_run: true,
      issues_scanned: (data.issues || []).length,
      status: 'skeleton',
      note: '骨架版：触发信号从评论关键词启发式检测，需接入 run-messages 才可准确运行',
    },
    tool_candidates: candidates,
    schema_reference: TOOL_CANDIDATE_SCHEMA,
  };

  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
