---
name: design
description: 为 CX 变更编写必要的技术设计。
---

# CX Design

目标：在有技术取舍、跨模块影响、迁移或 UI 约束时创建 `.cx/changes/<change-id>/design.md`。

参数规则：

- 如果 `$ARGUMENTS` 是 change-id，使用它。
- 如果 `$ARGUMENTS` 为空，运行 `node "${HOME}/.cx/cx.js" status --json` 推导唯一活跃 change。
- 如果无法唯一推导，停止并请用户指定。

执行步骤：

1. 读取 `contract.md`、`../core/protocols/common.md` 和 `../core/protocols/design.md`；如存在 `visual/style-guide.md`，必须同时读取 `visual/prototype.html`。
2. 判断是否需要 `design.md`；如果实现显然简单，可说明跳过设计并建议 `tasks`。
3. 如需要技术栈选型，先读取项目现有约束（包管理器、语言、框架、依赖、数据库、测试和构建工具），向用户给出简洁推荐并等待最终确认。
   - 前端选型至少覆盖：语言、框架、核心库、构建工具、测试工具；不涉及前端时写 `N/A`。
   - 后端选型至少覆盖：语言、框架、数据库、ORM 或数据访问库、构建工具、测试工具；不涉及后端时写 `N/A`。
   - 推荐必须说明选择理由、放弃的备选方案和主要风险。
   - 未得到用户最终确认前，不得把推荐写成最终 `design.md`。
4. 如需要，写入 `design.md`，必须复制 Design 协议骨架并至少包含关键决策/方案、技术栈选型、受影响文件、测试策略、风险。
   - 技术栈选型必须标注确认来源，例如用户确认、项目既有约束或 contract 明确指定。
   - 技术栈选型是下游实现硬约束；若 tasks/build 需要新增或替换语言、框架、库、数据库、ORM、构建工具或测试工具，必须回到 `design` 重新推荐并确认。
   - 不得改名固定 heading；无内容时写 `None` 或 `N/A`，不得保留 `<...>` 占位符。
   - 不要为了显而易见的实现写长设计；实现显然简单时可说明跳过设计并建议 `tasks`。
5. 运行：

```bash
node "${HOME}/.cx/cx.js" validate --change <change-id> --stage design
```

6. 如果有 error，立即修复。
7. 成功后提醒用户：Design 已落盘，下游 tasks/build 必须遵守 `design.md` 中已确认的技术栈选型，并且只依赖 `contract.md`、`design.md`、可选 `visual/prototype.html` 和 `visual/style-guide.md`，建议执行 `/clear` 后继续 `tasks`。
