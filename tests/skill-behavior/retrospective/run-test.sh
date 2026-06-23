#!/usr/bin/env bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../_helpers/run-skill.sh"
source "$SCRIPT_DIR/../_helpers/assert-skill-triggered.sh"

echo "=== Test: retrospective ==="
echo ""
run_skill "retrospective" "$SCRIPT_DIR/prompts/naive-do-retro.txt" 3
assert_skill_triggered "retrospective"
assert_no_premature_action
assert_output_contains "retro\|accomplish\|pattern\|commit\|learning\|复盘\|回顾\|模式\|提交\|学习" "mentions retro analysis"
print_skill_summary "retrospective"
