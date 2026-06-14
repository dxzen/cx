---
name: sync
description: 将 CX 变更内的 durable spec delta 同步到长期规格。
---

# CX Sync

目标：把 `.cx/changes/<change-id>/specs/*.md` 中的 durable spec delta 合并到 `.cx/specs/`，让长期规格成为后续需求的事实来源。

职责边界：

- 只同步长期规格和必要的 `evidence.md` 状态。
- 不修改 production code。
- 不移动 change 目录；关闭变更由 `archive` 完成。
- 不读取 `.cx/archive/` 作为默认知识来源。

参数规则：

- 如果 `$ARGUMENTS` 是 change-id，使用它。
- 如果 `$ARGUMENTS` 为空，运行 `node "${HOME}/.cx/cx.js" status --json` 推导唯一活跃 change。
- 如果无法唯一推导，停止并请用户指定。

执行步骤：

1. 运行：

```bash
node "${HOME}/.cx/cx.js" validate --change <change-id> --stage review
```

2. 如果有 error，先修复 CX 产物，不要同步。
3. 读取 `review.md`，只有 `Decision: PASS` 才能同步；如果是 `NEEDS_CHANGES` 或缺少 Decision，停止。
4. 读取 `.cx/changes/<change-id>/specs/*.md`、`../core/protocols/common.md` 和 `../core/protocols/change-spec-delta.md`，必要时读取 `../core/protocols/durable-spec.md`，确认 delta 使用固定 ADDED/MODIFIED/REMOVED/RENAMED Requirements 格式：
   - `ADDED`：新增长期 Requirement。
   - `MODIFIED`：替换已有 Requirement，必须写完整新版本。
   - `REMOVED`：移除已有 Requirement，必须在 delta 中说明原因和迁移方式。
   - `RENAMED`：重命名已有 Requirement，必须写 FROM/TO。
   - 如果格式不符合协议，回到 `contract` 修复 change-local spec delta，不要手动猜测同步。
5. 先运行 dry-run：

```bash
node "${HOME}/.cx/cx.js" sync --change <change-id> --dry-run
```

6. 如果 dry-run 报 error，停止并报告需要修复的 delta 文件或长期规格问题。
7. dry-run 通过后，运行：

```bash
node "${HOME}/.cx/cx.js" sync --change <change-id>
```

8. 运行：

```bash
node "${HOME}/.cx/cx.js" status
```

9. 报告同步到的 `.cx/specs/<capability>.md`、ADDED/MODIFIED/REMOVED/RENAMED 数量，以及 `evidence.md` 是否从 `Durable specs: pending sync` 更新为 `Durable specs: updated`。
10. 成功后提醒用户：长期规格已同步，下一步运行 `archive <change-id>`。

跳过规则：

- 如果变更不需要长期规格，`evidence.md` 必须写 `Durable specs: skipped because <reason>`，此时不需要运行 `sync`。
- 如果没有 `.cx/changes/<change-id>/specs/*.md`，不要臆造长期规格；回到 `contract` 或 `verify` 明确 skipped reason。
