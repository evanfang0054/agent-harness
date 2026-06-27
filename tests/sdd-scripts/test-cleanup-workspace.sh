#!/usr/bin/env bash
# Test cleanup-workspace script
# Usage: ./test-cleanup-workspace.sh
#
# Tests:
# 1. 目录不存在 → exit 0，无输出
# 2. 目录有内容（含 .gitignore）→ 全部清空，保留空目录
# 3. rm 失败时不阻断 → 仍 exit 0，stderr 有 warning（root 用户跳过）

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
SCRIPT="$PLUGIN_DIR/skills/subagent-driven-development/scripts/cleanup-workspace"
TEST_DIR="/tmp/agent-harness-cleanup-test-$$"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

PASS=0
FAIL=0

log_pass() { echo -e "${GREEN}✅ PASS${NC}: $1"; ((PASS++)); }
log_fail() { echo -e "${RED}❌ FAIL${NC}: $1"; ((FAIL++)); }

cleanup() { rm -rf "$TEST_DIR"; }
trap cleanup EXIT

# 每个用例在独立临时目录中运行，通过 CLAUDE_PROJECT_DIR 指定路径
# （与 v2 脚本的 fallback 链一致：CLAUDE_PROJECT_DIR 优先，git rev-parse 备用）
setup_repo() {
    rm -rf "$TEST_DIR"
    mkdir -p "$TEST_DIR"
    cd "$TEST_DIR"
    export CLAUDE_PROJECT_DIR="$TEST_DIR"
}

echo "=== cleanup-workspace Tests ==="
echo "Script: $SCRIPT"
echo "Test dir: $TEST_DIR"
echo ""

# ==========================================
# Test 1: 目录不存在 → exit 0，无输出
# ==========================================
echo "--- Test 1: 目录不存在 → exit 0 ---"
setup_repo

out=$(bash "$SCRIPT" 2>/tmp/cleanup-stderr-1); rc=$?
if [ "$rc" = "0" ] && [ -z "$out" ] && [ ! -d ".agent-harness/sdd" ]; then
    log_pass "exit=0, stdout empty, dir not created"
else
    log_fail "rc=$rc, out='$out', stderr='$(cat /tmp/cleanup-stderr-1)'"
fi

# ==========================================
# Test 2: 目录有内容（含 .gitignore）→ 全部清空，保留空目录
# ==========================================
echo "--- Test 2: 目录有内容 → 清空 ---"
setup_repo
mkdir -p .agent-harness/sdd
touch .agent-harness/sdd/.gitignore
touch .agent-harness/sdd/progress.md
touch .agent-harness/sdd/task-1-brief.md
touch .agent-harness/sdd/task-1-report.md
touch .agent-harness/sdd/review-aaa..bbb.diff

out=$(bash "$SCRIPT" 2>/tmp/cleanup-stderr-2); rc=$?
remaining=$(ls -A .agent-harness/sdd/ 2>/dev/null | wc -l | tr -d ' ')
if [ "$rc" = "0" ] && \
   echo "$out" | grep -q "^cleaned:" && \
   [ -d ".agent-harness/sdd" ] && \
   [ "$remaining" = "0" ]; then
    log_pass "exit=0, 'cleaned:' printed, dir kept empty (.gitignore removed)"
else
    log_fail "rc=$rc, out='$out', remaining=$remaining, stderr='$(cat /tmp/cleanup-stderr-2)'"
fi

# ==========================================
# Test 3: rm 失败时不阻断 → exit 0，stderr 有 warning
# ==========================================
echo "--- Test 3: rm 失败 → 不阻断 ---"
if [ "$(id -u)" = "0" ]; then
    echo "    (skipped: running as root, permission test unreliable)"
else
    setup_repo
    mkdir -p .agent-harness/sdd
    touch .agent-harness/sdd/.gitignore .agent-harness/sdd/progress.md
    # 父目录改只读，rm 无法删除内部文件
    chmod 555 .agent-harness/sdd

    out=$(bash "$SCRIPT" 2>/tmp/cleanup-stderr-3); rc=$?
    chmod 755 .agent-harness/sdd  # 恢复以便 trap cleanup 能清理
    err=$(cat /tmp/cleanup-stderr-3)
    if [ "$rc" = "0" ] && \
       echo "$err" | grep -q "warning: cleanup-workspace failed"; then
        log_pass "exit=0 even on rm failure, stderr has warning"
    else
        log_fail "rc=$rc, out='$out', stderr='$err'"
    fi
fi

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
[ "$FAIL" = "0" ] || exit 1
