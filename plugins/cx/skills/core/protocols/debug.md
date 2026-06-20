# Debug Protocol

路径：

```text
.cx/changes/<change-id>/debug.md
```

机器必选格式：

- 必须包含 `## Observed`、`## Expected`、`## Reproduction`、`## Hypotheses`、`## Regression Test`。
- Regression Test 必须说明修复前应失败的测试或检查方式。
- 必须包含非空固定行 `Confirmed reproduction:`，说明是否已确认最小复现。
- 必须包含非空固定行 `Regression test fails before fix:`，说明修复前失败的 regression test 证据。

协议骨架：

```markdown
# Debug: <Change Title>

## Observed

<实际症状。>

## Expected

<期望行为。>

## Reproduction

<最小复现步骤、命令或输入。>

Confirmed reproduction: <yes，附命令/步骤；或 no，说明阻塞原因>

## Hypotheses

- <根因假设 1，附验证方法>
- <根因假设 2，附验证方法>

## Regression Test

<修复前必须失败的 regression test 设计。>

Regression test fails before fix: <失败命令和失败摘要；若尚未运行，写阻塞原因>
```
