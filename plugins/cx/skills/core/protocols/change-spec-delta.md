# Change Spec Delta Protocol

路径：

```text
.cx/changes/<change-id>/specs/<capability>.md
```

机器必选格式：

- 至少包含一个有效的 ADDED、MODIFIED、REMOVED 或 RENAMED 操作。
- ADDED/MODIFIED 的需求必须使用 `### Requirement: <名称>`，并至少包含一个 `#### Scenario: <名称>`。
- MODIFIED 表示：本次变更**有意**改变已有长期行为。旧版本 Requirement 对应的已有测试预期会 FAIL，contract 的 `## Related Durable Specs` 中对应的 spec 文件应标记为 `modified`（非 `unchanged`）。verify 阶段对 MODIFIED 的 Requirement 不做旧测试必须 PASS 的要求。
- MODIFIED 必须写完整新版本，不写局部补丁。
- REMOVED 推荐使用 `### Requirement: <名称>`，原因写在其后正文；避免用额外 bullet 写原因，因为 bullet 会被解析为另一个待移除 Requirement。
- RENAMED 必须成对使用 `- FROM:` 和 `- TO:`。
- 未使用的操作章节可以省略；如果保留，只能写 `- None`，不得保留占位 Requirement。

协议骨架：

```markdown
# <Capability> Delta

## ADDED Requirements

### Requirement: <新增短名称>
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
