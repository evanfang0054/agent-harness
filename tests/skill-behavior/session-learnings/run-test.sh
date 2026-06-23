#!/usr/bin/env bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../_helpers/run-skill.sh"
source "$SCRIPT_DIR/../_helpers/assert-skill-triggered.sh"

echo "=== Test: session-learnings ==="
echo ""
run_skill "session-learnings" "$SCRIPT_DIR/prompts/naive-capture-learning.txt" 3
assert_skill_triggered "session-learnings"
assert_no_premature_action
assert_output_contains "learning\|capture\|pattern\|pitfall\|knowledge\|学习\|捕获\|模式\|陷阱\|知识" "mentions learning capture"
print_skill_summary "session-learnings"
