#!/usr/bin/env bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../_helpers/run-skill.sh"
source "$SCRIPT_DIR/../_helpers/assert-skill-triggered.sh"

echo "=== Test: trace-analysis ==="
echo ""
run_skill "trace-analysis" "$SCRIPT_DIR/prompts/naive-analyze-patterns.txt" 3
assert_skill_triggered "trace-analysis"
assert_no_premature_action
assert_output_contains "pattern\|learnings\|trace\|failure\|session\|模式\|分析\|轨迹\|失败\|会话" "mentions trace analysis"
print_skill_summary "trace-analysis"
