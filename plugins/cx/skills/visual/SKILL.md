---
name: visual
description: 读取 CX contract，为 UI 变更通过互动确认生成可调参、可视化编辑的交互原型和样式规范。
---

# CX Visual

目标：读取 `.cx/changes/<change-id>/contract.md`，把上游意图转成可确认、可体验、可微调的 UI 原型，并创建：

```text
.cx/changes/<change-id>/visual/prototype.editable.html
.cx/changes/<change-id>/visual/prototype.final.html
.cx/changes/<change-id>/visual/style-guide.md
```

`visual` 是 CX 的原型阶段。只提炼其对交互原型有用的能力：上下文优先、检查点确认、Junior pass、变体/Tweaks、浏览器验证。不要迁移 PPT、视频导出、配音动画、专家评审和重资产采集等冗余流程，除非用户明确要求。

可编辑能力必须使用本 Skill 的 bundled Editor Shell，不要每次手写随机编辑器：

```text
plugins/cx/skills/visual/assets/prototype-editable.template.html
plugins/cx/skills/visual/assets/cx-visual-editor.css
plugins/cx/skills/visual/assets/cx-visual-editor.js
```

生成 `prototype.editable.html` 时，读取这些 assets，把 CSS/JS 内联进 HTML。AI 只负责生成内层 Prototype App 和编辑协议数据。

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
- 如果已有 `visual/prototype.editable.html`、`visual/prototype.final.html` 或 `visual/style-guide.md`，先读取并按增量更新处理。

从 contract 中提取并在回复里整理：

- 用户目标、目标用户、核心场景。
- UI 范围：页面/屏幕/组件/状态/用户 flow。
- 必须覆盖的 Requirements、Scenarios、边界状态、错误状态。
- 平台与视口：desktop、mobile、responsive、iOS/Android、嵌入式等。
- 明确设计约束：品牌、色彩、字体、组件库、禁区、无障碍要求。
- 缺失或有歧义的信息。

### 2. 互动确认门

除非用户已经明确说“不要问，直接做”，否则在写完整原型前必须先停下确认。一次性给出一个短 brief，不要一问一答拖长：

```markdown
我从 contract 里读到的 UI 意图：
- Scope：<页面/flow/组件>
- 必须覆盖：<关键状态和场景>
- 主要风险/歧义：<最多 3 条>

建议原型形态：
- <overview 平铺 / flow demo 单机 / responsive 页面 / 组件状态板>

视觉方向：
1. <推荐方向>：<为什么符合 contract>
2. <备选方向>：<差异点>
3. <备选方向>：<差异点>

默认 Tweaks：
- <2-5 个有意义的调参项>

可视化编辑：
- 工作稿会内置 Edit Mode，可编辑 <文案 / 色板 / 密度 / 间距 / 组件状态 / 布局变体>，支持保存工作稿自身，并在确认后导出纯净 final 原型。

确认后我开始做第一版。
```

确认门规则：

- 用户确认某个方向后再写完整原型。
- 如果 contract 已经很明确，可以只给 1 个推荐方向 + 1 个备选，不要强行凑 3 个。
- 用户拒绝回答或要求直接做时，按 best judgment 做 1 个主方案 + 1 个可切换变体，并在 `style-guide.md` 记录 Assumptions。
- 如果发现 contract 内部矛盾，指出具体矛盾并等待用户选择，不能静默决定。

### 3. 原型制作规则

默认产物分为工作稿和确认稿：

- `prototype.editable.html` 是唯一工作稿，默认带 Tweaks、Edit Mode 和保存/导出能力。
- `prototype.final.html` 是用户确认后从工作稿手动导出的纯净原型，不包含 Tweaks、Edit Mode、调试 API、保存按钮或编辑样式。
- 下游 `design`、`tasks`、`build` 只读取 `prototype.final.html` 和 `style-guide.md`，不读取工作稿。
- 两个 HTML 都必须能通过浏览器直接打开；没有必要时不引入构建步骤。
- 可以用纯 HTML/CSS/JS；复杂交互可用 inline React + Babel，但所有组件和数据默认写在同一个 HTML 中。
- 不默认生成图片。需要图片时优先使用用户提供或项目已有资产；没有资产就用诚实 placeholder 标注，不用粗糙 SVG/CSS 手画实体产品。
- 原型必须覆盖 contract 中关键状态：empty、loading、success、error、disabled、hover/focus、responsive 等，按需求取舍。
- 原型应让用户“点得到、看得见状态变化”，不要只做静态摆拍。
- 不要做 landing page 式说明页；第一屏就是可用原型或状态总览。

工作稿架构：

```text
prototype.editable.html
- 外层：CX Visual Editor Shell（来自 bundled assets）
- 内层：AI 生成的 Prototype App（页面、组件、flow、状态）
```

外层 Editor Shell 不理解具体业务，只根据协议控制内层原型。内层原型必须提供：

- DOM 标记：可编辑元素使用 `data-edit-id`，并用 `data-editable` 或 `data-edit-type` 标明 `text`、`block`、`token`、`layout` 等类型。
- CSS token：可调视觉值使用 CSS variables，例如 `--primary`、`--radius-card`、`--density-gap`。
- Schema：在 `<script type="application/json" id="cx-visual-schema">` 中声明可编辑 content、tokens、states 和 final 导出规则。
- Saved state：在 `<script type="application/json" id="cx-visual-saved-state">` 中保存当前工作稿状态。
- 可选 State API：复杂交互原型暴露 `window.CXPrototype.getState()`、`setState(patch)`、`getEditableSchema()`；静态页面可以省略或返回空对象。

`cx-visual-schema` 最低结构：

```json
{
  "changeId": "<change-id>",
  "content": {
    "hero.title": { "type": "text", "label": "Hero title" }
  },
  "tokens": {
    "primary": { "type": "color", "label": "Primary", "cssVar": "--primary" }
  },
  "states": {
    "formState": { "type": "select", "label": "Form state", "options": ["empty", "editing", "error", "success"] }
  },
  "export": {
    "removeSelectors": ["[data-editor-only]"]
  }
}
```

编辑路径：

- 文案：Shell 根据 `data-edit-id` 直接改 DOM text。
- 视觉 token：Shell 根据 schema 修改 CSS variable。
- 交互状态：Shell 调用 `window.CXPrototype.setState(patch)`，由内层原型自己重渲染。

原型形态选择：

- `overview 平铺`：适合设计 review、多个屏幕/状态并排比较。
- `flow demo 单机`：适合演示一条用户路径，按钮、Tab、Modal、表单状态必须可点击。
- `组件状态板`：适合设计系统组件或复杂表单状态。
- `responsive 页面`：适合桌面/移动同源页面，必须内置视口说明或通过 CSS 响应。

### 4. 默认 Tweaks

`prototype.editable.html` 默认通过 Editor Shell 带 Tweaks，除非用户明确要求不要。`prototype.final.html` 不得包含 Tweaks。

最低要求：

- 右下角或不遮挡主操作区的可折叠 Tweaks 面板。
- Tweaks 实时变更可写入 `localStorage` 草稿缓存，key 使用 `cx-visual:<change-id>:tweaks`；正式保存必须写入工作稿内嵌 saved state。
- 默认 2-5 个有意义的选项，最多 6 个。不要把无意义 slider 当调参能力。
- 默认值必须本身就是完整设计，关闭 Tweaks 后仍然成立。
- Tweaks 必须影响真实设计决策：视觉主题、密度、布局变体、状态数量、动效速度、文案版本、数据量等。
- 在 HTML 中保留兼容源码级编辑的标记：

```js
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  theme: "default",
  density: "comfortable"
}/*EDITMODE-END*/;
```

典型 Tweaks：

- 产品原型：布局变体、信息密度、状态、mock 数据量、动效速度。
- Dashboard：数据密度、图表强调方式、过滤器状态、明暗主题。
- 表单：校验强度、错误呈现方式、辅助文案密度。
- 移动端 flow：overview/flow 切换、设备主题、Tab 初始页。

### 5. 可视化编辑与保存

`prototype.editable.html` 默认内置 CX Visual Editor Shell，让用户不改代码也能加工原型。它不是生产 CMS，而是为 AI 与用户协作收敛视觉意图。

最低要求：

- 提供 `Edit` 开关，或支持 URL 参数 `?edit=1` 自动开启。
- 可编辑元素加明确标记，例如 `data-editable="text"`、`data-editable="token"`、`data-editable="layout"`、`data-edit-id="hero.title"`。
- Edit Mode 开启时：
  - 文案类元素可 `contenteditable` 修改。
  - 可调设计 token 在面板中呈现：颜色、字体、字号、行高、间距、圆角、阴影、密度、断点、关键 layout 变体。
  - 结构类元素支持显示/隐藏、复制、删除、排序、重命名；只对标记为可编辑的安全区域开放。
  - 数据类元素支持编辑列表项、表格行、卡片字段、状态内容和 mock 数据量。
  - 交互类元素支持切换初始状态、Modal/Drawer/Toast 展示状态、Tab 默认项、动效速度和主要用户路径。
  - 选中元素时显示轻量 outline 和当前 `data-edit-id`，不遮挡主界面。
  - 用户修改实时反映，并更新内存中的 saved state。
- 保存必须写回 `prototype.editable.html` 自身，而不是只依赖 `localStorage`：
  - 首选 Chrome/Edge File System Access API。用户第一次点 `Save` 时选择当前 `prototype.editable.html` 并授权，之后可覆盖保存。
  - 如果浏览器不支持文件写回，降级为下载最新版 `prototype.editable.html`，并明确提示用户替换工作稿。
  - 如果环境有 Chrome DevTools MCP、Playwright MCP 或本地 helper endpoint，可以由 AI/工具把保存后的 HTML 写回同一路径。
  - `localStorage` 只能作为未保存草稿缓存，key 使用 `cx-visual:<change-id>:draft`；再次打开时应优先读取 HTML 内嵌 saved state，再合并未保存草稿。
- 工作稿必须内嵌当前保存状态，例如：

```html
<script type="application/json" id="cx-visual-saved-state">
{
  "changeId": "<change-id>",
  "tweaks": {},
  "content": {},
  "tokens": {},
  "layout": {},
  "components": {},
  "interactions": {},
  "updatedAt": "ISO-8601"
}
</script>
```

Editor Shell 暴露稳定全局 API，便于保存和导出 final：

```js
window.CXVisual = {
  getState,
  setState,
  saveEditable,
  saveFinal,
  exportEditableHTML,
  exportFinalHTML,
  reset,
  importState
};
```

不要改名这些 API；下游浏览器自动化、Chrome DevTools MCP 或 Playwright MCP 会依赖它们。

确认稿导出规则：

- 提供 `Export final` 按钮，由用户在确认进入下游前手动导出 `prototype.final.html`。
- `prototype.final.html` 的正确位置必须是工作稿同目录，即 `.cx/changes/<change-id>/visual/prototype.final.html`。
- Editor Shell 的 `Export final` 必须优先使用浏览器 File System Access API 让用户选择当前 `visual` 目录并直接写入 `prototype.final.html`；如果只能使用 Save File Picker，默认文件名必须是 `prototype.final.html`；如果只能下载，必须明确提示用户把下载文件放到 `visual` 目录下。
- 导出的 `prototype.final.html` 必须冻结当前状态，移除 Tweaks、Edit Mode、保存/导出控件、`window.CXVisual`、编辑标记样式和 authoring 数据。
- 导出后提示用户确认文件已经位于 `.cx/changes/<change-id>/visual/prototype.final.html`，不要放在 Downloads、项目根目录或 change 根目录。
- `style-guide.md` 必须声明 final 原型路径，并记录它是下游唯一可依赖原型。
- 不要默认引入 GrapesJS、Tweakpane 等大型编辑器；只有用户明确要更重的可视化编辑器时才加。

### 6. 样式规范

创建或更新 `style-guide.md`。它必须遵守 `../core/protocols/common.md` 和 `../core/protocols/visual-style-guide.md`，至少包含色板和字体系统，以通过 CX 校验，并应让下游 `design/tasks/build` 可执行。

协议结构：

```markdown
# Visual Style Guide

## Intent Trace
- 来源：contract 中哪些 Requirement / Scenario。
- Assumptions：用户确认或暂定的视觉/交互假设。

## Prototype
- 工作稿：`visual/prototype.editable.html`
- 确认稿：`visual/prototype.final.html`
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

## Tweaks
- 默认值、可调项、设计意图；仅存在于 editable 工作稿。

## Edit Mode
- 使用的 Editor Shell 版本/来源、可编辑区域、保存机制、final 导出规则。

## Downstream Contract
- 下游读取：`visual/prototype.final.html` 和 `visual/style-guide.md`。
- 不读取：`visual/prototype.editable.html`。

## Responsive / Accessibility
- 视口策略、键盘焦点、对比度、文本溢出处理。
```

不得改名固定 heading；不得保留 `<...>` 占位符；没有内容时写 `None` 或 `N/A`。`prototype.final.html` 字样必须出现在 `style-guide.md` 中。

### 7. 验证

保存文件后运行：

```bash
node "${HOME}/.cx/cx.js" validate --change <change-id> --stage visual
```

如果有 error，立即修复。

还应尽量做浏览器验证：

- 用 Playwright 或浏览器打开 `prototype.editable.html`，检查首屏非空、无控制台错误。
- 对关键交互至少点一遍：主路径、状态切换、Tweaks、Edit Mode、Save、Export final。
- 如果已导出 `prototype.final.html`，打开确认首屏非空、主路径可用，且不包含 Tweaks、Edit Mode 或 `window.CXVisual`。
- 如果是响应式页面，检查 desktop 和 mobile 两个视口。
- 没有 Playwright 或浏览器能力时，在最终回复中说明未做浏览器验证。

### 8. 交付说明

成功后提醒用户：

- 工作稿路径：`.cx/changes/<change-id>/visual/prototype.editable.html`
- 确认稿路径：`.cx/changes/<change-id>/visual/prototype.final.html`
- 样式规范路径：`.cx/changes/<change-id>/visual/style-guide.md`
- 可以在浏览器打开 editable 工作稿，使用 Tweaks 和 Edit Mode 继续调整，并用 Save 覆盖保存工作稿最新状态。
- 确认进入下游前，必须从工作稿导出纯净 `prototype.final.html`。
- Visual 上下文通常较长，下游只依赖 `prototype.final.html` 和 `style-guide.md`，建议执行 `/clear` 后继续 `design` 或 `tasks`。
