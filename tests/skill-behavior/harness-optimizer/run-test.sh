#!/usr/bin/env bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../_helpers/run-skill.sh"
source "$SCRIPT_DIR/../_helpers/assert-skill-triggered.sh"

echo "=== Test: harness-optimizer ==="
echo ""
run_skill "harness-optimizer" "$SCRIPT_DIR/prompts/naive-optimize-from-session.txt" 3

# harness-optimizer 的 SKILL.md 设置了 disable-model-invocation: true，
# 只能通过 slash command 触发；slash 加载 skill 内容后，模型会按 SKILL.md
# 的要求宣布 "我正在使用 harness-optimizer 分析会话数据"。这里用该短语作为
# skill 被激活的证据。
if grep -q "harness-optimizer" "$LOG_FILE" && \
   grep -qE "正在使用 harness-optimizer|harness-optimizer 分析" "$LOG_FILE"; then
    SKILL_CURRENT="harness-optimizer"
    echo "  [PASS] Skill 'harness-optimizer' activated"
    SKILL_PASS_COUNT=$((SKILL_PASS_COUNT + 1))
else
    echo "  [FAIL] Skill 'harness-optimizer' activated"
    SKILL_FAIL_COUNT=$((SKILL_FAIL_COUNT + 1))
    echo "    Expected announcement: '正在使用 harness-optimizer ...'" >&2
fi

assert_no_premature_action
assert_output_contains "session\|analyze\|optimize\|workflow\|skill\|会话\|分析\|优化\|工作流" "mentions session-based optimization"
print_skill_summary "harness-optimizer"
