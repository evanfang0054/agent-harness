#!/usr/bin/env bash
# 验证 auto-loop.sh 的 --fix-only / --max-issues 参数解析与占位符注入
# 不依赖 Claude API 配额，纯 shell 断言

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
AUTO_LOOP="$REPO_ROOT/scripts/auto-loop.sh"

source "$REPO_ROOT/scripts/lib/state.sh"

PASS=0
FAIL=0

assert_contains() {
    local desc="$1" actual="$2" pattern="$3"
    if echo "$actual" | grep -qE "$pattern"; then
        echo "✓ $desc"
        PASS=$((PASS+1))
    else
        echo "✗ $desc"
        echo "  期望包含: $pattern"
        echo "  实际: $actual"
        FAIL=$((FAIL+1))
    fi
}

# Test 1: --dry-run 与 --fix-only 互斥
echo "--- Test 1: 互斥校验 ---"
OUT=$("$AUTO_LOOP" --dry-run --fix-only all "test" 2>&1 || true)
assert_contains "dry-run + fix-only 互斥报错" "$OUT" "互斥"

# Test 2: --max-issues 必须正整数
echo "--- Test 2: max-issues 校验 ---"
OUT=$("$AUTO_LOOP" --max-issues 0 "test" 2>&1 || true)
assert_contains "max-issues 0 被拒" "$OUT" "必须是正整数"
OUT=$("$AUTO_LOOP" --max-issues abc "test" 2>&1 || true)
assert_contains "max-issues abc 被拒" "$OUT" "必须是正整数"
OUT=$("$AUTO_LOOP" --max-issues -3 "test" 2>&1 || true)
assert_contains "max-issues 负数被拒" "$OUT" "必须是正整数"

# Test 3: --fix-only 缺参数
echo "--- Test 3: fix-only 缺参 ---"
OUT=$("$AUTO_LOOP" --fix-only 2>&1 || true)
assert_contains "fix-only 缺参报错" "$OUT" "需要"

# Test 4: state_init 写入 mode/target_issues/max_issues
echo "--- Test 4: state_init 字段 ---"
TMP=$(mktemp -d)
state_init run-t feat/t "req" "$TMP" "" "" fix_only "#12,#15" 5
MODE=$(jq -r '.mode' "$TMP/state.json")
TI=$(jq -c '.target_issues' "$TMP/state.json")
MI=$(jq -r '.max_issues' "$TMP/state.json")
assert_contains "mode=fix_only 写入" "$MODE" "fix_only"
assert_contains "target_issues 数组" "$TI" '#12'
assert_contains "target_issues 数组" "$TI" '#15'
assert_contains "max_issues=5 写入" "$MI" "^5$"

# Test 5: "all" 转 ["all"]
state_init run-t2 feat/t "req" "$TMP" "" "" dry_run "all" ""
TI=$(jq -c '.target_issues' "$TMP/state.json")
assert_contains "all → [\"all\"]" "$TI" '"all"'

# Test 6: 空 target_issues → []
state_init run-t3 feat/t "req" "$TMP" "" "" full "" ""
TI=$(jq -c '.target_issues' "$TMP/state.json")
assert_contains "空 target_issues → []" "$TI" '\[\]'

# Test 7: 占位符注入（不跑 claude，只验证 jq gsub）
echo "--- Test 7: 占位符注入 ---"
PROMPT=$(jq -r --raw-input --slurp \
    --arg mode "fix_only" --arg ti "#12,#15" --arg mi "5" \
    'gsub("{{MODE}}"; $mode) | gsub("{{TARGET_ISSUES}}"; $ti) | gsub("{{MAX_ISSUES}}"; $mi)' \
    < "$REPO_ROOT/skills/auto-loop/orchestrator-prompt.md")
RESIDUAL=$(echo "$PROMPT" | grep -cE '{{MODE}}|{{TARGET_ISSUES}}|{{MAX_ISSUES}}' || true)
if [ "$RESIDUAL" = "0" ]; then
    echo "✓ 无残留占位符"
    PASS=$((PASS+1))
else
    echo "✗ 仍有 $RESIDUAL 处残留占位符"
    FAIL=$((FAIL+1))
fi
assert_contains "运行模式: fix_only 出现" "$PROMPT" "运行模式.*fix_only"

rm -rf "$TMP"

echo ""
echo "结果: $PASS 通过 / $FAIL 失败"
[ "$FAIL" = 0 ] || exit 1
