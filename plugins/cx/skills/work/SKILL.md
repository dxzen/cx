---
name: work
description: 澄清需求并路由到合适的 CX 阶段。
---

# CX Work

使用 `core` Skill 澄清用户意图，并路由到最小必要流程。

参数规则：

- 如果 `$ARGUMENTS` 非空，把它作为需求描述或 change-id 候选。
- 如果 `$ARGUMENTS` 为空，从当前用户消息和对话上下文识别需求；仍不清楚时，只问一个澄清问题。
- 如果用户只是想继续已有变更，运行 `node "${HOME}/.cx/cx.js" status --json` 推导唯一活跃 change。

澄清规则：

- 先提取 Intent 摘要、可观察行为、边界、成功标准；缺少阻塞信息时不要猜。
- 新需求开始时读取 `.cx/specs/` 中相关长期规格；它是跨变更事实来源，`.cx/archive/` 只在需要追溯历史时读取。
- 即使 `$ARGUMENTS` 非空，只要可观察行为、边界或成功标准不清，也只问一个阻塞性问题。
- 如果存在多种合理解读，列出最可能的 2-3 种解读，并用一个问题让用户选择或补充。

路由规则：

- Micro 变更：仅在无行为歧义且验证方式明确时可以直接执行；否则提示进入 `contract <需求>`。
- Normal/Large 新变更：提示进入 `contract <需求>`。
- Bug 修复且症状/根因不清：提示进入 `debug <bug>`。
- Large 变更：在 contract 后提示可选 `worktree <change>`。
- 已有 contract：提示进入 `design` 或 `tasks`。
- 已有 tasks 且未完成：提示进入 `build`。
- tasks 中所有实现任务完成但缺 evidence：提示进入 `verify`。
- evidence 完成但缺 review：提示进入 `review`。
- review 完成且 `Decision: PASS`：如果 status 显示 `Durable specs: pending-sync`，提示进入 `sync <change>`；否则提示进入 `archive`。

输出规则：

- 无阻塞问题时，输出：Intent 摘要、变更级别、下一步 Skill、理由。
- 有阻塞问题时，只输出阻塞原因和一个澄清问题。
- **切记**不要在 `work` 中展开完整实现。
