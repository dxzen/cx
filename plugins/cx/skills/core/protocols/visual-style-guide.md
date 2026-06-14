# Visual Style Guide Protocol

路径：

```text
.cx/changes/<change-id>/visual/style-guide.md
```

机器必选格式：

- 必须包含色板信息；标题或正文中需出现 `Palette`、`Color` 或 `色板`。
- 必须包含字体信息；标题或正文中需出现 `Typography`、`Font` 或 `字体`。
- 必须声明 `prototype.final.html`；下游只读取 final 原型和 style guide。

协议骨架：

```markdown
# Visual Style Guide

## Intent Trace

- 来源：contract 中哪些 Requirement / Scenario。
- Assumptions：用户确认或暂定的视觉/交互假设。

## Prototype

- 工作稿：`visual/prototype.editable.html`
- 确认稿：`visual/prototype.final.html`
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

## Tweaks

- <默认值、可调项、设计意图；仅存在于 editable 工作稿。>

## Edit Mode

- Editor Shell: bundled CX Visual Editor Shell。
- 保存机制：<File System Access API、下载降级或本地 helper。>
- final 导出：导出 `visual/prototype.final.html`，移除 Tweaks/Edit Mode/authoring 数据。

## Downstream Contract

- 下游读取：`visual/prototype.final.html` 和 `visual/style-guide.md`。
- 不读取：`visual/prototype.editable.html`。

## Responsive / Accessibility

- <视口策略、键盘焦点、对比度、文本溢出处理。>
```
