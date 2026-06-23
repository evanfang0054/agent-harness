#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/_helpers.sh"

echo "=== Test: Commands Frontmatter ==="

shopt -s nullglob
COMMAND_FILES=("$REPO_ROOT"/commands/*.md)

if [ ${#COMMAND_FILES[@]} -eq 0 ]; then
    fail "found commands/*.md files"
else
    pass "found ${#COMMAND_FILES[@]} command files"
fi

for f in "${COMMAND_FILES[@]}"; do
    name=$(basename "$f")

    # frontmatter 起始 ---
    if head -1 "$f" | grep -q '^---$'; then
        pass "$name: frontmatter starts with ---"
    else
        fail "$name: frontmatter starts with ---"
    fi

    # 存在闭合的第二个 ---
    if awk 'NR>1 && /^---$/{found=1; exit} END{exit !found}' "$f"; then
        pass "$name: frontmatter has closing ---"
    else
        fail "$name: frontmatter has closing ---"
    fi

    # description 必填且非空
    DESC=$(awk '/^---$/{n++; next} n==1 && /^description:/{sub(/^description:[[:space:]]*/,""); gsub(/^"|"$/,""); print; exit}' "$f")
    if [ -n "$DESC" ]; then
        pass "$name: description non-empty"
    else
        fail "$name: description non-empty"
    fi

    # 若有 allowed-tools，应是数组格式（以 [ 开头）或合法字符串
    if grep -q '^allowed-tools:' "$f"; then
        AT=$(awk '/^---$/{n++; next} n==1 && /^allowed-tools:/{sub(/^allowed-tools:[[:space:]]*/,""); print; exit}' "$f")
        if echo "$AT" | grep -q '^\[' || [ -n "$AT" ]; then
            pass "$name: allowed-tools format valid"
        else
            fail "$name: allowed-tools format valid (got '$AT')"
        fi
    fi
done

print_summary "Commands Frontmatter"
