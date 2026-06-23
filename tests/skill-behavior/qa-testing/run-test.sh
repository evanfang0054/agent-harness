#!/usr/bin/env bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../_helpers/run-skill.sh"
source "$SCRIPT_DIR/../_helpers/assert-skill-triggered.sh"

echo "=== Test: qa-testing ==="
echo ""
run_skill "qa-testing" "$SCRIPT_DIR/prompts/naive-qa-webapp.txt" 3
assert_skill_triggered "qa-testing"
assert_no_premature_action
assert_output_contains "qa\|test\|bug\|fix\|测试\|缺陷\|修复\|问题" "mentions QA workflow"
print_skill_summary "qa-testing"
