#!/usr/bin/env bash
# Test stop-hook promise detection window (v2 fix)
# Usage: ./test-stop-hook-promise.sh
#
# Tests only the jq + perl extraction logic from hooks/stop-hook.sh:129-150.
# Does not run the full hook (which would require hook input, transcript path,
# state file — out of scope for this unit test).
#
# Test cases:
# 1. promise 在最后一条 text block → 检测成功（兼容旧行为）
# 2. promise 在倒数第二条，最后一条是其他 text → 检测成功（v2 修复核心场景）
# 3. 完全没有 promise → 不检测

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

PASS=0
FAIL=0

log_pass() { echo -e "${GREEN}✅ PASS${NC}: $1"; ((PASS++)); }
log_fail() { echo -e "${RED}❌ FAIL${NC}: $1"; ((FAIL++)); }

# Extracts promise text from a fake transcript using the SAME jq + perl
# pipeline as hooks/stop-hook.sh:129-150 (v2 version with join("\n")).
# Args: $1 = path to fake transcript JSONL
# Prints: extracted promise text (empty if none found)
extract_promise() {
    local transcript="$1"
    local last_lines
    last_lines=$(grep '"role":"assistant"' "$transcript" | tail -n 100)

    local last_output
    last_output=$(echo "$last_lines" | jq -rs '
      map(.message.content[]? | select(.type == "text") | .text) | join("\n")
    ' 2>&1)

    echo "$last_output" | perl -0777 -pe 's/.*?<promise>(.*?)<\/promise>.*/$1/s; s/^\s+|\s+$//g; s/\s+/ /g' 2>/dev/null || echo ""
}

# Writes a fake assistant text block to a JSONL file.
# Args: $1 = file path, $2 = text content
emit_text() {
    local file="$1"
    local text="$2"
    python3 -c "
import json
print(json.dumps({
    'role': 'assistant',
    'message': {'content': [{'type': 'text', 'text': '''$text'''}]}
}, separators=(',', ':')))
" >> "$file"
}

TEST_DIR="/tmp/agent-harness-stop-hook-test-$$"
cleanup() { rm -rf "$TEST_DIR"; }
trap cleanup EXIT

echo "=== stop-hook promise detection Tests ==="
echo ""

# ==========================================
# Test 1: promise 在最后一条 text block → 检测成功
# ==========================================
echo "--- Test 1: promise 在最后一条 → 检测成功 ---"
mkdir -p "$TEST_DIR"
T1="$TEST_DIR/t1.jsonl"
: > "$T1"
emit_text "$T1" "working on task"
emit_text "$T1" "<promise>COMPLETE</promise>"

PROMISE=$(extract_promise "$T1")
if [ "$PROMISE" = "COMPLETE" ]; then
    log_pass "提取出 COMPLETE"
else
    log_fail "期望 COMPLETE，实际 '$PROMISE'"
fi

# ==========================================
# Test 2: promise 在倒数第二条，最后一条是其他 text → 检测成功
# （v1 | last 会失败的核心场景）
# ==========================================
echo "--- Test 2: promise 在倒数第二条 → 检测成功（v2 修复核心） ---"
T2="$TEST_DIR/t2.jsonl"
: > "$T2"
emit_text "$T2" "starting work"
emit_text "$T2" "<promise>COMPLETE</promise>"
emit_text "$T2" "已记录 4 条 learnings"

PROMISE=$(extract_promise "$T2")
if [ "$PROMISE" = "COMPLETE" ]; then
    log_pass "v2 join 能在倒数第二条找到 promise"
else
    log_fail "期望 COMPLETE，实际 '$PROMISE'（v1 的 last 会取到 '已记录...'）"
fi

# ==========================================
# Test 3: 完全没有 promise → 不检测
# ==========================================
echo "--- Test 3: 完全没有 promise → 空字符串 ---"
T3="$TEST_DIR/t3.jsonl"
: > "$T3"
emit_text "$T3" "working on task"
emit_text "$T3" "all done, no promise emitted"

PROMISE=$(extract_promise "$T3")
if [ "$PROMISE" != "COMPLETE" ]; then
    log_pass "无 promise 时未匹配到 COMPLETE（与 stop-hook.sh:154 的等值守卫一致）"
else
    log_fail "期望未匹配到 COMPLETE，实际 '$PROMISE'"
fi

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
[ "$FAIL" = "0" ] || exit 1
