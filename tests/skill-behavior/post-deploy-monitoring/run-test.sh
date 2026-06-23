#!/usr/bin/env bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../_helpers/run-skill.sh"
source "$SCRIPT_DIR/../_helpers/assert-skill-triggered.sh"

echo "=== Test: post-deploy-monitoring ==="
echo ""
run_skill "post-deploy-monitoring" "$SCRIPT_DIR/prompts/naive-monitor-deploy.txt" 3
assert_skill_triggered "post-deploy-monitoring"
assert_no_premature_action
assert_output_contains "console\|performance\|error\|monitor\|canary\|监控\|控制台\|性能\|错误" "mentions monitoring dimensions"
print_skill_summary "post-deploy-monitoring"
