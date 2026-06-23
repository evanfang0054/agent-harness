#!/usr/bin/env bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../_helpers/run-skill.sh"
source "$SCRIPT_DIR/../_helpers/assert-skill-triggered.sh"

echo "=== Test: loop-detection ==="
echo ""
run_skill "loop-detection" "$SCRIPT_DIR/prompts/naive-stuck-editing.txt" 3
assert_skill_triggered "loop-detection"
assert_no_premature_action
assert_output_contains "loop\|stuck\|converge\|repeat\|doom\|循环\|卡住\|收敛\|重复" "mentions loop detection"
print_skill_summary "loop-detection"
