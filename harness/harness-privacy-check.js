#!/usr/bin/env node
/**
 * harness-privacy-check.js
 * LYN-1150: Agent Team Harness dry-run — privacy-check CLI
 * LYN-1180: 否定句过滤与 false-positive 分类改进
 *
 * 检查 issue/comment 内容是否包含：
 * 1. 真实 PII（姓名、手机、邮件、身份证、地址、真实简历内容）
 * 2. 外部触达动作（飞书写入、邮件发送、候选人联系、真实写操作）
 * 3. 真实候选人数据（非 synthetic/mock 的候选人内容）
 *
 * 输出：CLEAR / LOW / MEDIUM / HIGH / BLOCKED
 * BLOCKED = 有明确 PII 或不可控外部触达，必须人工处理后才能继续
 *
 * 信号分类（LYN-1180 新增）：
 *   actual-risk     = 实际 PII/外部触达行为（需要立即处理）
 *   guardrail-mention = 守护边界描述（规则文字、禁止条款、否定声明）— 常见 false-positive 来源
 *
 * dry-run only：不写任何外部系统
 */

// ─── Negation / Guardrail Prefix Detection ──────────────────────────────────
//
// 判断一段 excerpt 是否处于否定语境中（即描述"禁止"或"不允许"某动作，
// 而非实际执行该动作）。
// 匹配前缀：禁止 / 不得 / 未 / 无 / 不接入 / 不触达 / 不写入 / 严禁 / 拒绝 / 不可 / 防止
// 以及英文对应：no / not / never / prevent / block / deny / prohibit / disallow
//
// 如果在 match 位置之前 0..40 个字符内出现这些前缀，判断为 guardrail-mention。

const NEGATION_PREFIXES_ZH = [
  '禁止', '不得', '未', '无', '不接入', '不触达', '不写入', '严禁', '拒绝',
  '不可', '防止', '不允许', '移除', '不发', '不运行', '不操作', '不对外', '不外发',
  '仅 dry-run', '仅dry-run', 'dry-run only', '不应', '不会', '确保不',
  '不采集', '不存储', '不发送', '不进行',
];

const NEGATION_PREFIXES_EN = [
  'no ', 'not ', 'never ', 'prevent ', 'block ', 'deny ', 'prohibit ',
  'disallow ', 'disabled', 'blocked', 'guardrail', 'must not', 'do not',
  'should not', 'cannot', 'won\'t', 'avoid',
];

/**
 * 从原文 text 中提取匹配位置的上下文（前 contextBefore 字符 + 后 contextAfter 字符）
 * @param {string} text
 * @param {number} matchIndex  匹配起始位置
 * @param {string} matchStr
 * @param {number} contextBefore
 * @param {number} contextAfter
 * @returns {string}
 */
function extractExcerpt(text, matchIndex, matchStr, contextBefore = 40, contextAfter = 60) {
  const start = Math.max(0, matchIndex - contextBefore);
  const end = Math.min(text.length, matchIndex + matchStr.length + contextAfter);
  const excerpt = text.slice(start, end);
  return (start > 0 ? '…' : '') + excerpt + (end < text.length ? '…' : '');
}

/**
 * 判断 match 是否在否定语境中（是否为 guardrail-mention）
 * @param {string} text   完整原文
 * @param {number} matchIndex  match 在 text 中的位置
 * @param {string} matchStr    匹配到的字符串
 * @returns {'actual-risk' | 'guardrail-mention'}
 */
function classifySignal(text, matchIndex, matchStr) {
  // 取 match 之前 60 字符的上下文（跨行也考虑）
  const contextStart = Math.max(0, matchIndex - 60);
  const context = text.slice(contextStart, matchIndex + matchStr.length + 20);

  const lower = context.toLowerCase();

  for (const prefix of NEGATION_PREFIXES_ZH) {
    if (context.includes(prefix)) return 'guardrail-mention';
  }
  for (const prefix of NEGATION_PREFIXES_EN) {
    if (lower.includes(prefix)) return 'guardrail-mention';
  }

  return 'actual-risk';
}

'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ─── PII Detection Rules ────────────────────────────────────────────────────
// noNegationCheck: true = 即使处于否定上下文也判为 actual-risk（如真实手机号、邮箱本身不因否定消失）
const PII_PATTERNS = [
  {
    id: 'pii_cn_mobile',
    name: '中国手机号',
    pattern: /(?<!\d)(1[3-9]\d{9})(?!\d)/g,
    severity: 'HIGH',
    noNegationCheck: true, // 手机号本身是真实 PII，无论上下文如何
  },
  {
    id: 'pii_cn_id',
    name: '中国身份证号',
    pattern: /(?<!\d)\d{17}[\dXx](?!\d)/g,
    severity: 'HIGH',
    noNegationCheck: true,
  },
  {
    id: 'pii_email',
    name: '邮箱地址',
    // Exclude common example domains and placeholder patterns
    pattern: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g,
    severity: 'MEDIUM',
    filter: (match) => !match.includes('example.') && !match.includes('test.') && !match.includes('mock.'),
    noNegationCheck: true, // 邮箱本身是 PII，即使说"不发邮件"出现真实邮箱仍是风险
  },
  {
    id: 'pii_real_name_pattern',
    name: '疑似真实中文姓名',
    // Heuristic: 候选人 + 2-4 Chinese chars that look like names
    pattern: /候选人[\u4e00-\u9fa5]{2,4}(?:[先生女士]|的|已|曾|在)/g,
    severity: 'MEDIUM',
    // 允许否定分类 — "候选人张三" 可能是举例说"禁止使用候选人张三的数据"
  },
  {
    id: 'pii_linkedin_url',
    name: 'LinkedIn 个人主页（可能含真实个人信息）',
    pattern: /linkedin\.com\/in\/[a-zA-Z0-9\-_]+/g,
    severity: 'MEDIUM',
    noNegationCheck: true,
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
// 外部触达规则允许否定分类："禁止写入飞书" != "正在写入飞书"
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
    // LYN-1180: 如果文本以"禁止使用真实候选人"等否定形式出现，额外考虑是否为 guardrail 声明
    checkFn: (text) => {
      const hasCandidateRef = /候选人|candidate/i.test(text);
      const hasSafeLabel = /synthetic|mock|合成|匿名|no_real_pii|虚拟|模拟|模拟数据/i.test(text);
      if (!hasCandidateRef) return false;
      if (hasSafeLabel) return false;
      // 如果文本中有明确禁止声明（同时有"候选人"和"禁止/不得/不可"），标记为 guardrail，但仍发出 WARN
      // （由调用方通过 classifySignal 进一步判断；这里只决定是否发出信号）
      return true;
    },
    severity: 'MEDIUM',
    note: '包含"候选人"但未标注 synthetic/mock；需确认是否为真实数据',
  },
  {
    id: 'cand_pii_marker',
    name: '真实 PII 标记（含"真实候选人"等字样）',
    // LYN-1180: "真实候选人" 出现在否定语境（"禁止使用真实候选人"）时为 guardrail-mention
    pattern: /(?:真实姓名|real.*name|actual.*candidate|真实候选人|非合成)/gi,
    severity: 'HIGH',
  },
];

// ─── Check runner ─────────────────────────────────────────────────────────────

/**
 * 将 classification 映射到人工复核建议（LYN-1180）
 */
function reviewAdvice(classification, category) {
  if (classification === 'guardrail-mention') {
    return 'ℹ️ 该信号处于否定/边界语境，判断为 guardrail-mention（常见误报）。人工复核请确认：这是对该行为的禁止描述，还是确实正在发生该动作？';
  }
  if (category === 'external_action') {
    return '⚠️ 外部触达工具行为信号，必须确认是否为 dry-run / disabled 标注或加了 human_confirm 门控。';
  }
  if (category === 'pii') {
    return '⚠️ 实际 PII 信号，必须移除或替换为 synthetic/mock 数据。';
  }
  return '需人工确认该信号是否为实际风险。';
}

function scanText(text, issueRef) {
  const findings = [];

  // PII patterns
  for (const rule of PII_PATTERNS) {
    if (rule.checkFn) {
      if (rule.checkFn(text)) {
        // checkFn-based rules: use first occurrence of '候选人' as representative
        const candidateMatch = text.match(/候选人|candidate/i);
        const idx = candidateMatch ? text.indexOf(candidateMatch[0]) : 0;
        const classification = classifySignal(text, idx, candidateMatch ? candidateMatch[0] : '');
        findings.push({
          check_id: rule.id,
          check_name: rule.name,
          category: 'pii',
          classification,
          status: classification === 'guardrail-mention' ? 'WARN' : (rule.severity === 'HIGH' ? 'FAIL' : 'WARN'),
          description: rule.name,
          judgment_reason: classification === 'guardrail-mention'
            ? '文本包含否定/边界前缀，判断为 guardrail-mention。'
            : '未检测到否定前缀，判断为 actual-risk。',
          human_review: reviewAdvice(classification, 'pii'),
          source_ref: [{ ...issueRef, matched_pattern: rule.id }],
          remediation: classification === 'guardrail-mention' ? '否定上下文，建议人工确认' : '移除或替换为合成数据',
        });
      }
    } else if (rule.pattern) {
      rule.pattern.lastIndex = 0;
      const matchItems = [];
      let m;
      while ((m = rule.pattern.exec(text)) !== null) {
        const match = m[0];
        if (!rule.filter || rule.filter(match)) {
          matchItems.push({ match, index: m.index });
        }
        if (matchItems.length >= 3) break;
      }
      if (matchItems.length > 0) {
        const firstMatch = matchItems[0];
        // noNegationCheck: true = 忽略否定分类（如真实手机号）
        const classification = rule.noNegationCheck ? 'actual-risk' : classifySignal(text, firstMatch.index, firstMatch.match);
        const excerpts = matchItems.slice(0, 2).map((mi) =>
          extractExcerpt(text, mi.index, mi.match, 30, 40).slice(0, 120)
        );
        findings.push({
          check_id: rule.id,
          check_name: rule.name,
          category: 'pii',
          classification,
          raw_signals: matchItems.slice(0, 2).map((mi) => mi.match),
          status: classification === 'guardrail-mention' ? 'WARN' : (rule.severity === 'HIGH' ? 'FAIL' : 'WARN'),
          description: `${rule.name}，检测到 ${matchItems.length} 处匹配`,
          judgment_reason: classification === 'guardrail-mention'
            ? '匹配到否定/边界前缀，判断为 guardrail-mention（false-positive 来源）。'
            : '未检测到否定前缀，判断为 actual-risk。',
          human_review: reviewAdvice(classification, 'pii'),
          source_ref: [
            {
              ...issueRef,
              matched_pattern: rule.id,
              excerpt: excerpts.join(' | ').slice(0, 200),
            },
          ],
          remediation: classification === 'guardrail-mention'
            ? '否定上下文，建议人工确认是否为真实 PII'
            : '移除或替换为合成数据；如为示例/测试数据，添加 mock/synthetic 标注',
        });
      }
    }
  }

  // External action patterns
  for (const rule of EXTERNAL_ACTION_PATTERNS) {
    rule.pattern.lastIndex = 0;
    const matchItems = [];
    let m;
    while ((m = rule.pattern.exec(text)) !== null) {
      matchItems.push({ match: m[0], index: m.index });
      if (matchItems.length >= 3) break;
    }
    if (matchItems.length > 0) {
      const firstMatch = matchItems[0];
      const classification = classifySignal(text, firstMatch.index, firstMatch.match);
      const excerpts = matchItems.slice(0, 2).map((mi) =>
        extractExcerpt(text, mi.index, mi.match, 30, 50).slice(0, 120)
      );
      findings.push({
        check_id: rule.id,
        check_name: rule.name,
        category: 'external_action',
        classification,
        raw_signals: matchItems.slice(0, 2).map((mi) => mi.match),
        status: classification === 'guardrail-mention' ? 'WARN' : 'FAIL',
        description: `${rule.name}，检测到 ${matchItems.length} 处匹配`,
        judgment_reason: classification === 'guardrail-mention'
          ? '匹配内容处于否定语境，判断为 guardrail-mention。'
          : '未检测到否定前缀，判断为 actual-risk（可能实际在执行该动作）。',
        human_review: reviewAdvice(classification, 'external_action'),
        source_ref: [
          {
            ...issueRef,
            matched_pattern: rule.id,
            excerpt: excerpts.join(' | ').slice(0, 200),
          },
        ],
        remediation: classification === 'guardrail-mention'
          ? '否定上下文，建议人工确认是否发生了实际外部触达'
          : (rule.note || '外部触达动作必须在 dry-run 中标注为 disabled/blocked，或加 human_confirm 门控'),
      });
    }
  }

  // Real candidate check
  for (const rule of REAL_CANDIDATE_PATTERNS) {
    if (rule.checkFn) {
      if (rule.checkFn(text)) {
        const candidateMatch = text.match(/候选人|candidate/i);
        const candidateIndex = candidateMatch ? text.indexOf(candidateMatch[0]) : 0;
        const classification = classifySignal(text, candidateIndex, candidateMatch ? candidateMatch[0] : '候选人');
        findings.push({
          check_id: rule.id,
          check_name: rule.name,
          category: 'real_candidate',
          classification,
          status: classification === 'guardrail-mention' ? 'WARN' : (rule.severity === 'HIGH' ? 'FAIL' : 'WARN'),
          description: rule.note || rule.name,
          judgment_reason: classification === 'guardrail-mention'
            ? '文本包含"候选人"但处于否定语境，判断为 guardrail-mention。'
            : '未检测到否定前缀和 synthetic/mock 标注，判断为 actual-risk。',
          human_review: reviewAdvice(classification, 'real_candidate'),
          source_ref: [{ ...issueRef, matched_pattern: rule.id }],
          remediation: '确认数据为 synthetic/mock；添加 no_real_pii 标注',
        });
      }
    } else if (rule.pattern) {
      rule.pattern.lastIndex = 0;
      const matchItems = [];
      let m;
      while ((m = rule.pattern.exec(text)) !== null) {
        matchItems.push({ match: m[0], index: m.index });
        if (matchItems.length >= 3) break;
      }
      if (matchItems.length > 0) {
        const firstMatch = matchItems[0];
        const classification = classifySignal(text, firstMatch.index, firstMatch.match);
        const excerpts = matchItems.slice(0, 2).map((mi) =>
          extractExcerpt(text, mi.index, mi.match, 30, 50).slice(0, 120)
        );
        findings.push({
          check_id: rule.id,
          check_name: rule.name,
          category: 'real_candidate',
          classification,
          raw_signals: matchItems.slice(0, 2).map((mi) => mi.match),
          status: classification === 'guardrail-mention' ? 'WARN' : 'FAIL',
          description: rule.name,
          judgment_reason: classification === 'guardrail-mention'
            ? '匹配内容处于否定语境，判断为 guardrail-mention。'
            : '未检测到否定前缀，判断为 actual-risk。',
          human_review: reviewAdvice(classification, 'real_candidate'),
          source_ref: [
            {
              ...issueRef,
              matched_pattern: rule.id,
              excerpt: excerpts.join(' | ').slice(0, 200),
            },
          ],
          remediation: classification === 'guardrail-mention'
            ? '否定上下文，建议人工确认是否为真实候选人标记'
            : '替换为 synthetic 数据',
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

  // Calculate risk level (LYN-1180: 分离 actual-risk 与 guardrail-mention)
  // actual-risk FAIL = 真实违规信号（需要立即处理）
  // guardrail-mention FAIL (降级为 WARN) = 否定/边界描述（常见 false-positive）
  const actualRiskFindings = allFindings.filter((f) => f.classification === 'actual-risk');
  const guardrailFindings = allFindings.filter((f) => f.classification === 'guardrail-mention');

  const hasFail = actualRiskFindings.some((f) => f.status === 'FAIL');
  const hasWarn = allFindings.some((f) => f.status === 'WARN') || guardrailFindings.length > 0;
  const failCount = actualRiskFindings.filter((f) => f.status === 'FAIL').length;
  const highRiskCategories = new Set(
    actualRiskFindings.filter((f) => f.status === 'FAIL').map((f) => f.category)
  );
  const guardrailMentionCount = guardrailFindings.length;

  let riskLevel;
  let recommendation;

  if (failCount === 0 && !hasWarn) {
    riskLevel = 'CLEAR';
    recommendation = 'continue';
  } else if (failCount === 0 && hasWarn) {
    // 只有 guardrail-mention 或 WARN 级别信号
    riskLevel = guardrailMentionCount > 0 ? 'LOW' : 'LOW';
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
      // LYN-1180: 分类统计
      actual_risk_count: dedupedFindings.filter((f) => f.classification === 'actual-risk' && f.status === 'FAIL').length,
      guardrail_mention_count: dedupedFindings.filter((f) => f.classification === 'guardrail-mention').length,
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

  if (summary.guardrail_mention_count > 0) {
    lines.push(`\n> 💡 **${summary.guardrail_mention_count} 条 guardrail-mention 信号**已识别为否定/边界声明（false-positive 候选），状态降级为 WARN。建议人工确认后继续。`);
  }

  if (checks.length === 0) {
    lines.push(`\n✅ 未检测到已知隐私或外部触达风险。`);
  } else {
    const actualRiskChecks = checks.filter((c) => c.classification === 'actual-risk');
    const guardrailChecks = checks.filter((c) => c.classification === 'guardrail-mention');

    if (actualRiskChecks.length > 0) {
      lines.push(`\n## 🔴 actual-risk 信号（${actualRiskChecks.length} 条）\n`);
      lines.push(`| 检查项 | 来源 | 状态 | 分类 | 判定理由 | 人工复核 | 修复建议 |`);
      lines.push(`|---|---|---|---|---|---|---|`);
      for (const c of actualRiskChecks) {
        const source = (c.source_ref || [])
          .slice(0, 2)
          .map((s) => [s.identifier, s.field].filter(Boolean).join('>'))
          .join(', ');
        const excerpt = (c.source_ref || [])[0]?.excerpt || '—';
        const statusIcon2 = c.status === 'FAIL' ? '🔴 FAIL' : '🟡 WARN';
        lines.push(`| ${c.check_name} | ${source} | ${statusIcon2} | actual-risk | ${c.judgment_reason || '—'} | ${c.human_review || '—'} | ${c.remediation || '—'} |`);
        if (excerpt && excerpt !== '—') lines.push(`> excerpt: \`${excerpt.slice(0, 80)}\``);
      }
    }

    if (guardrailChecks.length > 0) {
      lines.push(`\n## 💡 guardrail-mention 信号（${guardrailChecks.length} 条 — 常见 false-positive）\n`);
      lines.push(`> 以下信号触发了规则，但处于否定/禁止语境，判断为边界描述而非实际违规。`);
      lines.push(`> 人工复核只需确认：这些是规则描述/禁止条款，而非实际发生的行为。\n`);
      lines.push(`| 检查项 | 来源 | 判定理由 | raw_signal | excerpt |`);
      lines.push(`|---|---|---|---|---|`);
      for (const c of guardrailChecks) {
        const source = (c.source_ref || [])
          .slice(0, 2)
          .map((s) => [s.identifier, s.field].filter(Boolean).join('>'))
          .join(', ');
        const rawSig = (c.raw_signals || []).join(', ') || c.check_id;
        const excerpt = ((c.source_ref || [])[0]?.excerpt || '—').slice(0, 60);
        lines.push(`| ${c.check_name} | ${source} | ${c.judgment_reason || '—'} | \`${rawSig}\` | \`${excerpt}\` |`);
      }
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
harness-privacy-check.js — LYN-1150/LYN-1180 dry-run CLI

Options:
  --input <path>      读取 issue JSON 文件
  --input-stdin       从 stdin 读取 JSON
  --output <format>   json（默认）| markdown
  --help              显示帮助

风险等级：CLEAR < LOW < MEDIUM < HIGH < BLOCKED
  CLEAR   = 无任何信号
  LOW     = 仅有 WARN 或 guardrail-mention（否定/边界描述）信号
  MEDIUM  = 有 actual-risk FAIL 但非高优先级分类
  HIGH    = 有 actual-risk PII 或真实候选人 FAIL 信号
  BLOCKED = 有 actual-risk 外部触达 FAIL 信号，必须人工处理后才能继续

信号分类（LYN-1180）：
  actual-risk       = 实际 PII/外部触达，需立即处理
  guardrail-mention = 否定/禁止/边界描述，常见 false-positive 来源
                      例："禁止使用真实候选人" → guardrail-mention
                          实际出现真实手机号  → actual-risk

注意：BLOCKED 不一定是实际违规，可能是 guardrail-mention 触发。
      查看 checks[].classification 字段判断是否需要立即处理。
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
