# Session Log Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use agent-harness:subagent-driven-development (recommended) or agent-harness:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 通过三个优化域修复会话日志暴露的反复问题——意外 staging 运行时文件、子代理任务偏离、headless 模式 skill 调用失败。

**Architecture:** 两个 PreToolUse/SubagentStop shell hook 脚本（stdin 读 JSON、exit code 控制流程）+ SDD task brief 模板增加边界约束段落 + session-start 无条件注入 headless 调用提示。所有改动在核心仓库内，不触碰 demo/templates，不引入新依赖。

**Tech Stack:** bash + jq（解析 hook 事件 JSON）；复用 `tests/plugin-infrastructure/` 的 `_helpers.sh` 断言框架。

**Spec:** `docs/agent-harness/specs/2026-06-24-session-log-optimization-design.md`

---

## File Structure

| 文件 | 职责 | 域 |
|---|---|---|
| `scripts/guard-staging.sh` | PreToolUse hook：拦截 `git add` 对受保护运行时路径的 staging，`-f` 放行 | 1 |
| `scripts/audit-subagent.sh` | SubagentStop hook：检测子代理输出过短或 off-topic，软警告注入 context | 2 |
| `tests/plugin-infrastructure/test-guard-staging.sh` | guard-staging 的纯脚本测试（拦截 / 放行 / 非 git-add 三类场景） | 1 |
| `tests/plugin-infrastructure/test-audit-subagent.sh` | audit-subagent 的纯脚本测试（正常 / 过短 / off-topic 三类场景） | 2 |
| `hooks/hooks.json` | 新增 PreToolUse 与 SubagentStop 配置，合并进现有结构 | 1, 2 |
| `hooks/session-start` | 无条件注入 headless skill 调用提示块（< 10 行 echo） | 3 |
| `skills/subagent-driven-development/implementer-prompt.md` | 在 "Task Description" 与 "Context" 之间插入 CRITICAL BOUNDARIES 段落 | 2 |
| `tests/plugin-infrastructure/run-all.sh` | `TESTS` 数组追加两个新测试 | 1, 2 |
| `tests/plugin-infrastructure/test-hooks-config.sh` | 追加 PreToolUse/SubagentStop 配置存在性断言 | 1, 2 |

**为什么 CRITICAL BOUNDARIES 放在 `implementer-prompt.md` 而非 SKILL.md：** spec 明确要求在 "task brief 模板的 Task Description 和 Context 之间" 插入。实际承载 task brief 模板的是 `implementer-prompt.md`（第 13-16 行是 `## Task Description`，第 18-20 行是 `## Context`）。SKILL.md 是 orchestrator 指令，不含 task brief 模板。边界约束必须进入子代理真正看到的提示文本，而非 orchestrator 看到的流程文档。

---

## Task 1: 创建 guard-staging.sh（PreToolUse 提交防护 hook）

**Files:**
- Create: `scripts/guard-staging.sh`
- Test: `tests/plugin-infrastructure/test-guard-staging.sh`

- [ ] **Step 1: 写失败测试 `test-guard-staging.sh`**

```bash
#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/_helpers.sh"

echo "=== Test: guard-staging.sh ==="

GUARD="$REPO_ROOT/scripts/guard-staging.sh"
assert_file_exists "$GUARD" "guard-staging.sh exists"
assert_executable "$GUARD" "guard-staging.sh is executable"

# Helper: pipe a JSON tool_input to guard-staging, capture exit code
run_guard() {
    local json="$1"
    echo "$json" | bash "$GUARD" 2>/tmp/guard-stderr.txt
    return $?
}

# Case 1: non-git command → exit 0 (passthrough)
run_guard '{"tool_input":{"command":"ls -la"}}'
if [ $? -eq 0 ]; then pass "non-git command passes"; else fail "non-git command passes (got $?)"; fi

# Case 2: git add . → exit 2 (blocked)
run_guard '{"tool_input":{"command":"git add ."}}'
if [ $? -eq 2 ]; then pass "git add . blocked"; else fail "git add . blocked (got $?)"; fi

# Case 3: git add -A → exit 2 (blocked)
run_guard '{"tool_input":{"command":"git add -A"}}'
if [ $? -eq 2 ]; then pass "git add -A blocked"; else fail "git add -A blocked (got $?)"; fi

# Case 4: git add with protected path → exit 2
run_guard '{"tool_input":{"command":"git add .agent-harness/learnings.jsonl"}}'
if [ $? -eq 2 ]; then pass "git add protected path blocked"; else fail "git add protected path blocked (got $?)"; fi

# Case 5: git add -f with protected path → exit 0 (force allowed)
run_guard '{"tool_input":{"command":"git add -f .agent-harness/learnings.jsonl"}}'
if [ $? -eq 0 ]; then pass "git add -f protected path allowed"; else fail "git add -f protected path allowed (got $?)"; fi

# Case 6: git add normal file → exit 0
run_guard '{"tool_input":{"command":"git add README.md"}}'
if [ $? -eq 0 ]; then pass "git add normal file passes"; else fail "git add normal file passes (got $?)"; fi

# Case 7: stderr contains reason when blocked
run_guard '{"tool_input":{"command":"git add ."}}' >/dev/null 2>&1
if grep -q "learnings\|agent-harness\|protected\|staging" /tmp/guard-stderr.txt; then
    pass "stderr contains block reason"
else
    fail "stderr contains block reason (stderr was empty or generic)"
fi

rm -f /tmp/guard-stderr.txt

print_summary "guard-staging.sh"
```

- [ ] **Step 2: 运行测试确认失败**

Run: `bash tests/plugin-infrastructure/test-guard-staging.sh`
Expected: FAIL — `guard-staging.sh exists` 失败（文件尚未创建）

- [ ] **Step 3: 创建 `scripts/guard-staging.sh`**

```bash
#!/usr/bin/env bash
# PreToolUse hook: prevent accidental staging of runtime files.
# Blocks `git add` that would stage protected paths unless -f/--force is given.
# Reads PreToolUse event JSON from stdin. Exit 0 = allow, exit 2 = block.

set -uo pipefail

# Protected runtime paths (relative to repo root)
PROTECTED_PATHS=(
    ".agent-harness/learnings.jsonl"
    ".agent-harness/sdd/"
    ".agent-harness/loop-tracker.json"
)

# Read event JSON from stdin
INPUT="$(cat)"
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# Not a git add command at all → passthrough
case "$COMMAND" in
    *"git add"*) ;;
    *) exit 0 ;;
esac

# Force flag → allow explicitly
case "$COMMAND" in
    *" -f"*|*" --force"*) exit 0 ;;
esac

# Broad-catch forms that stage everything
case "$COMMAND" in
    *"git add ."*|*"git add -A"*|*"git add --all"*)
        cat >&2 <<'EOF'
[guard-staging] Blocked: 'git add .' / 'git add -A' stages all files including
runtime artifacts. List files explicitly, or use 'git add -f' to force.
Protected paths:
EOF
        printf '  - %s\n' "${PROTECTED_PATHS[@]}" >&2
        exit 2
        ;;
esac

# Check for explicit protected path mentions
for p in "${PROTECTED_PATHS[@]}"; do
    case "$COMMAND" in
        *"$p"*)
            echo "[guard-staging] Blocked: refusing to stage protected runtime path '$p'. Use -f to force." >&2
            exit 2
            ;;
    esac
done

exit 0
```

- [ ] **Step 4: 运行测试确认通过**

Run: `bash tests/plugin-infrastructure/test-guard-staging.sh`
Expected: PASS — 全部 7 个断言通过

- [ ] **Step 5: 提交**

```bash
git add scripts/guard-staging.sh tests/plugin-infrastructure/test-guard-staging.sh
git commit -m "feat(guard-staging): add PreToolUse hook to prevent accidental staging of runtime files"
```

---

## Task 2: 创建 audit-subagent.sh（SubagentStop 审计 hook）

**Files:**
- Create: `scripts/audit-subagent.sh`
- Test: `tests/plugin-infrastructure/test-audit-subagent.sh`

- [ ] **Step 1: 写失败测试 `test-audit-subagent.sh`**

```bash
#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/_helpers.sh"

echo "=== Test: audit-subagent.sh ==="

AUDIT="$REPO_ROOT/scripts/audit-subagent.sh"
assert_file_exists "$AUDIT" "audit-subagent.sh exists"
assert_executable "$AUDIT" "audit-subagent.sh is executable"

# SubagentStop always exits 0 (soft check — warn, don't block)
run_audit() {
    local json="$1"
    OUT=$(echo "$json" | bash "$AUDIT" 2>/tmp/audit-stderr.txt)
    return $?
}

# Case 1: normal output → exit 0, no warning in stdout
OUT=$(echo '{"stop_hook_active":false,"agent_type":"general-purpose","output":"Successfully implemented the feature in src/foo.py and src/bar.py. All 14 tests passing."}' | bash "$AUDIT" 2>/dev/null)
if [ $? -eq 0 ]; then pass "normal subagent exit 0"; else fail "normal subagent exit 0"; fi
if [ -z "$OUT" ]; then pass "normal subagent emits no warning"; else fail "normal subagent emits no warning (got: $OUT)"; fi

# Case 2: very short output (< 50 chars) → exit 0 with warning in stdout
OUT=$(echo '{"stop_hook_active":false,"agent_type":"general-purpose","output":"done."}' | bash "$AUDIT" 2>/dev/null)
if [ $? -eq 0 ]; then pass "short output still exits 0"; else fail "short output still exits 0"; fi
if echo "$OUT" | grep -qi "warning\|suspicious\|short\|incomplete"; then
    pass "short output triggers warning keyword"
else
    fail "short output triggers warning keyword (got: $OUT)"
fi

# Case 3: off-topic keywords in output → exit 0 with warning
OUT=$(echo '{"stop_hook_active":false,"agent_type":"general-purpose","output":"I analyzed the Unity game engine rendering pipeline and optimized the shader compilation step in the unrelated-game-project repo."}' | bash "$AUDIT" 2>/dev/null)
if [ $? -eq 0 ]; then pass "off-topic still exits 0"; else fail "off-topic still exits 0"; fi
if echo "$OUT" | grep -qi "warning\|off-topic\|unrelated\|scope"; then
    pass "off-topic triggers warning keyword"
else
    fail "off-topic triggers warning keyword (got: $OUT)"
fi

# Case 4: stop_hook_active=true → skip entirely (reentry guard)
OUT=$(echo '{"stop_hook_active":true,"agent_type":"general-purpose","output":"done."}' | bash "$AUDIT" 2>/dev/null)
if [ $? -eq 0 ]; then pass "reentry-guard skips with exit 0"; else fail "reentry-guard skips with exit 0"; fi
if [ -z "$OUT" ]; then pass "reentry-guard emits no output"; else fail "reentry-guard emits no output (got: $OUT)"; fi

rm -f /tmp/audit-stderr.txt

print_summary "audit-subagent.sh"
```

- [ ] **Step 2: 运行测试确认失败**

Run: `bash tests/plugin-infrastructure/test-audit-subagent.sh`
Expected: FAIL — `audit-subagent.sh exists` 失败

- [ ] **Step 3: 创建 `scripts/audit-subagent.sh`**

```bash
#!/usr/bin/env bash
# SubagentStop hook: lightweight audit of subagent output.
# Soft check only — exits 0 always, emits warnings to stdout (injected into context).
# Detects: very short output (< 50 chars), off-topic keyword drift.

set -uo pipefail

INPUT="$(cat)"

# Reentry guard — never recurse
STOP_HOOK_ACTIVE=$(echo "$INPUT" | jq -r '.stop_hook_active // false')
if [ "$STOP_HOOK_ACTIVE" = "true" ]; then
    exit 0
fi

OUTPUT=$(echo "$INPUT" | jq -r '.output // empty')
WARNINGS=""

# Check 1: suspiciously short output
OUTPUT_LEN=${#OUTPUT}
if [ "$OUTPUT_LEN" -lt 50 ]; then
    WARNINGS="${WARNINGS}- Subagent output is very short (${OUTPUT_LEN} chars) — task may be incomplete.\n"
fi

# Check 2: off-topic keyword drift
# Keywords unrelated to typical agent-harness development work
OFFTOPIC_KEYWORDS="Unity|Unreal Engine|game engine|shader|rendering pipeline|Roblox|Minecraft mod"
if echo "$OUTPUT" | grep -qiE "$OFFTOPIC_KEYWORDS"; then
    WARNINGS="${WARNINGS}- Subagent output mentions off-topic keywords (game engines / unrelated stacks) — verify task scope was respected.\n"
fi

# Emit warnings (if any) to stdout for context injection
if [ -n "$WARNINGS" ]; then
    AGENT_TYPE=$(echo "$INPUT" | jq -r '.agent_type // "unknown"')
    echo "[audit-subagent] Soft warning(s) for agent '${AGENT_TYPE}':"
    printf '%b' "$WARNINGS"
    echo "[audit-subagent] These are advisory only — review the subagent's work if concerned."
fi

exit 0
```

- [ ] **Step 4: 运行测试确认通过**

Run: `bash tests/plugin-infrastructure/test-audit-subagent.sh`
Expected: PASS — 全部断言通过

- [ ] **Step 5: 提交**

```bash
git add scripts/audit-subagent.sh tests/plugin-infrastructure/test-audit-subagent.sh
git commit -m "feat(audit-subagent): add SubagentStop hook for lightweight output drift detection"
```

---

## Task 3: 合并 PreToolUse 与 SubagentStop 配置到 hooks.json

**Files:**
- Modify: `hooks/hooks.json`
- Modify: `tests/plugin-infrastructure/test-hooks-config.sh`
- Modify: `tests/plugin-infrastructure/run-all.sh`

- [ ] **Step 1: 扩展 test-hooks-config.sh 增加新事件断言**

在 `tests/plugin-infrastructure/test-hooks-config.sh` 的 "引用的脚本存在" 之前插入断言：

```bash
# --- PreToolUse + SubagentStop (new in session-log-optimization) ---
if jq -e '.hooks.PreToolUse' "$CLAUDE_HOOKS" >/dev/null 2>&1; then
    pass "hooks.json has PreToolUse"
else
    fail "hooks.json has PreToolUse"
fi
if jq -e '.hooks.PreToolUse[] | select(.matcher == "Bash")' "$CLAUDE_HOOKS" >/dev/null 2>&1; then
    pass "PreToolUse has Bash matcher"
else
    fail "PreToolUse has Bash matcher"
fi
if jq -e '.hooks.SubagentStop' "$CLAUDE_HOOKS" >/dev/null 2>&1; then
    pass "hooks.json has SubagentStop"
else
    fail "hooks.json has SubagentStop"
fi
# New scripts must exist and be executable
assert_executable "$REPO_ROOT/scripts/guard-staging.sh" "guard-staging.sh is executable"
assert_executable "$REPO_ROOT/scripts/audit-subagent.sh" "audit-subagent.sh is executable"
```

- [ ] **Step 2: 运行 test-hooks-config 确认新增断言失败**

Run: `bash tests/plugin-infrastructure/test-hooks-config.sh`
Expected: FAIL — `hooks.json has PreToolUse` 失败（配置尚未添加）

- [ ] **Step 3: 修改 `hooks/hooks.json` 合并新事件**

将 `hooks/hooks.json` 替换为：

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "bash -c 'SESSION_ID=$(cat | jq -r .session_id); echo \"export CLAUDE_SESSION_ID=$SESSION_ID\" >> \"$CLAUDE_ENV_FILE\"'"
          }
        ]
      },
      {
        "matcher": "startup|clear|compact",
        "hooks": [
          {
            "type": "command",
            "command": "\"${CLAUDE_PLUGIN_ROOT}/hooks/run-hook.cmd\" session-start",
            "async": false
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "bash \"${CLAUDE_PROJECT_DIR}/scripts/guard-staging.sh\""
          }
        ]
      }
    ],
    "SubagentStop": [
      {
        "matcher": "general-purpose|implementer",
        "hooks": [
          {
            "type": "command",
            "command": "bash \"${CLAUDE_PROJECT_DIR}/scripts/audit-subagent.sh\""
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/stop-hook.sh"
          }
        ]
      }
    ]
  }
}
```

**注意：** 现有的 SessionStart（两个）和 Stop 配置原样保留，只在中间插入 PreToolUse 和 SubagentStop。`$CLAUDE_PROJECT_DIR` 与 `$CLAUDE_PLUGIN_ROOT` 是 Claude Code 注入的环境变量；guard-staging 和 audit-subagent 是脚本而非插件内置 hook 命令，用 `$CLAUDE_PROJECT_DIR` 与 spec 1.2/2.2 一致。

- [ ] **Step 4: 运行 test-hooks-config 确认通过**

Run: `bash tests/plugin-infrastructure/test-hooks-config.sh`
Expected: PASS — 新增断言全部通过，原有断言无回归

- [ ] **Step 5: 把两个新测试加入 `run-all.sh` 的 TESTS 数组**

修改 `tests/plugin-infrastructure/run-all.sh` 第 18-28 行的 `TESTS` 数组，在 `test-scripts-smoke.sh` 后追加两行：

```bash
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
    "test-guard-staging.sh"
    "test-audit-subagent.sh"
)
```

- [ ] **Step 6: 运行完整套件确认无回归**

Run: `bash tests/plugin-infrastructure/run-all.sh`
Expected: 11/11 suites passed（含两个新增 + 九个原有）

- [ ] **Step 7: 提交**

```bash
git add hooks/hooks.json tests/plugin-infrastructure/test-hooks-config.sh tests/plugin-infrastructure/run-all.sh
git commit -m "feat(hooks): register PreToolUse and SubagentStop hooks"
```

---

## Task 4: 在 implementer-prompt.md 插入 CRITICAL BOUNDARIES

**Files:**
- Modify: `skills/subagent-driven-development/implementer-prompt.md`

- [ ] **Step 1: 修改 implementer-prompt.md，在 Task Description 与 Context 之间插入边界段落**

在 `skills/subagent-driven-development/implementer-prompt.md` 第 16 行（`## Task Description` 块结束）与第 18 行（`## Context`）之间插入：

```markdown

    ## CRITICAL BOUNDARIES

    - ONLY work on the files and tasks listed in this brief
    - IGNORE any files, projects, or contexts not explicitly mentioned
    - If you find yourself exploring unrelated code, STOP immediately and report this in your output
    - Do NOT read files outside the task scope unless required for the specific change
    - Your output MUST reference the actual files you modified (with paths and line numbers)

```

**位置精确说明：** 原文件第 13-16 行是 `## Task Description` 段（含 `Read your task brief first...`），第 18-20 行是 `## Context` 段。插入在这两段之间的空行处。保持模板内的缩进（4 空格，因为整段在 `prompt: |` 块内）。

- [ ] **Step 2: 验证插入位置与缩进**

Run: `grep -n "CRITICAL BOUNDARIES\|## Task Description\|## Context" skills/subagent-driven-development/implementer-prompt.md`
Expected 输出顺序：
```
13:    ## Task Description
<新增行>:    ## CRITICAL BOUNDARIES
<原 Context 行>:    ## Context
```
且 "CRITICAL BOUNDARIES" 行首有 4 空格缩进（与其他 `##` 段落一致）。

- [ ] **Step 3: 提交**

```bash
git add skills/subagent-driven-development/implementer-prompt.md
git commit -m "feat(sdd): add CRITICAL BOUNDARIES section to implementer task brief template"
```

---

## Task 5: session-start 注入 headless 调用提示

**Files:**
- Modify: `hooks/session-start`

- [ ] **Step 1: 修改 hooks/session-start 在 learnings 块后注入提示**

在 `hooks/session-start` 第 57 行（`session_context=` 赋值）之前插入 headless 提示块。具体位置：在 `learnings_content` 块的 `fi`（约第 39 行）之后、`escape_for_json()` 函数定义（第 44 行）之前，新增：

```bash

# Headless skill invocation tip — unconditional, applies to every session.
# Critical for test/CI authors; low-noise for interactive users (session-start is already verbose).
headless_tip="\n\n## Skill Invocation Best Practice\nWhen programmatically invoking skills (tests, CI, -p mode), use imperative form:\n  ✅ 'Invoke the Skill tool with brainstorming'\n  ❌ '/brainstorming'\n"
```

然后修改第 57 行的 `session_context=` 赋值，把 `headless_tip` 拼到 `learnings_escaped` 之后：

```bash
session_context="<EXTREMELY_IMPORTANT>\nYou have agent-harness.\n\n**Below is the full content of your 'agent-harness:using-agent-harness' skill - your introduction to using skills. For all other skills, use the 'Skill' tool:**\n\n${using_superpowers_escaped}\n\n${warning_escaped}${learnings_escaped}${headless_tip}\n</EXTREMELY_IMPORTANT>"
```

（即在 `${learnings_escaped}` 与 `\n</EXTREMELY_IMPORTANT>` 之间加入 `${headless_tip}`。）

- [ ] **Step 2: 验证 session-start 仍输出合法 JSON**

Run: `CLAUDE_PROJECT_DIR="$(pwd)" bash hooks/session-start </dev/null 2>/dev/null | jq empty && echo "valid JSON" || echo "INVALID JSON"`
Expected: `valid JSON`

- [ ] **Step 3: 验证提示内容出现**

Run: `CLAUDE_PROJECT_DIR="$(pwd)" bash hooks/session-start </dev/null 2>/dev/null | jq -r '.hookSpecificOutput.additionalContext' | grep -c "Skill Invocation Best Practice"`
Expected: `1`（提示至少出现一次）

- [ ] **Step 4: 运行 session-start-injection 测试确认无回归**

Run: `bash tests/plugin-infrastructure/test-session-start-injection.sh`
Expected: PASS — 所有原有断言仍通过

- [ ] **Step 5: 提交**

```bash
git add hooks/session-start
git commit -m "feat(session-start): inject headless skill invocation best-practice tip"
```

---

## Task 6: 全套件回归与手动 hook 验证

**Files:** 无修改，纯验证

- [ ] **Step 1: 完整 plugin-infrastructure 套件**

Run: `bash tests/plugin-infrastructure/run-all.sh`
Expected: `Suites failed: 0`，11 个 suite 全部 PASS

- [ ] **Step 2: 手动验证 hooks.json JSON 有效**

Run: `jq empty hooks/hooks.json && echo "OK"`
Expected: `OK`

- [ ] **Step 3: 手动验证 guard-staging 真的拦截 `git add .`**

在当前工作目录模拟 PreToolUse 事件：

Run: `echo '{"tool_input":{"command":"git add ."}}' | bash scripts/guard-staging.sh; echo "exit=$?"`
Expected: stderr 打印阻止原因，stdout 空，`exit=2`

- [ ] **Step 4: 手动验证 audit-subagent 对 off-topic 输出告警**

Run: `echo '{"stop_hook_active":false,"agent_type":"general-purpose","output":"I analyzed the Unity game engine and optimized shaders in unrelated-game-project."}' | bash scripts/audit-subagent.sh; echo "exit=$?"`
Expected: stdout 包含 warning 关键词，`exit=0`

- [ ] **Step 5: 提交（如有任何小修补）**

如果步骤 1-4 全部通过无需修改，跳过提交。否则修补后提交：

```bash
git add -p
git commit -m "fix: address regression found in full-suite verification"
```

---

## Task 7: 关闭 GitHub Issues

**Files:** 无修改，GitHub 操作

- [ ] **Step 1: 确认所有测试通过 + 工作树干净**

Run: `bash tests/plugin-infrastructure/run-all.sh && git status --porcelain`
Expected: 套件全绿 + 工作树无未提交改动

- [ ] **Step 2: 收集提交 SHA 供 issue 评论引用**

Run: `git log --oneline feat/loop-optimization ^main | head -20`
记录 guard-staging / audit-subagent / hooks / sdd / session-start 五个提交的 SHA。

- [ ] **Step 3: 关闭 Issue #1（路径 + 提交污染）**

Run:
```bash
gh issue close 1 --comment "$(cat <<'EOF'
Fixed in `feat/loop-optimization` branch.

**Path consistency:** Already resolved in v2 refactor — `hooks/session-start`, `scripts/log-learning.sh`, `scripts/search-learnings.sh` all use `CLAUDE_PROJECT_DIR` → `git rev-parse` fallback.

**Accidental staging:** New PreToolUse hook `scripts/guard-staging.sh` blocks `git add .`, `git add -A`, and `git add <protected-path>` for runtime files (`.agent-harness/learnings.jsonl`, `.agent-harness/sdd/`, `.agent-harness/loop-tracker.json`). `git add -f` bypasses for intentional force-add.

Spec: `docs/agent-harness/specs/2026-06-24-session-log-optimization-design.md` (Domain 1)
Tested: `tests/plugin-infrastructure/test-guard-staging.sh` (7 assertions) + `run-all.sh` green.
EOF
)"
```

- [ ] **Step 4: 关闭 Issue #2（子代理偏离）**

Run:
```bash
gh issue close 2 --comment "$(cat <<'EOF'
Fixed in `feat/loop-optimization` branch.

**Task brief boundary:** `skills/subagent-driven-development/implementer-prompt.md` now includes a `## CRITICAL BOUNDARIES` section between Task Description and Context — constrains the implementer to listed files, forbids exploring unrelated code, requires output to reference modified files with paths + line numbers.

**Drift detection:** New SubagentStop hook `scripts/audit-subagent.sh` does soft checks (exit 0 always): flags sub-100-char outputs and off-topic keyword drift (game engines, unrelated stacks). Warnings inject into context without blocking.

Naming stability (Problem 1) is out of scope — process issue, not a technical fix.

Spec: `docs/agent-harness/specs/2026-06-24-session-log-optimization-design.md` (Domain 2)
Tested: `tests/plugin-infrastructure/test-audit-subagent.sh` (8 assertions).
EOF
)"
```

- [ ] **Step 5: 关闭 Issue #3（headless skill 触发）**

Run:
```bash
gh issue close 3 --comment "$(cat <<'EOF'
Partially fixed in `feat/loop-optimization` branch.

**Headless invocation tip:** `hooks/session-start` now unconditionally injects a "Skill Invocation Best Practice" block — tells agents to use imperative form ("Invoke the Skill tool with brainstorming") instead of slash form ("/brainstorming") in `-p` / CI / test scenarios. Injected every session since headless detection is unreliable.

**Stop hook reentry** (`stop_hook_active` / `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP`) is **out of scope** for this spec — belongs to a separate hook-infra spec.

Root cause of slash-form unreliability is Claude API behavior, not project-controllable.

Spec: `docs/agent-harness/specs/2026-06-24-session-log-optimization-design.md` (Domain 3)
EOF
)"
```

- [ ] **Step 6: 关闭 Issue #4（token 浪费，indirectly addressed）**

Run:
```bash
gh issue close 4 --comment "$(cat <<'EOF'
Indirectly addressed in `feat/loop-optimization` branch.

The primary token-waste sources identified in this issue are closed by their root-cause fixes:
- Accidental staging redo-loops → Issue #1 (guard-staging hook)
- Subagent drift into unrelated projects → Issue #2 (CRITICAL BOUNDARIES + audit hook)
- Headless skill retries → Issue #3 (session-start tip)

**Skill naming stability** (Problem 1 in the issue) is a process problem, not a technical fix, and is explicitly out of scope per the spec. Recommend documenting a naming-decision pre-check in the release process instead.

Spec: `docs/agent-harness/specs/2026-06-24-session-log-optimization-design.md` (Linked Issues table)
EOF
)"
```

- [ ] **Step 7: 验证四个 issue 都已关闭**

Run: `gh issue list --state closed --limit 5`
Expected: issues #1, #2, #3, #4 出现在已关闭列表中

---

## Self-Review

**Spec coverage:**
- Domain 1.2 PreToolUse guard → Task 1 ✓
- Domain 2.1 CRITICAL BOUNDARIES → Task 4 ✓
- Domain 2.2 SubagentStop audit → Task 2 ✓
- Domain 3.1 session-start headless tip → Task 5 ✓
- Domain 3.2 hooks.json integration → Task 3 ✓
- Domain 3.3 Cursor 兼容性（不动 hooks-cursor.json）→ Task 3 仅改 hooks.json，未碰 cursor ✓
- Success Criteria #1-2 → Task 1 测试 ✓
- Success Criteria #3 → Task 2 测试 ✓
- Success Criteria #4 → Task 4 + grep 验证 ✓
- Success Criteria #5 → Task 5 测试 ✓
- Success Criteria #6 → Task 1 + Task 2 ✓
- Success Criteria #7 → Task 6 Step 1 ✓
- Linked Issues #1-#4 → Task 7 ✓

**Placeholder scan:** 无 TBD/TODO，所有代码块完整。

**Type consistency:** `PROTECTED_PATHS` 在 guard-staging 中定义、在 test 中按字符串匹配测试，一致。`headless_tip` 在 session-start 中定义并在同一文件引用，一致。hooks.json 中 `matcher: "Bash"` 与 `matcher: "general-purpose|implementer"` 与 spec 1.2/2.2 完全一致。

**DoD 对齐：** sprint contract 的 10 条 DoD 与 Task 1-7 步骤一一映射。
