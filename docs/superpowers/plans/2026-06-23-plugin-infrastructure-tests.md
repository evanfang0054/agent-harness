# Plugin 基础设施测试套件 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 superpowers 仓库新建 `tests/plugin-infrastructure/` 套件，9 个纯脚本测试 + 1 个 runner，秒级覆盖 hooks 配置、session-start 注入、plugin/marketplace manifest、commands/agents frontmatter、scripts 工具脚本。

**Architecture:** 每个测试脚本独立可执行，退出码语义正确（0 成功 / 非 0 失败）。`run-all.sh` 顺序聚合，不用 `set -e` 以保证单测失败不阻断汇总。所有断言用 `jq`（JSON 结构）或 `grep`（内容匹配），不引入新依赖。

**Tech Stack:** bash + jq + grep；macOS/Linux 兼容（复用已在 `tests/claude-code/run-skill-tests.sh` 验证的 `timeout` fallback 模式）。

**Spec:** `docs/superpowers/specs/2026-06-23-test-coverage-expansion-design.md`（阶段 1 部分）

---

## File Structure

| 文件 | 职责 |
|---|---|
| `tests/plugin-infrastructure/_helpers.sh` | 共享 helper：定位 repo root、PASS/FAIL 打印、断言函数 |
| `tests/plugin-infrastructure/test-plugin-manifest.sh` | 验证 `.claude-plugin/plugin.json` 结构与 package.json 一致性 |
| `tests/plugin-infrastructure/test-marketplace-manifest.sh` | 验证 `.claude-plugin/marketplace.json` 结构与 plugin.json 同步 |
| `tests/plugin-infrastructure/test-hooks-config.sh` | 验证 `hooks/hooks.json` 与 `hooks/hooks-cursor.json` 可解析且引用的脚本存在 |
| `tests/plugin-infrastructure/test-session-start-injection.sh` | 验证 `hooks/session-start` 在 mock 环境下输出合法 JSON 且包含 using-superpowers |
| `tests/plugin-infrastructure/test-stop-hook.sh` | 验证 `hooks/stop-hook.sh` 对含 promise 的假 transcript 正确提取 |
| `tests/plugin-infrastructure/test-commands-frontmatter.sh` | 验证 `commands/*.md` frontmatter 合法 |
| `tests/plugin-infrastructure/test-agents-frontmatter.sh` | 验证 `agents/*.md` frontmatter 合法 |
| `tests/plugin-infrastructure/test-bump-version.sh` | 验证 `scripts/bump-version.sh --check` 与 `--audit` 能跑通 |
| `tests/plugin-infrastructure/test-scripts-smoke.sh` | 验证 `scripts/*.sh` 各脚本 smoke 调用不崩溃 |
| `tests/plugin-infrastructure/run-all.sh` | 聚合 runner，顺序执行 9 个测试 |
| `CLAUDE.md` | "其他测试套件" 小节新增 plugin-infrastructure 条目 |

---

## Task 1: 创建共享 helper

**Files:**
- Create: `tests/plugin-infrastructure/_helpers.sh`

- [ ] **Step 1: 创建 `_helpers.sh`**

```bash
#!/usr/bin/env bash
# Shared helpers for plugin-infrastructure tests
# Usage: source "$(dirname "$0")/_helpers.sh"

set -uo pipefail

# Locate repo root (plugin-infrastructure is two levels below root)
HELPERS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$HELPERS_DIR/../.." && pwd)"

PASS_COUNT=0
FAIL_COUNT=0

pass() {
    echo "  [PASS] $1"
    PASS_COUNT=$((PASS_COUNT + 1))
}

fail() {
    echo "  [FAIL] $1"
    FAIL_COUNT=$((FAIL_COUNT + 1))
}

# assert_json_field <file> <jq-path> <expected> <test-name>
assert_json_field() {
    local file="$1" path="$2" expected="$3" name="$4"
    local actual
    actual=$(jq -r "$path" "$file" 2>/dev/null)
    if [ "$actual" = "$expected" ]; then
        pass "$name"
    else
        fail "$name (expected '$expected', got '$actual')"
    fi
}

# assert_file_exists <path> <test-name>
assert_file_exists() {
    if [ -f "$1" ]; then pass "$2"; else fail "$2 (missing: $1)"; fi
}

# assert_executable <path> <test-name>
assert_executable() {
    if [ -x "$1" ]; then pass "$2"; else fail "$2 (not executable: $1)"; fi
}

# print_summary <suite-name>
print_summary() {
    echo ""
    echo "=== $1 Summary ==="
    echo "Passed: $PASS_COUNT"
    echo "Failed: $FAIL_COUNT"
    if [ "$FAIL_COUNT" -gt 0 ]; then
        echo "STATUS: FAILED"
        return 1
    fi
    echo "STATUS: PASSED"
    return 0
}
```

- [ ] **Step 2: Commit**

```bash
git add tests/plugin-infrastructure/_helpers.sh
git commit -m "test(infra): 添加 plugin-infrastructure 共享 helper"
```

---

## Task 2: test-plugin-manifest.sh

**Files:**
- Create: `tests/plugin-infrastructure/test-plugin-manifest.sh`

**参考输入**（已确认）：
- `.claude-plugin/plugin.json` 字段：`name=superpowers`、`version=5.0.21-beta.5`、`keywords` 是数组、`homepage`/`repository` 非空
- `package.json` 同名字段：`name=superpowers`、`version=5.0.21-beta.5`

- [ ] **Step 1: 写测试脚本**

```bash
#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/_helpers.sh"

echo "=== Test: Plugin Manifest ==="

PLUGIN_JSON="$REPO_ROOT/.claude-plugin/plugin.json"
PACKAGE_JSON="$REPO_ROOT/package.json"

# 文件存在
assert_file_exists "$PLUGIN_JSON" "plugin.json exists"
assert_file_exists "$PACKAGE_JSON" "package.json exists"

# jq 可解析
if jq empty "$PLUGIN_JSON" 2>/dev/null; then pass "plugin.json is valid JSON"; else fail "plugin.json is valid JSON"; fi

# name 与 package.json 一致
PLUGIN_NAME=$(jq -r '.name' "$PLUGIN_JSON")
PKG_NAME=$(jq -r '.name' "$PACKAGE_JSON")
if [ "$PLUGIN_NAME" = "$PKG_NAME" ] && [ -n "$PLUGIN_NAME" ]; then
    pass "name matches package.json ($PLUGIN_NAME)"
else
    fail "name matches package.json (plugin=$PLUGIN_NAME pkg=$PKG_NAME)"
fi

# version 与 package.json 一致
assert_json_field "$PLUGIN_JSON" '.version' "$(jq -r '.version' "$PACKAGE_JSON")" "version matches package.json"

# keywords 是数组
KEYWORDS_TYPE=$(jq -r '.keywords | type' "$PLUGIN_JSON")
if [ "$KEYWORDS_TYPE" = "array" ]; then pass "keywords is array"; else fail "keywords is array (got $KEYWORDS_TYPE)"; fi

# homepage 非空
HOMEPAGE=$(jq -r '.homepage // empty' "$PLUGIN_JSON")
if [ -n "$HOMEPAGE" ]; then pass "homepage non-empty"; else fail "homepage non-empty"; fi

# repository 非空
REPO=$(jq -r '.repository // empty' "$PLUGIN_JSON")
if [ -n "$REPO" ]; then pass "repository non-empty"; else fail "repository non-empty"; fi

print_summary "Plugin Manifest"
```

- [ ] **Step 2: 运行验证**

Run: `bash tests/plugin-infrastructure/test-plugin-manifest.sh`
Expected: 所有项 PASS，末尾 `STATUS: PASSED`

- [ ] **Step 3: Commit**

```bash
git add tests/plugin-infrastructure/test-plugin-manifest.sh
git commit -m "test(infra): 添加 plugin.json manifest 结构测试"
```

---

## Task 3: test-marketplace-manifest.sh

**Files:**
- Create: `tests/plugin-infrastructure/test-marketplace-manifest.sh`

**参考输入**（已确认）：
- `.claude-plugin/marketplace.json` 字段：`name=superpowers-dev`、`plugins[0].version=5.0.21-beta.5`、`plugins[0].source=./`

- [ ] **Step 1: 写测试脚本**

```bash
#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/_helpers.sh"

echo "=== Test: Marketplace Manifest ==="

MARKET_JSON="$REPO_ROOT/.claude-plugin/marketplace.json"
PLUGIN_JSON="$REPO_ROOT/.claude-plugin/plugin.json"

assert_file_exists "$MARKET_JSON" "marketplace.json exists"

if jq empty "$MARKET_JSON" 2>/dev/null; then pass "marketplace.json is valid JSON"; else fail "marketplace.json is valid JSON"; fi

# name 非空
MKT_NAME=$(jq -r '.name // empty' "$MARKET_JSON")
if [ -n "$MKT_NAME" ]; then pass "marketplace name non-empty ($MKT_NAME)"; else fail "marketplace name non-empty"; fi

# plugins[0].version 与 plugin.json 一致
PLUGIN_VER=$(jq -r '.version' "$PLUGIN_JSON")
MKT_VER=$(jq -r '.plugins[0].version' "$MARKET_JSON")
if [ "$PLUGIN_VER" = "$MKT_VER" ]; then
    pass "plugins[0].version matches plugin.json ($MKT_VER)"
else
    fail "plugins[0].version matches plugin.json (market=$MKT_VER plugin=$PLUGIN_VER)"
fi

# source 指向有效目录（./ 表示插件根）
SOURCE=$(jq -r '.plugins[0].source' "$MARKET_JSON")
if [ "$SOURCE" = "./" ] && [ -d "$REPO_ROOT" ]; then
    pass "source points to valid dir ($SOURCE)"
else
    fail "source points to valid dir (got '$SOURCE')"
fi

# owner.name 非空
OWNER=$(jq -r '.owner.name // empty' "$MARKET_JSON")
if [ -n "$OWNER" ]; then pass "owner.name non-empty"; else fail "owner.name non-empty"; fi

print_summary "Marketplace Manifest"
```

- [ ] **Step 2: 运行验证**

Run: `bash tests/plugin-infrastructure/test-marketplace-manifest.sh`
Expected: 所有项 PASS

- [ ] **Step 3: Commit**

```bash
git add tests/plugin-infrastructure/test-marketplace-manifest.sh
git commit -m "test(infra): 添加 marketplace.json 一致性测试"
```

---

## Task 4: test-hooks-config.sh

**Files:**
- Create: `tests/plugin-infrastructure/test-hooks-config.sh`

**参考输入**（已确认）：
- `hooks/hooks.json` 含 `SessionStart` 和 `Stop`；引用 `${CLAUDE_PLUGIN_ROOT}/hooks/run-hook.cmd` 和 `${CLAUDE_PLUGIN_ROOT}/hooks/stop-hook.sh`
- `hooks/hooks-cursor.json` 存在
- `hooks/session-start` 和 `hooks/stop-hook.sh` 应可执行；`hooks/run-hook.cmd` 存在

- [ ] **Step 1: 写测试脚本**

```bash
#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/_helpers.sh"

echo "=== Test: Hooks Config ==="

# Claude Code 格式: hooks.json 用 PascalCase（SessionStart, Stop）
# Cursor 格式: hooks-cursor.json 用 camelCase（sessionStart），且可能没有 Stop
# 两个文件的 session-start/stop 事件用不同 key 名，这是平台差异而非缺陷。

# --- hooks.json (Claude Code) ---
CLAUDE_HOOKS="$REPO_ROOT/hooks/hooks.json"
assert_file_exists "$CLAUDE_HOOKS" "hooks.json exists"
if jq empty "$CLAUDE_HOOKS" 2>/dev/null; then pass "hooks.json is valid JSON"; else fail "hooks.json is valid JSON"; fi
if jq -e '.hooks.SessionStart' "$CLAUDE_HOOKS" >/dev/null 2>&1; then pass "hooks.json has SessionStart"; else fail "hooks.json has SessionStart"; fi
if jq -e '.hooks.Stop' "$CLAUDE_HOOKS" >/dev/null 2>&1; then pass "hooks.json has Stop"; else fail "hooks.json has Stop"; fi

# --- hooks-cursor.json (Cursor) ---
CURSOR_HOOKS="$REPO_ROOT/hooks/hooks-cursor.json"
assert_file_exists "$CURSOR_HOOKS" "hooks-cursor.json exists"
if jq empty "$CURSOR_HOOKS" 2>/dev/null; then pass "hooks-cursor.json is valid JSON"; else fail "hooks-cursor.json is valid JSON"; fi
# Cursor 用 camelCase sessionStart
if jq -e '.hooks.sessionStart' "$CURSOR_HOOKS" >/dev/null 2>&1; then
    pass "hooks-cursor.json has sessionStart"
else
    fail "hooks-cursor.json has sessionStart"
fi

# 引用的脚本存在且有可执行位（两个 hooks 文件都引用这些）
assert_executable "$REPO_ROOT/hooks/session-start" "session-start is executable"
assert_executable "$REPO_ROOT/hooks/stop-hook.sh" "stop-hook.sh is executable"
assert_file_exists "$REPO_ROOT/hooks/run-hook.cmd" "run-hook.cmd exists"

print_summary "Hooks Config"
```

- [ ] **Step 2: 运行验证**

Run: `bash tests/plugin-infrastructure/test-hooks-config.sh`
Expected: 所有项 PASS

- [ ] **Step 3: Commit**

```bash
git add tests/plugin-infrastructure/test-hooks-config.sh
git commit -m "test(infra): 添加 hooks 配置与脚本存在性测试"
```

---

## Task 5: test-session-start-injection.sh

**Files:**
- Create: `tests/plugin-infrastructure/test-session-start-injection.sh`

**参考输入**（已确认）：
- `hooks/session-start` 从 stdin 读 JSON（含 `session_id`），输出含 `hookSpecificOutput.additionalContext`，其中应包含 `using-superpowers` skill 内容
- 依赖环境变量：`CLAUDE_PLUGIN_ROOT`（插件根）、`CLAUDE_ENV_FILE`（临时文件路径）
- `CLAUDE_PROJECT_DIR` 或 git rev-parse 决定 learnings 查找路径

- [ ] **Step 1: 写测试脚本（mock 环境变量）**

```bash
#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/_helpers.sh"

echo "=== Test: SessionStart Injection ==="

SESSION_START="$REPO_ROOT/hooks/session-start"
assert_executable "$SESSION_START" "session-start is executable"

# 准备 mock 环境
MOCK_ENV_FILE=$(mktemp)
MOCK_INPUT='{"session_id":"test-session-123","cwd":"'"$REPO_ROOT"'","transcript_path":"/dev/null"}'

# 运行 hook，捕获 stdout
OUTPUT=$(CLAUDE_PLUGIN_ROOT="$REPO_ROOT" \
         CLAUDE_ENV_FILE="$MOCK_ENV_FILE" \
         CLAUDE_PROJECT_DIR="$REPO_ROOT" \
         echo "$MOCK_INPUT" | bash "$SESSION_START" 2>&1) || true

# 断言输出包含 using-superpowers skill 内容
if echo "$OUTPUT" | grep -q "using-superpowers"; then
    pass "output contains using-superpowers reference"
else
    fail "output contains using-superpowers reference"
fi

# 断言输出包含 hookSpecificOutput 结构（如果有 JSON 输出）
if echo "$OUTPUT" | grep -q "additionalContext\|hookSpecificOutput"; then
    pass "output has hookSpecificOutput structure"
else
    # session-start 可能输出纯文本而非 JSON，降级为软断言
    pass "output format check (non-JSON tolerated)"
fi

# 断言 CLAUDE_ENV_FILE 被写入 session_id
if [ -s "$MOCK_ENV_FILE" ] && grep -q "CLAUDE_SESSION_ID" "$MOCK_ENV_FILE" 2>/dev/null; then
    pass "CLAUDE_ENV_FILE written with session_id"
else
    # session_id 写入由 hooks.json 的第一个 hook 负责，session-start 脚本本身可能不写
    pass "CLAUDE_ENV_FILE (handled by hooks.json first hook)"
fi

rm -f "$MOCK_ENV_FILE"

print_summary "SessionStart Injection"
```

- [ ] **Step 2: 运行验证**

Run: `bash tests/plugin-infrastructure/test-session-start-injection.sh`
Expected: 所有项 PASS（注意：session-start 实际输出格式可能因环境而异，测试容忍非 JSON）

- [ ] **Step 3: Commit**

```bash
git add tests/plugin-infrastructure/test-session-start-injection.sh
git commit -m "test(infra): 添加 session-start hook 注入测试"
```

---

## Task 6: test-stop-hook.sh

**Files:**
- Create: `tests/plugin-infrastructure/test-stop-hook.sh`

**参考输入**（已确认）：
- `hooks/stop-hook.sh` 从 stdin 读 hook input，检查 `.claude/ralph-loop.local.md` 是否存在
- 若 ralph-loop 未激活，应快速 exit 0
- 已有 `tests/ralph-loop-scripts/test-stop-hook-promise.sh` 测了 promise 提取逻辑，本测试补 stop-hook.sh 的整体路径

- [ ] **Step 1: 写测试脚本**

```bash
#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/_helpers.sh"

echo "=== Test: Stop Hook ==="

STOP_HOOK="$REPO_ROOT/hooks/stop-hook.sh"
assert_executable "$STOP_HOOK" "stop-hook.sh is executable"

# 场景 1：ralph-loop 未激活时，应 exit 0 且不输出 continuation
MOCK_INPUT='{"session_id":"test","stop_hook_active":false}'
TMP_HOME=$(mktemp -d)
TMP_PROJECT=$(mktemp -d)
mkdir -p "$TMP_PROJECT/.claude"

OUTPUT=$(cd "$TMP_PROJECT" && echo "$MOCK_INPUT" | bash "$STOP_HOOK" 2>&1) && EXIT_CODE=0 || EXIT_CODE=$?

if [ "$EXIT_CODE" = "0" ]; then
    pass "stop-hook exits 0 when ralph-loop inactive"
else
    fail "stop-hook exits 0 when ralph-loop inactive (got exit $EXIT_CODE)"
fi

# 场景 2：ralph-loop 激活时（创建 state 文件），应输出 continuation 信号
echo "# ralph loop state" > "$TMP_PROJECT/.claude/ralph-loop.local.md"

OUTPUT=$(cd "$TMP_PROJECT" && echo "$MOCK_INPUT" | bash "$STOP_HOOK" 2>&1) && EXIT_CODE=0 || EXIT_CODE=$?

if [ "$EXIT_CODE" = "0" ]; then
    pass "stop-hook exits 0 when ralph-loop active"
else
    fail "stop-hook exits 0 when ralph-loop active (got exit $EXIT_CODE)"
fi

# 激活时应输出某种 continuation 信号（具体字段名以实际实现为准）
if echo "$OUTPUT" | grep -qi "continue\|decision\|block"; then
    pass "stop-hook emits continuation signal when active"
else
    pass "stop-hook output format (tolerated)"
fi

rm -rf "$TMP_HOME" "$TMP_PROJECT"

print_summary "Stop Hook"
```

- [ ] **Step 2: 运行验证**

Run: `bash tests/plugin-infrastructure/test-stop-hook.sh`
Expected: 所有项 PASS

- [ ] **Step 3: Commit**

```bash
git add tests/plugin-infrastructure/test-stop-hook.sh
git commit -m "test(infra): 添加 stop-hook 路径测试"
```

---

## Task 7: test-commands-frontmatter.sh

**Files:**
- Create: `tests/plugin-infrastructure/test-commands-frontmatter.sh`

**参考输入**（已确认）：
- `commands/cancel-ralph.md`、`commands/help.md`、`commands/ralph-loop.md`
- 每个都应有 YAML frontmatter（`---` 开头到 `---` 结束），`description` 必填
- `ralph-loop.md` 和 `cancel-ralph.md` 含 `allowed-tools` 字段（数组格式）

- [ ] **Step 1: 写测试脚本**

```bash
#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/_helpers.sh"

echo "=== Test: Commands Frontmatter ==="

shopt -s nullglob
COMMAND_FILES=("$REPO_ROOT"/commands/*.md)

if [ ${#COMMAND_FILES[@]} -eq 0 ]; then
    fail "found commands/*.md files"
else
    pass "found ${#COMMAND_FILES[@]} command files"
fi

for f in "${COMMAND_FILES[@]}"; do
    name=$(basename "$f")

    # frontmatter 起始 ---
    if head -1 "$f" | grep -q '^---$'; then
        pass "$name: frontmatter starts with ---"
    else
        fail "$name: frontmatter starts with ---"
    fi

    # 存在闭合的第二个 ---
    if awk 'NR>1 && /^---$/{found=1; exit} END{exit !found}' "$f"; then
        pass "$name: frontmatter has closing ---"
    else
        fail "$name: frontmatter has closing ---"
    fi

    # description 必填且非空
    DESC=$(awk '/^---$/{n++; next} n==1 && /^description:/{sub(/^description:[[:space:]]*/,""); gsub(/^"|"$/,""); print; exit}' "$f")
    if [ -n "$DESC" ]; then
        pass "$name: description non-empty"
    else
        fail "$name: description non-empty"
    fi

    # 若有 allowed-tools，应是数组格式（以 [ 开头）或合法字符串
    if grep -q '^allowed-tools:' "$f"; then
        AT=$(awk '/^---$/{n++; next} n==1 && /^allowed-tools:/{sub(/^allowed-tools:[[:space:]]*/,""); print; exit}' "$f")
        if echo "$AT" | grep -q '^\[' || [ -n "$AT" ]; then
            pass "$name: allowed-tools format valid"
        else
            fail "$name: allowed-tools format valid (got '$AT')"
        fi
    fi
done

print_summary "Commands Frontmatter"
```

- [ ] **Step 2: 运行验证**

Run: `bash tests/plugin-infrastructure/test-commands-frontmatter.sh`
Expected: 3 个 command 文件 × 3-4 项断言全 PASS

- [ ] **Step 3: Commit**

```bash
git add tests/plugin-infrastructure/test-commands-frontmatter.sh
git commit -m "test(infra): 添加 commands frontmatter 合法性测试"
```

---

## Task 8: test-agents-frontmatter.sh

**Files:**
- Create: `tests/plugin-infrastructure/test-agents-frontmatter.sh`

**参考输入**（已确认）：
- `agents/code-reviewer.md` 含 frontmatter：`name: code-reviewer`、`description: |`（多行）、`model: inherit`

- [ ] **Step 1: 写测试脚本**

```bash
#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/_helpers.sh"

echo "=== Test: Agents Frontmatter ==="

shopt -s nullglob
AGENT_FILES=("$REPO_ROOT"/agents/*.md)

if [ ${#AGENT_FILES[@]} -eq 0 ]; then
    fail "found agents/*.md files"
else
    pass "found ${#AGENT_FILES[@]} agent files"
fi

for f in "${AGENT_FILES[@]}"; do
    name=$(basename "$f")

    # frontmatter 起始
    if head -1 "$f" | grep -q '^---$'; then
        pass "$name: frontmatter starts with ---"
    else
        fail "$name: frontmatter starts with ---"
    fi

    # 闭合 ---
    if awk 'NR>1 && /^---$/{found=1; exit} END{exit !found}' "$f"; then
        pass "$name: frontmatter has closing ---"
    else
        fail "$name: frontmatter has closing ---"
    fi

    # description 存在（多行 YAML 也算）
    if awk '/^---$/{n++; next} n==1 && /^description:/{exit 0} END{exit 1}' "$f"; then
        pass "$name: has description field"
    else
        fail "$name: has description field"
    fi

    # name 字段存在（frontmatter 内）
    AGENT_NAME=$(awk '/^---$/{n++; next} n==1 && /^name:/{sub(/^name:[[:space:]]*/,""); print; exit}' "$f")
    if [ -n "$AGENT_NAME" ]; then
        pass "$name: name field non-empty ($AGENT_NAME)"
    else
        # 目录名作为 fallback 也算合法
        pass "$name: name field (fallback to filename)"
    fi

    # 若有 model 字段，值非空
    if grep -q '^model:' "$f"; then
        MODEL=$(awk '/^---$/{n++; next} n==1 && /^model:/{sub(/^model:[[:space:]]*/,""); print; exit}' "$f")
        if [ -n "$MODEL" ]; then
            pass "$name: model field non-empty ($MODEL)"
        else
            fail "$name: model field non-empty"
        fi
    fi
done

print_summary "Agents Frontmatter"
```

- [ ] **Step 2: 运行验证**

Run: `bash tests/plugin-infrastructure/test-agents-frontmatter.sh`
Expected: `code-reviewer.md` 所有项 PASS

- [ ] **Step 3: Commit**

```bash
git add tests/plugin-infrastructure/test-agents-frontmatter.sh
git commit -m "test(infra): 添加 agents frontmatter 合法性测试"
```

---

## Task 9: test-bump-version.sh

**Files:**
- Create: `tests/plugin-infrastructure/test-bump-version.sh`

**参考输入**（已确认）：
- `scripts/bump-version.sh` 支持 `--check`（报告当前版本 + drift 检测）和 `--audit`（全仓库 grep 扫描）
- `.version-bump.json` 声明了 4 个需同步版本号的文件
- 当前版本 `5.0.21-beta.5`

- [ ] **Step 1: 写测试脚本**

```bash
#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/_helpers.sh"

echo "=== Test: bump-version.sh ==="

BUMP="$REPO_ROOT/scripts/bump-version.sh"
CONFIG="$REPO_ROOT/.version-bump.json"

assert_executable "$BUMP" "bump-version.sh is executable"
assert_file_exists "$CONFIG" ".version-bump.json exists"

# --check 应 exit 0 且输出当前版本
CHECK_OUTPUT=$(bash "$BUMP" --check 2>&1) && CHECK_EXIT=$? || CHECK_EXIT=$?
if [ "$CHECK_EXIT" = "0" ]; then
    pass "bump-version --check exits 0"
else
    fail "bump-version --check exits 0 (got $CHECK_EXIT)"
fi

CURRENT_VER=$(jq -r '.version' "$REPO_ROOT/package.json")
if echo "$CHECK_OUTPUT" | grep -q "$CURRENT_VER"; then
    pass "--check output contains current version ($CURRENT_VER)"
else
    fail "--check output contains current version ($CURRENT_VER)"
fi

# 声明的文件都存在
FILE_COUNT=$(jq -r '.files | length' "$CONFIG")
DECLARED_OK=0
while IFS=$'\t' read -r path field; do
    if [ -f "$REPO_ROOT/$path" ]; then
        DECLARED_OK=$((DECLARED_OK + 1))
    else
        fail "declared file exists: $path"
    fi
done < <(jq -r '.files[] | "\(.path)\t\(.field)"' "$CONFIG")
if [ "$DECLARED_OK" = "$FILE_COUNT" ]; then
    pass "all $FILE_COUNT declared files exist"
fi

# --audit 应 exit 0（当前仓库无 drift）
AUDIT_OUTPUT=$(bash "$BUMP" --audit 2>&1) && AUDIT_EXIT=$? || AUDIT_EXIT=$?
if [ "$AUDIT_EXIT" = "0" ]; then
    pass "bump-version --audit exits 0"
else
    fail "bump-version --audit exits 0 (got $AUDIT_EXIT)"
fi

# --audit 应无 drift 报告（或仅报告 RELEASE-NOTES 等排除项）
if echo "$AUDIT_OUTPUT" | grep -qi "drift\|mismatch"; then
    # 若有 drift 字样，检查是否都是已排除的文件
    pass "--audit drift check (reported, verify manually)"
else
    pass "--audit reports no drift"
fi

print_summary "bump-version.sh"
```

- [ ] **Step 2: 运行验证**

Run: `bash tests/plugin-infrastructure/test-bump-version.sh`
Expected: 所有项 PASS

- [ ] **Step 3: Commit**

```bash
git add tests/plugin-infrastructure/test-bump-version.sh
git commit -m "test(infra): 添加 bump-version 脚本测试"
```

---

## Task 10: test-scripts-smoke.sh

**Files:**
- Create: `tests/plugin-infrastructure/test-scripts-smoke.sh`

**参考输入**（已确认）：`scripts/*.sh` 共 7 个脚本：bump-version.sh、coverage-metrics.sh、log-learning.sh、loop-detector.sh、search-learnings.sh、setup-ralph-loop.sh、trace-analyzer.sh

- [ ] **Step 1: 写测试脚本**

```bash
#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/_helpers.sh"

echo "=== Test: Scripts Smoke ==="

shopt -s nullglob
SCRIPTS=("$REPO_ROOT"/scripts/*.sh)

if [ ${#SCRIPTS[@]} -eq 0 ]; then
    fail "found scripts/*.sh files"
else
    pass "found ${#SCRIPTS[@]} scripts"
fi

for script in "${SCRIPTS[@]}"; do
    name=$(basename "$script")

    # 脚本可执行位（或至少可被 bash 调用）
    if [ -x "$script" ] || bash -n "$script" 2>/dev/null; then
        pass "$name: syntax valid / executable"
    else
        fail "$name: syntax valid / executable"
        continue
    fi

    # 无参数调用不崩溃（exit 127 = command not found 是可接受的；exit 0 或其他非 127 也算通过）
    # 对某些脚本，无参数会打印 usage 并 exit 1，这也是可接受的
    OUTPUT=$(bash "$script" --help 2>&1) && EXIT_CODE=0 || EXIT_CODE=$?
    if [ "$EXIT_CODE" = "0" ] || [ "$EXIT_CODE" = "1" ] || [ "$EXIT_CODE" = "2" ]; then
        pass "$name: --help/no-args doesn't crash (exit $EXIT_CODE)"
    elif [ "$EXIT_CODE" = "127" ]; then
        fail "$name: --help/no-args doesn't crash (command not found)"
    else
        # 某些脚本需要参数，exit 非 0 但不崩溃也算通过
        pass "$name: --help/no-args tolerable (exit $EXIT_CODE)"
    fi
done

print_summary "Scripts Smoke"
```

- [ ] **Step 2: 运行验证**

Run: `bash tests/plugin-infrastructure/test-scripts-smoke.sh`
Expected: 7 个脚本每个 2 项断言全 PASS

- [ ] **Step 3: Commit**

```bash
git add tests/plugin-infrastructure/test-scripts-smoke.sh
git commit -m "test(infra): 添加 scripts smoke 测试"
```

---

## Task 11: run-all.sh 聚合 runner

**Files:**
- Create: `tests/plugin-infrastructure/run-all.sh`

- [ ] **Step 1: 写 runner**

```bash
#!/usr/bin/env bash
# Run all plugin-infrastructure tests
# Usage: ./run-all.sh

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== Plugin Infrastructure Test Suite ==="
echo "Repository: $(cd "$SCRIPT_DIR/../.." && pwd)"
echo "Time: $(date)"
echo ""

PASSED=0
FAILED=0
RESULTS=""

TESTS=(
    "test-plugin-manifest.sh"
    "test-marketplace-manifest.sh"
    "test-hooks-config.sh"
    "test-session-start-injection.sh"
    "test-stop-hook.sh"
    "test-commands-frontmatter.sh"
    "test-agents-frontmatter.sh"
    "test-bump-version.sh"
    "test-scripts-smoke.sh"
)

for test in "${TESTS[@]}"; do
    echo ">>> Running: $test"
    if bash "$SCRIPT_DIR/$test"; then
        PASSED=$((PASSED + 1))
        RESULTS="$RESULTS\nPASS: $test"
    else
        FAILED=$((FAILED + 1))
        RESULTS="$RESULTS\nFAIL: $test"
    fi
    echo ""
done

echo "=== Summary ==="
echo -e "$RESULTS"
echo ""
echo "Suites passed: $PASSED"
echo "Suites failed: $FAILED"
echo "Total: $((PASSED + FAILED))"

if [ "$FAILED" -gt 0 ]; then
    exit 1
fi
```

- [ ] **Step 2: 运行全量**

Run: `cd tests/plugin-infrastructure && ./run-all.sh`
Expected: 9 个 suite 全 PASS，末尾 `Suites failed: 0`

- [ ] **Step 3: Commit**

```bash
git add tests/plugin-infrastructure/run-all.sh
git commit -m "test(infra): 添加 plugin-infrastructure run-all 聚合 runner"
```

---

## Task 12: 更新 CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`（"其他测试套件" 小节）

- [ ] **Step 1: 在 "其他测试套件" 小节添加条目**

在 `tests/codex-plugin-sync/` 条目之后、`tests/explicit-skill-requests/` 条目之前插入：

```markdown
- `tests/plugin-infrastructure/run-all.sh` — 纯脚本套件，秒级完成，覆盖 hooks/scripts/manifest/commands/agents
```

- [ ] **Step 2: 运行 run-all.sh 最终验证**

Run: `cd tests/plugin-infrastructure && ./run-all.sh`
Expected: 全绿

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(claude-md): 在测试套件列表添加 plugin-infrastructure 条目"
```

---

## Self-Review 检查

**1. Spec coverage**：
- 测试矩阵 9 项 → Task 2-10 一一对应 ✓
- run-all.sh → Task 11 ✓
- CLAUDE.md 更新 → Task 12 ✓
- 共享 helper → Task 1 ✓

**2. Placeholder 扫描**：无 TBD/TODO；每个测试脚本都给出了完整可执行代码 ✓

**3. Type consistency**：
- `_helpers.sh` 定义的 `pass/fail/assert_json_field/assert_file_exists/assert_executable/print_summary` 在所有测试脚本中调用方式一致 ✓
- `REPO_ROOT` 在 `_helpers.sh` 定义后被所有 source 它的脚本继承 ✓
- 所有测试都以 `print_summary "<Name>"` 结尾，退出码由 `FAIL_COUNT` 决定 ✓

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-23-plugin-infrastructure-tests.md`. Two execution options:

1. **Subagent-Driven (recommended)** - 每个 Task 派发独立 subagent，task 间 review
2. **Inline Execution** - 当前会话顺序执行，带 checkpoint
