---
name: validate
description: 使用 CX CLI 校验 .cx 产物结构与关键门禁。
---

# CX Validate

使用 CX CLI 做确定性校验，减少手动阅读 `.cx/` 产物的 token 消耗。`sync` 是独立子命令，不是 validate stage；归档前如需长期规格同步，应先运行 `sync --dry-run` 和 `sync`。

执行步骤：

1. 如果用户提供了 change 名称和 stage，运行：

```bash
node "${HOME}/.cx/cx.js" validate --change <change-name> --stage <stage>
```

2. 如果用户只提供 change 名称，运行：

```bash
node "${HOME}/.cx/cx.js" validate --change <change-name>
```

3. 如果用户未提供 change 名称但提供 stage，运行：

```bash
node "${HOME}/.cx/cx.js" validate --stage <stage>
```

CLI 会在只有一个活跃 change 时自动推导；多个活跃 change 时会要求指定。

4. 如果用户未提供任何参数，运行：

```bash
node "${HOME}/.cx/cx.js" validate
```

5. 把 error 作为必须修复项，把 warning 作为建议修复项。
6. 不要在存在 error 时进入下游、归档或声称完成。

可用 stage：`debug`、`contract`、`visual`、`design`、`tasks`、`build`、`verify`、`review`、`archive`。
