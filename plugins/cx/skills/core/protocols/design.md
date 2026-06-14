# Design Protocol

路径：

```text
.cx/changes/<change-id>/design.md
```

机器必选格式：

- 必须有一级标题。
- 正文必须包含关键决策、方案或 Decision 相关说明。
- 建议包含测试或验证策略；缺失会产生 warning。

协议骨架：

```markdown
# Design: <Change Title>

## Context

<来自 contract、visual 或项目约束的设计背景。>

## Key Decisions

- Decision: <关键方案或取舍。>
- Rationale: <选择理由。>

## Alternatives

- <放弃的备选方案和原因；没有则写 None。>

## Technical Stack

- Frontend: <语言、框架、核心库、构建工具、测试工具；不涉及则写 N/A。>
- Backend: <语言、框架、数据库、ORM 或数据访问库、构建工具、测试工具；不涉及则写 N/A。>
- Confirmation source: <用户确认、项目既有约束或 contract 明确指定。>

## Impacted Areas

- <受影响文件、模块或边界。>

## Testing Strategy

- <测试、lint、typecheck、build 或人工验证策略。>

## Risks / Rollback

- <风险和回退方式；没有则写 None。>
```
