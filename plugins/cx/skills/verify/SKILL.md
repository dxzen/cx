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
2. 判断是否适合 subagent 并行验证：
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
5. 写入 `evidence.md`，必须复制 Evidence 协议骨架并包含 Verification Commands、Requirement Coverage、TDD Evidence、Diff Review、Remaining Risk；任何命令为 FAIL 时不得进入下游。
   - 保留表格列名 `Command`、`Result`、`Notes` 和状态值 `PASS` / `FAIL` / `SKIPPED`。
   - 保留 Diff Review 中的 `Durable specs:` 固定行格式。
   - 如果存在 `.cx/changes/<change-id>/specs/*.md`，Diff Review 写 `Durable specs: pending sync`。
   - 如果不需要长期规格，Diff Review 写 `Durable specs: skipped because <reason>`。
   - 不要在 verify 阶段直接写 `.cx/specs/` 或把 pending sync 手动标为 updated。
   - 不得保留 `<...>` 占位符；没有剩余风险写 `None`。
6. 运行：

```bash
node "${HOME}/.cx/cx.js" validate --change <change-id> --stage verify
```

7. 如果有 error，立即修复 evidence 或补跑验证。
8. 成功后提醒用户：Review 只依赖落盘产物和必要 diff 摘要，建议执行 `/clear` 后继续 `review`。
