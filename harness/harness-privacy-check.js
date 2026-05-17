#!/usr/bin/env node
/**
 * harness-privacy-check.js
 * LYN-1150: Agent Team Harness dry-run — privacy-check CLI
 *
 * 检查 issue/comment 内容是否包含：
 * 1. 真实 PII（姓名、手机、邮件、身份证、地址、真实简历内容）
 * 2. 外部触达动作（飞书写入、邮件发送、候选人联系、真实写操作）
 * 3. 真实候选人数据（非 synthetic/mock 的候选人内容）
 *
 * 输出：CLEAR / LOW / MEDIUM / HIGH / BLOCKED
 * BLOCKED = 有明确 PII 或不可控外部触达，必须人工处理后才能继续
 *
 * dry-run only：不写任何外部系统
 */

'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ─── PII Detection Rules ────────────────────────────────────────────────────
const PII_PATTERNS = [
  {
    id: 'pii_cn_mobile',
    name: '中国手机号',
    pattern: /(?<!\d)(1[3-9]\d{9})(?!\d)/g,
    severity: 'HIGH',
  },
  {
    id: 'pii_cn_id',
    name: '中国身份证号',
    pattern: /(?<!\d)\d{17}[\dXx](?!\d)/g,
    severity: 'HIGH',
  },
  {
    id: 'pii_email',
    name: '邮箱地址',
    // Exclude common example domains and placeholder patterns
    pattern: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g,
    severity: 'MEDIUM',
    filter: (match) => !match.includes('example.') && !match.includes('test.') && !match.includes('mock.'),
  },
  {
    id: 'pii_real_name_pattern',
    name: '疑似真实中文姓名',
    // Heuristic: 候选人 + 2-4 Chinese chars that look like names
    pattern: /候选人[\u4e00-\u9fa5]{2,4}(?:[先生女士]|的|已|曾|在)/g,
    severity: 'MEDIUM',
  },
  {
    id: 'pii_linkedin_url',
    name: 'LinkedIn 个人主页（可能含真实个人信息）',
    pattern: /linkedin\.com\/in\/[a-zA-Z0-9\-_]+/g,
    severity: 'MEDIUM',
  },
  {
    id: 'pii_resume_content',
    name: '疑似简历内容（工作经历/教育背景真实格式）',
    pattern: /(?:工作经历|教育背景|个人简历|简历)[\s\S]{0,20}(?:公司|大学|学校|毕业)/g,
    severity: 'LOW',
    note: '可能是模板或讨论，需人工确认是否真实简历',
  },
];

// ─── External Action Rules ──────────────────────────────────────────────────
const EXTERNAL_ACTION_PATTERNS = [
  {
    id: 'ext_feishu_write',
    name: '飞书写入操作',
    pattern: /(?:写入飞书|飞书写|lark.*write|feishu.*write|飞书文档.*创建|飞书.*新建)/gi,
    severity: 'HIGH',
  },
  {
    id: 'ext_email_send',
    name: '发送邮件',
    pattern: /(?:发送邮件|send email|sendmail|smtp.*send|邮件发送给)/gi,
    severity: 'HIGH',
  },
  {
    id: 'ext_candidate_contact',
    name: '联系候选人（真实触达）',
    pattern: /(?:联系候选人|向候选人发|给候选人发|候选人联系方式|candidate.*contact|reach out)/gi,
    severity: 'HIGH',
    note: '候选人触达必须有人工确认',
  },
  {
    id: 'ext_client_visible',
    name: '客户可见内容外发',
    pattern: /(?:发给客户|客户可见|client.*share|share.*client|向客户发|给客户发)/gi,
    severity: 'HIGH',
  },
  {
    id: 'ext_real_write',
    name: '生产系统写操作信号',
    pattern: /(?:写入数据库|insert into|update.*production|deploy.*prod|生产环境.*写|真实.*写入)/gi,
    severity: 'HIGH',
  },
];

// ─── Real Candidate Data Rules ───────────────────────────────────────────────
const REAL_CANDIDATE_PATTERNS = [
  {
    id: 'cand_non_synthetic',
    name: '非合成候选人数据（未标注 synthetic/mock/合成/匿名）',
    // This is a meta-check: if description mentions "候选人" but NOT "synthetic/mock/合成/匿名"
    checkFn: (text) => {
      const hasCandidateRef = /候选人|candidate/i.test(text);
      const hasSafeLabel = /synthetic|mock|合成|匿名|no_real_pii|虚拟|模拟|模拟数据/i.test(text);
      return hasCandidateRef && !hasSafeLabel;
    },
    severity: 'MEDIUM',
    note: '包含"候选人"但未标注 synthetic/mock；需确认是否为真实数据',
  },
  {
    id: 'cand_pii_marker',
    name: '真实 PII 标记',
    pattern: /(?:真实姓名|real.*name|actual.*candidate|真实候选人|非合成)/gi,
    severity: 'HIGH',
  },
];

// ─── Check runner ─────────────────────────────────────────────────────────────
function scanText(text, issueRef) {
  const findings = [];

  // PII patterns
  for (const rule of PII_PATTERNS) {
    if (rule.checkFn) {
      if (rule.checkFn(text)) {
        findings.push({
          check_id: rule.id,
          check_name: rule.name,
          category: 'pii',
          status: rule.severity === 'HIGH' ? 'FAIL' : 'WARN',
          description: rule.name,
          source_ref: [{ ...issueRef, matched_pattern: rule.id }],
          remediation: '移除或替换为合成数据',
        });
      }
    } else if (rule.pattern) {
      rule.pattern.lastIndex = 0;
      const matches = [];
      let m;
      while ((m = rule.pattern.exec(text)) !== null) {
        const match = m[0];
        if (!rule.filter || rule.filter(match)) {
          matches.push(match);
        }
        if (matches.length >= 3) break;
      }
      if (matches.length > 0) {
        findings.push({
          check_id: rule.id,
          check_name: rule.name,
          category: 'pii',
          status: rule.severity === 'HIGH' ? 'FAIL' : 'WARN',
          description: `${rule.name}，检测到 ${matches.length} 处匹配`,
          source_ref: [
            {
              ...issueRef,
              matched_pattern: rule.id,
              excerpt: matches.slice(0, 2).join(', ').slice(0, 100),
            },
          ],
          remediation: '移除或替换为合成数据；如为示例/测试数据，添加 mock/synthetic 标注',
        });
      }
    }
  }

  // External action patterns
  for (const rule of EXTERNAL_ACTION_PATTERNS) {
    rule.pattern.lastIndex = 0;
    const matches = [];
    let m;
    while ((m = rule.pattern.exec(text)) !== null) {
      matches.push(m[0]);
      if (matches.length >= 3) break;
    }
    if (matches.length > 0) {
      findings.push({
        check_id: rule.id,
        check_name: rule.name,
        category: 'external_action',
        status: 'FAIL',
        description: `${rule.name}，检测到 ${matches.length} 处匹配`,
        source_ref: [
          {
            ...issueRef,
            matched_pattern: rule.id,
            excerpt: matches.slice(0, 2).join(', ').slice(0, 100),
          },
        ],
        remediation: rule.note || '外部触达动作必须在 dry-run 中标注为 disabled/blocked，或加 human_confirm 门控',
      });
    }
  }

  // Real candidate check
  for (const rule of REAL_CANDIDATE_PATTERNS) {
    if (rule.checkFn) {
      if (rule.checkFn(text)) {
        findings.push({
          check_id: rule.id,
          check_name: rule.name,
          category: 'real_candidate',
          status: rule.severity === 'HIGH' ? 'FAIL' : 'WARN',
          description: rule.note || rule.name,
          source_ref: [{ ...issueRef, matched_pattern: rule.id }],
          remediation: '确认数据为 synthetic/mock；添加 no_real_pii 标注',
        });
      }
    } else if (rule.pattern) {
      rule.pattern.lastIndex = 0;
      const m = rule.pattern.exec(text);
      if (m) {
        findings.push({
          check_id: rule.id,
          check_name: rule.name,
          category: 'real_candidate',
          status: 'FAIL',
          description: rule.name,
          source_ref: [
            { ...issueRef, matched_pattern: rule.id, excerpt: m[0].slice(0, 100) },
          ],
          remediation: '替换为 synthetic 数据',
        });
      }
    }
  }

  return findings;
}

function runChecks(data) {
  const issues = data.issues || [];
  const allFindings = [];

  for (const issue of issues) {
    const issueRef = {
      type: 'issue',
      id: issue.id || '',
      identifier: issue.identifier || '',
    };

    // Scan title
    if (issue.title) {
      const f = scanText(issue.title, { ...issueRef, field: 'title' });
      allFindings.push(...f);
    }

    // Scan description
    if (issue.description) {
      const f = scanText(issue.description, { ...issueRef, field: 'description' });
      allFindings.push(...f);
    }

    // Scan comments
    for (const comment of issue.comments || []) {
      const commentRef = {
        type: 'comment',
        id: comment.id || '',
        identifier: issue.identifier || '',
        field: 'comment.content',
      };
      if (comment.content) {
        const f = scanText(comment.content, commentRef);
        allFindings.push(...f);
      }
    }
  }

  // Calculate risk level
  const hasFail = allFindings.some((f) => f.status === 'FAIL');
  const hasWarn = allFindings.some((f) => f.status === 'WARN');
  const failCount = allFindings.filter((f) => f.status === 'FAIL').length;
  const highRiskCategories = new Set(
    allFindings.filter((f) => f.status === 'FAIL').map((f) => f.category)
  );

  let riskLevel;
  let recommendation;

  if (failCount === 0 && !hasWarn) {
    riskLevel = 'CLEAR';
    recommendation = 'continue';
  } else if (failCount === 0 && hasWarn) {
    riskLevel = 'LOW';
    recommendation = 'review';
  } else if (hasFail && highRiskCategories.has('external_action')) {
    riskLevel = 'BLOCKED';
    recommendation = 'block';
  } else if (hasFail && (highRiskCategories.has('pii') || highRiskCategories.has('real_candidate'))) {
    riskLevel = 'HIGH';
    recommendation = 'block';
  } else if (hasFail) {
    riskLevel = 'MEDIUM';
    recommendation = 'review';
  } else {
    riskLevel = 'LOW';
    recommendation = 'review';
  }

  // Deduplicate findings by check_id + identifier
  const seen = new Set();
  const dedupedFindings = allFindings.filter((f) => {
    const key = `${f.check_id}:${(f.source_ref[0] || {}).identifier || ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return {
    meta: {
      generated_at: new Date().toISOString(),
      dry_run: true,
      issues_scanned: issues.length,
    },
    summary: {
      risk_level: riskLevel,
      recommendation,
      pii_signals_count: dedupedFindings.filter((f) => f.category === 'pii').length,
      external_action_signals_count: dedupedFindings.filter((f) => f.category === 'external_action').length,
      real_candidate_signals_count: dedupedFindings.filter((f) => f.category === 'real_candidate').length,
    },
    checks: dedupedFindings,
  };
}

// ─── Output formatters ────────────────────────────────────────────────────────
function toMarkdown(result) {
  const { meta, summary, checks } = result;
  const lines = [];

  const statusIcon = {
    CLEAR: '✅',
    LOW: '🟡',
    MEDIUM: '🟠',
    HIGH: '🔴',
    BLOCKED: '⛔',
  }[summary.risk_level] || '❓';

  const recLabel = {
    continue: '✅ 可继续 dry-run',
    review: '⚠️ 需要人工确认后继续',
    block: '⛔ 必须停止，处理后再继续',
  }[summary.recommendation] || '—';

  lines.push(`# Privacy Check Report — Dry-run`);
  lines.push(`\n> **⚠️ dry-run** — 不写入任何外部系统。`);
  lines.push(`\n生成时间：${meta.generated_at} | 扫描 issue：${meta.issues_scanned} 条\n`);
  lines.push(`## 总体结论\n`);
  lines.push(`| 风险等级 | 建议操作 | PII 信号 | 外部触达 | 真实候选人 |`);
  lines.push(`|---|---|---|---|---|`);
  lines.push(
    `| ${statusIcon} **${summary.risk_level}** | ${recLabel} | ${summary.pii_signals_count} | ${summary.external_action_signals_count} | ${summary.real_candidate_signals_count} |`
  );

  if (checks.length === 0) {
    lines.push(`\n✅ 未检测到已知隐私或外部触达风险。`);
  } else {
    lines.push(`\n## 检测发现（${checks.length} 条）\n`);
    lines.push(`| 检查项 | 来源 | 状态 | 分类 | 修复建议 |`);
    lines.push(`|---|---|---|---|---|`);
    for (const c of checks) {
      const source = (c.source_ref || [])
        .slice(0, 2)
        .map((s) => [s.identifier, s.field].filter(Boolean).join('>'))
        .join(', ');
      const statusIcon2 = c.status === 'FAIL' ? '🔴 FAIL' : '🟡 WARN';
      lines.push(`| ${c.check_name} | ${source} | ${statusIcon2} | ${c.category} | ${c.remediation || '—'} |`);
    }
  }

  return lines.join('\n');
}

// ─── CLI parsing ────────────────────────────────────────────────────────────
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
harness-privacy-check.js — LYN-1150 dry-run CLI

Options:
  --input <path>      读取 issue JSON 文件
  --input-stdin       从 stdin 读取 JSON
  --output <format>   json（默认）| markdown
  --help              显示帮助

风险等级：CLEAR < LOW < MEDIUM < HIGH < BLOCKED
BLOCKED = 有明确 PII 或外部触达，必须人工处理后才能继续
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

  const result = runChecks(data);

  if (args.output === 'markdown') {
    console.log(toMarkdown(result));
  } else {
    console.log(JSON.stringify(result, null, 2));
  }

  // Exit non-zero if blocked
  if (result.summary.recommendation === 'block') {
    process.exit(2);
  }
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
