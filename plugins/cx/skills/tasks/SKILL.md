---
name: tasks
description: 将 CX 变更拆成 TDD 任务。
---

# CX Tasks

目标：创建 `.cx/changes/<change-id>/tasks.md`，让实现阶段可以按 RED -> GREEN -> REFACTOR 执行。

参数规则：

- 如果 `$ARGUMENTS` 是 change-id，使用它。
- 如果 `$ARGUMENTS` 为空，运行 `node "${HOME}/.cx/cx.js" status --json` 推导唯一活跃 change。
- 如果无法唯一推导，停止并请用户指定。

写作规则：

- `tasks.md` 必须遵守 `../core/protocols/common.md` 和 `../core/protocols/tasks.md`；这些协议是机器可解析格式，不是示例。
- 写入前复制 Tasks 协议骨架并只填充内容，不得改名固定 heading、checkbox、字段标签或 TDD 标签。
- `tasks.md` 的叙述正文必须使用简体中文；只保留必要英文专业术语、代码标识、路径、命令、包名和固定 CX/TDD 标签。
- 固定标签可使用英文：`Requirement`、`Scenario`、`RED`、`GREEN`、`VERIFY`、`REFACTOR`、`Command`、`Expected failure`、`Scope`、`Test files`、`Parallel Execution Plan`、`Parallel build`、`Worker`、`Tasks`、`Write scope`、`Commands`、`Depends on`、`EVIDENCE`。
- 标签后面的原因、动作、范围说明和风险解释必须用中文描述；例如 `Expected failure:` 后写中文失败原因，`Parallel build: enabled/skipped because` 后写中文原因。
- 不得保留 `<...>` 占位符；无并行计划时小变更可省略整个 `## Parallel Execution Plan`，触发并行计划条件时必须按协议写完整。

执行步骤：

1. 读取项目约束：从当前目录向上查找 `AGENTS.md`，并读取与当前项目相关的语言、编码、测试和协作规则；如果不存在，继续执行但保留本 Skill 的中文写作规则。
2. 读取 `contract.md`、contract 引用的 `.cx/changes/<change-id>/specs/*.md`、可选 `design.md`、可选 `visual/style-guide.md`，并读取 `../core/protocols/common.md` 和 `../core/protocols/tasks.md`。
   - 如果存在 `visual/style-guide.md`，必须同时读取 `visual/prototype.html`。
   - 不读取 `visual/prototype.html` 以外的工作稿。
3. 如果 `design.md` 包含已确认的技术栈选型，先提取语言、框架、库、数据库、ORM、构建工具和测试工具，并把它作为任务拆分的硬约束。
4. 按 Requirement 拆分任务；如果存在 change-local spec delta，确保需要长期沉淀的 Requirement 在任务中有实现和验证覆盖。每个实现任务必须包含 RED/GREEN/VERIFY 信息和明确 Command；不要把 `EVIDENCE` 写成 checkbox，验证证据由 `verify` 产出。
   - 任务中的测试文件、实现文件、命令和 Scope 必须遵守已确认技术栈。
   - 如果某个任务需要新增或替换未确认的技术栈选项，停止拆分并回到 `design` 重新推荐和确认。
5. 判断是否启用 subagent 并行：大规模工程按需使用 subagent，小改动不用，协调成本更高。只有当前未完成任务位于可并行 worker 范围内时才启用；给 subagent 的上下文只包含 contract、design、对应 tasks、允许文件范围和验证命令。
6. 判断是否必须规划并行 build：
   - Large 变更、实现 checkbox 达到 16 个及以上、或同时包含前端和后端/服务端实现块时，必须写入 `## Parallel Execution Plan`。
   - 对空仓库或共享基础设施工程，先声明串行 Foundation/Bootstrap 阶段，再为后续互不重叠的前端、后端、模型、迁移、E2E、文档等实现块规划 worker；不得因为早期共享文件存在就把整个大型工程标记为 skipped。
   - 只有当所有实现任务都无法拆出独立写入范围和独立验证命令时，才允许整体写 `Parallel build: skipped because <中文原因>`。
   - 每个 worker 必须声明 Tasks、Write scope、Commands、Depends on。
   - 不得让多个 worker 同时修改同一模块、同一测试文件、同一快照文件或同一 migration 序列文件。
   - 如果某些任务必须串行，写成 `Serial phase` 或在 worker 的 `Depends on` 中表达依赖；不要把可并行任务混入串行说明。
7. 写入 `.cx/changes/<change-id>/tasks.md`，必须复制 Tasks 协议骨架并保留 `## Requirement:`、checkbox、`RED:`、`GREEN:`、`VERIFY:`、`Command:`、`Expected failure:`、`Scope:` 等固定格式。
8. 运行：

```bash
node "${HOME}/.cx/cx.js" validate --change <change-id> --stage tasks
```

9. 如果有 error，立即修复。
10. 成功后提醒用户：实现阶段只需要产物文件和相关代码，强烈建议执行 `/clear` 后继续 `build`。
