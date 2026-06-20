---
name: debug
description: 使用 CX 调试流程复现 Bug、定位根因并规划 regression test。
---

# CX Debug

目标：为 Bug 修复创建 `.cx/changes/<change-id>/debug.md`，先复现和定位根因，再进入 `contract`。

参数规则：

- 如果 `$ARGUMENTS` 非空，把它作为 Bug 描述或 change-id 候选。
- 如果 `$ARGUMENTS` 为空，从当前用户消息和对话上下文识别 Bug。
- 如果无法判断症状或期望行为，只问一个阻塞性问题。

执行步骤：

1. 如 `.cx/` 不存在，先运行：

```bash
node "${HOME}/.cx/cx.js" init
```

2. 识别 change-id，使用 kebab-case，例如 `fix-empty-cart-total`。
3. 读取 `../core/protocols/common.md` 和 `../core/protocols/debug.md`；它们是机器可解析格式，不是示例。
4. 创建 `.cx/changes/<change-id>/debug.md`，必须复制 Debug 协议骨架并保留固定 heading：
   - `## Observed`
   - `## Expected`
   - `## Reproduction`
   - `## Hypotheses`
   - `## Regression Test`
5. 不得保留 `<...>` 占位符；未知信息写明确假设或待验证项。
6. 必须写入 `Confirmed reproduction:` 和 `Regression test fails before fix:` 固定行；如果尚未确认，写清阻塞原因，不得假装已复现。
7. 不要先修代码。先找最小复现和 regression test 入口。
8. 运行：

```bash
node "${HOME}/.cx/cx.js" validate --change <change-id> --stage debug
```

9. 如果有 error，立即修复。
10. 成功后提醒用户：Debug 结论已落盘，下游只依赖 `debug.md` 和后续 `contract.md`，建议执行 `/clear` 后继续 `contract <change-id>`。
