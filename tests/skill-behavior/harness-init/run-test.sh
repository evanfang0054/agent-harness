#!/usr/bin/env bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../_helpers/run-skill.sh"
source "$SCRIPT_DIR/../_helpers/assert-skill-triggered.sh"

echo "=== Test: harness-init ==="
echo ""
run_skill "harness-init" "$SCRIPT_DIR/prompts/naive-init-project.txt" 3
assert_skill_triggered "harness-init"
assert_no_premature_action
assert_output_contains "tech stack\|init\|setup\|react\|python\|template\|技术栈\|初始化\|配置" "mentions project init"
print_skill_summary "harness-init"
