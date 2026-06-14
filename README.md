# CX

CX 是一个面向 Codex CLI 与 Claude Code 的轻量 AI 编程工作流插件。它把一次代码变更拆成几个容易执行、容易验证的步骤：先确认需求，再写契约和任务，按 TDD 实现，最后验证、审查、同步长期规格并归档。

它适合：

- 新功能、Bug 修复、重构、UI 改造。
- 希望 AI 不跑偏、不越界、不跳过测试的代码变更。
- 需要把长期行为沉淀到 `.cx/specs/`，方便后续需求继续沿用的项目。

## 核心流程

```text
work -> contract -> tasks -> build -> verify -> review -> sync -> archive
```

常用可选分支：

- Bug 不清晰：先 `debug`，再 `contract`。
- UI 变更较复杂：`contract` 后可先 `visual`。
- 有技术取舍：进入 `design`。
- Large 或高风险变更：可用 `worktree` 隔离。

## 安装

### Codex CLI

```bash
codex plugin marketplace add dxzen/cx --ref master
codex plugin add cx@dxzen-cx
```

### Claude Code

在 Claude Code 里执行：

```text
/plugin marketplace add dxzen/cx
/plugin install cx@dxzen-cx
/cx:setup
/reload-plugins
```

`/cx:setup` 会在 Claude Code 的 CX 插件目录中建立 `skills/`、`scripts/` 和 `template/` 软链；执行后必须 `/reload-plugins`，再使用 `/cx:init`。

## 初始化项目

安装插件后，第一次在目标项目里使用 CX，先初始化：

| 平台 | 初始化命令 | 开始变更 |
| --- | --- | --- |
| Codex CLI | `init` | `work <需求>` |
| Claude Code | `/cx:init` | `/cx:work <需求>` |

初始化会在当前项目创建：

```text
.cx/
  specs/      # 长期规格
  changes/    # 进行中的变更
  archive/    # 已完成变更
  worktrees/  # 可选隔离工作区
```

## 快速上手

下面的 `add-login-rate-limit`、`fix-empty-cart-total`、`checkout-form-states` 是示例 change-id；实际名称以 `contract` 创建结果或 `status` 输出为准。

### 新增功能

```text
init
work 给登录接口增加失败次数限流，连续失败 5 次后锁定 15 分钟
contract 给登录接口增加失败次数限流，连续失败 5 次后锁定 15 分钟
tasks add-login-rate-limit
build add-login-rate-limit
verify add-login-rate-limit
review add-login-rate-limit
sync add-login-rate-limit
archive add-login-rate-limit
```

如果这次变更不需要沉淀长期规格，`verify` 阶段会在 `evidence.md` 中写明跳过原因，此时可以不运行 `sync`，直接在 review 通过后归档。

### 修 Bug

```text
init
debug 购物车为空时总价显示 NaN
contract fix-empty-cart-total
tasks fix-empty-cart-total
build fix-empty-cart-total
verify fix-empty-cart-total
review fix-empty-cart-total
archive fix-empty-cart-total
```

Bug 已经很清楚时，也可以跳过 `debug`，直接从 `contract` 开始。

### UI 改造

```text
init
work 重做结算页表单交互和错误状态
contract 重做结算页表单交互和错误状态
visual checkout-form-states
design checkout-form-states
tasks checkout-form-states
build checkout-form-states
verify checkout-form-states
review checkout-form-states
sync checkout-form-states
archive checkout-form-states
```

`visual` 会帮助先确认交互原型和样式规范，后续实现只依赖确认后的 final 原型。

## 常用命令

```text
status
validate
validate <change-id> --stage tasks
sync <change-id>
archive <change-id>
worktree <change-id>
```

建议每个阶段完成后按提示继续下一步；不确定当前该做什么时，运行 `status`。

## 使用习惯

- 需求不明确时先 `work`，不要直接写代码。
- Normal/Large 变更先 `contract`，再进入实现。
- `.cx` 产物遵守插件内的 Artifact Protocols，固定 heading、字段标签和表格列名不能随意改写。
- `build` 阶段按 RED -> GREEN -> REFACTOR 做 TDD。
- 完成前必须 `verify`，不要用“应该可以”代替验证证据。
- `review` 通过后再 `sync` 和 `archive`。
- 开始新变更时优先读取 `.cx/specs/`；`.cx/archive/` 主要用于追溯历史。

CX 的目标是让一次 AI 代码变更有清晰入口、清晰下一步和清晰完成标准。多数时候，你只需要从 `init` 和 `work <需求>` 开始，按提示往下走即可。
