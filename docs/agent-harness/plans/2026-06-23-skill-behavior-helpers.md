# Skill 行为测试套件 Implementation Plan（阶段二，第 1 批：基础设施 + helpers）

> **For agentic workers:** REQUIRED SUB-SKILL: Use agent-harness:subagent-driven-development (recommended) or agent-harness:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 28 个 skill 行为测试打地基——创建通用运行器 `run-skill.sh`、通用断言函数 `assert-skill-triggered.sh`，以及一个最简单的冒烟 skill（using-agent-harness）验证整个框架可用。

**Architecture:** 每个 skill 测试通过共享 helper 在独立 HOME + 工作目录下调用 `claude -p --output-format stream-json --verbose`，捕获完整 stream-json 输出到日志文件，调用方基于日志做 grep 断言。helper 用 `source` 引入而非子进程，保证变量可见。

**Tech Stack:** bash + stream-json + grep；复用 `tests/explicit-skill-requests/run-test.sh` 已验证的独立 HOME 模式；复用 `tests/claude-code/run-skill-tests.sh` 的 `timeout` fallback。

**Spec:** `docs/agent-harness/specs/2026-06-23-test-coverage-expansion-design.md`（阶段 2 部分）
**Contract:** `docs/agent-harness/contracts/skill-behavior-tests.contract.md`

---

## File Structure

| 文件 | 职责 |
|---|---|
| `tests/skill-behavior/_helpers/run-skill.sh` | 通用 headless 运行器：建独立目录、调 claude、落日志、暴露 `$LOG_FILE` |
| `tests/skill-behavior/_helpers/assert-skill-triggered.sh` | 断言函数库：`assert_skill_triggered`、`assert_output_contains`、`assert_no_premature_action` |
| `tests/skill-behavior/using-agent-harness/prompts/ask-about-skills.txt` | 冒烟 prompt |
| `tests/skill-behavior/using-agent-harness/run-test.sh` | 冒烟 skill 测试，验证整个框架 |

后续 3 批 plan 将基于本批的 helpers 继续补 27 个 skill。

---

## Task 1: 通用运行器 run-skill.sh

**Files:**
- Create: `tests/skill-behavior/_helpers/run-skill.sh`

**接口约定**：
```
source run-skill.sh
run_skill <skill-name> <prompt-file> [max-turns]
# 运行后 $LOG_FILE 指向 stream-json 日志路径
```

- [ ] **Step 1: 写 run-skill.sh**

```bash
#!/usr/bin/env bash
# Universal headless runner for skill-behavior tests.
# Usage (after `source`):
#   run_skill <skill-name> <prompt-file> [max-turns]
# After return, $LOG_FILE points to the captured stream-json log.

# macOS 兼容 timeout（复用 tests/claude-code/run-skill-tests.sh 的 fallback）
if ! command -v timeout &> /dev/null; then
    if command -v gtimeout &> /dev/null; then
        timeout() { gtimeout "$@"; }
    else
        timeout() {
            local dur="$1"; shift
            perl -e 'alarm shift @ARGV; exec @ARGV' "$dur" "$@"
        }
    fi
fi

# Resolve repo root (skill-behavior is three levels below root)
_HELPERS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_BEHAVIOR_DIR="$(cd "$_HELPERS_DIR/.." && pwd)"
REPO_ROOT="$(cd "$SKILL_BEHAVIOR_DIR/../.." && pwd)"

# check_claude_available: exit early if claude CLI missing
check_claude_available() {
    if ! command -v claude &> /dev/null; then
        echo "ERROR: Claude Code CLI not found. Install from https://code.claude.com" >&2
        exit 1
    fi
}

# run_skill <skill-name> <prompt-file> [max-turns]
run_skill() {
    local skill_name="$1"
    local prompt_file="$2"
    local max_turns="${3:-3}"

    check_claude_available

    if [ -z "$skill_name" ] || [ -z "$prompt_file" ] || [ ! -f "$prompt_file" ]; then
        echo "ERROR: run_skill <skill-name> <prompt-file> [max-turns]" >&2
        echo "  prompt_file '$prompt_file' missing or invalid" >&2
        exit 1
    fi

    local prompt
    prompt=$(cat "$prompt_file")

    local timestamp
    timestamp=$(date +%s)
    local output_dir="/tmp/agent-harness-tests/${timestamp}/skill-behavior/${skill_name}"
    mkdir -p "$output_dir"

    # 隔离 HOME 避免用户配置污染（参考 explicit-skill-requests/run-test.sh）
    local isolated_home
    isolated_home=$(mktemp -d)
    local project_dir
    project_dir=$(mktemp -d)

    LOG_FILE="$output_dir/claude-output.json"

    echo "=== Skill Behavior Test ===" >&2
    echo "Skill: $skill_name" >&2
    echo "Prompt file: $prompt_file" >&2
    echo "Max turns: $max_turns" >&2
    echo "Log: $LOG_FILE" >&2
    echo "" >&2

    cd "$project_dir"
    HOME="$isolated_home" timeout 300 claude -p "$prompt" \
        --plugin-dir "$REPO_ROOT" \
        --permission-mode bypassPermissions \
        --max-turns "$max_turns" \
        --output-format stream-json \
        --verbose \
        > "$LOG_FILE" 2>&1 || true

    cd "$SKILL_BEHAVIOR_DIR"
    # 注意：不清理 isolated_home 和 project_dir，供事后排查
    echo "Skill run complete. Log: $LOG_FILE" >&2
}

# Export LOG_FILE 让 source 方可见
export LOG_FILE
```

- [ ] **Step 2: 语法检查**

Run: `bash -n tests/skill-behavior/_helpers/run-skill.sh`
Expected: 无输出，exit 0

- [ ] **Step 3: Commit**

```bash
git add tests/skill-behavior/_helpers/run-skill.sh
git commit -m "test(skill-behavior): 添加通用 headless 运行器 run-skill.sh"
```

---

## Task 2: 通用断言函数 assert-skill-triggered.sh

**Files:**
- Create: `tests/skill-behavior/_helpers/assert-skill-triggered.sh`

**接口约定**（全部基于 `$LOG_FILE`）：
- `assert_skill_triggered <skill-name>` — Skill 工具被调用，且 skill 名匹配
- `assert_output_contains <pattern> [test-name]` — 日志中能 grep 到模式
- `assert_no_premature_action` — Skill 调用前无非 TodoWrite/system 的 tool_use
- `print_skill_summary <skill-name>` — 打印 PASS/FAIL 汇总

- [ ] **Step 1: 写 assert-skill-triggered.sh**

```bash
#!/usr/bin/env bash
# Assertion helpers for skill-behavior tests.
# Requires: $LOG_FILE set by run_skill before calling any assert.
# Usage (after `source`):
#   assert_skill_triggered "brainstorming"
#   assert_output_contains "design\|spec\|方案"
#   assert_no_premature_action
#   print_skill_summary "brainstorming"

SKILL_PASS_COUNT=0
SKILL_FAIL_COUNT=0
SKILL_CURRENT=""

_skill_pass() {
    echo "  [PASS] $1"
    SKILL_PASS_COUNT=$((SKILL_PASS_COUNT + 1))
}

_skill_fail() {
    echo "  [FAIL] $1"
    SKILL_FAIL_COUNT=$((SKILL_FAIL_COUNT + 1))
}

# assert_skill_triggered <skill-name>
assert_skill_triggered() {
    local skill="$1"
    SKILL_CURRENT="$skill"

    if [ -z "${LOG_FILE:-}" ] || [ ! -f "$LOG_FILE" ]; then
        _skill_fail "Skill '$skill' triggered (log missing: ${LOG_FILE:-unset})"
        return 1
    fi

    # 必须同时出现 "name":"Skill" 和 "skill":"agent-harness:<name>"
    if grep -q '"name":"Skill"' "$LOG_FILE" && \
       grep -q "\"skill\":\"agent-harness:${skill}\"" "$LOG_FILE"; then
        _skill_pass "Skill '$skill' triggered"
        return 0
    fi

    _skill_fail "Skill '$skill' triggered"
    echo "    Expected: \"name\":\"Skill\" + \"skill\":\"agent-harness:${skill}\"" >&2
    echo "    Actual skills in log:" >&2
    grep -o '"skill":"[^"]*"' "$LOG_FILE" 2>/dev/null | sort -u | head -10 >&2
    return 1
}

# assert_output_contains <pattern> [test-name]
assert_output_contains() {
    local pattern="$1"
    local name="${2:-output contains pattern}"

    if [ -z "${LOG_FILE:-}" ] || [ ! -f "$LOG_FILE" ]; then
        _skill_fail "$name (log missing)"
        return 1
    fi

    if grep -q "$pattern" "$LOG_FILE"; then
        _skill_pass "$name"
        return 0
    fi
    _skill_fail "$name (pattern: $pattern)"
    return 1
}

# assert_no_premature_action: Skill 调用前无非 TodoWrite/system 的 tool_use
assert_no_premature_action() {
    if [ -z "${LOG_FILE:-}" ] || [ ! -f "$LOG_FILE" ]; then
        _skill_fail "no premature action (log missing)"
        return 1
    fi

    local first_skill_line
    first_skill_line=$(grep -n '"name":"Skill"' "$LOG_FILE" | head -1 | cut -d: -f1)

    if [ -z "$first_skill_line" ]; then
        # 没有 Skill 调用，由 assert_skill_triggered 报告，这里跳过
        _skill_pass "no premature action (no skill call, skipped)"
        return 0
    fi

    # 检查 Skill 调用前是否有非 TodoWrite/system 的 tool_use
    local premature
    premature=$(head -n "$first_skill_line" "$LOG_FILE" \
        | grep '"type":"tool_use"' \
        | grep -v '"name":"Skill"' \
        | grep -v '"name":"TodoWrite"' \
        | grep -v '"name":"system"' \
        | head -3 || true)

    if [ -z "$premature" ]; then
        _skill_pass "no premature action before skill"
        return 0
    fi
    _skill_fail "no premature action before skill"
    echo "    Premature tool_use found:" >&2
    echo "$premature" | sed 's/^/      /' >&2
    return 1
}

# print_skill_summary <skill-name>
print_skill_summary() {
    local skill="$1"
    echo ""
    echo "=== $skill Summary ==="
    echo "Passed: $SKILL_PASS_COUNT"
    echo "Failed: $SKILL_FAIL_COUNT"
    if [ "$SKILL_FAIL_COUNT" -gt 0 ]; then
        echo "STATUS: FAILED"
        return 1
    fi
    echo "STATUS: PASSED"
    return 0
}
```

- [ ] **Step 2: 语法检查**

Run: `bash -n tests/skill-behavior/_helpers/assert-skill-triggered.sh`
Expected: 无输出，exit 0

- [ ] **Step 3: Commit**

```bash
git add tests/skill-behavior/_helpers/assert-skill-triggered.sh
git commit -m "test(skill-behavior): 添加通用断言函数 assert-skill-triggered.sh"
```

---

## Task 3: 冒烟 skill — using-agent-harness

**Files:**
- Create: `tests/skill-behavior/using-agent-harness/prompts/ask-about-skills.txt`
- Create: `tests/skill-behavior/using-agent-harness/run-test.sh`

**目的**：用一个最简单的 skill 验证整个 helpers 框架能跑通。using-agent-harness 是会话启动时自动加载的入门 skill，最容易触发。

- [ ] **Step 1: 写 prompt**

`tests/skill-behavior/using-agent-harness/prompts/ask-about-skills.txt`:

```
What skills are available in this project? How should I use the agent-harness skills system?
```

- [ ] **Step 2: 写 run-test.sh**

```bash
#!/usr/bin/env bash
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../_helpers/run-skill.sh"
source "$SCRIPT_DIR/../_helpers/assert-skill-triggered.sh"

echo "=== Test: using-agent-harness ==="
echo ""

run_skill "using-agent-harness" "$SCRIPT_DIR/prompts/ask-about-skills.txt" 3

assert_skill_triggered "using-agent-harness"
assert_no_premature_action
assert_output_contains "skill\|Skill" "output mentions skills"

print_skill_summary "using-agent-harness"
```

- [ ] **Step 3: 赋可执行位并实际运行**

Run:
```bash
chmod +x tests/skill-behavior/using-agent-harness/run-test.sh
bash tests/skill-behavior/using-agent-harness/run-test.sh
```
Expected: skill 触发断言 PASS，末尾 `STATUS: PASSED`

> **注意**：using-agent-harness 的 description 是 "Use when starting any conversation"，触发率非常高。如果这个 skill 都不能触发，说明 helper 框架有问题，必须先修好。

- [ ] **Step 4: 若失败，排查并调优**

如果 `assert_skill_triggered` 失败：
1. 查看 `$LOG_FILE`（运行时会打印路径）确认 claude 是否真的运行
2. 检查日志中实际触发的 skill 列表：`grep -o '"skill":"[^"]*"' $LOG_FILE | sort -u`
3. 如果 claude 完全没调用 Skill 工具，可能是 prompt 不够明确，改成 "Use the agent-harness skills system to help me understand what's available"

如果 `assert_no_premature_action` 失败：
- 检查日志中 premature 的 tool_use 内容，如果是 Read 之类的探查性工具，可在 prompt 里更明确地要求先调用 skill

- [ ] **Step 5: Commit**

```bash
git add tests/skill-behavior/using-agent-harness/
git commit -m "test(skill-behavior): 添加 using-agent-harness 冒烟测试"
```

---

## Task 4: 更新 CLAUDE.md（skill-behavior 条目占位）

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: 在 "其他测试套件" 小节添加 skill-behavior 条目**

在 `tests/subagent-driven-dev/` 条目之后追加：

```markdown
- `tests/skill-behavior/` — 28 个 skill 的 headless 行为测试（依赖 `claude -p` + Claude API 配额，全量运行约 15-40 分钟；单 skill 可独立运行 `cd tests/skill-behavior/<skill> && ./run-test.sh`）
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(claude-md): 在测试套件列表添加 skill-behavior 条目"
```

---

## Self-Review 检查

**1. Spec coverage**：
- 通用运行器 → Task 1 ✓
- 通用断言函数 → Task 2 ✓
- 至少一个 skill 跑通验证框架 → Task 3（using-agent-harness）✓
- CLAUDE.md 更新 → Task 4 ✓

**2. Placeholder 扫描**：无 TBD/TODO；helper 和 run-test.sh 都给了完整代码 ✓

**3. Type consistency**：
- `run_skill` 设置 `$LOG_FILE`，所有 `assert_*` 函数依赖 `$LOG_FILE` ✓
- `SKILL_PASS_COUNT` / `SKILL_FAIL_COUNT` 在 helper 内定义，每个 run-test.sh 独立 source，互不污染 ✓
- `print_skill_summary` 在每个 run-test.sh 末尾调用，返回退出码供 CI 判断 ✓

**4. 与后续 3 批 plan 的衔接**：
- 本批建立的 `_helpers/run-skill.sh` 和 `assert-skill-triggered.sh` 是后续所有 skill 测试的基础
- 后续每批 plan 的每个 skill 只需：写 prompt + 写 5-10 行 run-test.sh（source 两个 helper + 调用 assert）
- 本批完成后，contract 的"helpers 存在 + 框架可用"两条 DoD 满足；剩余 27 skill 在后续 3 批完成

---

## Execution Handoff

Plan complete and saved to `docs/agent-harness/plans/2026-06-23-skill-behavior-helpers.md`. 本批是后续 3 批 skill 测试的基础设施，建议用 Subagent-Driven 模式逐 task 推进，尤其 Task 3 需要实际 headless 运行验证。
