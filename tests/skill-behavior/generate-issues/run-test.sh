#!/usr/bin/env bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../_helpers/run-skill.sh"
source "$SCRIPT_DIR/../_helpers/assert-skill-triggered.sh"

echo "=== Test: generate-issues ==="
echo ""

# --- naive scenario ---
run_skill "generate-issues" "$SCRIPT_DIR/prompts/naive-analyze-sessions.txt" 3
assert_skill_triggered "generate-issues"
assert_no_premature_action
assert_output_contains "dry.run\|不修复\|not fix\|只分析\|analyze.only" "mentions dry-run / no-fix mode"

# --- explicit scenario ---
SKILL_PASS_COUNT=0
SKILL_FAIL_COUNT=0
run_skill "generate-issues" "$SCRIPT_DIR/prompts/explicit-invoke.txt" 3
assert_skill_triggered "generate-issues"
assert_no_premature_action
assert_output_contains "dry.run\|不修复\|not fix\|只分析\|analyze.only" "mentions dry-run / no-fix mode"

print_skill_summary "generate-issues"
