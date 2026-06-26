#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/_helpers.sh"

echo "=== Test: auto-loop.sh fix-only / max-issues ==="

SCRIPT="$REPO_ROOT/scripts/auto-loop.sh"
PROMPT_FILE="$REPO_ROOT/skills/auto-loop/orchestrator-prompt.md"

# Case 1: auto-loop.sh 声明 FIX_ONLY="" 变量
if grep -q '^FIX_ONLY=' "$SCRIPT"; then pass "script declares FIX_ONLY var"; else fail "script declares FIX_ONLY var"; fi

# Case 2: auto-loop.sh 声明 MAX_ISSUES="" 变量
if grep -q '^MAX_ISSUES=' "$SCRIPT"; then pass "script declares MAX_ISSUES var"; else fail "script declares MAX_ISSUES var"; fi

# Case 3: auto-loop.sh 有 --fix-only case 分支
if grep -q -- '--fix-only)' "$SCRIPT"; then pass "script has --fix-only case branch"; else fail "script has --fix-only case branch"; fi

# Case 4: auto-loop.sh 有 --max-issues case 分支
if grep -q -- '--max-issues)' "$SCRIPT"; then pass "script has --max-issues case branch"; else fail "script has --max-issues case branch"; fi

# Case 5: auto-loop.sh 有 check_mode_mutex 互斥校验
if grep -q 'check_mode_mutex' "$SCRIPT"; then pass "script has check_mode_mutex"; else fail "script has check_mode_mutex"; fi

# Case 6: auto-loop.sh 注入 {{MODE}} 占位符
if grep -q 'gsub.*{{MODE}}' "$SCRIPT"; then pass "script injects {{MODE}} placeholder"; else fail "script injects {{MODE}} placeholder"; fi

# Case 7: auto-loop.sh 注入 {{TARGET_ISSUES}} 占位符
if grep -q 'gsub.*{{TARGET_ISSUES}}' "$SCRIPT"; then pass "script injects {{TARGET_ISSUES}} placeholder"; else fail "script injects {{TARGET_ISSUES}} placeholder"; fi

# Case 8: auto-loop.sh 注入 {{MAX_ISSUES}} 占位符
if grep -q 'gsub.*{{MAX_ISSUES}}' "$SCRIPT"; then pass "script injects {{MAX_ISSUES}} placeholder"; else fail "script injects {{MAX_ISSUES}} placeholder"; fi

# Case 9: orchestrator-prompt.md 包含「模式分支守卫」section
if grep -q '模式分支守卫' "$PROMPT_FILE"; then pass "prompt has 模式分支守卫 section"; else fail "prompt has 模式分支守卫 section"; fi

# Case 10: orchestrator-prompt.md 用 {{MODE}} 做 mode 区分
if grep -q '{{MODE}}' "$PROMPT_FILE"; then pass "prompt uses {{MODE}} placeholder"; else fail "prompt uses {{MODE}} placeholder"; fi

# Case 11: orchestrator-prompt.md fix_only 模式读 state.target_issues
if grep -q 'target_issues' "$PROMPT_FILE"; then pass "prompt references target_issues"; else fail "prompt references target_issues"; fi

# Case 12: state.sh 的 state_init 支持 mode 参数
STATE_SH="$REPO_ROOT/scripts/lib/state.sh"
if grep -q 'mode=' "$STATE_SH"; then pass "state_init supports mode param"; else fail "state_init supports mode param"; fi

print_summary "auto-loop.sh fix-only / max-issues"
