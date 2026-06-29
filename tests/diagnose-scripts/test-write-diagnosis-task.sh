#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
TEST_DIR="/tmp/agent-harness-wdt-test-$$"
RED='\033[0;31m'; GREEN='\033[0;32m'; NC='\033[0m'
PASS=0; FAIL=0
log_pass() { echo -e "${GREEN}✅ PASS${NC}: $1"; PASS=$((PASS+1)); }
log_fail() { echo -e "${RED}❌ FAIL${NC}: $1"; FAIL=$((FAIL+1)); }
cleanup() { rm -rf "$TEST_DIR"; }
trap cleanup EXIT

setup() { rm -rf "$TEST_DIR"; mkdir -p "$TEST_DIR"; cd "$TEST_DIR"; export CLAUDE_PROJECT_DIR="$TEST_DIR"; }

echo "=== Write Diagnosis Task Tests ==="

# --- Test 1: append to existing plan ---
echo "--- Test 1: append to plan.md ---"
setup
mkdir -p docs/agent-harness/plans
cat > docs/agent-harness/plans/p.md <<EOF
# Plan
EOF
cat > diag.json <<'EOF'
{"ts":"2026-06-29T00:00:00Z","failure_type":"loop","spec_topic":"t1","failure_summary":"3 edits","evidence":{},"root_cause_hypothesis":"h","suggested_fixes":[{"action":"revisit-brainstorming","rationale":"r"}],"confidence":7}
EOF
"$PLUGIN_DIR/scripts/write-diagnosis-task.sh" --diagnosis diag.json --plan docs/agent-harness/plans/p.md
grep -q "auto-generated" docs/agent-harness/plans/p.md && log_pass "appended to plan" || log_fail "not appended"
grep -q "revisit-brainstorming" docs/agent-harness/plans/p.md && log_pass "task action present" || log_fail "action missing"

# --- Test 2: standalone when no plan ---
echo "--- Test 2: standalone when no plan ---"
setup
cat > diag.json <<'EOF'
{"ts":"2026-06-29T00:00:00Z","failure_type":"loop","spec_topic":"t1","failure_summary":"3 edits","evidence":{},"root_cause_hypothesis":"h","suggested_fixes":[{"action":"revisit-brainstorming","rationale":"r"}],"confidence":7}
EOF
"$PLUGIN_DIR/scripts/write-diagnosis-task.sh" --diagnosis diag.json 2>&1
F=$(ls docs/agent-harness/notes/diagnoses/*.md 2>/dev/null | head -1)
[ -n "$F" ] && log_pass "standalone created" || log_fail "no standalone file"

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] || exit 1
