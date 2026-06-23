#!/usr/bin/env bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../_helpers/run-skill.sh"
source "$SCRIPT_DIR/../_helpers/assert-skill-triggered.sh"

echo "=== Test: documentation-sync ==="
echo ""
run_skill "documentation-sync" "$SCRIPT_DIR/prompts/naive-sync-docs.txt" 3
assert_skill_triggered "documentation-sync"
assert_no_premature_action
assert_output_contains "doc\|readme\|changelog\|sync\|update\|文档\|同步\|更新" "mentions doc sync"
print_skill_summary "documentation-sync"
