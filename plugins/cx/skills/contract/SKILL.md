---
name: contract
description: 创建或更新 CX 变更契约。
---

# CX Contract

目标：以资深产品经理的方式引导用户澄清需求，经过必要的多轮问答，把用户已有方向收敛为可实现、可验证、可交付的 `.cx/changes/<change-id>/contract.md`，并额外产出面向产品确认与沟通的 `.cx/changes/<change-id>/prd.html`。

Contract 是 CX 流水线第一环：

- 负责用产品视角把问题、用户、场景、范围、优先级、约束、风险和验收方式问清楚。
- 可做与需求澄清直接相关的产品判断，例如目标用户、核心痛点、主流程、成功指标和非目标；不得编造市场规模、竞品事实、业务数据或用户证据。
- 用户目标不明确时，必须通过多轮高信息量问答继续收敛；每轮最多问 1-3 个问题。
- `contract.md` 是下游实现的唯一可信输入，必须把关键需求、边界、场景和验证方式写清楚。
- `prd.html` 是面向用户和团队沟通的产品文档，必须与 `contract.md` 一致；如果二者冲突，以 `contract.md` 为实现约束，并先修正冲突再进入下游。

参数规则：

- 如果 `$ARGUMENTS` 是已有 change-id，读取该 change；如存在 `debug.md`，必须把 Observed、Expected、Reproduction、Regression Test 纳入 Contract。
- 如果 `$ARGUMENTS` 非空且不是已有 change-id，把它作为需求描述。
- 如果 `$ARGUMENTS` 为空，从当前用户消息和对话上下文识别需求；若只有一个活跃 change 且已有 `debug.md` 但缺 `contract.md`，自动使用该 change。
- 如果需求不足以写 Contract 和 PRD，进入资深 PM 澄清；每轮最多问 1-3 个会影响产品边界、实现方向或验收方式的问题。

## Contract Readiness

落盘前先判断是否足够写 Contract：

- Intent：用户想达成的结果是否清楚。
- Problem / Value：要解决的问题、用户价值或业务价值是否清楚；缺证据时是否标注为假设。
- Actor / Trigger：谁在什么情况下触发变化是否清楚。
- Observable Behavior：系统可观察行为是否能写成 Requirement。
- Scope：In / Out 是否能确定，且 Out 不能为空。
- Priority：核心能力、可延后能力和明确不做的内容是否能区分。
- Scenarios：至少一个主路径是否能写成 Given / When / Then。
- States / Data / Permission：关键状态、数据输入输出、权限或角色边界是否清楚；无相关内容时可明确 N/A。
- Success Metrics：完成后如何判断产品结果或交付质量是否更好；没有量化指标时写可验证的替代信号。
- Verification：如何证明完成是否清楚，优先使用精确测试、lint、typecheck 或 build 命令。
- Durable Specs：是否已读取相关 `.cx/specs/`，并判断新需求是新增、修改、移除还是重命名长期行为。
- Spec Delta：是否会成为长期行为；如果会，是否能写 `Delta files: specs/<capability>.md` 并创建 change-local delta，或是否能明确 skipped reason。

如果缺口不影响行为边界，可以用保守默认补齐，并在 Contract 中明确。
如果缺口会导致不同实现方向、不同用户可见行为或不同验证方式，必须先澄清。

## 资深 PM 澄清规则

- 先用 3-5 条短句复述当前理解，明确 Intent、目标用户、核心问题、可能的 Scope、主场景和验证方向。
- 像资深产品经理一样指出当前需求里最影响成败的假设、取舍和风险，不只追问字段。
- 优先给出 AI 的默认收敛方案，再请用户确认或修正。
- 每轮最多问 1-3 个高信息量问题；如果只有一个阻塞点，只问一个问题。
- 问题必须围绕落盘：用户/角色、问题价值、行为、触发条件、边界、优先级、场景、数据/权限/状态、UI 影响、验收指标、验证方式、长期规格。
- 如果存在 2-3 种合理解读，列出选项并让用户选择或补充。
- 如果用户目标非常模糊，只追问能让需求变成可观察行为的最小问题。
- 如果用户要求“你来定”，可以用明确假设继续推进，但必须在 Contract 和 PRD 中标注这些假设。
- 如果用户回答后仍存在影响方向的关键缺口，继续下一轮澄清；如果已足够落盘，不要为了形式继续追问。

澄清时使用这种结构：

```text
我先把当前需求收敛为：
- Intent: ...
- 目标用户/角色: ...
- 核心问题/价值: ...
- In: ...
- Out: ...
- 主场景: ...
- 成功标准: ...
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
- 任何会约束实现或验收的产品结论都必须进入 `contract.md`；不要只写在 `prd.html` 里。
- `prd.html` 可以扩展背景、用户旅程、思维脑图和流程图，但不得引入 `contract.md` 未覆盖的新功能承诺。

## PRD HTML 规则

`prd.html` 是 Contract 阶段的必选产物，路径固定为：

```text
.cx/changes/<change-id>/prd.html
```

创建 `prd.html` 时：

- 如果运行环境提供 `huashu-design` skill，必须先读取并遵守该 skill 中适用于信息图/可视化 HTML 的要求；如果不可用，按本节最小规则执行。
- 使用单文件 HTML，CSS 内联；默认不依赖外部 CDN、远程字体或运行时网络。
- 文档应是 PRD，而不是营销落地页；首屏直接呈现产品需求主题和关键结论。
- 使用真实需求内容；未知信息写“待确认”或“假设”，不得编造用户数据、指标、竞品结论或市场事实。
- 视觉风格应克制、清晰、适合产品评审；避免无意义装饰、营销式 hero、虚假数据卡片和通用渐变堆叠。
- 必须包含产品思维脑图和核心流程图；可用 HTML/CSS 原生结构、内联 SVG 或 Mermaid 源文本的静态渲染说明，但不得依赖外网脚本才能理解。
- 必须能通过浏览器直接打开阅读；可访问性基本合格，包含 `<title>`、清晰 heading、足够对比度和响应式布局。

PRD 内容至少包含：

- 产品概述：背景、目标、目标用户/角色、核心问题和价值主张。
- 目标与非目标：本次变更要达成什么、不做什么。
- 用户场景：主路径、关键触发、用户故事或 Job Story。
- 需求范围：功能需求、非功能需求、边界条件、权限/数据/状态。
- 优先级：Must / Should / Could 或等价分级。
- 验收标准：与 `contract.md` Requirements / Scenarios 对齐。
- 产品思维脑图：围绕用户、问题、能力、约束、指标、风险展开。
- 核心流程图：覆盖主要用户流程、系统响应和异常/分支路径。
- 指标与验证：产品成功指标、工程验证命令或人工验收方式。
- 风险、依赖与待确认项：明确假设、外部依赖和仍需用户确认的问题。
- 追踪关系：说明 PRD 各关键需求对应 `contract.md` 中哪些 Requirement。

执行步骤：

1. 如 `.cx/` 不存在，先运行：

```bash
node "${HOME}/.cx/cx.js" init
```

2. 识别 change-id，使用 kebab-case；如果是 Bug 修复且已有 `debug.md`，先读取它，不要依赖 `/clear` 前的对话记忆。
3. 读取 `.cx/specs/` 中与需求相关的长期规格；没有相关文件时继续，但要避免把 `.cx/archive/` 当作默认知识来源。
4. 读取 `../core/protocols/common.md`、`../core/protocols/contract.md` 和 `../core/protocols/change-spec-delta.md`，确认机器必选格式。
5. 执行 Contract Readiness 判断；信息不足时按资深 PM 澄清规则继续对话，不要急于落盘。
6. 创建 `.cx/changes/<change-id>/contract.md`，必须复制 Contract 协议骨架并填充 Intent、Scope、Requirements、Spec Delta、Design Notes、Verification；Bug contract 必须包含 regression test 对应的 Requirement 或 Scenario。
7. 如果需要长期沉淀，创建 `.cx/changes/<change-id>/specs/<capability>.md`，必须复制 Change Spec Delta 协议骨架并写完整 delta；Contract 的 `## Spec Delta` 写 `Delta files: specs/<capability>.md`。如果不沉淀，Contract 的 `## Spec Delta` 写 `Skipped: <reason>`。
8. 创建 `.cx/changes/<change-id>/prd.html`，内容必须遵守 PRD HTML 规则，并与 `contract.md` 的 Scope、Requirements、Scenarios、Verification 保持一致。
9. 运行：

```bash
node "${HOME}/.cx/cx.js" validate --change <change-id> --stage contract
```

10. 如果有 error，立即修复或询问用户；不能进入下游。`prd.html` 当前不纳入 `cx.js validate --stage contract` 门禁，但仍必须按本 Skill 自检。
11. 成功后提醒用户：Contract 和 PRD 已落盘，下游实现只依赖 `contract.md`、相关 change-local spec delta 和必要代码，`prd.html` 用于产品评审和沟通；建议执行 `/clear` 后继续 `visual`（如有 UI）或 `design`/`tasks`。
