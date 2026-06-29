#!/usr/bin/env bash
# Test phase-metrics scripts (log-phase-metric.sh and query-phase-metrics.sh)
# Usage: ./test-phase-metrics.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
TEST_DIR="/tmp/agent-harness-phase-metrics-test-$$"

RED='\033[0;31m'; GREEN='\033[0;32m'; NC='\033[0m'
PASS=0; FAIL=0
log_pass() { echo -e "${GREEN}✅ PASS${NC}: $1"; ((PASS++)); }
log_fail() { echo -e "${RED}❌ FAIL${NC}: $1"; ((FAIL++)); }
cleanup() { rm -rf "$TEST_DIR"; }
trap cleanup EXIT

setup() {
  rm -rf "$TEST_DIR"; mkdir -p "$TEST_DIR"; cd "$TEST_DIR"
  export CLAUDE_PROJECT_DIR="$TEST_DIR"
  git init -q 2>/dev/null || true
}

echo "=== Phase Metrics Scripts Tests ==="

# --- Test 1: log-phase-metric.sh basic usage ---
echo "--- Test 1: log-phase-metric.sh basic write ---"
setup
"$PLUGIN_DIR/scripts/log-phase-metric.sh" \
  --phase brainstorming --action end --duration-ms 1000 \
  --tokens-in 100 --tokens-out 50 --spec-topic test-topic

if [ -f .agent-harness/phase-metrics.jsonl ]; then
  if python3 -c "import json; json.loads(open('.agent-harness/phase-metrics.jsonl').read())" 2>/dev/null; then
    log_pass "log-phase-metric.sh writes valid JSON line"
  else
    log_fail "log-phase-metric.sh writes invalid JSON"
  fi
else
  log_fail "log-phase-metric.sh did not create file"
fi

# --- Test 2: missing optional args still works ---
echo "--- Test 2: minimal args (phase + action only) ---"
setup
"$PLUGIN_DIR/scripts/log-phase-metric.sh" --phase writing-plans --action start
if [ -f .agent-harness/phase-metrics.jsonl ]; then
  log_pass "minimal args writes file"
else
  log_fail "minimal args failed"
fi

# --- Test 3: spec-topic with special chars (injection safety) ---
echo "--- Test 3: spec-topic with quotes/slashes ---"
setup
"$PLUGIN_DIR/scripts/log-phase-metric.sh" \
  --phase brainstorming --action end --spec-topic 'a"b\c/d'
if python3 -c "
import json
line = open('.agent-harness/phase-metrics.jsonl').read().strip()
d = json.loads(line)
assert d['spec_topic'] == 'a\"b\\\\c/d', d['spec_topic']
" 2>/dev/null; then
  log_pass "special chars preserved verbatim"
else
  log_fail "special chars broke JSON"
fi

# --- Test 4: exit code is 0 even on weird input ---
echo "--- Test 4: silent failure on bad args ---"
setup
"$PLUGIN_DIR/scripts/log-phase-metric.sh" >/dev/null 2>&1
[ $? -eq 0 ] && log_pass "missing phase/action exits 0" || log_fail "non-zero exit"

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] || exit 1
