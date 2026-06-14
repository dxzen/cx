# CX Artifact Protocol Rules

本文件是 CX 节点产出协议的通用规则，不是自由写作示例。生成或更新 `.cx/` 产物时，必须先读取对应协议文件，复制协议骨架，再填充内容。

硬性规则：

- 不得改名固定 heading、字段标签、表格列名和状态值；这些内容会被 `scripts/cx.js validate` 解析。
- 不得保留 `<...>` 占位符；无内容时使用 `None`、`Skipped: <reason>` 或明确说明。
- Markdown heading 层级必须保持一致，例如 contract 的 Requirement 必须是 `### Requirement:`，Scenario 必须是 `#### Scenario:`。
- 固定英文协议标签保留英文；正文说明默认使用简体中文，技术名词、命令、路径和代码标识可保留英文。
- 每个产物写入后必须运行对应 stage 的 `node "${HOME}/.cx/cx.js" validate --change <change-id> --stage <stage>`。
