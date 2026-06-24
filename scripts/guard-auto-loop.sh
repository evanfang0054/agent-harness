#!/usr/bin/env bash
# guard-auto-loop.sh — PreToolUse hook that prevents Claude from destroying
# its own auto-loop runtime state mid-run.
#
# Blocks bash commands that would delete or corrupt the .claude/auto-loop/
# state directory or the .claude/worktrees/ worktree where the running
# orchestrator lives. Without this, Claude sometimes runs `rm -rf .claude/...`
# or `git worktree remove` on itself and crashes the main loop.
#
# Env: AUTO_LOOP_ACTIVE=1 is set by auto-loop.sh before dispatching Claude.
# When not active, this hook is a no-op (lets normal dev work proceed).
#
# Exit codes (Claude Code PreToolUse convention):
#   0  allow the command
#   2  block the command (with stderr reason)

set -uo pipefail

# Only active during auto-loop runs
if [ "${AUTO_LOOP_ACTIVE:-0}" != "1" ]; then
    exit 0
fi

# Read the tool input JSON from stdin
INPUT=$(cat)

# Determine tool name: Claude Code PreToolUse passes tool_name at top level,
# but if absent we treat any input with tool_input.command as a Bash command.
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)

# If we have no command, nothing to check
[ -z "$COMMAND" ] && exit 0

# If tool_name is set and not Bash, skip (only inspect Bash commands)
if [ -n "$TOOL_NAME" ] && [ "$TOOL_NAME" != "Bash" ]; then
    exit 0
fi
# If tool_name is empty, assume Bash (PreToolUse without explicit tool_name)

# Patterns that would destroy the running auto-loop state.
# We deliberately keep this list narrow: only commands that operate on
# .claude/auto-loop/ or .claude/worktrees/ or call auto-loop.sh itself.
BLOCK_PATTERNS=(
    # Direct deletion of the state directory or its parents
    'rm[[:space:]]+-rf?[[:space:]].*\.claude/auto-loop'
    'rm[[:space:]]+-rf?[[:space:]].*\.claude/worktrees'
    'rm[[:space:]]+-rf?[[:space:]].*\.claude[[:space:]]*/?$'
    'rm[[:space:]]+-rf?[[:space:]].*\.claude[[:space:]]*"\s*$'
    # rmdir / find -delete on the same
    'rmdir[[:space:]].*\.claude/auto-loop'
    'rmdir[[:space:]].*\.claude/worktrees'
    'find[[:space:]].*\.claude/auto-loop.*-delete'
    'find[[:space:]].*\.claude/worktrees.*-delete'
    # Invoking auto-loop.sh from within itself
    'scripts/auto-loop\.sh'
    './scripts/auto-loop\.sh'
    'auto-loop\.sh[[:space:]]+--cleanup'
    'auto-loop\.sh[[:space:]]+--resume'
    # worktree removal (the running orchestrator's worktree)
    'git[[:space:]]+worktree[[:space:]]+remove'
    'git[[:space:]]+worktree[[:space:]]+prune'
)

for pattern in "${BLOCK_PATTERNS[@]}"; do
    if echo "$COMMAND" | grep -qE "$pattern"; then
        cat >&2 <<EOF
[guard-auto-loop] 阻止：命令会破坏正在运行的 auto-loop 状态。

被拦截命令: $COMMAND
匹配模式: $pattern

你在 auto-loop 进程内运行，删除 .claude/auto-loop/ 或 .claude/worktrees/
会导致主循环立即崩溃（state.json 和 stream.log 丢失）。

如果需要清理环境，请让外层 auto-loop.sh 脚本自己在结束后处理。
EOF
        exit 2
    fi
done

exit 0
