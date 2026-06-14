# Review Protocol

路径：

```text
.cx/changes/<change-id>/review.md
```

机器必选格式：

- 必须包含 `## Scope`、`## Findings`、`## Spec Coverage`、`## Code Quality`、`## Test Gaps`、`## Decision`。
- 只能出现一个 `Decision: PASS` 或 `Decision: NEEDS_CHANGES`。
- archive 阶段只接受 `Decision: PASS`。

协议骨架：

```markdown
# Review

## Scope

<审查范围：contract/tasks/evidence/diff。>

## Findings

- <阻塞或非阻塞发现；没有则写 None。>

## Spec Coverage

<每个 Requirement 是否有测试或验证证据。>

## Code Quality

<项目风格、职责边界、错误处理、debug 代码、越界修改。>

## Test Gaps

<缺失测试；没有则写 None。>

## Decision

Decision: PASS
```
