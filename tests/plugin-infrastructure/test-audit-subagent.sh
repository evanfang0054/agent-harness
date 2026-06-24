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
