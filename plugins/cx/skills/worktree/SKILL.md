---
name: worktree
description: 为 CX Large 变更创建可选 git worktree。
---

# CX Worktree

目标：为风险较高或跨度较大的变更创建隔离 worktree。该模式可选，不默认启用。

参数规则：

- 如果 `$ARGUMENTS` 是 change-id，使用它。
- 如果 `$ARGUMENTS` 为空，运行 `node "${HOME}/.cx/cx.js" status --json` 推导唯一活跃 change。
- 如果无法唯一推导，停止并请用户指定。

执行步骤：

1. 先运行 dry-run：

```bash
node "${HOME}/.cx/cx.js" worktree --change <change-id> --dry-run
```

2. 如果 dry-run 提示 `.cx/worktrees/` 未被 git ignore，询问用户是否允许把 `.cx/worktrees/` 加入 `.gitignore`；修改后重新 dry-run。
3. 如果 dry-run 仍失败，报告原因并停止。
4. 如果 dry-run 通过，询问用户是否确认创建 worktree。
5. 用户确认后运行：

```bash
node "${HOME}/.cx/cx.js" worktree --change <change-id> --yes
```

6. 报告 worktree 路径和分支名，并说明 `.cx` 状态仍以原项目根目录为准；在 worktree 子目录中运行 CX CLI 时会向上查找原 `.cx` 根。

Large 变更提示语：

```text
这是 Large 变更，建议使用 git worktree 隔离。是否创建？
```
