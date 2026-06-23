#!/usr/bin/env bash
# Shared helpers for plugin-infrastructure tests
# Usage: source "$(dirname "$0")/_helpers.sh"

set -uo pipefail

# Locate repo root (plugin-infrastructure is two levels below root)
HELPERS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$HELPERS_DIR/../.." && pwd)"

PASS_COUNT=0
FAIL_COUNT=0

pass() {
    echo "  [PASS] $1"
    PASS_COUNT=$((PASS_COUNT + 1))
}

fail() {
    echo "  [FAIL] $1"
    FAIL_COUNT=$((FAIL_COUNT + 1))
}

# assert_json_field <file> <jq-path> <expected> <test-name>
assert_json_field() {
    local file="$1" path="$2" expected="$3" name="$4"
    local actual
    actual=$(jq -r "$path" "$file" 2>/dev/null)
    if [ "$actual" = "$expected" ]; then
        pass "$name"
    else
        fail "$name (expected '$expected', got '$actual')"
    fi
}

# assert_file_exists <path> <test-name>
assert_file_exists() {
    if [ -f "$1" ]; then pass "$2"; else fail "$2 (missing: $1)"; fi
}

# assert_executable <path> <test-name>
assert_executable() {
    if [ -x "$1" ]; then pass "$2"; else fail "$2 (not executable: $1)"; fi
}

# print_summary <suite-name>
print_summary() {
    echo ""
    echo "=== $1 Summary ==="
    echo "Passed: $PASS_COUNT"
    echo "Failed: $FAIL_COUNT"
    if [ "$FAIL_COUNT" -gt 0 ]; then
        echo "STATUS: FAILED"
        return 1
    fi
    echo "STATUS: PASSED"
    return 0
}
