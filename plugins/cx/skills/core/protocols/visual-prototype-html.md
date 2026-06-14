# Visual Prototype HTML Protocol

路径：

```text
.cx/changes/<change-id>/visual/prototype.editable.html
.cx/changes/<change-id>/visual/prototype.final.html
```

机器必选格式：

- `prototype.editable.html` 必须包含 `cx-visual-schema`、`cx-visual-saved-state`、`data-cx-prototype-root`、`CXVisualEditor` 和 `window.CXVisual`。
- `prototype.final.html` 不得包含 `CXVisualEditor`、`window.CXVisual`、`cx-visual-schema`、`cx-visual-saved-state`、`data-cx-editor-shell`、`data-cx-editor-asset`、`data-edit-id`、`data-editable`、`data-edit-type` 或 `contenteditable`。
- final 原型必须由用户确认后的 editable 工作稿导出，下游不得读取 editable 工作稿。
