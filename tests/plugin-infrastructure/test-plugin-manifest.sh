#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/_helpers.sh"

echo "=== Test: Plugin Manifest ==="

PLUGIN_JSON="$REPO_ROOT/.claude-plugin/plugin.json"
PACKAGE_JSON="$REPO_ROOT/package.json"

assert_file_exists "$PLUGIN_JSON" "plugin.json exists"
assert_file_exists "$PACKAGE_JSON" "package.json exists"

if jq empty "$PLUGIN_JSON" 2>/dev/null; then pass "plugin.json is valid JSON"; else fail "plugin.json is valid JSON"; fi

PLUGIN_NAME=$(jq -r '.name' "$PLUGIN_JSON")
PKG_NAME=$(jq -r '.name' "$PACKAGE_JSON")
if [ "$PLUGIN_NAME" = "$PKG_NAME" ] && [ -n "$PLUGIN_NAME" ]; then
    pass "name matches package.json ($PLUGIN_NAME)"
else
    fail "name matches package.json (plugin=$PLUGIN_NAME pkg=$PKG_NAME)"
fi

assert_json_field "$PLUGIN_JSON" '.version' "$(jq -r '.version' "$PACKAGE_JSON")" "version matches package.json"

KEYWORDS_TYPE=$(jq -r '.keywords | type' "$PLUGIN_JSON")
if [ "$KEYWORDS_TYPE" = "array" ]; then pass "keywords is array"; else fail "keywords is array (got $KEYWORDS_TYPE)"; fi

HOMEPAGE=$(jq -r '.homepage // empty' "$PLUGIN_JSON")
if [ -n "$HOMEPAGE" ]; then pass "homepage non-empty"; else fail "homepage non-empty"; fi

REPO=$(jq -r '.repository // empty' "$PLUGIN_JSON")
if [ -n "$REPO" ]; then pass "repository non-empty"; else fail "repository non-empty"; fi

print_summary "Plugin Manifest"
