---
name: visual
description: 读取 CX contract，为 UI 变更生成交互原型和样式规范。
---

# CX Visual

目标：读取 `.cx/changes/<change-id>/contract.md`，把上游 UI 意图转成可确认、可体验的原型，产出：

```text
.cx/changes/<change-id>/visual/prototype.html
.cx/changes/<change-id>/visual/style-guide.md
```

`visual` 是 CX 的原型阶段。只提炼交互原型有用的能力：上下文优先、检查点确认、变体探索、浏览器验证。不要迁移 PPT、视频导出、配音动画和专家评审等冗余流程，除非用户明确要求。

参数规则：

- 如果 `$ARGUMENTS` 是 change-id，使用它。
- 如果 `$ARGUMENTS` 为空，运行 `node "${HOME}/.cx/cx.js" status --json` 推导唯一活跃 change。
- 如果没有活跃 change 或存在多个活跃 change，停止并请用户指定。

## 适用判断

需要 `visual`：

- 新页面、新组件、复杂表单、仪表盘、编辑器、可视化、游戏、交互工具。
- Contract 中有 UI 状态、用户流程、响应式行为、视觉主题或动效要求。
- 用户明确要求原型、Demo、视觉设计、交互确认或高保真界面。

不需要 `visual`：

- 纯后端、CLI、配置、数据迁移、测试或内部重构。
- 只改文案、copy、字段名或已有组件的小样式。

不需要时停止，说明理由并建议继续 `design` 或 `tasks`，不要创建 visual 文件。

## 执行流程

### 1. 读取意图

读取 `contract.md`、`../core/protocols/common.md`、`../core/protocols/visual-style-guide.md` 和 `../core/protocols/visual-prototype-html.md`，必要时读取项目现有 UI 约束：

- 现有 design system、组件库、CSS tokens、页面截图或相关前端文件。
- 如果已有 `visual/prototype.html` 或 `visual/style-guide.md`，先读取并按增量更新处理。

从 contract 中提取并整理：

- 用户目标、目标用户、核心场景。
- UI 范围：页面/屏幕/组件/状态/用户 flow。
- 必须覆盖的 Requirements、Scenarios、边界状态、错误状态。
- 平台与视口：desktop、mobile、responsive 等。
- 明确设计约束：品牌、色彩、字体、组件库、无障碍要求。
- 缺失或有歧义的信息。

### 2. 互动确认门

除非用户已经明确说"不要问，直接做"，否则在生成原型前必须先停下确认。一次性给出短 brief：

```markdown
我从 contract 里读到的 UI 意图：
- Scope：<页面/flow/组件>
- 必须覆盖：<关键状态和场景>
- 主要风险/歧义：<最多 3 条>

建议原型形态：
- <overview 平铺 / flow demo / 组件状态板 / responsive 页面>

视觉方向：
1. <推荐方向>：<为什么符合 contract>
2. <备选方向>：<差异点>

确认后我生成 prototype.html。
```

确认门规则：

- 用户确认某个方向后再生成原型。
- 如果 contract 已经很明确，可以只给 1 个推荐方向 + 1 个备选，不要强行凑 3 个。
- 用户拒绝回答或要求直接做时，按 best judgment 做 1 个主方案，并在 `style-guide.md` 记录 Assumptions。
- 如果发现 contract 内部矛盾，指出具体矛盾并等待用户选择，不能静默决定。

### 3. 生成原型

调用 `huashu-design` skill 生成 `prototype.html`：

- 先读取并遵守 `huashu-design` skill 中适用于 UI 原型的规则。
- 使用单文件 HTML，CSS 内联，默认不依赖外部 CDN 或远程字体。
- 原型必须覆盖 contract 中关键状态：empty、loading、success、error、disabled、hover/focus、responsive 等，按需求取舍。
- 原型应让用户"点得到、看得见状态变化"，不要只做静态摆拍。
- 不要做 landing page 式说明页；第一屏就是可用原型或状态总览。
- 原型路径固定为 `.cx/changes/<change-id>/visual/prototype.html`。

### 4. 样式规范

创建或更新 `style-guide.md`。它必须遵守 `../core/protocols/common.md` 和 `../core/protocols/visual-style-guide.md`，至少包含色板和字体系统，以通过 CX 校验，并应让下游 `design/tasks/build` 可执行。

协议结构：

```markdown
# Visual Style Guide

## Intent Trace
- 来源：contract 中哪些 Requirement / Scenario。
- Assumptions：用户确认或暂定的视觉/交互假设。

## Prototype
- 路径：`visual/prototype.html`
- 形态：overview / flow demo / 组件状态板 / responsive 页面。
- 覆盖状态：...

## Palette / 色板
- Background：...
- Surface：...
- Text：...
- Primary：...
- Accent / Danger / Success：...

## Typography / 字体
- Display：...
- Body：...
- Mono：...
- 层级：H1 / H2 / Body / Caption / Control。

## Components
- 关键组件、状态和交互反馈。

## Interactions
- 点击路径、Modal/Drawer/Toast/Form 状态、动效节奏。

## Downstream Contract
- 下游读取：`visual/prototype.html` 和 `visual/style-guide.md`。

## Responsive / Accessibility
- 视口策略、键盘焦点、对比度、文本溢出处理。
```

不得改名固定 heading；不得保留 `<...>` 占位符；没有内容时写 `None` 或 `N/A`。

### 5. 验证

保存文件后运行：

```bash
node "${HOME}/.cx/cx.js" validate --change <change-id> --stage visual
```

如果有 error，立即修复。如有浏览器能力，打开 `prototype.html` 检查首屏非空、关键交互可用。

### 6. 交付说明

成功后提醒用户：

- 原型路径：`.cx/changes/<change-id>/visual/prototype.html`
- 样式规范路径：`.cx/changes/<change-id>/visual/style-guide.md`
- Visual 上下文通常较长，下游只依赖 `prototype.html` 和 `style-guide.md`，建议执行 `/clear` 后继续 `design` 或 `tasks`。
