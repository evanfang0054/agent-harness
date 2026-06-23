#!/usr/bin/env bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../_helpers/run-skill.sh"
source "$SCRIPT_DIR/../_helpers/assert-skill-triggered.sh"

echo "=== Test: harness-design ==="
echo ""
run_skill "harness-design" "$SCRIPT_DIR/prompts/naive-prototype.txt" 3
assert_skill_triggered "harness-design"
assert_no_premature_action
assert_output_contains "design\|prototype\|html\|visual\|mockup\|设计\|原型\|视觉\|Demo" "mentions design/prototype"
print_skill_summary "harness-design"
