#!/usr/bin/env bash
# Test: scripts/bump-version.sh --check / --audit on the current repo.
# Verifies: declared files exist, --check exits 0 with current version,
# --audit exits 0, and no drift is reported in --check output.
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/_helpers.sh"

echo "=== Test: bump-version.sh ==="

BUMP="$REPO_ROOT/scripts/bump-version.sh"
CONFIG="$REPO_ROOT/.version-bump.json"

assert_executable "$BUMP" "bump-version.sh is executable"
assert_file_exists "$CONFIG" ".version-bump.json exists"

# --- All declared files exist ---
FILE_COUNT=$(jq -r '.files | length' "$CONFIG")
DECLARED_OK=0
while IFS=$'\t' read -r path field; do
    if [ -f "$REPO_ROOT/$path" ]; then
        DECLARED_OK=$((DECLARED_OK + 1))
    else
        fail "declared file exists: $path"
    fi
done < <(jq -r '.files[] | "\(.path)\t\(.field)"' "$CONFIG")
if [ "$DECLARED_OK" = "$FILE_COUNT" ]; then
    pass "all $FILE_COUNT declared files exist"
fi

# --- --check exits 0 ---
CHECK_OUTPUT=$(bash "$BUMP" --check 2>&1) && CHECK_EXIT=$? || CHECK_EXIT=$?
if [ "$CHECK_EXIT" = "0" ]; then
    pass "bump-version --check exits 0"
else
    fail "bump-version --check exits 0 (got $CHECK_EXIT)"
fi

# --- --check output contains the current version ---
CURRENT_VER=$(jq -r '.version' "$REPO_ROOT/package.json")
if echo "$CHECK_OUTPUT" | grep -qF "$CURRENT_VER"; then
    pass "--check output contains current version ($CURRENT_VER)"
else
    fail "--check output contains current version ($CURRENT_VER)"
fi

# --- --check reports in-sync (no drift) ---
if echo "$CHECK_OUTPUT" | grep -qi "in sync"; then
    pass "--check reports all files in sync"
else
    fail "--check reports all files in sync (output did not contain 'in sync')"
fi

# --- --audit exits 0 ---
AUDIT_OUTPUT=$(bash "$BUMP" --audit 2>&1) && AUDIT_EXIT=$? || AUDIT_EXIT=$?
if [ "$AUDIT_EXIT" = "0" ]; then
    pass "bump-version --audit exits 0"
else
    fail "bump-version --audit exits 0 (got $AUDIT_EXIT)"
fi

# --- --audit output contains the version scan header ---
if echo "$AUDIT_OUTPUT" | grep -qF "Audit: scanning repo for version string"; then
    pass "--audit runs version scan"
else
    fail "--audit runs version scan (header missing)"
fi

print_summary "bump-version.sh"
