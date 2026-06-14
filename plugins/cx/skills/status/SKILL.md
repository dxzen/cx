---
name: status
description: 检查 CX 变更状态并给出下一步。
---

# CX Status

检查当前 repo 的 `.cx/` 状态，并根据 CLI 输出给出下一步。

执行步骤：

1. 使用 Bash 运行：

```bash
node "${HOME}/.cx/cx.js" status
```

2. 报告活跃变更、阶段、任务进度、Durable specs 状态、校验摘要和 CLI 给出的下一步。
   - 如果阶段是 `spec-sync` 或 Durable specs 为 `pending-sync`，下一步是 `sync <change>`。
   - 如果 Durable specs 为 `skipped` 或 `synced`，按 CLI 下一步继续。
3. 如果需要更严格诊断，建议继续运行 `validate`。

只报告事实和下一步，不要声称变更完成，除非已有 fresh verification 证据。
