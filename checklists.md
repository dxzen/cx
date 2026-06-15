# CX Checklists
本文件是人类维护者和审查时的可选自查清单，不是节点必读协议。

## Intent Checklist

- 用户想改变的可观察行为是否清楚？
- 是否读取了相关 `.cx/specs/` 长期规格？
- 非目标是否清楚？
- 成功标准是否可验证？
- 是否需要拆分多个独立变更？
- 项目测试命令和包管理器是否已识别？

## Contract Checklist

- 已复制 `plugins/cx/skills/core/protocols/contract.md` 中的 Contract 协议骨架，固定 heading、字段标签和层级未改名。
- `Out` 不为空。
- 每个 Requirement 都有至少一个 Scenario。
- Scenario 使用 Given/When/Then。
- 长期行为已写 `Delta files: specs/<capability>.md` 并创建 change-local delta，或明确说明 skipped 原因。
- Verification 命令足够精确。
- 没有把实现细节伪装成需求。
- 已创建 `.cx/changes/<change-id>/prd.html`，且内容与 `contract.md` 一致。
- PRD HTML 包含常规 PRD 内容、产品思维脑图、核心流程图、验收标准、风险和待确认项。
- PRD 中的假设已标注，没有编造市场、用户、竞品或指标事实。

## TDD Checklist

- 先写测试。
- 已运行测试并看到预期失败。
- 没有 RED 失败前没有写 production code。
- 如果使用 subagent worker，`tasks.md` 已声明互不重叠的并行计划、写入范围和验证命令。
- 如果自己先写了实现，已回退自己的实现并用 TDD 重来。
- production code 只满足当前测试。
- 聚焦测试已通过。
- 相关测试或全量测试已通过。
- 重构发生在 green 之后。

## UI Checklist

- 是否是新页面、新组件、复杂表单、仪表盘、编辑器、可视化、游戏或交互工具？
- 是否缺少布局、色彩、状态、响应式或动效依据？
- 是否需要进入 `visual` 阶段生成可确认、可调参、可视化编辑的 HTML 原型？
- 进入下游前是否已从 `prototype.editable.html` 导出纯净 `prototype.final.html`？
- `visual/style-guide.md` 是否可直接指导实现？

## Completion Checklist

- 所有 `.cx` 产物均遵守 `plugins/cx/skills/core/protocols/` 中对应 Artifact Protocol，且未保留 `<...>` 占位符。
- Fresh verification 已运行。
- `evidence.md` 或最终回复包含命令和结果，且没有 FAIL 结果被带入下游。
- 如果使用 subagent 验证或审查，最终 `evidence.md`、`review.md` 和 Decision 已由主 agent 汇总。
- `review.md` 已完成，且 `Decision: PASS`。
- Diff 已检查，无 debug 代码和无关 churn。
- Durable specs 已 `sync` 到 `.cx/specs/`，或以 `skipped because <reason>` 明确跳过原因。
- 未验证风险已说明。

## Debug Checklist

- Observed symptom 是否清楚？
- Expected behavior 是否清楚？
- 是否有最小复现步骤？
- 是否列出根因假设和验证方法？
- 是否设计了修复前失败的 regression test？

## Review Checklist

- Requirement 是否都有证据？
- 是否有 contract 范围外实现？
- 是否有 debug 代码、无关格式化或临时改动？
- 是否缺少边界/异常/regression 测试？
- Decision 是否明确为 `PASS` 或 `NEEDS_CHANGES`？
