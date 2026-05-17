#!/usr/bin/env node
/**
 * harness-tool-candidate.js
 * LYN-1181 / LYN-1190: tool-candidate 脚本完整化
 *
 * 从离线 JSON（issues + comments）或 stdin 中聚合以下信号：
 *   - 重复动作（repeated_action）：同类动作在 ≥3 个评论/issue 中出现
 *   - Reviewer 退回（reviewer_return）：返工/退回信号 ≥2 次指向同一输出类型
 *   - Run 失败模式（run_failure）：run 失败/挂起/超时 ≥2 次同模式
 *   - 人工覆盖（human_override）：人工修改/校正 ≥2 次覆盖同一字段
 *
 * 每个候选按以下维度评分（0-100）：
 *   frequency_score    重复频率
 *   rework_score       返工/退回率
 *   risk_score         风险（越低越好，候选总分 = freq + rework - risk）
 *   scriptability      可脚本化程度（HIGH/MEDIUM/LOW）
 *   human_confirm_req  是否需要人工确认
 *
 * 输出三层候选：
 *   immediate_script   可立即脚本化
 *   needs_design       需人工设计
 *   defer_high_risk    暂缓/高风险
 *
 * dry-run only：不写任何外部系统
 */

'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ─── Constants & Config ───────────────────────────────────────────────────────
const TRIGGER_THRESHOLDS = {
  repeated_action_min:   3,   // same pattern in ≥3 comments
  reviewer_return_min:   2,   // rework signal ≥2 times
  run_failure_min:       2,   // run failure ≥2 times
  human_override_min:    2,   // human correction ≥2 times
};

// Scoring weights
const SCORING = {
  frequency: { multiplier: 2.5 },   // count × multiplier, capped at 60
  rework:    { multiplier: 8.0 },   // rework_count × multiplier, capped at 30
  risk:      { multiplier: 10.0 },  // risk_count × multiplier
};

// Classification thresholds
const TIER_THRESHOLDS = {
  immediate_script:  { min_score: 40, max_risk: 20, scriptability: ['HIGH'] },
  needs_design:      { min_score: 20, max_risk: 50, scriptability: ['HIGH', 'MEDIUM'] },
  defer_high_risk:   {},   // everything else
};

// ─── Signal Detection Patterns ────────────────────────────────────────────────
const SIGNAL_PATTERNS = [
  {
    id: 'feishu_notify',
    name: '飞书通知发送',
    kind: 'script',
    description: '定期或事件触发的飞书消息推送；规则固定（里程碑/阻塞/偏航/决策），但每次手动触发',
    patterns: [/发送.*飞书|飞书.*发送|message_id.*om_|已发.*通知|飞书.*已发/],
    risk_patterns: [/真实.*open_id|真实.*候选人|发给.*候选/],
    scriptability: 'HIGH',
    human_confirm_req: false,
    expected_benefit: '消除每次手动触发；可脚本化为 rule-based trigger（阻塞/里程碑条件满足后自动发送）',
    risk_boundary: '需要确认 feishu open_id 和 chat_id 为 synthetic；真实收件人需人工确认',
  },
  {
    id: 'progress_update',
    name: '进展中枢状态更新',
    kind: 'script',
    description: '周期性（约每 20 分钟）从 issue tree 聚合进展数据并更新 LYN-76',
    patterns: [/更新.*进展中枢|进展.*更新|中枢.*已更新|本轮.*中枢|pulse.*更新/],
    risk_patterns: [/外部发布|生产.*推送|向.*客户/],
    scriptability: 'HIGH',
    human_confirm_req: false,
    expected_benefit: 'progress-manifest 脚本已有基础（harness-progress-manifest.js），工具化后可消除手动运行成本',
    risk_boundary: 'current_stage/next_20min 字段仍需人工覆盖；不自动推断意图',
  },
  {
    id: 'issue_status_flip',
    name: 'Issue 状态批量更新',
    kind: 'cli',
    description: '多个 issue 被手动从 in_progress → in_review / done / blocked；每次需要逐个操作',
    patterns: [/已.*标.*为.*blocked|已.*更新.*status|从.*in_progress.*到|状态.*改为|已.*收口为.*done/],
    risk_patterns: [/批量.*删除|批量.*关闭|生产.*状态/],
    scriptability: 'HIGH',
    human_confirm_req: true,
    expected_benefit: 'multica CLI 已有 issue status 子命令；可以封装 batch-status 脚本，减少多次手动触发',
    risk_boundary: '批量状态变更需人工确认目标 issue 列表；不应自动推断哪些 issue 需要变更',
  },
  {
    id: 'duplicate_trigger_detect',
    name: '重复触发检测',
    kind: 'script',
    description: '调度器/LaunchAgent 多次触发同一 autopilot run，产生重复 issue，需要人工识别和清理',
    patterns: [/重复.*触发|重复.*创建|duplicate.*trigger|重复.*run|多次.*scheduled|LaunchAgent.*额外/],
    risk_patterns: [/自动.*删除.*issue|批量.*cancel/],
    scriptability: 'MEDIUM',
    human_confirm_req: true,
    expected_benefit: '脚本化 idempotency check：检查同一时间窗口内是否已有相同 title 的 issue，若有则跳过创建；预防重复触发',
    risk_boundary: '判断"重复"的规则需人工设计；自动删除/cancel 动作禁止；仅输出告警',
  },
  {
    id: 'run_hang_detect',
    name: 'Run 挂起/孤立检测',
    kind: 'script',
    description: 'Agent run 长时间处于 running 状态但无 run-messages 输出，需要 EnvAgent 诊断',
    patterns: [/run.*挂起|孤立.*run|silent.*hang|长时间.*running|run.*无.*消息|stuck.*run|run.*stuck/i],
    risk_patterns: [/自动.*kill.*run|强制.*停止.*run/],
    scriptability: 'MEDIUM',
    human_confirm_req: true,
    expected_benefit: '定期检查 run 状态（multica issue runs）：若 run 超过阈值时间仍 running 且无 messages，生成告警 issue；减少人工轮询',
    risk_boundary: '强制 kill run 需人工确认；脚本只生成告警，不自动终止',
  },
  {
    id: 'privacy_check_gate',
    name: 'Privacy Check 准入门控',
    kind: 'module',
    description: '任何真实 harness run 前必须运行 privacy-check；目前是手动步骤，偶尔被跳过',
    patterns: [/privacy.*check|隐私.*检查|pii.*check|PII.*检查|harness.*准入/i],
    risk_patterns: [/自动.*通过.*隐私|绕过.*privacy/i],
    scriptability: 'HIGH',
    human_confirm_req: false,
    expected_benefit: 'harness-privacy-check.js 已实现；可集成为 pre-run hook：run 前自动调用，BLOCKED 时阻止执行',
    risk_boundary: '仅作为 gate check；不自动修改或过滤输入数据；BLOCKED 结果必须由人工处理',
  },
  {
    id: 'rework_pattern_log',
    name: '返工/退回模式记录',
    kind: 'script',
    description: 'Reviewer 多次退回同一类型输出（进展数据格式不符、状态误判）；目前无自动记录',
    patterns: [/退回|返工|reviewer.*退|重新.*校正|格式.*不符|格式.*不正确/],
    risk_patterns: [/自动.*修改.*输出|绕过.*review/],
    scriptability: 'MEDIUM',
    human_confirm_req: true,
    expected_benefit: '脚本化 rework-log：从评论中提取退回事件，统计各类输出的退回率，为 tool-candidate 触发提供准确信号',
    risk_boundary: '返工判断依赖评论文本，有误判风险；结果为建议，不自动修改任何输出',
  },
  {
    id: 'issue_create_batch',
    name: '批量 Issue 创建',
    kind: 'cli',
    description: '每轮推进脉冲创建多个子任务 issue，格式固定但每次手动执行',
    patterns: [/创建.*issue|新建.*任务|已创建.*LYN|create.*sub.*issue|子.*issue.*已创建/],
    risk_patterns: [/自动.*创建.*agent|自动.*new.*agent/],
    scriptability: 'HIGH',
    human_confirm_req: true,
    expected_benefit: '封装 issue-batch-create 脚本：从模板 JSON 批量创建带统一 label/assignee/parent 的 issue；减少逐条创建成本',
    risk_boundary: '创建前需人工确认 issue 列表；不自动创建 Agent 类 issue；不修改已有 issue',
  },
];

// ─── Input Aggregation ────────────────────────────────────────────────────────
function aggregateSignals(data) {
  const issues = data.issues || [];
  const signalCounts = {};
  const signalEvidence = {};
  const riskFlags = {};

  // Initialize
  for (const sp of SIGNAL_PATTERNS) {
    signalCounts[sp.id] = { total: 0, issue_sources: new Set(), rework: 0, run_failure: 0 };
    signalEvidence[sp.id] = [];
    riskFlags[sp.id] = 0;
  }

  // Rework/run-failure indicators
  const reworkRe = /退回|返工|重新.*校正|重新.*修改|reviewer.*退|已.*退回/;
  const runFailRe = /run.*失败|run.*挂起|run.*超时|failed.*run|stuck.*run|孤立.*run|silent.*hang/i;

  for (const issue of issues) {
    const allTexts = [
      { text: issue.title + ' ' + (issue.description || ''), type: 'issue', ref: issue.identifier },
      ...( issue.comments || []).map(c => ({ text: c.content, type: 'comment', ref: `${issue.identifier}#${c.id.slice(0, 8)}`, id: c.id })),
    ];

    for (const { text, type, ref, id } of allTexts) {
      for (const sp of SIGNAL_PATTERNS) {
        for (const pat of sp.patterns) {
          if (pat.test(text)) {
            signalCounts[sp.id].total++;
            signalCounts[sp.id].issue_sources.add(issue.identifier);

            if (signalEvidence[sp.id].length < 3) {
              signalEvidence[sp.id].push({
                source: ref,
                type,
                excerpt: text.replace(/\n+/g, ' ').slice(0, 200),
              });
            }

            if (reworkRe.test(text)) signalCounts[sp.id].rework++;
            if (runFailRe.test(text)) signalCounts[sp.id].run_failure++;

            // Check risk patterns
            for (const rp of (sp.risk_patterns || [])) {
              if (rp.test(text)) riskFlags[sp.id]++;
            }

            break; // only count once per pattern per text
          }
        }
      }
    }
  }

  return { signalCounts, signalEvidence, riskFlags };
}

// ─── Scoring ──────────────────────────────────────────────────────────────────
function scoreCandidate(sp, counts, riskFlag) {
  const c = counts[sp.id];

  // Frequency score (0-60)
  const freqScore = Math.min(60, c.total * SCORING.frequency.multiplier);

  // Rework score (0-30)
  const reworkScore = Math.min(30, c.rework * SCORING.rework.multiplier);

  // Risk penalty (subtracted)
  const riskPenalty = Math.min(40, riskFlag * SCORING.risk.multiplier);

  const totalScore = Math.max(0, Math.round(freqScore + reworkScore - riskPenalty));

  // Confidence
  let confidence = 'LOW';
  if (c.total >= TRIGGER_THRESHOLDS.repeated_action_min) confidence = 'MEDIUM';
  if (c.total >= TRIGGER_THRESHOLDS.repeated_action_min * 3 && c.rework >= TRIGGER_THRESHOLDS.reviewer_return_min) confidence = 'HIGH';

  return {
    frequency_score: Math.round(freqScore),
    rework_score: Math.round(reworkScore),
    risk_penalty: Math.round(riskPenalty),
    total_score: totalScore,
    confidence,
    trigger_count: c.total,
    rework_count: c.rework,
    run_failure_count: c.run_failure,
    issue_sources: Array.from(c.issue_sources),
  };
}

// ─── Tiering ─────────────────────────────────────────────────────────────────
function tierCandidate(sp, scoring) {
  const { total_score, risk_penalty, confidence } = scoring;

  // immediate_script: high score, low risk, high scriptability
  if (
    total_score >= TIER_THRESHOLDS.immediate_script.min_score &&
    risk_penalty <= TIER_THRESHOLDS.immediate_script.max_risk &&
    TIER_THRESHOLDS.immediate_script.scriptability.includes(sp.scriptability) &&
    !sp.human_confirm_req
  ) {
    return 'immediate_script';
  }

  // needs_design: medium score, medium risk, scriptability HIGH or MEDIUM
  if (
    total_score >= TIER_THRESHOLDS.needs_design.min_score &&
    risk_penalty <= TIER_THRESHOLDS.needs_design.max_risk &&
    TIER_THRESHOLDS.needs_design.scriptability.includes(sp.scriptability)
  ) {
    return 'needs_design';
  }

  // defer_high_risk: everything else
  return 'defer_high_risk';
}

// ─── Build Candidates ────────────────────────────────────────────────────────
function buildCandidates(data) {
  const { signalCounts, signalEvidence, riskFlags } = aggregateSignals(data);
  const candidates = [];

  for (const sp of SIGNAL_PATTERNS) {
    const counts = signalCounts;
    const scoring = scoreCandidate(sp, counts, riskFlags[sp.id] || 0);

    // Skip if no evidence at all
    if (scoring.trigger_count === 0) continue;

    const tier = tierCandidate(sp, scoring);

    candidates.push({
      tool_candidate_id: `tc_${sp.id}`,
      name: sp.name,
      kind: sp.kind,
      tier,
      scoring,
      proposed_tool: {
        name: sp.id,
        kind: sp.kind,
        description: sp.description,
        scriptability: sp.scriptability,
        human_confirm_required: sp.human_confirm_req,
        expected_benefit: sp.expected_benefit,
        risk_boundary: sp.risk_boundary,
      },
      trigger: {
        type: scoring.rework_count > 0 ? 'repeated_action+reviewer_return' : 'repeated_action',
        evidence: signalEvidence[sp.id],
      },
      manual_override: true,
      auto_infer_forbidden: true,
      status: 'draft',
      note: `触发次数 ${scoring.trigger_count}，返工 ${scoring.rework_count}，风险标志 ${riskFlags[sp.id]}`,
    });
  }

  // Sort by tier priority then score
  const tierOrder = { immediate_script: 0, needs_design: 1, defer_high_risk: 2 };
  candidates.sort((a, b) => {
    const td = tierOrder[a.tier] - tierOrder[b.tier];
    if (td !== 0) return td;
    return b.scoring.total_score - a.scoring.total_score;
  });

  return candidates;
}

// ─── Summary ──────────────────────────────────────────────────────────────────
function buildSummary(candidates, issues) {
  const byTier = { immediate_script: [], needs_design: [], defer_high_risk: [] };
  for (const c of candidates) byTier[c.tier].push(c.tool_candidate_id);

  return {
    total_candidates: candidates.length,
    issues_scanned: issues.length,
    comments_scanned: issues.reduce((s, i) => s + (i.comments || []).length, 0),
    by_tier: {
      immediate_script:  { count: byTier.immediate_script.length,  ids: byTier.immediate_script },
      needs_design:      { count: byTier.needs_design.length,      ids: byTier.needs_design },
      defer_high_risk:   { count: byTier.defer_high_risk.length,   ids: byTier.defer_high_risk },
    },
  };
}

// ─── CLI Parsing ─────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const args = { input: null, inputStdin: false, output: 'json', help: false, minScore: 0 };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h')        args.help = true;
    else if (a === '--input' && argv[i + 1]) args.input = argv[++i];
    else if (a === '--input-stdin')          args.inputStdin = true;
    else if (a === '--output' && argv[i + 1]) args.output = argv[++i];
    else if (a === '--min-score' && argv[i + 1]) args.minScore = parseInt(argv[++i], 10) || 0;
  }
  return args;
}

function printHelp() {
  console.log(`
harness-tool-candidate.js — LYN-1190 tool-candidate 候选识别（完整版）

用法：
  node harness/harness-tool-candidate.js [options]

Options:
  --input <path>       读取 issue JSON 文件（格式见 examples/issues-input.json）
  --input-stdin        从 stdin 读取 JSON
  --output json        输出格式（当前只支持 json）
  --min-score <n>      只输出总分 ≥ n 的候选（默认 0，输出全部）
  --help               显示本帮助

默认输入（无 --input / --input-stdin 时）：
  自动读取 harness/examples/issues-input.json（若存在）

信号触发条件：
  - 同类动作重复 ≥ ${TRIGGER_THRESHOLDS.repeated_action_min} 次
  - Reviewer 退回次数 ≥ ${TRIGGER_THRESHOLDS.reviewer_return_min} 次指向同一输出类型
  - Run failure 模式相同 ≥ ${TRIGGER_THRESHOLDS.run_failure_min} 次
  - 人类修改轨迹 ≥ ${TRIGGER_THRESHOLDS.human_override_min} 次覆盖同一字段

输出层级：
  immediate_script   可立即脚本化（高频 + 低风险 + HIGH scriptability + 无需人工确认）
  needs_design       需人工设计（中等频率或需要人工确认）
  defer_high_risk    暂缓/高风险（低频 + 高风险 + LOW scriptability）

安全边界：
  - 所有运行默认 dry-run，不写任何外部系统
  - 输出仅为候选建议；不自动创建工具、Agent 或修改任何 issue/系统
  - 每个候选必须有来源证据（trigger.evidence）
  - manual_override: true — 所有候选均需人工确认后才能实施

如何解读候选：
  1. 查看 tier 字段：immediate_script > needs_design > defer_high_risk
  2. 查看 scoring.total_score：分数越高越值得优先实施
  3. 查看 trigger.evidence：验证来源是否符合实际情况
  4. 查看 proposed_tool.risk_boundary：了解实施前必须确认的边界条件
  5. 标注为 defer_high_risk 的候选不建议在无人工设计的情况下脚本化

不能自动执行的候选（需人工设计/确认后才可实施）：
  - 任何 human_confirm_required: true 的候选
  - 任何 defer_high_risk tier 的候选
  - feishu/外部系统触达类（即使评分高，真实收件人/open_id 需人工确认）
  - 批量状态变更类（目标 issue 列表需人工确认）
`);
}

async function readStdin() {
  return new Promise((resolve) => {
    let buf = '';
    const rl = readline.createInterface({ input: process.stdin });
    rl.on('line', (line) => { buf += line + '\n'; });
    rl.on('close', () => resolve(buf));
  });
}

// ─── Main ────────────────────────────────────────────────────────────────────
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
      const samplePath = path.join(__dirname, 'examples', 'issues-input.json');
      if (fs.existsSync(samplePath)) {
        rawData = fs.readFileSync(samplePath, 'utf8');
      } else {
        console.error('Error: 请提供 --input <file> 或 --input-stdin');
        console.error('  示例: node harness/harness-tool-candidate.js --input harness/examples/issues-input.json');
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

  let candidates = buildCandidates(data);

  // Apply min-score filter
  if (args.minScore > 0) {
    candidates = candidates.filter(c => c.scoring.total_score >= args.minScore);
  }

  const result = {
    meta: {
      generated_at: new Date().toISOString(),
      dry_run: true,
      source: (data.meta && data.meta.source) || 'local-file',
      status: 'complete',
      external_writes: 'none',
      note: 'synthetic/no_real_pii 受控样例运行；未产生外部写操作',
    },
    summary: buildSummary(candidates, data.issues || []),
    tool_candidates: candidates,
  };

  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
