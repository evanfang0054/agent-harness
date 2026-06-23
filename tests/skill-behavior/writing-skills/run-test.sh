#!/usr/bin/env bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../_helpers/run-skill.sh"
source "$SCRIPT_DIR/../_helpers/assert-skill-triggered.sh"

echo "=== Test: writing-skills ==="
echo ""
run_skill "writing-skills" "$SCRIPT_DIR/prompts/naive-create-skill.txt" 3
assert_skill_triggered "writing-skills"
assert_no_premature_action
assert_output_contains "skill\|frontmatter\|description\|SKILL.md\|when_to_use\|技能" "mentions skill authoring"
print_skill_summary "writing-skills"
