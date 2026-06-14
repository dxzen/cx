# Durable Spec Protocol

路径：

```text
.cx/specs/<capability>.md
```

机器必选格式：

- durable spec 必须包含至少一个 `### Requirement:`。
- 每个 Requirement 至少包含一个 `#### Scenario:`。

协议骨架：

```markdown
# <Capability>

## Purpose

<能力存在的原因。>

## Requirements

### Requirement: <短名称>
<系统 MUST/SHOULD/MAY 做什么。>

#### Scenario: <场景名称>
- Given <状态>
- When <动作>
- Then <结果>
```
