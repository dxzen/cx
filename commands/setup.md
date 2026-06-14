---
description: 为 Claude Code 修复 CX 插件目录软链
allowed-tools: Bash
---

# CX Setup

目标：在 Claude Code 安装后的 CX 插件根目录创建 `scripts`、`template`、`skills` 软链，让 Claude Code 能默认识别 `/cx:*` skills。

本命令只修改已安装的 CX 插件目录，不修改当前用户项目。

## 执行步骤

1. 从 `installed_plugins.json` 读取 CX 插件的精确安装路径：

```bash
set -e

CLAUDE_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
INSTALLED_JSON="$CLAUDE_DIR/plugins/installed_plugins.json"

if [ ! -f "$INSTALLED_JSON" ]; then
  echo "错误: 未找到 installed_plugins.json" >&2
  echo "请先运行: /plugin marketplace add dxzen/cx" >&2
  echo "然后运行: /plugin install cx@dxzen-cx" >&2
  exit 1
fi

CX_PLUGIN_HOME=$(sed -n '/"cx@dxzen-cx"/,/\]/p' "$INSTALLED_JSON" | sed -n 's/.*"installPath": *"\([^"]*\)".*/\1/p' | head -1)

if [ -z "$CX_PLUGIN_HOME" ]; then
  echo "错误: 无法从 installed_plugins.json 中解析 cx@dxzen-cx 的安装路径。" >&2
  exit 1
fi

if [ ! -d "$CX_PLUGIN_HOME" ]; then
  echo "错误: 安装路径不存在: $CX_PLUGIN_HOME" >&2
  exit 1
fi

echo "$CX_PLUGIN_HOME"
```

2. 在找到的插件根目录创建或修复软链。必须保守处理：

- 如果目标软链已存在且指向正确，跳过。
- 如果目标软链存在但指向错误，替换。
- 如果目标是普通文件或真实目录，停止，不得删除用户数据。

```bash
set -e

CLAUDE_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
INSTALLED_JSON="$CLAUDE_DIR/plugins/installed_plugins.json"

if [ ! -f "$INSTALLED_JSON" ]; then
  echo "错误: 未找到 installed_plugins.json" >&2
  exit 1
fi

CX_PLUGIN_HOME=$(sed -n '/"cx@dxzen-cx"/,/\]/p' "$INSTALLED_JSON" | sed -n 's/.*"installPath": *"\([^"]*\)".*/\1/p' | head -1)

if [ -z "$CX_PLUGIN_HOME" ]; then
  echo "错误: 无法从 installed_plugins.json 中解析 cx@dxzen-cx 的安装路径。" >&2
  exit 1
fi

if [ ! -d "$CX_PLUGIN_HOME" ]; then
  echo "错误: 安装路径不存在: $CX_PLUGIN_HOME" >&2
  exit 1
fi

cd "$CX_PLUGIN_HOME"

cx_link() {
  local name="$1"
  local target="./plugins/cx/$name"

  if [ ! -e "$target" ]; then
    echo "错误: 缺少源目录 $target" >&2
    exit 1
  fi

  if [ -L "$name" ]; then
    local current
    current="$(readlink "$name")"
    if [ "$current" = "$target" ]; then
      echo "已存在: $name -> $target"
      return 0
    fi
    echo "替换错误软链: $name -> $current"
    rm "$name"
  elif [ -e "$name" ]; then
    echo "错误: $CX_PLUGIN_HOME/$name 已存在但不是软链，未自动覆盖。" >&2
    exit 1
  fi

  ln -s "$target" "$name"
  echo "已创建: $name -> $target"
}

cx_link scripts
cx_link template
cx_link skills
```

3. 验证软链结果：

```bash
set -e

CLAUDE_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
INSTALLED_JSON="$CLAUDE_DIR/plugins/installed_plugins.json"

if [ ! -f "$INSTALLED_JSON" ]; then
  echo "错误: 未找到 installed_plugins.json" >&2
  exit 1
fi

CX_PLUGIN_HOME=$(sed -n '/"cx@dxzen-cx"/,/\]/p' "$INSTALLED_JSON" | sed -n 's/.*"installPath": *"\([^"]*\)".*/\1/p' | head -1)

if [ -z "$CX_PLUGIN_HOME" ]; then
  echo "错误: 无法从 installed_plugins.json 中解析 cx@dxzen-cx 的安装路径。" >&2
  exit 1
fi

if [ ! -d "$CX_PLUGIN_HOME" ]; then
  echo "错误: 安装路径不存在: $CX_PLUGIN_HOME" >&2
  exit 1
fi

test -f "$CX_PLUGIN_HOME/scripts/cx.js"
test -d "$CX_PLUGIN_HOME/template"
test -f "$CX_PLUGIN_HOME/skills/init/SKILL.md"

echo "设置完成，请运行 /reload-plugins，然后使用 /cx:init。"
```

## 完成回复

告诉用户：

- 找到的插件目录。
- 创建或跳过了哪些软链。
- 验证是否通过。
- 下一步运行 `/reload-plugins`，然后运行 `/cx:init`。
