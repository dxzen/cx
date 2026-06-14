---
name: build
description: 按 CX tasks 执行 TDD 实现。
---

# CX Build
目标：按 `.cx/changes/<change-id>/tasks.md` 严格执行 TDD。

## 参数规则：
- 如果 `$ARGUMENTS` 是 change-id，使用它。
- 如果 `$ARGUMENTS` 为空，运行 `node "${HOME}/.cx/cx.js" status --json` 推导唯一活跃 change。
- 如果无法唯一推导，停止并请用户指定。

## 必须遵守的 6 条编码规范
除非另有明确说明，这些规则适用于每一项任务。
**核心倾向：** 在处理非琐碎任务时，**审慎优于速度**。琐碎任务请自行判断。

### 规则 1: 编码前先思考（Think Before Coding）
**不要假设。不要隐藏困惑。把权衡摆出来。**
实现之前：
- 明确陈述假设。如果不确定，请提问而非猜测。
- 当存在歧义时，请提供多种解读方案。
- 如果有更简单的实现路径，请勇于推翻当前方案。
- 感到困惑时立即停下，并准确描述不清晰的地方。

### 规则 2: 简约至上（Simplicity First）
**只编写解决问题的最少代码。拒绝投机性开发。**
- 不增加需求之外的功能。不对仅使用一次的代码进行抽象。
- 不添加不必要的灵活性或可配置性
- 不为不可能发生的场景添加错误处理
- 50行能搞定的，不要写200行

### 规则 3: 精准修改（Surgical Changes）
**只触碰必须修改的部分。只清理自己造成的“代码垃圾”。**
- 不要顺便“改进”相邻的代码、注释或格式。
- 不要重构没坏的代码。必须与现有风格保持严丝合缝。
- 不调整无关的格式或注释
- 只删除你的改动导致废弃的代码，不动之前就存在的死代码

### 规则 4: 代码注释要求
**中文注释，且要简洁**
- 新编写的代码注释必须使用中文，并保持简洁。
- 在代码的关键逻辑处添加中文注释，解释“为什么”这么做，而不仅仅是“做了什么”。

### 规则 5: 揭示冲突，拒绝折中
- 如果两种模式冲突，选择其一（通常选更新或验证更充分的）。
- 解释选择的原因，并将另一种模式标记为待清理。
- **严禁**混合使用相互冲突的模式。

### 规则 6: 公开失败 (Fail Loud)
- 如果默默跳过了任何步骤，“已完成”就是错误的结论。
- 如果有测试被跳过，“测试通过”就是谎言。
- **默认原则：** 宁可暴露不确定性，也不要隐藏它。

## 执行步骤：
1. 运行：
```bash
node "${HOME}/.cx/cx.js" validate --change <change-id> --stage build
```

2. 如果有 error，先修复 CX 产物，不要写 production code。
3. 读取 `tasks.md`、`contract.md`、contract 引用的 `.cx/changes/<change-id>/specs/*.md`、可选 `design.md`、可选 `visual/style-guide.md`，以及 `../core/protocols/common.md` 和 `../core/protocols/tasks.md`。
   - 如果存在 `visual/style-guide.md`，必须同时读取 `visual/prototype.final.html`。
   - 如果缺少 `visual/prototype.final.html`，停止并请用户先从 `visual/prototype.editable.html` 手动导出 final 确认稿。
   - 不读取 `visual/prototype.editable.html` 作为实现依据；它只是可编辑工作稿。
4. 如果 `design.md` 包含已确认的技术栈选型，把它作为实现硬约束：
   - 不得引入未确认的语言、框架、库、数据库、ORM、构建工具或测试工具。
   - 如果当前任务必须偏离已确认技术栈，停止实现并回到 `design` 重新推荐和确认。
5. TDD gate：
   - 没看到 RED 失败，不得写 production code。
   - 如果自己已经先写了实现但没有 RED，必须回退自己的实现并用 TDD 重来。
   - 用户已有未提交改动不能擅自回退；遇到这类情况，改用 characterization test 或询问用户。
   - 每个任务必须留下 RED/GREEN 证据，后续写入 `evidence.md`。
   - 如果存在 change-local spec delta，实现必须覆盖 delta 中的长期 Requirement，但不得直接改 `.cx/specs/`；长期规格由后续 `sync` 合并。
6. 判断是否允许 subagent 并行 build：
   - Large 变更、多任务工程或前后端工程必须先读取 `tasks.md` 中的 `## Parallel Execution Plan`；计划可以包含必须串行的 Foundation/Bootstrap 阶段和后续可并行 worker。
   - 只有当前未完成任务位于可并行 worker 范围内时，才启用 subagent；如果当前任务仍处于 `Serial phase` 或依赖未完成，主 agent 串行推进到并行边界。
   - 每个 worker 必须有独立 Tasks、Write scope、Commands、Depends on。
   - Write scope 不能重叠；不能多个 subagent 同时改同一模块、同一测试文件、同一快照文件或同一 migration 序列文件。
   - 如果计划缺失、边界含糊、命令会争用共享状态，或存在跨 worker 依赖未完成，必须降级为主 agent 串行执行；但大型/多任务/前后端工程的计划缺失应先回到 `tasks` 修复产物，不要静默串行整个工程。
7. 如启用 subagent worker：
   - 主 agent 先把每个 worker 的上下文限制为 contract、design、对应 tasks、允许文件范围和验证命令。
   - 明确告知 worker 不独占代码库，不能回退他人或用户改动，只能修改自己的 Write scope。
   - 每个 worker 必须按 RED -> GREEN -> REFACTOR 执行，并返回 RED/GREEN/VERIFY 命令、结果、关键输出、改动文件和剩余风险。
   - 主 agent 负责审查 worker 改动、解决冲突、确认 TDD 证据后再勾选 `tasks.md`。
   - 任一 worker 未提供可信 RED/GREEN 证据、越界修改或验证 FAIL，主 agent 必须停止并修复，不得声称完成。
8. 如未启用 subagent，从第一个未完成 checkbox 开始：
   - RED：写失败测试并运行，确认失败原因正确。
   - GREEN：写最小实现。
   - REFACTOR：只在测试绿色后做局部清理。
   - 勾选对应任务，保留 `tasks.md` 的协议结构、heading、checkbox 和固定标签，不重写为自由格式。
9. 每完成一组任务或合并一批 worker 结果后运行：

```bash
node "${HOME}/.cx/cx.js" status
```

10. 如果所有实现任务完成，提醒用户：Build 过程上下文较重，建议执行 `/clear` 后继续 `verify`。
