# Evidence Protocol

路径：

```text
.cx/changes/<change-id>/evidence.md
```

机器必选格式：

- 必须包含 `## Verification Commands`、`## Requirement Coverage`、`## Regression`、`## TDD Evidence`、`## Diff Review`、`## Remaining Risk`。
- Verification Commands 表格列必须是 `Command`、`Result`、`Notes`。
- Result 只能使用 `PASS`、`FAIL`、`SKIPPED`；任何 `FAIL` 都阻塞下游。
- verify/review/archive 严格阶段至少要有一个 `PASS`。
- Requirement Coverage 必须至少有一条非占位证据。
- `## Regression` 表格列必须是 `Requirement (Durable - Unchanged)`、`Scenario`、`Source Spec`、`Evidence`、`Result`。
- Result 只能使用 `PASS`、`FAIL`、`N/A (modified)`、`N/A (removed)`；任何 `FAIL` 都阻塞下游。
- 此章节由 verify 阶段根据 contract 的 `## Related Durable Specs` 中 unchanged 条目填充；不得手动标为 PASS。
- 如果 contract 的 `## Related Durable Specs` 为 `None` 或无 `unchanged` 条目，此章节写 `None`。
- Diff Review 必须明确 `Durable specs: pending sync`、`Durable specs: updated` 或 `Durable specs: skipped because <reason>`。

协议骨架：

```markdown
# Evidence

## Verification Commands

| Command | Result | Notes |
| --- | --- | --- |
| `<command>` | PASS | <关键输出摘要> |

## Requirement Coverage

| Requirement | Evidence |
| --- | --- |
| <Requirement name> | <测试名、命令或人工检查结果> |

## Regression

<对 contract 中标记为 unchanged 的长期 Requirement 的回归验证结果。如果 contract 的 ## Related Durable Specs 为 None 或无 unchanged 条目，写 None。>

| Requirement (Durable - Unchanged) | Scenario | Source Spec | Evidence | Result |
| --- | --- | --- | --- | --- |
| <Requirement 名称> | <Scenario 名称> | specs/<file>.md | <测试命令或检查项> | PASS |

## TDD Evidence

| Requirement | RED | GREEN | REFACTOR | Scope |
| --- | --- | --- | --- | --- |
| <Requirement name> | <失败命令和失败摘要> | <通过命令> | <通过命令或 skipped> | <是否有越界实现> |

## Diff Review

- Debug code: none
- Unrelated changes: none
- Durable specs: pending sync

## Remaining Risk

- None
```

Durable specs 状态按实际情况替换为：

```markdown
- Durable specs: updated
```

或：

```markdown
- Durable specs: skipped because <具体原因>
```
