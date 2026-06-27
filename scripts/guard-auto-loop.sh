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
# Patterns are anchored to command-start (^) to avoid matching the path string
# inside comments, echo, heredoc, grep arguments, or variable assignments.
# Leading whitespace/env-var prefixes are tolerated by stripping them below.
#
# Pre-processing: strip leading comments so a `# rm -rf ...` comment is never
# mistaken for a real command. We do NOT strip echo/heredoc content because
# doing so is unsafe (echo can still cause harm if redirected), but the
# command-start anchoring already excludes those cases where the dangerous
# token is merely a quoted argument.
COMMAND_FOR_MATCH="$COMMAND"
# Strip a leading comment line: if the command starts with optional
# whitespace then '#', treat it as a non-command and skip matching.
case "$COMMAND_FOR_MATCH" in
    *[[:space:]]#*|\#*) COMMENT_LEADING=1 ;;
    *) COMMENT_LEADING=0 ;;
esac

# Only enforce the destructive patterns on real command invocations.
# We detect "real invocation" by anchoring each pattern to ^, optionally
# preceded by env-var assignments (FOO=bar baz) which bash allows.
ALLOW_PREFIX='^([A-Z_][A-Z0-9_]*=[^[:space:]]*[[:space:]]*)*'

BLOCK_PATTERNS=(
    # Direct deletion of the state directory or its parents (command-start)
    "${ALLOW_PREFIX}rm[[:space:]]+-rf?[[:space:]].*\.claude/auto-loop"
    "${ALLOW_PREFIX}rm[[:space:]]+-rf?[[:space:]].*\.claude/worktrees"
    "${ALLOW_PREFIX}rm[[:space:]]+-rf?[[:space:]].*\.claude[[:space:]]*([\"']/?)?$"
    "${ALLOW_PREFIX}rm[[:space:]]+-rf?[[:space:]]+(['\"]?)\.claude\1[[:space:]]*$"
    # rmdir / find -delete on the same (command-start only)
    "${ALLOW_PREFIX}rmdir[[:space:]].*\.claude/auto-loop"
    "${ALLOW_PREFIX}rmdir[[:space:]].*\.claude/worktrees"
    "${ALLOW_PREFIX}find[[:space:]].*\.claude/auto-loop.*-delete"
    "${ALLOW_PREFIX}find[[:space:]].*\.claude/worktrees.*-delete"
    # Invoking auto-loop.sh as an actual command (command-start only).
    # Matches: scripts/auto-loop.sh ... , ./scripts/auto-loop.sh ... ,
    # bare `auto-loop.sh --cleanup/--resume` (other args are safe calls
    # the orchestrator is allowed to make from within its own loop, but we
    # still block any direct invocation to avoid recursion).
    "${ALLOW_PREFIX}(\./)?scripts/auto-loop\.sh([[:space:]]|$)"
    "${ALLOW_PREFIX}(\./)?scripts/auto-loop\.sh[[:space:]]+--cleanup"
    "${ALLOW_PREFIX}(\./)?scripts/auto-loop\.sh[[:space:]]+--resume"
    "${ALLOW_PREFIX}auto-loop\.sh([[:space:]]+--(cleanup|resume))?([[:space:]]|$)"
    # worktree removal (the running orchestrator's worktree)
    "${ALLOW_PREFIX}git[[:space:]]+worktree[[:space:]]+remove"
    "${ALLOW_PREFIX}git[[:space:]]+worktree[[:space:]]+prune"
)

# Skip matching entirely for leading-comment lines (a `# rm -rf ...` is not
# a command bash will execute as rm).
if [ "$COMMENT_LEADING" = "1" ]; then
    exit 0
fi

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
