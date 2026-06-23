#!/usr/bin/env bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../_helpers/run-skill.sh"
source "$SCRIPT_DIR/../_helpers/assert-skill-triggered.sh"

echo "=== Test: requesting-code-review ==="
echo ""
run_skill "requesting-code-review" "$SCRIPT_DIR/prompts/naive-request-review.txt" 3
assert_skill_triggered "requesting-code-review"
assert_no_premature_action
assert_output_contains "review\|plan\|issue\|severity\|审查\|计划\|问题\|严重" "mentions review dimensions"
print_skill_summary "requesting-code-review"
