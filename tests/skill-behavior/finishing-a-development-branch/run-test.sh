#!/usr/bin/env bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../_helpers/run-skill.sh"
source "$SCRIPT_DIR/../_helpers/assert-skill-triggered.sh"

echo "=== Test: finishing-a-development-branch ==="
echo ""
run_skill "finishing-a-development-branch" "$SCRIPT_DIR/prompts/naive-finish-branch.txt" 3
assert_skill_triggered "finishing-a-development-branch"
assert_no_premature_action
assert_output_contains "merge\|PR\|cleanup\|branch\|integrate\|合并\|清理\|分支\|集成" "mentions branch finishing"
print_skill_summary "finishing-a-development-branch"
