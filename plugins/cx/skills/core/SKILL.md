---
name: core
description: CX的总控Skill，用于需求驱动、规范先行、TDD 实现的轻量工作流。
---

# Core
CX 是面向 Codex 与 Claude Code 的 AI 编程工作流。

## 启动宣告
- 如果任务是纯问答、只读分析或极小文案修改，可以说明该任务不需要完整 CX 产物，但仍要保持验证纪律。

## 总流程
```text
概念流程：
Intent -> Contract -> Design -> TDD -> Verify -> Review -> Spec Sync -> Archive

执行 Skill：
work -> contract -> design(optional) -> tasks -> build -> verify -> review -> sync(if needed) -> archive

可选分支：
debug(bug optional) -> contract
contract -> visual(ui optional) -> design/tasks
contract/design -> worktree(large optional)
```

含义：

1. **Intent / `work`**：确认用户真正想改变的可观察行为，并路由到最小必要阶段。
2. **Contract / `contract`**：写短小变更契约，包含范围、非目标、Requirement 和 Scenario。
3. **Design / `design`**：只在有技术取舍、跨模块影响或 UI 影响时写设计。
4. **TDD / `tasks` + `build`**：先拆任务，再按 RED -> GREEN -> REFACTOR 实现。
5. **Verify / `verify`**：完成前运行 fresh verification，记录证据。
6. **Review / `review`**：归档前检查覆盖、质量、越界修改和测试缺口。
7. **Spec Sync / `sync`**：必要时把本次 durable spec delta 合并到 `.cx/specs/`。
8. **Archive / `archive`**：关闭变更并保存历史。



## 阶段 Skill
`work` 只做入口分级和路由；Normal/Large 变更按阶段 Skill 推进：

```text
Codex: work -> debug(bug optional) -> contract -> visual(optional)
  -> design(optional) -> worktree(large optional) -> tasks
  -> build -> verify -> review -> sync(if needed) -> archive
```

参数推导规则：

- `<需求>` 未传入时，由 AI 从当前用户消息和对话上下文识别；仍不清楚时，只问一个阻塞性问题。
- `<change>` 未传入时，先用 `node "${HOME}/.cx/cx.js" status --json` 推导唯一活跃变更。
- 如果没有活跃变更或存在多个活跃变更，停止并请用户指定。

上下文清理规则：

- Contract 成功后建议 `/clear`，下游只依赖 `contract.md`。
- Visual 成功并导出 final 后强烈建议 `/clear`，下游只依赖 `prototype.final.html` 和 `style-guide.md`。
- Design 成功后建议 `/clear`，下游只依赖 `design.md`。
- Tasks 成功后强烈建议 `/clear`，Build 只依赖落盘产物和相关代码。
- Verify 成功后建议 `/clear`，Review 只依赖落盘产物和必要 diff 摘要。
- Review 成功后建议 `/clear`，Sync/Archive 只依赖落盘产物和 CLI dry-run。
- Sync 成功后建议 `/clear`，Archive 只依赖落盘产物和 CLI dry-run。
- Archive 完成后强烈建议 `/clear`，新变更应从干净上下文开始。

## CLI 辅助命令
CX 包含零依赖脚本 `cx.js`。在日常开发中优先用它做结构化判断，AI 负责解释结果和补齐内容。**切记：**  `cx.js` 是执行入口，不是默认上下文，各节点不得读取其源码。

```text
node "${HOME}/.cx/cx.js" init
node "${HOME}/.cx/cx.js" status
node "${HOME}/.cx/cx.js" validate [--change <name>] [--stage <stage>]
node "${HOME}/.cx/cx.js" sync [--change <name>] [--dry-run]
node "${HOME}/.cx/cx.js" archive [--change <name>] [--dry-run]
node "${HOME}/.cx/cx.js" worktree [--change <name>] [--dry-run]
```

使用原则：

- 创建 `.cx/` 后运行 `status`，确认目录和下一步。
- 创建或更新 `contract.md`、`visual/`、`design.md`、`tasks.md`、`evidence.md` 后运行对应 stage 的 `validate`。
- 如果 status 显示 `Durable specs: pending-sync`，归档前必须运行 `sync --dry-run`，再运行 `sync`。
- 归档前必须先运行 `archive --dry-run`。
- 归档前必须有 `review.md` 且 `Decision: PASS`。
- CLI 输出的 error 是阻塞项，warning 是建议项。

## 产出协议
`.cx/` 产物必须遵守 `protocols/` 中对应的 CX Artifact Protocol。协议文件不是参考示例，而是节点产出协议：

- 写入任何 `.cx/changes/<change-id>/...` 或 `.cx/specs/...` 产物前，先读取 `protocols/common.md` 和对应产物协议文件。
- 复制协议骨架后填充内容，保留固定 heading、字段标签、表格列名和状态值。
- 不得把 `### Requirement:`、`#### Scenario:`、`- In:`、`- Out:`、`Delta files:`、`Skipped:`、`Decision:`、`Durable specs:` 等机器可解析标签改写成同义表达。
- 不得保留 `<...>` 占位符；无内容时使用协议允许的 `None`、`Skipped: <reason>` 或明确说明。
- 产物写入后必须运行对应 stage 的 `validate`；存在 error 时不能进入下游。

## 变更分级
按风险选择最轻流程：

| 级别   | 使用场景                                   | 必需产物                                       |
| ------ | ------------------------------------------ | ---------------------------------------------- |
| Micro  | 文案、配置、小型显然修复、无行为歧义       | 不建 `.cx/changes/*`，但必须验证               |
| Normal | 功能、Bug 修复、重构、API/UI 行为变化      | `contract.md`、`tasks.md`、TDD、验证证据       |
| Large  | 跨模块设计、迁移、高风险架构、重要 UI 流程 | Normal 产物，加 `design.md`，UI 可加 `visual/` |

拿不准时选 Normal。它的成本低，能换来清晰上下文。

## 默认目录
如果项目没有现成规范目录，使用：

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
        prototype.editable.html
        prototype.final.html
        style-guide.md
  worktrees/
  archive/
```

`<change-id>` 使用 kebab-case，例如 `add-login-rate-limit`、`fix-empty-cart-total`。

## Intent
开始编码前先做这些事：

- 读用户请求，提取可观察行为、边界、非目标和成功标准。
- 读取 `.cx/specs/` 中与需求相关的长期规格；它是跨变更事实来源，`.cx/archive/` 只在追溯历史时读取。
- 快速查看项目约束：`AGENTS.md`、项目已有说明文件、包管理器、测试框架、已有代码风格。
- 只在存在阻塞性歧义时提问；其他不确定点写入假设。
- 如果需求跨多个独立子系统，建议拆分。

不要在 Intent 阶段写 production code。

## Contract
Normal/Large 变更必须创建：

```text
.cx/changes/<change-id>/contract.md
```

使用 `protocols/common.md`、`protocols/contract.md` 和 `protocols/change-spec-delta.md`。Contract 必须复制协议骨架并保留固定格式：

- `## Intent`：一到两句话说明用户可见或开发者可见变化。
- `## Scope`：必须写 `- In:` 和 `- Out:`，Out 不能为空。
- `## Requirements`：每个需求使用 `### Requirement:`，使用 MUST/SHOULD/MAY 表达行为约束。
- `#### Scenario:`：每个 Requirement 至少一个 Scenario，使用 Given/When/Then 写验收场景。
- `## Spec Delta`：长期行为写 `Delta files: specs/<capability>.md`，并创建 change-local delta 文件；不沉淀时写 `Skipped: <reason>`。
- `## Design Notes`：没有约束时写 `None`。
- `## Verification`：列出精确命令或人工检查项。

Requirement 少而精，通常 1-5 个。超过 5 个时优先拆分变更。

## Design
只有在这些条件之一成立时创建 `design.md`：

- 跨模块或跨层修改。
- 有架构、数据模型、兼容性、迁移、性能或安全取舍。
- UI 流程、视觉系统或交互状态明显受影响。
- Contract 无法直接指导 tasks。

设计必须写清：

- 选择的方案和理由。
- 放弃的备选方案和原因。
- 受影响文件或模块。
- 测试策略。
- 风险和回退方式。

写入时使用 `protocols/common.md` 和 `protocols/design.md`，保留固定 heading；无内容时写 `None` 或 `N/A`。

不要为了显而易见的实现写长设计。

## UI 与 visual
当变更影响 UI，且不只是轻微文案或样式调整时，在 `contract` 后优先进入 `visual` 阶段沉淀交互原型和样式规范，再进入 `design` 或 `tasks`。

触发条件：

- 新页面、新组件、复杂表单、仪表盘、编辑器、可视化、游戏或交互工具。
- 用户明确要求原型、Demo、视觉设计、动画或高保真界面。
- 现有需求不足以指导布局、色彩、组件状态或响应式行为。

执行方式：

1. 整理 `contract.md` 中的 UI Requirements 和 Scenarios。
2. 运行 `visual <change-id>`，通过确认门对齐视觉主题、原型形态、关键交互和默认 Tweaks。
3. 产出可直接打开的 `prototype.editable.html` 工作稿，覆盖关键状态，并默认带 Tweaks 与轻量 Edit Mode，方便用户在浏览器中继续可视化调整。
4. 用户确认后，从工作稿手动导出纯净 `prototype.final.html`；该文件不包含 Tweaks、Edit Mode 或调试 API，是下游唯一可信原型。
5. 将稳定结果保存到：

```text
.cx/changes/<change-id>/visual/prototype.editable.html
.cx/changes/<change-id>/visual/prototype.final.html
.cx/changes/<change-id>/visual/style-guide.md
```

如果 UI 变更很小，可跳过 `visual`，但需要在 `design` 或 `tasks` 中说明沿用的现有组件和样式约束。

## Tasks
Normal/Large 变更必须创建：

```text
.cx/changes/<change-id>/tasks.md
```

任务必须按 Requirement 拆分，每个行为都能独立 RED/GREEN/REFACTOR。禁止写空泛任务，例如“添加错误处理”“完善测试”“优化代码”。

`tasks.md` 的叙述正文默认使用简体中文；只保留必要英文专业术语、代码标识、路径、命令、包名和固定 CX/TDD 标签。固定标签包括 `Requirement`、`Scenario`、`RED`、`GREEN`、`VERIFY`、`REFACTOR`、`Command`、`Expected failure`、`Scope`、`Test files`、`Parallel Execution Plan`、`Parallel build`、`Worker`、`Tasks`、`Write scope`、`Commands`、`Depends on`、`EVIDENCE`。标签后面的动作、原因、范围和风险说明必须用中文描述。

每个任务至少包含：

- Requirement 引用。
- 要新增或修改的测试文件。
- 聚焦测试命令。
- 预期 RED 失败原因。
- 最小实现范围。
- 最终验证命令。

使用 `protocols/common.md` 和 `protocols/tasks.md`。必须复制协议骨架并保留 checkbox、`RED:`、`GREEN:`、`VERIFY:`、`Command:`、`Expected failure:`、`Scope:` 等固定标签。

Large 变更、实现 checkbox 达到 16 个及以上、或同时包含前端和后端/服务端实现块时，必须写 `## Parallel Execution Plan`。对空仓库或共享基础设施工程，先声明串行 Foundation/Bootstrap 阶段，再为后续互不重叠的前端、后端、模型、迁移、E2E、文档等实现块规划 worker；不得因为早期共享文件存在就把整个大型工程标记为 skipped。只有所有任务都无法拆出独立写入范围和独立验证命令时，才允许整体 skipped，并必须写清中文原因。

## TDD 铁律
```text
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
```

适用：

- 新功能。
- Bug 修复。
- 行为变更。
- 重构。

流程：

1. RED：写一个聚焦测试。
2. 运行测试，确认失败原因正确。
3. GREEN：写最少 production code 让测试通过。
4. VERIFY：运行聚焦测试和相关测试。
5. REFACTOR：只在 GREEN 后清理命名、重复和局部结构。
6. 再次运行测试。

如果先写了 production code：

- 对自己刚写的实现，删除或回退后用 TDD 重来。
- 对用户已有未提交改动，不要回退；改用 characterization test 或最强可行验证，并记录原因。

如果无法先写失败测试，必须在 `tasks.md` 或 `evidence.md` 记录原因和替代验证方式。

构建阶段的硬门禁：

- 没看到 RED 失败，不得写 production code。
- 如果自己已经先写实现但没有 RED，必须回退自己的实现并用 TDD 重来。
- 用户已有未提交改动不能擅自回退；遇到这类情况，改用 characterization test 或询问用户。
- 每个任务必须留下 RED/GREEN 证据，后续写入 `evidence.md`。

每个完成的 Requirement 都要留下 TDD 证据：

| 检查项   | 要求                         |
| -------- | ---------------------------- |
| RED      | 已看到测试按预期失败         |
| GREEN    | 最小实现让聚焦测试通过       |
| REFACTOR | 如有重构，重构后测试仍通过   |
| SCOPE    | 没有实现 contract 范围外功能 |
| VERIFY   | fresh verification 已运行    |

## Bug 修复变体
Bug contract 必须包含：

- observed symptom。
- expected behavior。
- suspected 或 confirmed cause。
- regression test。

修复前，regression test 必须能在当前代码上失败。

复杂 Bug 先使用 `debug` 创建 `debug.md`。`debug.md` 必须记录 Observed、Expected、Reproduction、Hypotheses 和 Regression Test。不要在复现前试修。

如果 `debug` 后执行了 `/clear`，`contract <change>` 必须读取 `debug.md`，不能依赖已清理的对话上下文。

## 重构变体
重构 contract 不写新行为，而是写 invariants：

- 不能改变的 public behavior。
- 架构、依赖、性能或可读性目标。
- 证明行为不变的测试。

如果关键路径没有测试，先添加 characterization tests。

## Verify
完成前必须运行 fresh verification。不能用“之前跑过”“应该能过”代替。

最低要求：

- 运行 contract 或 tasks 中列出的测试、lint、typecheck、build 或人工检查。
- 查看 exit code 和关键输出。
- 先看 `git diff --stat`，再按 Requirement 和 tasks 涉及文件分块检查 diff，确认没有 debug 代码、无关格式化或越界修改。
- 对每条 Requirement 给出证据。

把结果写入：

```text
.cx/changes/<change-id>/evidence.md
```

或在最终回复中明确列出。

写入 `evidence.md` 时使用 `protocols/common.md` 和 `protocols/evidence.md`，保留 Verification Commands、Requirement Coverage、TDD Evidence、Diff Review、Remaining Risk 章节和表格列名。

如果存在 `.cx/changes/<change-id>/specs/*.md`，`evidence.md` 的 Diff Review 应写 `Durable specs: pending sync`。如果明确跳过长期规格，写 `Durable specs: skipped because <reason>`。

如果验证无法运行，说明具体原因、影响范围和剩余风险。

## Durable Specs
`.cx/specs/` 是长期事实来源。新需求开始时默认读取相关 durable specs；`.cx/archive/` 只是完成历史，不作为默认知识来源。

当变更产生长期有效行为时，先创建本次变更的 delta：

```text
.cx/changes/<change-id>/specs/<capability>.md
```

change-local delta 使用 OpenSpec 风格：

必须遵守 `protocols/common.md` 和 `protocols/change-spec-delta.md`。

```markdown
## ADDED Requirements
### Requirement: <短名称>

<系统 MUST/SHOULD/MAY 做什么。>

#### Scenario: <场景名称>

- Given <状态>
- When <动作>
- Then <结果>

## MODIFIED Requirements
### Requirement: <已有短名称>

<写出完整新版本，不写局部补丁。>

#### Scenario: <场景名称>
- Given <状态>
- When <动作>
- Then <结果>

## REMOVED Requirements
### Requirement: <移除的 Requirement 名称>

<移除原因和迁移方式。>

## RENAMED Requirements
- FROM: <旧名称>
- TO: <新名称>
```

Micro 修复、内部清理、一次性迁移、已经被项目文档或测试充分覆盖的行为，可以跳过 durable specs。

同步 durable specs 时运行：

```bash
node "${HOME}/.cx/cx.js" sync --change <change-id> --dry-run
node "${HOME}/.cx/cx.js" sync --change <change-id>
```

`sync` 会按相对路径映射：

```text
.cx/changes/<change-id>/specs/auth.md -> .cx/specs/auth.md
```

`sync` 合并语义：

- `ADDED`：新增长期需求。
- `MODIFIED`：修改已有需求，必须写出完整新版本。
- `REMOVED`：移除需求，必须说明原因和迁移方式。
- `RENAMED`：重命名需求，必须写 FROM/TO。

如果 `evidence.md` 中是 `Durable specs: pending sync`，成功同步后 CLI 会改为 `Durable specs: updated`。归档前不能保留 pending sync。

## Archive
实现和验证完成后，可以归档：

```text
.cx/archive/YYYY-MM-DD-<change-id>/
```

归档前检查：

- `tasks.md` 中实现任务已勾选完成。
- `evidence.md` 包含 fresh verification。
- `review.md` 存在且 `Decision: PASS`。
- durable specs 已通过 `sync` 更新，或在 evidence 中写明 `Durable specs: skipped because <reason>`。
- `node "${HOME}/.cx/cx.js" archive --dry-run` 通过。

Archive 不负责合并长期规格；如果仍是 `Durable specs: pending sync`，先回到 `sync`。如果归档会打断当前交付，可以暂缓，但不能丢失验证证据。

## Review
`review` 在 `verify` 后、`sync/archive` 前执行。它检查：

- Spec Coverage：Requirement 是否都有证据。
- Code Quality：命名、职责、错误处理、项目风格。
- Test Gaps：是否只有 happy path、是否缺少 regression/edge case。
- Scope：是否有 contract 外越界实现。

阻塞问题写 `Decision: NEEDS_CHANGES`，修复后重新 review。归档只接受 `Decision: PASS`。

写入 `review.md` 时使用 `protocols/common.md` 和 `protocols/review.md`，且只能包含一个 `Decision: PASS` 或 `Decision: NEEDS_CHANGES`。

## Worktree
Large 变更或高风险重构时，提示用户可选创建 worktree：

```text
这是 Large 变更，建议使用 git worktree 隔离。是否创建？
```

使用 `worktree <change>` 创建 `.cx/worktrees/<change>`。它不是默认路径，避免给小任务增加负担。

创建前必须确认 `.cx/worktrees/` 已被 git ignore；进入 worktree 后，CX CLI 会向上查找原项目根目录的 `.cx`。

## Subagent 使用
平台可用 subagent 时，按需使用，不要滥用：

- Large 变更、多任务工程或前后端工程：`tasks.md` 必须先声明 `Parallel Execution Plan`，可包含串行 Foundation/Bootstrap 阶段和后续互不重叠的 worker；只有当前未完成任务位于可并行 worker 范围内时，才派 subagent 做局部实现。
- Build worker 必须有独立 Write scope 和 Commands；不能多个 subagent 同时改同一模块、同一测试文件、同一快照文件或同一 migration 序列文件。
- Verify 可按独立命令、Requirement 或人工检查项并行；任何 FAIL 都必须由主 agent 阻塞下游。
- Review 可按 Scope、Spec Coverage、Code Quality、Test Gaps 分片审查；最终 `review.md` 和 `Decision` 只能由主 agent 写。
- 高风险设计：可派 subagent 审查 contract/design 是否矛盾。
- 小改动：通常不用 subagent，协调成本更高。

给 subagent 的上下文只包含 contract、当前 task、相关文件和验证命令。

## 完成回复
最终回复只报告高信号内容：

- 改了哪些文件或行为。
- 运行了哪些 verification commands，结果是什么。
- durable specs 是否 sync 或 skipped，archive 是否完成。
- 未验证风险和原因。

不要用没有证据的“应该可以”“看起来没问题”代替验证结果。
