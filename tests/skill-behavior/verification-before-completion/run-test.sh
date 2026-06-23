#!/usr/bin/env bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../_helpers/run-skill.sh"
source "$SCRIPT_DIR/../_helpers/assert-skill-triggered.sh"

echo "=== Test: verification-before-completion ==="
echo ""
run_skill "verification-before-completion" "$SCRIPT_DIR/prompts/naive-verify-complete.txt" 3
assert_skill_triggered "verification-before-completion"
assert_no_premature_action
assert_output_contains "evidence\|verify\|run\|claim\|command\|证据\|验证\|运行\|声明\|命令" "mentions evidence-first"
print_skill_summary "verification-before-completion"
