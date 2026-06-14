---
name: contract
description: 创建或更新 CX 变更契约。
---

# CX Contract

目标：通过轻量需求澄清，把用户已有方向收敛为可实现、可验证、可交付的 `.cx/changes/<change-id>/contract.md`。

Contract 是 CX 流水线第一环：

- 只服务于需求确认和落盘。
- 不做商业发散、市场判断、竞品分析、价值验证或额外展示产物。
- 沟通之后发现用户目标还不明确，可引导用户继续做需求澄清。
- 下游只依赖 `contract.md`，因此必须把关键需求、边界、场景和验证方式写清楚。

参数规则：

- 如果 `$ARGUMENTS` 是已有 change-id，读取该 change；如存在 `debug.md`，必须把 Observed、Expected、Reproduction、Regression Test 纳入 Contract。
- 如果 `$ARGUMENTS` 非空且不是已有 change-id，把它作为需求描述。
- 如果 `$ARGUMENTS` 为空，从当前用户消息和对话上下文识别需求；若只有一个活跃 change 且已有 `debug.md` 但缺 `contract.md`，自动使用该 change。
- 如果需求不足以写 Contract，在 Contract 内进行轻量澄清；每轮最多问 1-3 个会影响落盘的问题。

## Contract Readiness

落盘前先判断是否足够写 Contract：

- Intent：用户想达成的结果是否清楚。
- Actor / Trigger：谁在什么情况下触发变化是否清楚。
- Observable Behavior：系统可观察行为是否能写成 Requirement。
- Scope：In / Out 是否能确定，且 Out 不能为空。
- Scenarios：至少一个主路径是否能写成 Given / When / Then。
- Verification：如何证明完成是否清楚，优先使用精确测试、lint、typecheck 或 build 命令。
- Durable Specs：是否已读取相关 `.cx/specs/`，并判断新需求是新增、修改、移除还是重命名长期行为。
- Spec Delta：是否会成为长期行为；如果会，是否能写 `Delta files: specs/<capability>.md` 并创建 change-local delta，或是否能明确 skipped reason。

如果缺口不影响行为边界，可以用保守默认补齐，并在 Contract 中明确。
如果缺口会导致不同实现方向、不同用户可见行为或不同验证方式，必须先澄清。

## 澄清规则

- 先用 3-5 条短句复述当前理解，明确 Intent、可能的 Scope、主场景和验证方向。
- 优先给出 AI 的默认收敛方案，再请用户确认或修正。
- 每轮最多问 1-3 个高信息量问题；如果只有一个阻塞点，只问一个问题。
- 问题必须围绕 Contract 落盘：行为、触发条件、边界、场景、数据/权限/状态、UI 影响、验证方式、长期规格。
- 如果存在 2-3 种合理解读，列出选项并让用户选择或补充。
- 如果用户目标非常模糊，只追问能让需求变成可观察行为的最小问题。

澄清时使用这种结构：

```text
我先把当前需求收敛为：
- Intent: ...
- In: ...
- Out: ...
- 主场景: ...
- 验证方向: ...

还需要确认：
1. ...
2. ...
```

如果已足够落盘，不要继续追问。

## 写作规则

- `contract.md` 和可选 change-local spec delta 必须遵守 `../core/protocols/common.md`、`../core/protocols/contract.md` 和 `../core/protocols/change-spec-delta.md`；这些协议是机器可解析格式，不是示例。
- 写入前复制协议骨架并只填充内容，不得改名固定 heading、字段标签或层级。
- 固定格式包括 `## Intent`、`## Scope`、`- In:`、`- Out:`、`## Requirements`、`### Requirement:`、`#### Scenario:`、`## Spec Delta`、`Delta files:`、`Skipped:`、`## Design Notes`、`## Verification`。
- 不得保留 `<...>` 占位符；没有 Design Notes 时写 `None`。
- Requirement 必须描述系统 MUST/SHOULD/MAY 满足的可观察行为，不把实现细节伪装成需求。
- 每个 Requirement 至少包含一个 Scenario，风险较高时补充边界或失败路径。
- Scope 的 `Out` 必须真实限制范围，不能写空泛占位。
- Verification 必须尽量写精确命令；未知命令时写明确人工检查项，并说明待后续阶段确认。
- Spec Delta 必须二选一：写 `Delta files: specs/<capability>.md` 并在 `.cx/changes/<change-id>/specs/<capability>.md` 中声明 ADDED / MODIFIED / REMOVED / RENAMED；或写清 `Skipped: <reason>`。
- MODIFIED 的 Requirement 必须写完整新版本，不能只写局部差异。
- REMOVED 的 Requirement 使用 `### Requirement: <名称>`，原因写在后续正文，避免用额外 bullet 导致 CLI 误解析为另一个被移除 Requirement。
- Bug contract 必须把 `debug.md` 的 Observed、Expected、Reproduction、Regression Test 转成 Requirement 或 Scenario。
- Design Notes 只写会约束实现的关键取舍；明显内容省略。

执行步骤：

1. 如 `.cx/` 不存在，先运行：

```bash
node "${HOME}/.cx/cx.js" init
```

2. 识别 change-id，使用 kebab-case；如果是 Bug 修复且已有 `debug.md`，先读取它，不要依赖 `/clear` 前的对话记忆。
3. 读取 `.cx/specs/` 中与需求相关的长期规格；没有相关文件时继续，但要避免把 `.cx/archive/` 当作默认知识来源。
4. 读取 `../core/protocols/common.md`、`../core/protocols/contract.md` 和 `../core/protocols/change-spec-delta.md`，确认机器必选格式。
5. 执行 Contract Readiness 判断；信息不足时按澄清规则继续对话，不要急于落盘。
6. 创建 `.cx/changes/<change-id>/contract.md`，必须复制 Contract 协议骨架并填充 Intent、Scope、Requirements、Spec Delta、Design Notes、Verification；Bug contract 必须包含 regression test 对应的 Requirement 或 Scenario。
7. 如果需要长期沉淀，创建 `.cx/changes/<change-id>/specs/<capability>.md`，必须复制 Change Spec Delta 协议骨架并写完整 delta；Contract 的 `## Spec Delta` 写 `Delta files: specs/<capability>.md`。如果不沉淀，Contract 的 `## Spec Delta` 写 `Skipped: <reason>`。
8. 运行：

```bash
node "${HOME}/.cx/cx.js" validate --change <change-id> --stage contract
```

9. 如果有 error，立即修复或询问用户；不能进入下游。
10. 成功后提醒用户：Contract 已落盘，下游只依赖 `contract.md`、相关 change-local spec delta 和必要代码，建议执行 `/clear` 后继续 `visual`（如有 UI）或 `design`/`tasks`。
