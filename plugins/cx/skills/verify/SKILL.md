---
name: verify
description: 为 CX 变更运行 fresh verification 并记录 evidence。
---

# CX Verify

目标：运行最终验证，创建或更新 `.cx/changes/<change-id>/evidence.md`。

参数规则：

- 如果 `$ARGUMENTS` 是 change-id，使用它。
- 如果 `$ARGUMENTS` 为空，运行 `node "${HOME}/.cx/cx.js" status --json` 推导唯一活跃 change。
- 如果无法唯一推导，停止并请用户指定。

执行步骤：

1. 读取 `contract.md`、`tasks.md`、contract 引用的 `.cx/changes/<change-id>/specs/*.md`、`../core/protocols/common.md` 和 `../core/protocols/evidence.md`，先运行 `git diff --stat`；只按 Requirement、tasks 涉及文件和高风险文件分块读取 diff，不要一次性读取完整 diff。
1.5 回归验证（SDD 不变式门禁）：
   a. 读取 contract.md 的 `## Related Durable Specs` 表格。
   b. 如果表格为 `None` 或无 `unchanged` 条目，跳过回归验证，evidence.md 的 `## Regression` 写 `None`。
   c. 读取所有标记为 `unchanged` 的 `.cx/specs/<capability>.md` 文件完整内容。
   d. 提取所有 unchanged Requirement + Scenario，形成回归检查清单。
   e. 运行完整测试套件（非聚焦测试命令），确保未修改的长期行为仍然成立：
      - 每个 unchanged Requirement 的 Scenario 必须能找到对应测试并能 PASS。
      - 如有 unchanged Scenario 找不到对应测试：标记为 Remaining Risk，在 evidence.md 的 `## Remaining Risk` 中说明。
      - 如有测试 FAIL 且对应 Requirement 在 contract 中未声明 MODIFIED：**阻塞**，不得进入 review。先定位根因——要么是本次实现引入了退化（需修复），要么是 contract 遗漏了 MODIFIED 声明（需回到 contract 补充）。
   f. 将回归结果写入 evidence.md 的 `## Regression` 表格。
   g. 如果 contract 的 Spec Delta 声明了 MODIFIED/REMOVED 的 Requirement，其旧测试 FAIL 是预期的，在 Regression 表中标注 `N/A (modified)` 或 `N/A (removed)`，不阻塞——但必须确保 contract 的 `## Related Durable Specs` 中对应条目状态为 `modified`/`removed`（非 `unchanged`）。
2. 判断是否适合 subagent 并行验证（回归验证 1.5 必须由主 agent 串行完成后再进入此步骤）：
   - 大型验证矩阵、多个独立命令或多个互不依赖的人工检查项可以并行。
   - 会争用同一数据库、端口、缓存、快照、临时目录或全局环境的命令不得并行，必须串行运行。
   - subagent 默认只读；除测试工具自身产物外，不得修改 production code、CX 产物或 durable specs。
3. 如启用 subagent 验证，按命令、Requirement 或高风险 diff 文件分片；每个 subagent 必须返回：
   - Command 或检查项。
   - Result: PASS/FAIL/SKIPPED。
   - 关键输出、失败原因或跳过原因。
   - 覆盖的 Requirement。
   - 读取的 diff 文件和剩余风险。
4. 主 agent 汇总所有验证结果，运行必要的补充验证；任何 FAIL 或无法解释的 SKIPPED 都不得进入下游。
5. 写入 `evidence.md`，必须复制 Evidence 协议骨架并包含 Verification Commands、Requirement Coverage、Regression、TDD Evidence、Diff Review、Remaining Risk；任何命令为 FAIL 时不得进入下游。
   - 保留表格列名 `Command`、`Result`、`Notes` 和状态值 `PASS` / `FAIL` / `SKIPPED`。
   - 保留 Diff Review 中的 `Durable specs:` 固定行格式。
   - 如果存在 `.cx/changes/<change-id>/specs/*.md`，Diff Review 写 `Durable specs: pending sync`。
   - 如果不需要长期规格，Diff Review 写 `Durable specs: skipped because <reason>`。
   - TDD Evidence 必须覆盖 contract 中每个 Requirement，并记录 RED/GREEN/REFACTOR 证据。
   - 不要在 verify 阶段直接写 `.cx/specs/` 或把 pending sync 手动标为 updated。
   - 不得保留 `<...>` 占位符；没有剩余风险写 `None`。
6. 运行：

```bash
node "${HOME}/.cx/cx.js" validate --change <change-id> --stage verify
```

7. 如果有 error，立即修复 evidence 或补跑验证。
8. 成功后提醒用户：Review 只依赖落盘产物和必要 diff 摘要，建议执行 `/clear` 后继续 `review`。

## 完成回复

最终回复只报告高信号内容：改了哪些文件或行为、运行了哪些 verification commands 及结果、durable specs 是否 sync 或 skipped、archive 是否完成、未验证风险和原因。不要用没有证据的"应该可以""看起来没问题"代替验证结果。
