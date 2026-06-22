---
name: init
description: 初始化当前项目的 CX 轻量规范目录，并按 Codex CLI / Claude Code 平台建立软链入口。
---

# CX Init

目标是在当前 repo 第一次使用 CX 时创建最小 `.cx/` 目录结构，不能覆盖已有文件。

执行步骤：

1. 优先判断当前工作空间是否已经初始化：

```bash
if [ -d ".cx" ]; then
  echo "当前工作空间已经存在 .cx，CX 已初始化过，无需再次初始化。"
  exit 0
fi
```

如果 `.cx` 已存在，停止本 Skill，不创建软链、不运行 `node "${HOME}/.cx/cx.js" init`，并把已初始化的信息告知用户。

CLI 排障规则：

- 如果 `node "${HOME}/.cx/cx.js" init` 或软链验证失败，不要整篇读取 `cx.js`。
- 先用 `ls -l "${HOME}/.cx/cx.js"`、`readlink "${HOME}/.cx/cx.js"`、`node "${HOME}/.cx/cx.js" --help` 和失败命令的原始输出定位问题。
- 需要查看实现时，先用 `rg -n "function (main|initProject|resolveCxRoot)|cx usage|init" <CX_PLUGIN_ROOT>/scripts/cx.js` 定位，再只读取相关小段。

2. 在用户根目录创建 CX CLI 入口目录：

```bash
mkdir -p "${HOME}/.cx"
```

3. 根据当前平台找到插件 `cx` 的安装路径，并建立必要软链。第一次初始化时优先查找 Claude Code 插件目录；Claude Code 的查找方式必须先参考 `commands/setup.md`，从 `installed_plugins.json` 解析 `cx@dxzen-cx` 的精确 `installPath`：

```bash
if [ -d ".cx" ]; then
  echo "当前工作空间已经存在 .cx，CX 已初始化过，无需再次初始化。"
  exit 0
fi

# 全局变量定义
CX_PLUGIN_ROOT=""    # 找到的插件根目录路径
CX_PLUGIN_HOME=""    # 插件所在的基础目录
CX_PLATFORM=""       # 插件所在的平台名称

# 创建目标目录 ~/.cx 用于存放软链接
mkdir -p "${HOME}/.cx"

# 检查候选路径是否包含有效的 cx 插件
# 参数: $1 - 候选路径, $2 - 平台名称
cx_use_plugin_root() {
  local candidate="$1"
  local platform="$2"

  # 检查候选路径是否为空
  [ -n "${candidate}" ] || return 1

  # 情况1: 候选路径直接是 cx 插件目录 (包含 scripts/cx.js)
  if [ -f "${candidate}/scripts/cx.js" ]; then
    CX_PLUGIN_ROOT="${candidate}"
    CX_PLUGIN_HOME="${candidate}"
    CX_PLATFORM="${platform}"
    return 0
  fi

  # 情况2: 候选路径是插件容器目录，cx 插件在 plugins/cx 子目录中
  if [ -f "${candidate}/plugins/cx/scripts/cx.js" ]; then
    CX_PLUGIN_ROOT="${candidate}/plugins/cx"
    CX_PLUGIN_HOME="${candidate}"
    CX_PLATFORM="${platform}"
    return 0
  fi

  return 1
}

# 在 Codex CLI 环境中查找 cx 插件
cx_find_codex_plugin() {
  local candidate=""

  # 首先尝试使用 codex 命令行工具查询已安装的插件
  if command -v codex >/dev/null 2>&1; then
    candidate="$(codex plugin list 2>/dev/null | awk '$1 == "cx@dxzen-cx" {print $NF; exit}')"
    if [ -n "${candidate}" ] && cx_use_plugin_root "${candidate}" "Codex CLI"; then
      echo "找到 Codex CLI 插件: ${candidate}" >&2
      return 0
    fi
  fi

  # 如果 codex 命令不可用，则直接搜索常见的 Codex 插件缓存目录
  for candidate in "${HOME}/.codex/plugins/cache"/*/cx/* "${HOME}/.codex/.tmp/marketplaces"/*/plugins/cx; do
    [ -e "${candidate}" ] || continue
    if cx_use_plugin_root "${candidate}" "Codex CLI"; then
      echo "找到 Codex CLI 插件: ${candidate}" >&2
      return 0
    fi
  done

  return 1
}

# 在 Claude Code 环境中查找 cx 插件
cx_find_claude_plugin() {
  local candidate=""
  local claude_dir="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
  local installed_json="${claude_dir}/plugins/installed_plugins.json"

  # 优先参考 commands/setup.md：从 installed_plugins.json 读取精确安装路径
  if [ -f "${installed_json}" ]; then
    candidate="$(sed -n '/"cx@dxzen-cx"/,/\]/p' "${installed_json}" | sed -n 's/.*"installPath": *"\([^"]*\)".*/\1/p' | head -1)"
    if [ -n "${candidate}" ] && cx_use_plugin_root "${candidate}" "Claude Code"; then
      echo "找到 Claude Code 插件: ${candidate}" >&2
      return 0
    fi
  fi

  # 兜底搜索 Claude Code 的插件缓存和市场目录
  for candidate in "${claude_dir}/plugins/cache"/*/cx/* "${claude_dir}/plugins/marketplaces"/*; do
    [ -e "${candidate}" ] || continue
    if cx_use_plugin_root "${candidate}" "Claude Code"; then
      echo "找到 Claude Code 插件: ${candidate}" >&2
      return 0
    fi
  done

  return 1
}

# 在当前工作目录向上递归查找本地仓库中的 cx 插件
cx_find_nearby_plugin() {
  local search_root
  search_root="$(pwd)"

  # 从当前目录开始，逐级向上查找直到根目录
  while [ "${search_root}" != "/" ]; do
    if cx_use_plugin_root "${search_root}" "当前仓库"; then
      echo "找到本地仓库插件: ${search_root}" >&2
      return 0
    fi
    search_root="$(dirname "${search_root}")"
  done

  return 1
}

# 第一次初始化时优先查找 Claude Code 插件，再查 Codex CLI，最后查当前仓库
cx_find_claude_plugin || cx_find_codex_plugin || cx_find_nearby_plugin

# 验证是否成功找到有效的 cx.js 文件
if [ -z "${CX_PLUGIN_ROOT}" ] || [ ! -f "${CX_PLUGIN_ROOT}/scripts/cx.js" ]; then
  echo "错误: 无法在 Codex 或 Claude Code 插件目录中找到 cx/scripts/cx.js" >&2
  echo "请确保已安装 cx 插件: /plugin install cx@dxzen-cx" >&2
  exit 1
fi

# 创建软链接到 ~/.cx/cx.js
echo "正在创建软链接: ${CX_PLUGIN_ROOT}/scripts/cx.js -> ${HOME}/.cx/cx.js" >&2
ln -sfn "${CX_PLUGIN_ROOT}/scripts/cx.js" "${HOME}/.cx/cx.js"

# 验证软链接创建是否成功
if [ $? -eq 0 ]; then
  echo "成功创建软链接到 ${HOME}/.cx/cx.js" >&2
else
  echo "错误: 无法创建软链接" >&2
  exit 1
fi
```

4. 使用 Bash 运行：

```bash
node "${HOME}/.cx/cx.js" init
```

5. 把 CLI 输出原样摘要给用户。CLI 会创建 `.cx/specs`、`.cx/changes`、`.cx/archive`、`.cx/worktrees`，其中 `.cx/worktrees/` 用于可选 worktree，使用前必须加入 `.gitignore`。
6. 下一步提示：先清空上下文 `/clear` 。然后Codex CLI 中使用 `$cx:work <change description>`；Claude Code 中使用 `/cx:work <change description>` 开始工作。
