---
name: update
description: 重新发现已安装的 CX 插件位置，并刷新用户根目录下的 CX CLI 入口软链 `${HOME}/.cx/cx.js`。当插件升级、迁移平台、软链失效、`node "${HOME}/.cx/cx.js"` 找不到文件，或用户明确要求 update/更新 CX 入口时使用。
---

# CX Update

目标是重新生成用户根目录下的 CX CLI 软链：

```text
${HOME}/.cx/cx.js -> <CX_PLUGIN_ROOT>/scripts/cx.js
```

本 Skill 只刷新全局入口软链，不初始化当前项目，不创建或修改当前工作空间的 `.cx/`。

执行步骤：

1. 在用户根目录创建 CX CLI 入口目录：

```bash
mkdir -p "${HOME}/.cx"
```

2. 发现已安装的 CX 插件目录并重建软链。查找平台插件时优先使用 Claude Code 的安装记录，方式参考 `commands/setup.md`：从 `installed_plugins.json` 解析 `cx@dxzen-cx` 的精确 `installPath`；然后再查 Codex CLI；最后查当前仓库。

```bash
# 全局变量定义
CX_PLUGIN_ROOT=""    # 找到的插件根目录路径
CX_PLUGIN_HOME=""    # 插件所在的基础目录
CX_PLATFORM=""       # 插件所在的平台名称

mkdir -p "${HOME}/.cx"

cx_use_plugin_root() {
  local candidate="$1"
  local platform="$2"

  [ -n "${candidate}" ] || return 1

  if [ -f "${candidate}/scripts/cx.js" ]; then
    CX_PLUGIN_ROOT="${candidate}"
    CX_PLUGIN_HOME="${candidate}"
    CX_PLATFORM="${platform}"
    return 0
  fi

  if [ -f "${candidate}/plugins/cx/scripts/cx.js" ]; then
    CX_PLUGIN_ROOT="${candidate}/plugins/cx"
    CX_PLUGIN_HOME="${candidate}"
    CX_PLATFORM="${platform}"
    return 0
  fi

  return 1
}

cx_find_claude_plugin() {
  local candidate=""
  local claude_dir="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
  local installed_json="${claude_dir}/plugins/installed_plugins.json"

  if [ -f "${installed_json}" ]; then
    candidate="$(sed -n '/"cx@dxzen-cx"/,/\]/p' "${installed_json}" | sed -n 's/.*"installPath": *"\([^"]*\)".*/\1/p' | head -1)"
    if [ -n "${candidate}" ] && cx_use_plugin_root "${candidate}" "Claude Code"; then
      echo "找到 Claude Code 插件: ${candidate}" >&2
      return 0
    fi
  fi

  for candidate in "${claude_dir}/plugins/cache"/*/cx/* "${claude_dir}/plugins/marketplaces"/*; do
    [ -e "${candidate}" ] || continue
    if cx_use_plugin_root "${candidate}" "Claude Code"; then
      echo "找到 Claude Code 插件: ${candidate}" >&2
      return 0
    fi
  done

  return 1
}

cx_find_codex_plugin() {
  local candidate=""

  if command -v codex >/dev/null 2>&1; then
    candidate="$(codex plugin list 2>/dev/null | awk '$1 == "cx@dxzen-cx" {print $NF; exit}')"
    if [ -n "${candidate}" ] && cx_use_plugin_root "${candidate}" "Codex CLI"; then
      echo "找到 Codex CLI 插件: ${candidate}" >&2
      return 0
    fi
  fi

  for candidate in "${HOME}/.codex/plugins/cache"/*/cx/* "${HOME}/.codex/.tmp/marketplaces"/*/plugins/cx; do
    [ -e "${candidate}" ] || continue
    if cx_use_plugin_root "${candidate}" "Codex CLI"; then
      echo "找到 Codex CLI 插件: ${candidate}" >&2
      return 0
    fi
  done

  return 1
}

cx_find_nearby_plugin() {
  local search_root
  search_root="$(pwd)"

  while [ "${search_root}" != "/" ]; do
    if cx_use_plugin_root "${search_root}" "当前仓库"; then
      echo "找到本地仓库插件: ${search_root}" >&2
      return 0
    fi
    search_root="$(dirname "${search_root}")"
  done

  return 1
}

cx_find_claude_plugin || cx_find_codex_plugin || cx_find_nearby_plugin

if [ -z "${CX_PLUGIN_ROOT}" ] || [ ! -f "${CX_PLUGIN_ROOT}/scripts/cx.js" ]; then
  echo "错误: 无法在 Claude Code、Codex CLI 或当前仓库中找到 cx/scripts/cx.js" >&2
  echo "请确保已安装 cx 插件: /plugin install cx@dxzen-cx 或 codex plugin add cx@dxzen-cx" >&2
  exit 1
fi

echo "正在刷新软链接: ${CX_PLUGIN_ROOT}/scripts/cx.js -> ${HOME}/.cx/cx.js" >&2
ln -sfn "${CX_PLUGIN_ROOT}/scripts/cx.js" "${HOME}/.cx/cx.js"

if [ -L "${HOME}/.cx/cx.js" ] && [ -f "${HOME}/.cx/cx.js" ]; then
  echo "成功刷新 ${HOME}/.cx/cx.js" >&2
  echo "平台: ${CX_PLATFORM}" >&2
  echo "插件目录: ${CX_PLUGIN_ROOT}" >&2
else
  echo "错误: 无法创建有效软链接 ${HOME}/.cx/cx.js" >&2
  exit 1
fi
```

3. 验证入口可执行：

```bash
node "${HOME}/.cx/cx.js" --help
```

4. 把找到的平台、插件目录、软链目标和验证结果告知用户。提醒：如果当前项目尚未初始化，下一步使用 `init`；如果只是继续已有项目，直接使用 `status` 或后续 CX Skill。
