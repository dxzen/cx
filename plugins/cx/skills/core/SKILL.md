---
name: core
description: CX的总控Skill，用于需求驱动、规范先行、TDD 实现的轻量工作流。
---

# Core

CX 是面向 Codex 与 Claude Code 的 AI 编程工作流。如果任务是纯问答或只读分析，说明不需要完整 CX 产物即可。

## 总流程

```text
work -> contract -> design(optional) -> tasks -> build -> verify -> review -> sync(if needed) -> archive

可选分支：
debug(bug optional) -> contract
contract -> visual(ui optional) -> design/tasks
contract/design -> worktree(large optional)
```

1. **work**：澄清意图，路由到最小必要阶段。
2. **contract**：以资深 PM 方式澄清需求，写变更契约。
3. **design**：只在有技术取舍、跨模块影响或 UI 约束时写设计。
4. **tasks + build**：先拆任务，再按 RED -> GREEN -> REFACTOR 实现。
5. **verify**：运行 fresh verification + 长期规格回归验证（unchanged Requirement 不变式检查），记录证据。
6. **review**：归档前检查覆盖、质量、越界和测试缺口。
7. **sync**：必要时把 durable spec delta 合并到 `.cx/specs/`。
8. **archive**：关闭变更并保存历史。

## 变更分级

| 级别   | 使用场景                                   | 必需产物                                       |
| ------ | ------------------------------------------ | ---------------------------------------------- |
| Micro  | 文案、配置、小型显然修复、无行为歧义       | 不建 `.cx/changes/*`，但必须验证               |
| Normal | 功能、Bug 修复、重构、API/UI 行为变化      | `contract.md`、`tasks.md`、TDD、验证证据        |
| Large  | 跨模块设计、迁移、高风险架构、重要 UI 流程 | Normal 产物，加 `design.md`，UI 可加 `visual/` |

拿不准时选 Normal。

## TDD 铁律

```text
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
```

流程：RED（写失败测试并确认失败原因）→ GREEN（最小实现让测试通过）→ VERIFY（运行测试）→ REFACTOR（绿色后做局部清理）→ 再次运行测试。

如果先写了 production code：对自己刚写的实现，回退后用 TDD 重来；对用户已有未提交改动，用 characterization test 或询问用户。

Bug 修复：regression test 必须能在当前代码上失败。重构：contract 写 invariants 而非新行为，关键路径缺测试先加 characterization tests。

## 产出协议

`.cx/` 产物必须遵守 `protocols/` 中对应的 CX Artifact Protocol。写入前先读取 `protocols/common.md` 和对应产物协议文件，复制协议骨架后填充内容。不得改名固定 heading、字段标签、表格列名和状态值。不得保留 `<...>` 占位符。产物写入后必须运行对应 stage 的 `validate`，存在 error 时不能进入下游。

## CLI 辅助命令

```text
node "${HOME}/.cx/cx.js" init
node "${HOME}/.cx/cx.js" status
node "${HOME}/.cx/cx.js" validate [--change <name>] [--stage <stage>]
node "${HOME}/.cx/cx.js" sync [--change <name>] [--dry-run]
node "${HOME}/.cx/cx.js" archive [--change <name>] [--dry-run]
node "${HOME}/.cx/cx.js" worktree [--change <name>] [--dry-run]
```

使用原则：创建 `.cx/` 后运行 `status`。创建或更新产物后运行对应 stage 的 `validate`。归档前必须 `archive --dry-run` 通过、`review.md` 存在且 `Decision: PASS`、durable specs 已 sync 或明确 skipped。CLI 输出的 error 是阻塞项，warning 是建议项。

## 默认目录

```text
.cx/
  specs/
  changes/
    <change-id>/
      contract.md
      debug.md
      specs/
        <capability>.md
      design.md
      tasks.md
      evidence.md
      review.md
      visual/
        prototype.html
        style-guide.md
  worktrees/
  archive/
```

`<change-id>` 使用 kebab-case，例如 `add-login-rate-limit`。

## Subagent 使用

平台可用 subagent 时，按需使用，不滥用。Large 变更或多任务工程由 `tasks.md` 声明 `Parallel Execution Plan`。Build worker 必须有独立 Write scope 和 Commands，不能多个 subagent 同时改同一文件。Verify 可按独立命令并行。Review 可按维度分片。给 subagent 的上下文只包含 contract、当前 task、相关文件和验证命令。小改动不用 subagent，协调成本更高。
