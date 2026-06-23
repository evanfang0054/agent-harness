#!/usr/bin/env bash
# Validates that every agents/*.md file has valid YAML frontmatter
# with required `name` and `description` fields.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/_helpers.sh"

echo "=== Test: Agents Frontmatter ==="

shopt -s nullglob
AGENT_FILES=("$REPO_ROOT"/agents/*.md)

if [ ${#AGENT_FILES[@]} -eq 0 ]; then
    fail "found agents/*.md files"
else
    pass "found ${#AGENT_FILES[@]} agent file(s)"
fi

for f in "${AGENT_FILES[@]}"; do
    name=$(basename "$f")

    # frontmatter starts with ---
    if head -1 "$f" | grep -q '^---$'; then
        pass "$name: frontmatter starts with ---"
    else
        fail "$name: frontmatter starts with ---"
    fi

    # frontmatter has a closing ---
    if awk 'NR>1 && /^---$/{found=1; exit} END{exit !found}' "$f"; then
        pass "$name: frontmatter has closing ---"
    else
        fail "$name: frontmatter has closing ---"
    fi

    # description field exists (handles multi-line YAML)
    if awk '/^---$/{n++; next} n==1 && /^description:/{found=1; exit} END{exit !found}' "$f"; then
        pass "$name: has description field"
    else
        fail "$name: has description field"
    fi

    # name field exists inside frontmatter
    AGENT_NAME=$(awk '/^---$/{n++; next} n==1 && /^name:/{sub(/^name:[[:space:]]*/,""); print; exit}' "$f")
    if [ -n "$AGENT_NAME" ]; then
        pass "$name: name field non-empty ($AGENT_NAME)"
    else
        fail "$name: name field non-empty"
    fi

    # if model field present, value non-empty
    if awk '/^---$/{n++; next} n==1 && /^model:/{found=1; exit} END{exit !found}' "$f"; then
        MODEL=$(awk '/^---$/{n++; next} n==1 && /^model:/{sub(/^model:[[:space:]]*/,""); print; exit}' "$f")
        if [ -n "$MODEL" ]; then
            pass "$name: model field non-empty ($MODEL)"
        else
            fail "$name: model field non-empty"
        fi
    fi
done

print_summary "Agents Frontmatter"
