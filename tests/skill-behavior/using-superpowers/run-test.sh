#!/usr/bin/env bash
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../_helpers/run-skill.sh"
source "$SCRIPT_DIR/../_helpers/assert-skill-triggered.sh"

echo "=== Test: using-superpowers ==="
echo ""

# 注意：using-superpowers 自身设了 disable-model-invocation: true（仅会话启动时由 hook 注入，
# 不允许模型通过 Skill 工具直接调用）。因此冒烟测试验证的是模型对"什么是 skills"这类
# 问题的自然入口 skill —— superpowers:help（commands/help.md 暴露为可调用 skill）。
# 这依然覆盖了 helpers 框架：run-skill.sh 启 claude、assert-skill-triggered 解析日志、
# assert_no_premature_action 检查无前置 tool_use。
run_skill "using-superpowers" "$SCRIPT_DIR/prompts/ask-about-skills.txt" 3

assert_skill_triggered "help"
assert_no_premature_action
assert_output_contains "skill\|Skill" "output mentions skills"

print_skill_summary "using-superpowers"
