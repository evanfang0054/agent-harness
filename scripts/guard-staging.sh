#!/usr/bin/env bash
# PreToolUse hook: prevent accidental staging of runtime files.
# Blocks `git add` that would stage protected paths unless -f/--force is given.
# Reads PreToolUse event JSON from stdin. Exit 0 = allow, exit 2 = block.

set -uo pipefail

# Protected runtime paths (relative to repo root)
PROTECTED_PATHS=(
    ".superpowers/learnings.jsonl"
    ".superpowers/sdd/"
    ".superpowers/loop-tracker.json"
)

# Read event JSON from stdin
INPUT="$(cat)"
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# Not a git add command at all → passthrough
case "$COMMAND" in
    *"git add"*) ;;
    *) exit 0 ;;
esac

# Force flag → allow explicitly
case "$COMMAND" in
    *" -f"*|*" --force"*) exit 0 ;;
esac

# Check for explicit protected path mentions FIRST (more specific than broad-catch)
for p in "${PROTECTED_PATHS[@]}"; do
    case "$COMMAND" in
        *"$p"*)
            echo "[guard-staging] Blocked: refusing to stage protected runtime path '$p'. Use -f to force." >&2
            exit 2
            ;;
    esac
done

# Broad-catch forms that stage everything (git add ., git add -A, git add --all)
case "$COMMAND" in
    *"git add ."*|*"git add -A"*|*"git add --all"*)
        cat >&2 <<'EOF'
[guard-staging] Blocked: 'git add .' / 'git add -A' stages all files including
runtime artifacts. List files explicitly, or use 'git add -f' to force.
Protected paths:
EOF
        printf '  - %s\n' "${PROTECTED_PATHS[@]}" >&2
        exit 2
        ;;
esac

exit 0
