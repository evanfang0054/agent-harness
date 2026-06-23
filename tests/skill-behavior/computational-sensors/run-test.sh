#!/usr/bin/env bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../_helpers/run-skill.sh"
source "$SCRIPT_DIR/../_helpers/assert-skill-triggered.sh"

echo "=== Test: computational-sensors ==="
echo ""
run_skill "computational-sensors" "$SCRIPT_DIR/prompts/naive-run-sensors.txt" 3
assert_skill_triggered "computational-sensors"
assert_no_premature_action
assert_output_contains "lint\|typecheck\|test\|coverage\|sensor\|check\|检查\|覆盖\|传感器" "mentions computational sensors"
print_skill_summary "computational-sensors"
