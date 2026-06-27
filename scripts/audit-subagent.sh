#!/usr/bin/env bash
# SubagentStop hook: lightweight audit of subagent output.
# Soft check only — exits 0 always, emits warnings to stdout (injected into context).
# Detects: very short output (< 50 chars), off-topic keyword drift.

set -uo pipefail

INPUT="$(cat)"

# Reentry guard — never recurse
STOP_HOOK_ACTIVE=$(echo "$INPUT" | jq -r '.stop_hook_active // false')
if [ "$STOP_HOOK_ACTIVE" = "true" ]; then
    exit 0
fi

OUTPUT=$(echo "$INPUT" | jq -r '.output // empty')
WARNINGS=""

# Check 1: suspiciously short output
OUTPUT_LEN=${#OUTPUT}
if [ "$OUTPUT_LEN" -lt 50 ]; then
    WARNINGS="${WARNINGS}- Subagent output is very short (${OUTPUT_LEN} chars) — task may be incomplete.\n"
fi

# Check 2: off-topic keyword drift
# Keywords unrelated to typical agent-harness development work
OFFTOPIC_KEYWORDS="Unity|Unreal Engine|game engine|shader|rendering pipeline|Roblox|Minecraft mod"
if echo "$OUTPUT" | grep -qiE "$OFFTOPIC_KEYWORDS"; then
    WARNINGS="${WARNINGS}- Subagent output mentions off-topic keywords (game engines / unrelated stacks) — verify task scope was respected.\n"
fi

# Emit warnings (if any) to stdout for context injection
if [ -n "$WARNINGS" ]; then
    AGENT_TYPE=$(echo "$INPUT" | jq -r '.agent_type // "unknown"')
    echo "[audit-subagent] Soft warning(s) for agent '${AGENT_TYPE}':"
    printf '%b' "$WARNINGS"
    echo "[audit-subagent] These are advisory only — review the subagent's work if concerned."
fi

exit 0
