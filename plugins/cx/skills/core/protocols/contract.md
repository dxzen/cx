# Contract Protocol

路径：

```text
.cx/changes/<change-id>/contract.md
```

机器必选格式：

- 必须包含 `## Intent`、`## Scope`、`## Requirements`、`## Spec Delta`、`## Verification`。
- `## Scope` 下必须有非空 `- In:` 和 `- Out:`。
- 每个需求必须使用 `### Requirement: <名称>`。
- 每个 Requirement 至少包含一个 `#### Scenario: <名称>`。
- Scenario 步骤使用 `- Given`、`- When`、`- Then`。
- `## Spec Delta` 必须二选一：`Delta files: specs/<capability>.md`，或 `Skipped: <reason>`。
- 如果使用 `Delta files:`，引用的 `.cx/changes/<change-id>/specs/<capability>.md` 必须同时存在。
- 不要在 contract 里 inline 写 ADDED/MODIFIED/REMOVED/RENAMED 的完整 delta；长期变更写入 change-local spec delta 文件。
- `## Design Notes` 是协议章节；没有约束时写 `None`。

协议骨架：

```markdown
# <Change Title>

## Intent

<一到两句话说明用户可见或开发者可见变化。>

## Scope

- In: <包含的行为、模块或文件范围>
- Out: <明确不做的内容，不能为空>

## Requirements

### Requirement: <短名称>
<系统 MUST/SHOULD/MAY 满足的可观察行为。>

#### Scenario: <场景名称>
- Given <初始状态>
- When <用户或系统动作>
- Then <可观察结果>

## Spec Delta

Delta files: specs/<capability>.md

## Design Notes

<约束实现的关键取舍；没有则写 None。>

## Verification

- `<精确测试命令>`
- `<精确 lint/typecheck/build 命令或人工检查项>`
```

如果不沉淀 durable specs，将 `Delta files: specs/<capability>.md` 替换为：

```markdown
Skipped: <不沉淀为 durable specs 的具体原因>
```
