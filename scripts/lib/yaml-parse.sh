#!/usr/bin/env bash
# Minimal YAML frontmatter parser: yq preferred, awk/sed fallback.
#
# 用法（source 后）：
#   yaml_parse_load <file>      # 把 frontmatter 加载到全局变量 YAML_FM_FILE
#   yaml_parse_get <key>        # 打印某个字段值（无则空字符串）
#
# 仅支持扁平 key: value 与 key: [a, b, c] 列表；不支持嵌套。
# 复杂 schema 请手动结构化（本项目的 frontmatter 都保持扁平）。
#
# 实现注意：macOS 自带 bash 3.2 不支持关联数组，因此采用
# 进程级临时存储：把解析后的 KV 缓存到 $YAML_FM_FILE，
# 查询时用 grep 提取。这样兼容 bash 3.2+。

YAML_FM_FILE="${TMPDIR:-/tmp}/agent-harness-yaml-fm.$$"

yaml_parse_load() {
  local file="$1"
  : > "$YAML_FM_FILE"
  [ ! -f "$file" ] && return 1

  # 提取首对 --- ... --- 之间的内容
  local body
  body=$(awk '
    /^---[[:space:]]*$/ { c++; next }
    c == 1 { print }
    c >= 2 { exit }
  ' "$file" 2>/dev/null || true)
  [ -z "$body" ] && return 1

  if command -v yq >/dev/null 2>&1; then
    # yq 路径：把每行输出为 KEY=VALUE
    printf '%s\n' "$body" | yq -o=props '.' 2>/dev/null > "$YAML_FM_FILE" || true
    # 兜底：若 yq 输出为空（解析失败），走 fallback
    if [ ! -s "$YAML_FM_FILE" ]; then
      _yaml_parse_fallback "$body"
    fi
  else
    _yaml_parse_fallback "$body"
  fi
  return 0
}

# 内部 fallback：扁平 key: value / key: [a, b]
_yaml_parse_fallback() {
  local body="$1"
  local line k v
  : > "$YAML_FM_FILE"
  while IFS= read -r line; do
    line="${line%%#*}"  # 去行尾注释
    case "$line" in
      *:[[:space:]]*)
        k="${line%%:*}"
        v="${line#*:}"
        k="${k// /}"
        v="${v#"${v%%[![:space:]]*}"}"  # 去前导空格
        v="${v%"${v##*[![:space:]]}"}"  # 去尾部空格
        [ -n "$k" ] && printf '%s=%s\n' "$k" "$v" >> "$YAML_FM_FILE"
        ;;
    esac
  done <<< "$body"
}

yaml_parse_get() {
  local key="$1"
  [ -z "$key" ] && { printf '%s' ""; return; }
  local line
  line=$(grep -m1 "^${key}=" "$YAML_FM_FILE" 2>/dev/null || true)
  printf '%s' "${line#*=}"
}
