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

# Case 7: orchestrator-prompt 包含 0-issue 退出指令
PROMPT_FILE="$REPO_ROOT/skills/auto-loop/orchestrator-prompt.md"
if grep -q "0 个问题\|0 issues\|无问题" "$PROMPT_FILE"; then pass "prompt handles 0-issue case"; else fail "prompt handles 0-issue case"; fi

# Case 8: orchestrator-prompt 包含 push 失败信号
if grep -q "AUTO_LOOP_PUSH_FAILED" "$PROMPT_FILE"; then pass "prompt defines push-failed signal"; else fail "prompt defines push-failed signal"; fi

print_summary "auto-loop.sh CLI"
