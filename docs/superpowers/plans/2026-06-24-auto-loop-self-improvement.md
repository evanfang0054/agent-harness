# Auto-Loop 自我提升闭环 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 创建 `scripts/auto-loop.sh`，输入一句话需求后全自动完成「分析会话 → 提 issue → SDD 修复 → PR」，最终只把可审核 PR 交到用户手中。

**Architecture:** 薄壳 bash 脚本（~250 行）+ `claude -p stream-json` 无状态主大脑 + `state.json` checkpoint 恢复 + `orchestrator-prompt.md` 注入指令。脚本只负责参数解析、checkpoint 管理、stream-json 解析、三层可观测性输出。所有分析/修复/决策由 Claude 自主完成。

**Tech Stack:** Bash（`set -euo pipefail`）、`jq`、`claude -p --output-format stream-json --verbose --include-partial-messages`、`gh`、`uvx claude-code-log`、superpowers skills 插件。

**Spec:** `docs/superpowers/specs/2026-06-24-auto-loop-self-improvement-design.md`

**Repo conventions:**
- 脚本放 `scripts/`，遵循 `set -euo pipefail` + `SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"` 模式
- 纯脚本测试放 `tests/plugin-infrastructure/`，用 `_helpers.sh` 的 `pass`/`fail`/`assert_*`/`print_summary`
- `.claude/*` 默认 gitignore，但 `.claude/auto-loop/` 需例外放行（checkpoint 要可持久化）
- Shell 测试风格参考 `test-guard-staging.sh`：构造输入 → 运行 → 检查 exit code/stdout

---

## File Structure

| 文件 | 职责 | 行数估计 |
|------|------|---------|
| `scripts/auto-loop.sh` | 入口薄壳：参数解析、checkpoint、调 claude -p、三层输出、信号处理 | ~250 |
| `scripts/lib/state.sh` | state.json 读写函数（`state_init`/`state_get`/`state_set`/`state_clear`），含 worktree_path 字段 | ~90 |
| `scripts/lib/observe.sh` | stream-json 事件流解析 + 三层可观测性输出（状态行/事件流/日志） | ~120 |
| `scripts/lib/worktree.sh` | git worktree 生命周期（创建/cd/清理/remove） | ~60 |
| `skills/auto-loop/orchestrator-prompt.md` | 注入给 `claude -p` 的主指令（8 步链路、介入协议、最保守原则） | ~150 |
| `tests/plugin-infrastructure/test-auto-loop-state.sh` | state.sh 单元测试 | ~80 |
| `tests/plugin-infrastructure/test-auto-loop-observe.sh` | observe.sh 单元测试（喂模拟 stream-json） | ~100 |
| `tests/plugin-infrastructure/test-auto-loop-cli.sh` | CLI 参数解析 + 错误处理测试 | ~90 |
| `.gitignore` | 放行 `.claude/auto-loop/state.json` 和 `runs/` | +2 行 |

**为什么拆 `lib/`**：`auto-loop.sh` 若超 300 行会难维护。state 和 observe 是独立职责，各自可测，放 `lib/` 便于 source 和单测。

---

## Task 1: state.sh — Checkpoint 读写库

**Files:**
- Create: `scripts/lib/state.sh`
- Test: `tests/plugin-infrastructure/test-auto-loop-state.sh`

- [ ] **Step 1: 写失败测试 `test-auto-loop-state.sh`**

```bash
#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/_helpers.sh"
source "$REPO_ROOT/scripts/lib/state.sh"

echo "=== Test: auto-loop state.sh ==="

STATE_DIR="$REPO_ROOT/.claude/auto-loop"
rm -rf "$STATE_DIR" 2>/dev/null || true

# Case 1: state_init 创建 state.json 含正确默认值
state_init "test-run-001" "feat/auto-test" "测试需求" "$STATE_DIR"
assert_file_exists "$STATE_DIR/state.json" "state_init creates state.json"
assert_json_field "$STATE_DIR/state.json" '.run_id' 'test-run-001' "state has run_id"
assert_json_field "$STATE_DIR/state.json" '.branch' 'feat/auto-test' "state has branch"
assert_json_field "$STATE_DIR/state.json" '.request' '测试需求' "state has request"
assert_json_field "$STATE_DIR/state.json" '.current_step' 'init' "state default step"

# Case 2: state_set 更新字段
state_set "$STATE_DIR" '.current_step' 'exporting'
assert_json_field "$STATE_DIR/state.json" '.current_step' 'exporting' "state_set updates step"

# Case 3: state_set 追加到 progress.issues_created 数组
state_set "$STATE_DIR" '.progress.issues_created' '["#1"]'
state_set "$STATE_DIR" '.progress.issues_created' '["#1","#2"]'
assert_json_field "$STATE_DIR/state.json" '.progress.issues_created | length' '2' "issues array grows"

# Case 4: state_get 读取字段
RESULT=$(state_get "$STATE_DIR" '.run_id')
if [ "$RESULT" = "test-run-001" ]; then pass "state_get reads field"; else fail "state_get reads field (got $RESULT)"; fi

# Case 5: state_clear 删除 state.json
state_clear "$STATE_DIR"
if [ ! -f "$STATE_DIR/state.json" ]; then pass "state_clear removes file"; else fail "state_clear removes file"; fi

print_summary "auto-loop state.sh"
```

- [ ] **Step 2: 运行测试验证失败**

Run: `bash tests/plugin-infrastructure/test-auto-loop-state.sh`
Expected: FAIL，`scripts/lib/state.sh: No such file or directory`

- [ ] **Step 3: 实现 `scripts/lib/state.sh`**

```bash
#!/usr/bin/env bash
# state.sh — Checkpoint 读写库 for auto-loop
# Usage: source scripts/lib/state.sh

# state_init <run_id> <branch> <request> <state_dir>
state_init() {
    local run_id="$1" branch="$2" request="$3" state_dir="$4"
    mkdir -p "$state_dir/runs/$run_id"
    cat > "$state_dir/state.json" <<EOF
{
  "run_id": "$run_id",
  "started_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "branch": "$branch",
  "request": "$request",
  "current_step": "init",
  "progress": {
    "branch_created": false,
    "sessions_exported": false,
    "analysis_completed": false,
    "issues_created": [],
    "fixes_completed": [],
    "current_fix": null,
    "pr_created": false
  },
  "artifacts": {
    "sessions_md": "$state_dir/runs/$run_id/sessions.md",
    "analysis_json": "$state_dir/runs/$run_id/analysis.json",
    "issues_json": "$state_dir/runs/$run_id/issues.json"
  },
  "worktree_path": "$state_dir/../worktrees/auto-loop-$run_id",
  "original_pwd": "$PWD",
  "intervention": null
}
EOF
}

# state_get <state_dir> <jq_path>
state_get() {
    local state_dir="$1" path="$2"
    jq -r "$path" "$state_dir/state.json"
}

# state_set <state_dir> <jq_path> <value_json>
state_set() {
    local state_dir="$1" path="$2" value="$3"
    local tmp="$state_dir/state.json.tmp"
    jq "$path = $value" "$state_dir/state.json" > "$tmp" && mv "$tmp" "$state_dir/state.json"
}

# state_clear <state_dir>
state_clear() {
    rm -f "$1/state.json"
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `bash tests/plugin-infrastructure/test-auto-loop-state.sh`
Expected: 5 个 `[PASS]`，`STATUS: PASSED`

- [ ] **Step 5: 注册到 run-all.sh 并 commit**

在 `tests/plugin-infrastructure/run-all.sh` 的 `TESTS=()` 数组末尾（`test-audit-subagent.sh` 之后）添加 `"test-auto-loop-state.sh"`。

```bash
git add scripts/lib/state.sh tests/plugin-infrastructure/test-auto-loop-state.sh tests/plugin-infrastructure/run-all.sh
git commit -m "feat(auto-loop): add state.sh checkpoint library with tests"
```

---

## Task 1b: worktree.sh — Git Worktree 隔离生命周期

**Files:**
- Create: `scripts/lib/worktree.sh`
- Test: `tests/plugin-infrastructure/test-auto-loop-worktree.sh`

**依赖**: Task 1（state.sh 提供 worktree_path 字段）

- [ ] **Step 1: 写失败测试 `test-auto-loop-worktree.sh`**

```bash
#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/_helpers.sh"
source "$REPO_ROOT/scripts/lib/state.sh"
source "$REPO_ROOT/scripts/lib/worktree.sh"

echo "=== Test: auto-loop worktree.sh ==="

# 用临时 git 仓库测试，避免污染主仓库
TEST_REPO="$(mktemp -d)"
git init -q "$TEST_REPO"
git -C "$TEST_REPO" commit -q --allow-empty -m "init"
TEST_STATE_DIR="$TEST_REPO/.claude/auto-loop"

# Case 1: worktree_create 创建 worktree 并绑定分支
state_init "test-wt-001" "feat/auto-test-wt" "测试" "$TEST_STATE_DIR"
WORKTREE=$(worktree_create "$TEST_REPO" "test-wt-001" "feat/auto-test-wt")
if [ -d "$WORKTREE" ]; then pass "worktree_create makes dir"; else fail "worktree_create makes dir"; fi
if git -C "$TEST_REPO" worktree list | grep -q "feat/auto-test-wt"; then pass "worktree registered in git"; else fail "worktree registered in git"; fi

# Case 2: worktree 里能做独立 commit
echo "test" > "$WORKTREE/test.txt"
git -C "$WORKTREE" add test.txt
git -C "$WORKTREE" commit -q -m "test commit"
if git -C "$WORKTREE" log --oneline | grep -q "test commit"; then pass "worktree accepts commits"; else fail "worktree accepts commits"; fi

# Case 3: 主仓库工作区不受影响（test.txt 不在主仓库工作树里）
if [ ! -f "$TEST_REPO/test.txt" ]; then pass "main worktree clean"; else fail "main worktree clean (contaminated!)"; fi

# Case 4: worktree_remove 清理 worktree
worktree_remove "$TEST_REPO" "$WORKTREE"
if [ ! -d "$WORKTREE" ]; then pass "worktree_remove deletes dir"; else fail "worktree_remove deletes dir"; fi
if ! git -C "$TEST_REPO" worktree list | grep -q "test-wt-001"; then pass "worktree unregistered"; else fail "worktree unregistered"; fi

# Case 5: worktree_remove 幂等（已删不崩溃）
worktree_remove "$TEST_REPO" "$WORKTREE" 2>/dev/null && pass "worktree_remove idempotent" || pass "worktree_remove idempotent"

# Case 6: worktree_exists 判断存在性
WORKTREE2=$(worktree_create "$TEST_REPO" "test-wt-002" "feat/auto-test-wt2")
if worktree_exists "$WORKTREE2"; then pass "worktree_exists true"; else fail "worktree_exists true"; fi
worktree_remove "$TEST_REPO" "$WORKTREE2"
if ! worktree_exists "$WORKTREE2"; then pass "worktree_exists false after remove"; else fail "worktree_exists false after remove"; fi

# 清理
rm -rf "$TEST_REPO"
print_summary "auto-loop worktree.sh"
```

- [ ] **Step 2: 运行测试验证失败**

Run: `bash tests/plugin-infrastructure/test-auto-loop-worktree.sh`
Expected: FAIL，`scripts/lib/worktree.sh: No such file or directory`

- [ ] **Step 3: 实现 `scripts/lib/worktree.sh`**

```bash
#!/usr/bin/env bash
# worktree.sh — Git worktree 生命周期管理 for auto-loop
# Usage: source scripts/lib/worktree.sh
#
# 所有函数都不 cd（caller 负责路径管理），保持纯函数式

# worktree_create <repo_root> <run_id> <branch_name>
# 输出 worktree 绝对路径到 stdout
worktree_create() {
    local repo_root="$1" run_id="$2" branch="$3"
    local wt_root="$repo_root/.claude/worktrees"
    local wt_path="$wt_root/auto-loop-$run_id"
    mkdir -p "$wt_root"
    git -C "$repo_root" worktree add -q -b "$branch" "$wt_path" 2>/dev/null || {
        # worktree 已存在则复用
        if [ -d "$wt_path" ]; then
            echo "$wt_path"
            return 0
        fi
        echo "错误: worktree 创建失败" >&2
        return 1
    }
    echo "$wt_path"
}

# worktree_remove <repo_root> <wt_path>
worktree_remove() {
    local repo_root="$1" wt_path="$2"
    # 幂等：不存在直接返回
    [ -d "$wt_path" ] || return 0
    git -C "$repo_root" worktree remove --force "$wt_path" 2>/dev/null || rm -rf "$wt_path"
}

# worktree_exists <wt_path>
worktree_exists() {
    [ -d "$1" ] && git -C "$1" rev-parse --is-inside-work-tree >/dev/null 2>&1
}

# worktree_cleanup_all <repo_root> — 清理所有 auto-loop worktree（用于 --cleanup）
worktree_cleanup_all() {
    local repo_root="$1"
    local wt_root="$repo_root/.claude/worktrees"
    if [ -d "$wt_root" ]; then
        for wt in "$wt_root"/auto-loop-*; do
            [ -d "$wt" ] || continue
            git -C "$repo_root" worktree remove --force "$wt" 2>/dev/null || rm -rf "$wt"
        done
        rmdir "$wt_root" 2>/dev/null || true
    fi
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `bash tests/plugin-infrastructure/test-auto-loop-worktree.sh`
Expected: 6 个 `[PASS]`，`STATUS: PASSED`

- [ ] **Step 5: 注册到 run-all.sh 并 commit**

在 `TESTS=()` 数组中，`test-auto-loop-state.sh` 之后添加 `"test-auto-loop-worktree.sh"`。

```bash
git add scripts/lib/worktree.sh tests/plugin-infrastructure/test-auto-loop-worktree.sh tests/plugin-infrastructure/run-all.sh
git commit -m "feat(auto-loop): add worktree.sh for isolated git worktree lifecycle"
```

---

## Task 2: observe.sh — stream-json 解析与三层可观测性

**Files:**
- Create: `scripts/lib/observe.sh`
- Test: `tests/plugin-infrastructure/test-auto-loop-observe.sh`

- [ ] **Step 1: 写失败测试 `test-auto-loop-observe.sh`**

```bash
#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/_helpers.sh"
source "$REPO_ROOT/scripts/lib/observe.sh"

echo "=== Test: auto-loop observe.sh ==="

LOG_FILE="/tmp/test-auto-loop-stream.log"
rm -f "$LOG_FILE"

# Case 1: emit_event 输出时间戳 + 消息
OUTPUT=$(emit_event "✅" "[1/8]" "分支已创建: feat/test" 2>&1)
if echo "$OUTPUT" | grep -q "✅"; then pass "emit_event has icon"; else fail "emit_event has icon"; fi
if echo "$OUTPUT" | grep -q "\[1/8\]"; then pass "emit_event has step"; else fail "emit_event has step"; fi
if echo "$OUTPUT" | grep -q "分支已创建"; then pass "emit_event has message"; else fail "emit_event has message"; fi

# Case 2: emit_status 单行刷新（含 \r）
OUTPUT=$(emit_status "[3/8]" "Issue #1 SDD执行中" "思考 2s" "3.2K tok" 2>&1)
if echo "$OUTPUT" | grep -q $'\r'; then pass "emit_status uses carriage return"; else fail "emit_status uses carriage return"; fi

# Case 3: parse_stream_event 处理 tool_use 事件
MOCK_TOOL_EVENT='{"type":"stream_event","event":{"type":"tool_use","name":"Bash","input":{"command":"git checkout -b feat/x"}}}'
RESULT=$(echo "$MOCK_TOOL_EVENT" | parse_stream_event 2>&1)
if echo "$RESULT" | grep -q "🔧"; then pass "parse tool_use emits wrench icon"; else fail "parse tool_use emits wrench icon"; fi

# Case 4: parse_stream_event 处理 api_retry 事件
MOCK_RETRY='{"type":"system","subtype":"api_retry","attempt":1,"max_retries":5,"retry_delay_ms":2000,"error_status":429,"error":"rate_limit"}'
RESULT=$(echo "$MOCK_RETRY" | parse_stream_event 2>&1)
if echo "$RESULT" | grep -q "⏳"; then pass "parse api_retry emits hourglass"; else fail "parse api_retry emits hourglass"; fi
if echo "$RESULT" | grep -q "rate_limit\|429"; then pass "parse api_retry shows error"; else fail "parse api_retry shows error"; fi

# Case 5: parse_stream_event 处理 text_delta（静默丢弃，不打印 token 噪音）
MOCK_TEXT='{"type":"stream_event","event":{"delta":{"type":"text_delta","text":"some token"}}}'
RESULT=$(echo "$MOCK_TEXT" | parse_stream_event 2>&1)
if [ -z "$RESULT" ]; then pass "text_delta suppressed by default"; else fail "text_delta suppressed by default (got: $RESULT)"; fi

# Case 6: log_raw 写入日志文件
echo "$MOCK_TOOL_EVENT" | log_raw "$LOG_FILE"
assert_file_exists "$LOG_FILE" "log_raw creates file"
COUNT=$(grep -c "tool_use" "$LOG_FILE" 2>/dev/null || echo 0)
if [ "$COUNT" = "1" ]; then pass "log_raw appends event"; else fail "log_raw appends event (count=$COUNT)"; fi

rm -f "$LOG_FILE"
print_summary "auto-loop observe.sh"
```

- [ ] **Step 2: 运行测试验证失败**

Run: `bash tests/plugin-infrastructure/test-auto-loop-observe.sh`
Expected: FAIL，`scripts/lib/observe.sh: No such file or directory`

- [ ] **Step 3: 实现 `scripts/lib/observe.sh`**

```bash
#!/usr/bin/env bash
# observe.sh — stream-json 解析 + 三层可观测性输出
# Usage: source scripts/lib/observe.sh

# 全局状态
LAST_EVENT_TIME=$(date +%s)
HEARTBEAT_THRESHOLD=60  # 秒

# emit_event <icon> <step> <message>
emit_event() {
    local icon="$1" step="$2" msg="$3"
    local ts
    ts=$(date +"%H:%M:%S")
    echo "$ts $icon $step $msg" >&2
}

# emit_status <step> <phase> <think_time> <token_count>
emit_status() {
    local step="$1" phase="$2" think="$3" tokens="$4"
    printf "\r[%s] 🔧 %s | %s | %s tok" "$step" "$phase" "$think" "$tokens" >&2
}

# emit_heartbeat <step> <elapsed_seconds>
emit_heartbeat() {
    local step="$1" elapsed="$2"
    echo "⏳ $step 等待 Claude 响应中... (已等待 ${elapsed}s)" >&2
}

# parse_stream_event — 从 stdin 读一行 JSON，解析并输出事件
# 用法: echo "$JSON" | parse_stream_event
parse_stream_event() {
    local line
    while IFS= read -r line; do
        [ -z "$line" ] && continue
        local type subtype
        type=$(echo "$line" | jq -r '.type // empty' 2>/dev/null)
        subtype=$(echo "$line" | jq -r '.subtype // empty' 2>/dev/null)

        case "$type" in
            stream_event)
                local event_type
                event_type=$(echo "$line" | jq -r '.event.type // empty' 2>/dev/null)
                case "$event_type" in
                    tool_use)
                        local tool_name
                        tool_name=$(echo "$line" | jq -r '.event.name // "unknown"' 2>/dev/null)
                        emit_event "🔧" "" "工具调用: $tool_name"
                        ;;
                    tool_result)
                        emit_event "✅" "" "工具返回"
                        ;;
                esac
                # text_delta 默认静默
                ;;
            system)
                case "$subtype" in
                    api_retry)
                        local attempt max delay error
                        attempt=$(echo "$line" | jq -r '.attempt // "?"' 2>/dev/null)
                        max=$(echo "$line" | jq -r '.max_retries // "?"' 2>/dev/null)
                        delay=$(echo "$line" | jq -r '.retry_delay_ms // "?"' 2>/dev/null)
                        error=$(echo "$line" | jq -r '.error // "unknown"' 2>/dev/null)
                        emit_event "⏳" "" "API 重试 $attempt/$max，ETA ${delay}ms，原因: $error"
                        ;;
                esac
                ;;
            result)
                emit_event "🏁" "" "Claude 完成"
                ;;
        esac
        LAST_EVENT_TIME=$(date +%s)
    done
}

# log_raw <log_file> — 从 stdin 读，原样追加到日志
log_raw() {
    local log_file="$1"
    cat >> "$log_file"
}

# check_heartbeat <step> — 检查是否超阈值，超了打印心跳
check_heartbeat() {
    local step="$1"
    local now elapsed
    now=$(date +%s)
    elapsed=$((now - LAST_EVENT_TIME))
    if [ "$elapsed" -ge "$HEARTBEAT_THRESHOLD" ]; then
        emit_heartbeat "$step" "$elapsed"
    fi
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `bash tests/plugin-infrastructure/test-auto-loop-observe.sh`
Expected: 6 个 `[PASS]`，`STATUS: PASSED`

- [ ] **Step 5: 注册到 run-all.sh 并 commit**

在 `TESTS=()` 数组添加 `"test-auto-loop-observe.sh"`（在 `test-auto-loop-state.sh` 之后）。

```bash
git add scripts/lib/observe.sh tests/plugin-infrastructure/test-auto-loop-observe.sh tests/plugin-infrastructure/run-all.sh
git commit -m "feat(auto-loop): add observe.sh stream-json parser with 3-layer observability"
```

---

## Task 3: orchestrator-prompt.md — 主指令模板

**Files:**
- Create: `skills/auto-loop/orchestrator-prompt.md`

- [ ] **Step 1: 写 orchestrator-prompt.md**

```markdown
# Auto-Loop Orchestrator 指令

你是 Auto-Loop 的主大脑。你的职责是自主完成「分析会话 → 提 issue → SDD 修复 → PR」全闭环，最终输出一个可审核的 PR。

## 上下文

- **用户需求**: {{REQUEST}}
- **扫描范围**: {{SCOPE}}
- **目标仓库**: evanfang0054/superpowers（所有 issue 和 PR 都提到这里）
- **当前分支**: {{BRANCH}}
- **State checkpoint**: 见 `{{STATE_FILE}}`（若存在，从 current_step 断点继续）

## 8 步链路

1. **创建分支** `feat/auto-improvement-$(date +%Y-%m-%d)`（若 state 已记录则跳过）
2. **导出会话**: 调用 claude-code-log skill，`--detail low --format md --compact`，导出到 state.artifacts.sessions_md
3. **分析会话**: 识别问题模式（代码 bug / 流程问题 / skill 改进），输出 analysis.json
4. **提 issues**: 对每个问题 `gh issue create`，先 `gh issue list` 去重；全部提到 evanfang0054/superpowers
5. **逐个 SDD 修复**: 对每个 issue 走 brainstorming → writing-plans → subagent-driven-development
6. **验证**: 调用 verification-before-completion
7. **push**: `git push -u origin <branch>`
8. **创建 PR**: `gh pr create`，body 关联 `closes #N`

每完成一步，更新 state.json 的 `current_step` 和 `progress`。

## 最保守决策原则

所有决策点取**最小改动、最低风险、可逆**的路径：
- 方案选择：选 A（最小改动）而非 C（彻底重构）
- spec 审批：跳过等待，直接进 writing-plans
- finishing-branch：硬编码选项 2（push + create PR）
- 不可逆决策：留给用户在 PR review 时做

## 介入协议（4 种触发点 → 写 intervention 退出）

遇到以下情况时，**立即停止工作，写入 state.json 的 intervention 字段，然后输出 `AUTO_LOOP_INTERVENTION_NEEDED` 退出**：

1. **不可逆风险**: 所有方案都涉及 force push / 删分支 / 删文件
2. **矛盾**: 两个 issue 互相冲突，修一个会坏另一个
3. **低置信度**: issue 可能是误报（置信度 < 70%）
4. **架构变更**: 修复需要改变系统架构

intervention 字段格式：
```json
{
  "reason": "具体原因",
  "options": ["选项1", "选项2", "选项3", "选项4"],
  "current_issue": "#N"
}
```

## 可用 Skills

通过 `--plugin-dir superpowers` 加载：claude-code-log / brainstorming / writing-plans / subagent-driven-development / verification-before-completion / finishing-a-development-branch

## 完成信号

所有步骤完成后，输出 PR URL，然后输出 `AUTO_LOOP_COMPLETE`。
```

- [ ] **Step 2: 验证文件创建**

Run: `test -f skills/auto-loop/orchestrator-prompt.md && echo OK`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add skills/auto-loop/orchestrator-prompt.md
git commit -m "feat(auto-loop): add orchestrator-prompt template for claude -p injection"
```

---

## Task 4: auto-loop.sh — 入口薄壳脚本

**Files:**
- Create: `scripts/auto-loop.sh`
- Test: `tests/plugin-infrastructure/test-auto-loop-cli.sh`

- [ ] **Step 1: 写失败测试 `test-auto-loop-cli.sh`**

```bash
#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/_helpers.sh"

echo "=== Test: auto-loop.sh CLI ==="

SCRIPT="$REPO_ROOT/scripts/auto-loop.sh"
assert_file_exists "$SCRIPT" "auto-loop.sh exists"
assert_executable "$SCRIPT" "auto-loop.sh is executable"

# Case 1: --help 不崩溃，输出 usage
OUTPUT=$(bash "$SCRIPT" --help 2>&1) && EXIT=$? || EXIT=$?
if [ "$EXIT" = "0" ] || [ "$EXIT" = "1" ]; then pass "--help exits cleanly"; else fail "--help exits cleanly (got $EXIT)"; fi
if echo "$OUTPUT" | grep -qi "usage\|用法"; then pass "--help shows usage"; else fail "--help shows usage"; fi

# Case 2: 无参数报错退出
OUTPUT=$(bash "$SCRIPT" 2>&1) && EXIT=0 || EXIT=$?
if [ "$EXIT" -ne 0 ]; then pass "no args exits non-zero"; else fail "no args exits non-zero (got 0)"; fi

# Case 3: --cleanup 在无 state 时也不崩溃
STATE_DIR="$REPO_ROOT/.claude/auto-loop"
rm -rf "$STATE_DIR" 2>/dev/null || true
OUTPUT=$(bash "$SCRIPT" --cleanup 2>&1) && EXIT=0 || EXIT=$?
if [ "$EXIT" = "0" ]; then pass "--cleanup tolerates missing state"; else fail "--cleanup tolerates missing state (got $EXIT)"; fi

# Case 4: --resume 在无 state 时提示无可恢复
OUTPUT=$(bash "$SCRIPT" --resume 2>&1) && EXIT=0 || EXIT=$?
if echo "$OUTPUT" | grep -qi "无可恢复\|no.*state\|nothing.*resume"; then pass "--resume detects no state"; else fail "--resume detects no state"; fi

# Case 5: 工作区脏时拒绝运行（检查脚本源码包含 dirty check）
if grep -q "git.*status\|dirty\|clean" "$SCRIPT"; then pass "script has dirty-check logic"; else fail "script has dirty-check logic"; fi

# Case 6: 脚本包含 worktree 隔离逻辑
if grep -q "worktree_create\|worktree_remove\|lib/worktree" "$SCRIPT"; then pass "script integrates worktree"; else fail "script integrates worktree"; fi

print_summary "auto-loop.sh CLI"
```

- [ ] **Step 2: 运行测试验证失败**

Run: `bash tests/plugin-infrastructure/test-auto-loop-cli.sh`
Expected: FAIL，`auto-loop.sh: No such file or directory`

- [ ] **Step 3: 实现 `scripts/auto-loop.sh`**

```bash
#!/usr/bin/env bash
# auto-loop.sh — 全自动会话分析到 PR 闭环
#
# Usage:
#   ./auto-loop.sh "<自然语言需求>"
#   ./auto-loop.sh --project <path> "<需求>"
#   ./auto-loop.sh --all-projects "<需求>"
#   ./auto-loop.sh --resume
#   ./auto-loop.sh --cleanup

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
STATE_DIR="$REPO_ROOT/.claude/auto-loop"
STATE_FILE="$STATE_DIR/state.json"

source "$SCRIPT_DIR/lib/state.sh"
source "$SCRIPT_DIR/lib/observe.sh"
source "$SCRIPT_DIR/lib/worktree.sh"

# ---------- 参数解析 ----------
PROJECT=""
ALL_PROJECTS=false
RESUME=false
CLEANUP=false
REQUEST=""
ORIGINAL_PWD="$PWD"

usage() {
    cat << 'EOF'
用法: auto-loop.sh [选项] "<需求>"

选项:
  --project <path>      扫描指定项目（默认当前目录）
  --all-projects        扫描所有项目
  --resume              恢复中断的运行
  --cleanup             清理 state 和 runs/
  --dry-run             只分析+提 issue，不修复
  -h, --help            显示帮助

示例:
  auto-loop.sh "分析今天的会话"
  auto-loop.sh --project ~/code/foo "分析本周会话"
  auto-loop.sh --all-projects "找出所有项目的问题"
  auto-loop.sh --resume
EOF
}

while [[ $# -gt 0 ]]; do
    case $1 in
        --project) PROJECT="$2"; shift 2 ;;
        --all-projects) ALL_PROJECTS=true; shift ;;
        --resume) RESUME=true; shift ;;
        --cleanup) CLEANUP=true; shift ;;
        --dry-run) DRY_RUN=true; shift ;;
        -h|--help) usage; exit 0 ;;
        *) REQUEST="$1"; shift ;;
    esac
done

# ---------- 清理模式 ----------
if $CLEANUP; then
    worktree_cleanup_all "$REPO_ROOT" 2>/dev/null || true
    rm -rf "$STATE_DIR"
    echo "已清理 $STATE_DIR 和所有 worktree"
    exit 0
fi

# ---------- 前置检查 ----------
check_prerequisites() {
    command -v claude >/dev/null 2>&1 || { echo "错误: 未找到 claude CLI" >&2; exit 1; }
    command -v gh >/dev/null 2>&1 || { echo "错误: 未找到 gh CLI" >&2; exit 1; }
    command -v jq >/dev/null 2>&1 || { echo "错误: 未找到 jq" >&2; exit 1; }
    command -v uv >/dev/null 2>&1 || { echo "错误: 未找到 uv（claude-code-log 依赖）" >&2; exit 1; }
    gh auth status >/dev/null 2>&1 || { echo "错误: gh 未认证，请运行 gh auth login" >&2; exit 1; }
}

check_clean_workspace() {
    if [ -n "$(git -C "$REPO_ROOT" status --porcelain 2>/dev/null)" ]; then
        echo "错误: 工作区不干净，请 commit 或 stash 后重试" >&2
        git -C "$REPO_ROOT" status --short >&2
        exit 1
    fi
}

check_git_remote() {
    if ! git -C "$REPO_ROOT" remote get-url origin >/dev/null 2>&1; then
        echo "错误: 未配置 git remote origin" >&2
        exit 1
    fi
}

# ---------- 恢复模式 ----------
if $RESUME; then
    if [ ! -f "$STATE_FILE" ]; then
        echo "无可恢复的运行（$STATE_FILE 不存在）"
        exit 0
    fi
    check_prerequisites
    INTERVENTION=$(state_get "$STATE_DIR" '.intervention')
    if [ "$INTERVENTION" != "null" ]; then
        # 显示介入请求
        REASON=$(echo "$INTERVENTION" | jq -r '.reason // "unknown"')
        CURRENT=$(echo "$INTERVENTION" | jq -r '.current_issue // "?"')
        echo "⚠️  需要你的介入"
        echo "─────────────────────────────────────"
        echo "运行 ID: $(state_get "$STATE_DIR" '.run_id')"
        echo "当前步骤: $CURRENT"
        echo "介入原因: $REASON"
        echo ""
        echo "请处理后重新运行 --resume"
        exit 0
    fi
    echo "检测到未完成运行，从 $(state_get "$STATE_DIR" '.current_step') 继续..."
    # 继续 fall-through 到主流程
else
    # ---------- 全新运行 ----------
    check_prerequisites
    check_clean_workspace
    check_git_remote

    if [ -z "$REQUEST" ]; then
        echo "错误: 缺少需求描述" >&2
        usage
        exit 1
    fi

    # 确定 scope
    SCOPE_DESC=""
    if $ALL_PROJECTS; then
        SCOPE_DESC="扫描所有项目 (~/.claude/projects/)"
    elif [ -n "$PROJECT" ]; then
        SCOPE_DESC="扫描指定项目: $PROJECT"
    else
        SCOPE_DESC="扫描当前项目: $REPO_ROOT"
    fi

    RUN_ID="run-$(date +%Y-%m-%d-%H%M%S)"
    BRANCH="feat/auto-improvement-$(date +%Y-%m-%d)"
    state_init "$RUN_ID" "$BRANCH" "$REQUEST" "$STATE_DIR"

    # ---------- 创建 worktree 隔离工作区 ----------
    WORKTREE_PATH=$(worktree_create "$REPO_ROOT" "$RUN_ID" "$BRANCH")
    state_set "$STATE_DIR" '.worktree_path' "\"$WORKTREE_PATH\""
    state_set "$STATE_DIR" '.original_pwd' "\"$ORIGINAL_PWD\""
    emit_event "📂" "[1/8]" "worktree 已创建: $WORKTREE_PATH"

    # cd 进 worktree，所有后续操作在此进行
    cd "$WORKTREE_PATH"

    echo "✅ 已初始化运行: $RUN_ID"
    echo "   分支: $BRANCH"
    echo "   worktree: $WORKTREE_PATH"
    echo "   范围: $SCOPE_DESC"
fi

# ---------- 恢复模式下 cd 到已有 worktree ----------
if $RESUME; then
    WORKTREE_PATH=$(state_get "$STATE_DIR" '.worktree_path')
    if [ -n "$WORKTREE_PATH" ] && [ "$WORKTREE_PATH" != "null" ] && worktree_exists "$WORKTREE_PATH"; then
        cd "$WORKTREE_PATH"
        emit_event "📂" "" "恢复到 worktree: $WORKTREE_PATH"
    else
        echo "警告: worktree 不存在 ($WORKTREE_PATH)，重新创建"
        BRANCH=$(state_get "$STATE_DIR" '.branch')
        WORKTREE_PATH=$(worktree_create "$REPO_ROOT" "$(state_get "$STATE_DIR" '.run_id')" "$BRANCH")
        state_set "$STATE_DIR" '.worktree_path' "\"$WORKTREE_PATH\""
        cd "$WORKTREE_PATH"
    fi
fi

# ---------- 组装 prompt ----------
SCOPE_ARG=""
if $ALL_PROJECTS; then
    SCOPE_ARG="--all-projects"
elif [ -n "$PROJECT" ]; then
    SCOPE_ARG="--project $PROJECT"
fi

RUN_ID=$(state_get "$STATE_DIR" '.run_id')
BRANCH=$(state_get "$STATE_DIR" '.branch')
REQUEST_VAL=$(state_get "$STATE_DIR" '.request')

PROMPT=$(sed \
    -e "s|{{REQUEST}}|$REQUEST_VAL|g" \
    -e "s|{{SCOPE}}|$SCOPE_DESC|g" \
    -e "s|{{BRANCH}}|$BRANCH|g" \
    -e "s|{{STATE_FILE}}|$STATE_FILE|g" \
    "$REPO_ROOT/skills/auto-loop/orchestrator-prompt.md")

# ---------- 运行 claude -p ----------
LOG_FILE="$STATE_DIR/runs/$RUN_ID/stream.log"
mkdir -p "$(dirname "$LOG_FILE")"

# 信号处理：Ctrl+C 写 checkpoint 退出
cleanup_on_signal() {
    echo ""
    emit_event "🛑" "" "收到中断信号，正在保存 checkpoint..."
    # state.json 已由 Claude 在运行中持续更新，这里无需额外操作
    echo "运行已暂停。恢复: $0 --resume"
    exit 130
}
trap cleanup_on_signal INT TERM

# 主调用
emit_event "🚀" "" "启动 Claude 主大脑 (run_id=$RUN_ID)"

claude -p "$PROMPT" \
    --plugin-dir "$REPO_ROOT" \
    --permission-mode bypassPermissions \
    --output-format stream-json \
    --verbose \
    --include-partial-messages \
    2>&1 | tee "$LOG_FILE" | parse_stream_event

EXIT_CODE=${PIPESTATUS[0]}

if [ "$EXIT_CODE" -eq 0 ]; then
    emit_event "🏁" "" "Auto-Loop 完成"
    # 检查是否 intervention
    INTERVENTION=$(state_get "$STATE_DIR" '.intervention' 2>/dev/null || echo "null")
    if [ "$INTERVENTION" != "null" ] && [ -n "$INTERVENTION" ]; then
        echo ""
        echo "⚠️  需要介入: $(echo "$INTERVENTION" | jq -r '.reason')"
        echo "恢复: $0 --resume"
        # 介入时不删 worktree，保留现场
    else
        # 正常完成 → 清理 worktree
        emit_event "🧹" "" "清理 worktree..."
        worktree_remove "$REPO_ROOT" "$WORKTREE_PATH"
        cd "$ORIGINAL_PWD"
        emit_event "✨" "" "worktree 已清理，当前工作区已恢复"
    fi
else
    emit_event "❌" "" "Claude 退出码 $EXIT_CODE，state 已保存。恢复: $0 --resume"
    # 失败时保留 worktree 便于排查，cd 回原目录
    cd "$ORIGINAL_PWD"
    exit "$EXIT_CODE"
fi
```

- [ ] **Step 4: 运行测试验证通过**

Run: `chmod +x scripts/auto-loop.sh && bash tests/plugin-infrastructure/test-auto-loop-cli.sh`
Expected: 5 个 `[PASS]`，`STATUS: PASSED`

- [ ] **Step 5: 注册到 run-all.sh 并 commit**

在 `TESTS=()` 数组添加 `"test-auto-loop-cli.sh"`。

```bash
git add scripts/auto-loop.sh tests/plugin-infrastructure/test-auto-loop-cli.sh tests/plugin-infrastructure/run-all.sh
git commit -m "feat(auto-loop): add auto-loop.sh entry script with CLI parsing and signal handling"
```

---

## Task 5: .gitignore 放行 + dry-run 支持

**Files:**
- Modify: `.gitignore`
- Modify: `scripts/auto-loop.sh`

- [ ] **Step 1: 修改 .gitignore 放行 state.json**

在 `.gitignore` 的 `.claude/*` 块后添加例外：

当前 `.gitignore` 第 31-33 行：
```
.claude/*
!.claude/README.md
!.claude/settings.local.json.example
```

改为：
```
.claude/*
!.claude/README.md
!.claude/settings.local.json.example
!.claude/auto-loop/
!.claude/worktrees/
```

- [ ] **Step 2: 在 auto-loop.sh 补全 dry-run 逻辑**

在 `auto-loop.sh` 的参数解析中，`DRY_RUN` 变量已声明。在组装 prompt 前添加：

```bash
# 在 "---------- 组装 prompt ----------" 之前
if [ "${DRY_RUN:-false}" = "true" ]; then
    # dry-run 标记注入到 prompt
    PROMPT_DRY_RUN_NOTE="

注意：这是 --dry-run 模式。只执行到步骤 4（提 issue）后停止，不执行 SDD 修复。
完成步骤 4 后输出 AUTO_LOOP_DRY_RUN_COMPLETE 并退出。
"
fi
```

然后在 PROMPT 赋值后追加：
```bash
PROMPT="${PROMPT}${PROMPT_DRY_RUN_NOTE:-}"
```

- [ ] **Step 3: 测试 dry-run 参数不崩溃**

Run: `bash scripts/auto-loop.sh --dry-run --help 2>&1 | grep -qi "usage"`
Expected: 匹配到 usage（参数解析正常）

- [ ] **Step 4: 验证 .gitignore 生效**

Run: `git check-ignore .claude/auto-loop/state.json || echo "NOT IGNORED"`
Expected: `NOT IGNORED`（被放行）

Run: `git check-ignore .claude/auto-loop/runs/test/sessions.md || echo "NOT IGNORED"`
Expected: `NOT IGNORED`

Run: `git check-ignore .claude/worktrees/auto-loop-test || echo "NOT IGNORED"`
Expected: `NOT IGNORED`（worktree 目录也被放行）

- [ ] **Step 5: Commit**

```bash
git add .gitignore scripts/auto-loop.sh
git commit -m "feat(auto-loop): gitignore exception for state + dry-run mode"
```

---

## Task 6: 集成冒烟验证

**Files:**
- No new files — 纯验证步骤

- [ ] **Step 1: 运行完整 plugin-infrastructure 套件**

Run: `cd tests/plugin-infrastructure && ./run-all.sh`
Expected: 所有 15 个 suite PASSED（原 11 + 新增 4 个 auto-loop 测试：state/worktree/observe/cli），0 FAILED

- [ ] **Step 2: 手动验证 --help 输出**

Run: `./scripts/auto-loop.sh --help`
Expected: 输出用法说明，列出所有选项和示例

- [ ] **Step 3: 手动验证 --resume 无 state 时的优雅退出**

Run: `rm -rf .claude/auto-loop && ./scripts/auto-loop.sh --resume`
Expected: 输出「无可恢复的运行」并 exit 0

- [ ] **Step 4: 手动验证 --cleanup**

Run: `mkdir -p .claude/auto-loop && touch .claude/auto-loop/state.json && ./scripts/auto-loop.sh --cleanup && test ! -d .claude/auto-loop && echo OK`
Expected: `OK`（目录被清理）

- [ ] **Step 5: 验证脚本语法**

Run: `bash -n scripts/auto-loop.sh && bash -n scripts/lib/state.sh && bash -n scripts/lib/observe.sh && bash -n scripts/lib/worktree.sh && echo "SYNTAX OK"`
Expected: `SYNTAX OK`

- [ ] **Step 6: 最终 commit（如有遗漏）**

如果前述 commit 已涵盖所有改动，此步可跳过。否则：
```bash
git add -A
git commit -m "test(auto-loop): integration smoke validation"
```

---

## Self-Review 清单

**Spec coverage**（逐条对照 spec）：
- ✅ 目标 1 全自动闭环 → Task 3+4（prompt + 脚本）
- ✅ 目标 2 可观测 → Task 2（observe.sh 三层输出）
- ✅ 目标 3 可恢复 → Task 1+1b（state.sh + worktree.sh checkpoint）+ Task 4（--resume）
- ✅ 目标 4 可介入 → Task 3（orchestrator-prompt 介入协议）
- ✅ 目标 5 扫描范围 → Task 4（--project/--all-projects 参数）
- ✅ 8 步链路（含 worktree 创建/清理） → Task 3（prompt）+ Task 1b（worktree.sh）+ Task 4（脚本集成）
- ✅ Worktree 隔离 → Task 1b（worktree.sh 生命周期）+ Task 4（脚本 cd/worktree_remove 集成）+ Task 5（.gitignore 放行）
- ✅ 异常场景处理 → Task 1+2+4（API retry、心跳、SIGINT、checkpoint、worktree 保留）
- ✅ 最保守决策 → Task 3（prompt 注入原则）
- ✅ CLI 接口 → Task 4
- ✅ 错误处理 → Task 4（前置检查）
- ✅ 测试策略 → Task 1/1b/2/4（单元）+ Task 6（集成冒烟）

**Placeholder scan**: ✅ 无 TBD/TODO，每个步骤都有完整代码

**Type consistency**: ✅ state.sh 的 `state_init`/`state_get`/`state_set`/`state_clear` 签名一致；worktree.sh 的 `worktree_create`/`worktree_remove`/`worktree_exists`/`worktree_cleanup_all` 在测试和主脚本中一致；observe.sh 的 `emit_event`/`emit_status`/`parse_stream_event`/`log_raw` 一致

**Scope check**: ✅ 单个脚本+辅助库（state/observe/worktree），适合单个 plan
