# Visual Style Guide Protocol

路径：

```text
.cx/changes/<change-id>/visual/style-guide.md
```

机器必选格式：

- 必须包含色板信息；标题或正文中需出现 `Palette`、`Color` 或 `色板`。
- 必须包含字体信息；标题或正文中需出现 `Typography`、`Font` 或 `字体`。
- 必须声明 `prototype.html`；下游只读取 prototype.html 和 style guide。

协议骨架：

```markdown
# Visual Style Guide

## Intent Trace

- 来源：contract 中哪些 Requirement / Scenario。
- Assumptions：用户确认或暂定的视觉/交互假设。

## Prototype

- 路径：`visual/prototype.html`
- 形态：overview / flow demo / 组件状态板 / responsive 页面。
- 覆盖状态：<empty/loading/success/error/disabled/responsive 等。>

## Palette / 色板

- Background: <颜色/token>
- Surface: <颜色/token>
- Text: <颜色/token>
- Primary: <颜色/token>
- Accent / Danger / Success: <颜色/token>

## Typography / 字体

- Display: <字体、字号、行高>
- Body: <字体、字号、行高>
- Mono: <字体、字号、行高；不涉及则写 N/A>
- 层级：H1 / H2 / Body / Caption / Control。

## Components

- <关键组件、状态和交互反馈。>

## Interactions

- <点击路径、Modal/Drawer/Toast/Form 状态、动效节奏。>

## Downstream Contract

- 下游读取：`visual/prototype.html` 和 `visual/style-guide.md`。

## Responsive / Accessibility

- <视口策略、键盘焦点、对比度、文本溢出处理。>
```
