# Tasks Protocol

路径：

```text
.cx/changes/<change-id>/tasks.md
```

机器必选格式：

- 必须包含 checkbox 任务，即 `- [ ]` 或 `- [x]`。
- tasks/build/verify/review/archive 严格阶段必须显式包含 `RED:`、`GREEN:`，并使用 `Command:` 后跟反引号包裹的命令。
- 每个任务组使用 `## Requirement: <名称>` 引用 contract Requirement。
- 每个 `## Requirement:` 任务组必须包含 checkbox、`RED:`、`GREEN:`、`VERIFY:`、`REFACTOR:` 和至少一个 `Command:`。
- `Expected failure:` 和 `Scope:` 后的说明必须用中文。
- `## Parallel Execution Plan` 在 Large、实现 checkbox 达到 16 个及以上、或前后端/服务端并存时必选。
- Parallel 计划必须包含 `Parallel build: enabled/skipped because <中文原因>`。
- `enabled` 时至少包含一个 `- Worker:`，并声明 `Tasks`、`Write scope`、`Commands`、`Depends on`。
- 小变更可以省略整个 `## Parallel Execution Plan`。

协议骨架：

```markdown
# Tasks

## Requirement: <Requirement 短名称>

- [ ] 1. RED: 在 `<test-file>` 添加失败测试，覆盖 `<Scenario 名称>`。
  - Command: `<聚焦测试命令>`
  - Expected failure: <用中文说明功能未实现或当前 Bug 复现的失败摘要>
- [ ] 2. GREEN: 在 `<implementation-file>` 编写最小实现。
  - Scope: <用中文说明只允许修改的行为范围>
- [ ] 3. VERIFY: 运行聚焦测试和相关测试。
  - Command: `<聚焦测试命令>`
  - Command: `<相关测试或检查命令>`
- [ ] 4. REFACTOR: 只在测试保持 GREEN 时做局部清理。

## Parallel Execution Plan

Parallel build: enabled because <中文原因>

- Serial phase: <如需先串行完成 Foundation/Bootstrap/API 契约，写中文说明；不需要则写 None>

- Worker: <backend/frontend/migration/test>
  - Tasks: <任务编号或 Requirement 名称>
  - Write scope: `<允许修改的文件或目录 glob>`
  - Commands: `<该 worker 必须运行的验证命令>`
  - Depends on: <none 或依赖的 worker/任务，用中文说明依赖原因>
```

跳过并行时使用：

```markdown
## Parallel Execution Plan

Parallel build: skipped because <中文说明所有实现任务无法拆出独立 Write scope 和 Commands 的原因>
```
