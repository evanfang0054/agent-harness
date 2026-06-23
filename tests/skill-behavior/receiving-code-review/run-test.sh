#!/usr/bin/env bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../_helpers/run-skill.sh"
source "$SCRIPT_DIR/../_helpers/assert-skill-triggered.sh"

echo "=== Test: receiving-code-review ==="
echo ""
run_skill "receiving-code-review" "$SCRIPT_DIR/prompts/naive-receive-feedback.txt" 3
assert_skill_triggered "receiving-code-review"
assert_no_premature_action
assert_output_contains "verify\|technical\|rigor\|blindly\|question\|验证\|技术\|严谨\|盲从\|质疑" "mentions rigorous response"
print_skill_summary "receiving-code-review"
