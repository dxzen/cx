---
name: archive
description: 校验并归档一个已完成的 CX 变更。
---

# CX Archive

归档前必须先通过 CX CLI 预检。该命令只关闭变更并把 `.cx/changes/<change>` 移动到 `.cx/archive/YYYY-MM-DD-<change>/`；长期规格合并由 `sync` 完成。

归档门禁：

- `tasks.md` 中所有实现任务已完成。
- `evidence.md` 存在且通过校验。
- `review.md` 存在，且 `Decision: PASS`。
- `Durable specs: updated` 或 `Durable specs: skipped because <reason>` 已在 evidence 中明确。
- 如果 evidence 写 `Durable specs: pending sync`，必须先运行 `sync <change>`，不能归档。
- 如果 evidence 写 `Durable specs: updated`，`.cx/specs/` 必须已包含 change-local spec delta 中的长期 Requirement。

执行步骤：

1. 读取 `contract.md` 的 Spec Delta、`.cx/changes/<change>/specs/*.md`、`evidence.md` 的 Diff Review，以及 `../core/protocols/common.md`、`../core/protocols/evidence.md`、`../core/protocols/review.md` 和 `../core/protocols/change-spec-delta.md`。
2. 如果仍是 `Durable specs: pending sync`，停止并提示先运行 `sync <change>`。
3. 如果跳过 durable specs，evidence 必须按协议写明 `Durable specs: skipped because <reason>`。
4. 如果用户提供了 change 名称，先运行 dry-run：

```bash
node "${HOME}/.cx/cx.js" archive --change <change-name> --dry-run
```

5. 如果用户未提供 change 名称，先运行：

```bash
node "${HOME}/.cx/cx.js" archive --dry-run
```

6. 如果 dry-run 报 error，停止并报告需要修复的项；不要强行归档。
7. 如果 dry-run 通过，询问用户是否确认归档。
8. 用户确认后，运行不带 `--dry-run` 的同一命令。
9. 归档完成后，运行：

```bash
node "${HOME}/.cx/cx.js" status
```

10. 报告归档目录、Durable specs 状态和剩余活跃变更。
11. 提醒用户：归档后开始新变更前强烈建议执行 `/clear`，新变更从 `.cx/specs/` 读取长期规格，不从 archive 继承上下文。
