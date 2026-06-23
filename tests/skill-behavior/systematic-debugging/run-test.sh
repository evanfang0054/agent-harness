#!/usr/bin/env bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../_helpers/run-skill.sh"
source "$SCRIPT_DIR/../_helpers/assert-skill-triggered.sh"

echo "=== Test: systematic-debugging ==="
echo ""
run_skill "systematic-debugging" "$SCRIPT_DIR/prompts/naive-debug-error.txt" 3
assert_skill_triggered "systematic-debugging"
assert_no_premature_action
assert_output_contains "root cause\|phase\|debug\|hypothesis\|reproduce\|根因\|调试\|假设\|复现\|阶段" "mentions systematic debug"
print_skill_summary "systematic-debugging"
