#!/usr/bin/env bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../_helpers/run-skill.sh"
source "$SCRIPT_DIR/../_helpers/assert-skill-triggered.sh"

echo "=== Test: fix-issues-and-pr ==="
echo ""

# --- naive scenario ---
run_skill "fix-issues-and-pr" "$SCRIPT_DIR/prompts/naive-fix-issues.txt" 4
assert_skill_triggered "fix-issues-and-pr"
assert_no_premature_action
assert_output_contains "fix.only\|不分析\|not analyze\|直接修复" "mentions fix-only / skip-analysis mode"
assert_output_contains "PR\|pull.request\|closes" "mentions PR or closes"

# --- explicit scenario ---
SKILL_PASS_COUNT=0
SKILL_FAIL_COUNT=0
run_skill "fix-issues-and-pr" "$SCRIPT_DIR/prompts/explicit-invoke.txt" 4
assert_skill_triggered "fix-issues-and-pr"
assert_no_premature_action
assert_output_contains "fix.only\|不分析\|not analyze\|直接修复" "mentions fix-only / skip-analysis mode"
assert_output_contains "PR\|pull.request\|closes" "mentions PR or closes"

print_skill_summary "fix-issues-and-pr"
