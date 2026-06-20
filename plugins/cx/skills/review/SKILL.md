---
name: review
description: 对 CX 变更做归档前代码审查。
---

# CX Review

目标：在 `verify` 后、`sync/archive` 前审查 spec 覆盖、代码质量、越界修改、测试缺口和 durable spec delta，创建 `.cx/changes/<change-id>/review.md`。

参数规则：

- 如果 `$ARGUMENTS` 是 change-id，使用它。
- 如果 `$ARGUMENTS` 为空，运行 `node "${HOME}/.cx/cx.js" status --json` 推导唯一活跃 change。
- 如果无法唯一推导，停止并请用户指定。

执行步骤：

1. 运行：

```bash
node "${HOME}/.cx/cx.js" validate --change <change-id> --stage verify
```

2. 如果有 error，先修复，不要审查或归档。
3. 读取 `contract.md`、`tasks.md`、`evidence.md`、contract 引用的 `.cx/changes/<change-id>/specs/*.md`、`../core/protocols/common.md` 和 `../core/protocols/review.md`，先运行 `git diff --stat`；只读取相关文件或高风险文件的 diff，避免把完整 diff 放入上下文。
4. 对 Large 变更或高风险 diff，优先启用 subagent 并行 review：
   - Scope reviewer：检查 contract 外越界实现、无关格式化、debug code。
   - Spec reviewer：检查每个 Requirement 是否有 evidence 支撑，change-local spec delta 是否完整表达长期行为。额外检查：
     - Delta 中 MODIFIED 的 Requirement 是否与 contract `## Related Durable Specs` 中 unchanged 的 Requirement 存在逻辑冲突（如前置条件被破坏、状态机冲突、权限模型不一致）。
     - Delta 中 ADDED 的 Requirement 是否隐含覆盖或削弱了某个 unchanged Requirement 的行为。
     - evidence.md 的 `## Regression` 表格中每个 unchanged Requirement 是否都有 PASS 证据；如有 FAIL 且未被 contract 声明 MODIFIED，标记为阻塞 finding，Severity: high。
     - 如果发现冲突但 contract 未声明：标记为阻塞 finding，Severity: high。
   - Test reviewer：检查测试缺口、只有 happy path、缺 regression/edge case。
   - Code reviewer：检查命名、职责、错误处理、项目风格和风险点。
5. subagent reviewer 只输出 findings，不写最终 `review.md`，不得写 `Decision`；每条 finding 必须包含 Severity、Evidence、File/Line 或无法定位的原因、建议动作。
6. 主 agent 汇总所有 reviewer 结果，去重、定级并自行复核阻塞项；任何阻塞 finding 都必须导致 `Decision: NEEDS_CHANGES`。
7. 写入 `.cx/changes/<change-id>/review.md`，必须复制 Review 协议骨架并保留固定 heading：
   - `## Scope`
   - `## Findings`
   - `## Spec Coverage`
   - `## Code Quality`
   - `## Test Gaps`
   - `## Decision`
   不得保留 `<...>` 占位符；无发现或无缺口时写 `None`。
8. 如果发现阻塞问题，写 `Decision: NEEDS_CHANGES`，并明确下一步修复项。
9. 只有没有阻塞问题时，写 `Decision: PASS`。如果存在 `Durable specs: pending sync`，PASS 只表示可以进入 `sync`，不表示可以直接 archive。
10. 运行：

```bash
node "${HOME}/.cx/cx.js" validate --change <change-id> --stage review
```

11. 成功后提醒用户：Review 已落盘；如果 status 显示 `Durable specs: pending-sync`，建议执行 `/clear` 后继续 `sync`，否则继续 `archive`。
