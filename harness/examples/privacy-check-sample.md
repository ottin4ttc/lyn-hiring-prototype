# Privacy Check Report — Dry-run

> **⚠️ dry-run** — 不写入任何外部系统。

生成时间：2026-05-17T16:12:27.177Z | 扫描 issue：6 条

## 总体结论

| 风险等级 | 建议操作 | PII 信号 | 外部触达 | 真实候选人 |
|---|---|---|---|---|
| ⛔ **BLOCKED** | ⛔ 必须停止，处理后再继续 | 2 | 7 | 12 |

## 检测发现（21 条）

| 检查项 | 来源 | 状态 | 分类 | 修复建议 |
|---|---|---|---|---|
| 非合成候选人数据（未标注 synthetic/mock/合成/匿名） | LYN-36>description | 🟡 WARN | real_candidate | 确认数据为 synthetic/mock；添加 no_real_pii 标注 |
| 客户可见内容外发 | LYN-36>comment.content | 🔴 FAIL | external_action | 外部触达动作必须在 dry-run 中标注为 disabled/blocked，或加 human_confirm 门控 |
| 疑似真实中文姓名 | LYN-36>comment.content | 🟡 WARN | pii | 移除或替换为合成数据；如为示例/测试数据，添加 mock/synthetic 标注 |
| 生产系统写操作信号 | LYN-36>comment.content | 🔴 FAIL | external_action | 外部触达动作必须在 dry-run 中标注为 disabled/blocked，或加 human_confirm 门控 |
| 真实 PII 标记 | LYN-36>comment.content | 🔴 FAIL | real_candidate | 替换为 synthetic 数据 |
| 邮箱地址 | LYN-36>comment.content | 🟡 WARN | pii | 移除或替换为合成数据；如为示例/测试数据，添加 mock/synthetic 标注 |
| 生产系统写操作信号 | LYN-76>description | 🔴 FAIL | external_action | 外部触达动作必须在 dry-run 中标注为 disabled/blocked，或加 human_confirm 门控 |
| 真实 PII 标记 | LYN-76>description | 🔴 FAIL | real_candidate | 替换为 synthetic 数据 |
| 非合成候选人数据（未标注 synthetic/mock/合成/匿名） | LYN-76>comment.content | 🟡 WARN | real_candidate | 确认数据为 synthetic/mock；添加 no_real_pii 标注 |
| 飞书写入操作 | LYN-76>comment.content | 🔴 FAIL | external_action | 外部触达动作必须在 dry-run 中标注为 disabled/blocked，或加 human_confirm 门控 |
| 非合成候选人数据（未标注 synthetic/mock/合成/匿名） | LYN-437>description | 🟡 WARN | real_candidate | 确认数据为 synthetic/mock；添加 no_real_pii 标注 |
| 真实 PII 标记 | LYN-437>description | 🔴 FAIL | real_candidate | 替换为 synthetic 数据 |
| 客户可见内容外发 | LYN-1142>description | 🔴 FAIL | external_action | 外部触达动作必须在 dry-run 中标注为 disabled/blocked，或加 human_confirm 门控 |
| 非合成候选人数据（未标注 synthetic/mock/合成/匿名） | LYN-1142>description | 🟡 WARN | real_candidate | 确认数据为 synthetic/mock；添加 no_real_pii 标注 |
| 生产系统写操作信号 | LYN-1142>comment.content | 🔴 FAIL | external_action | 外部触达动作必须在 dry-run 中标注为 disabled/blocked，或加 human_confirm 门控 |
| 真实 PII 标记 | LYN-1142>comment.content | 🔴 FAIL | real_candidate | 替换为 synthetic 数据 |
| 非合成候选人数据（未标注 synthetic/mock/合成/匿名） | LYN-1146>description | 🟡 WARN | real_candidate | 确认数据为 synthetic/mock；添加 no_real_pii 标注 |
| 真实 PII 标记 | LYN-1146>description | 🔴 FAIL | real_candidate | 替换为 synthetic 数据 |
| 客户可见内容外发 | LYN-1146>comment.content | 🔴 FAIL | external_action | 外部触达动作必须在 dry-run 中标注为 disabled/blocked，或加 human_confirm 门控 |
| 非合成候选人数据（未标注 synthetic/mock/合成/匿名） | LYN-1150>description | 🟡 WARN | real_candidate | 确认数据为 synthetic/mock；添加 no_real_pii 标注 |
| 真实 PII 标记 | LYN-1150>description | 🔴 FAIL | real_candidate | 替换为 synthetic 数据 |
