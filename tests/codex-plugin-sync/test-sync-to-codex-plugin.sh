#!/usr/bin/env bash
# Codex plugin manifest 一致性测试
# 验证 .codex-plugin/plugin.json 与仓库其他元数据一致、引用的资源都存在
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

MANIFEST="$REPO_ROOT/.codex-plugin/plugin.json"
PACKAGE_JSON="$REPO_ROOT/package.json"

FAILURES=0

pass() { echo "  [PASS] $1"; }
fail() { echo "  [FAIL] $1"; FAILURES=$((FAILURES + 1)); }

assert_exists() {
    local path="$1"
    local desc="$2"
    if [[ -e "$path" ]]; then
        pass "$desc"
    else
        fail "$desc (路径不存在: $path)"
    fi
}

assert_json_eq() {
    local actual="$1"
    local expected="$2"
    local desc="$3"
    if [[ "$actual" == "$expected" ]]; then
        pass "$desc"
    else
        fail "$desc"
        echo "    expected: $expected"
        echo "    actual:   $actual"
    fi
}

echo "=== Test: Codex plugin manifest 一致性 ==="

# 1. manifest 存在
assert_exists "$MANIFEST" "Codex plugin manifest 存在"

# 2. manifest 的 skills 字段指向存在的目录
SKILLS_DIR="$REPO_ROOT/$(jq -r .skills "$MANIFEST")"
assert_exists "$SKILLS_DIR" "manifest.skills 指向的目录存在"

# 3. manifest 的 hooks 字段指向存在的文件
HOOKS_FILE="$REPO_ROOT/$(jq -r .hooks "$MANIFEST")"
assert_exists "$HOOKS_FILE" "manifest.hooks 指向的文件存在"

# 4. manifest 的 composerIcon 引用存在
COMPOSER_ICON="$REPO_ROOT/$(jq -r '.interface.composerIcon' "$MANIFEST")"
assert_exists "$COMPOSER_ICON" "manifest.interface.composerIcon 引用存在"

# 5. manifest 的 logo 引用存在
LOGO="$REPO_ROOT/$(jq -r '.interface.logo' "$MANIFEST")"
assert_exists "$LOGO" "manifest.interface.logo 引用存在"

# 6. manifest 的 version 与 package.json 的 version 一致（防漂移）
MANIFEST_VERSION=$(jq -r .version "$MANIFEST")
PACKAGE_VERSION=$(jq -r .version "$PACKAGE_JSON")
assert_json_eq "$MANIFEST_VERSION" "$PACKAGE_VERSION" "manifest version 与 package.json version 一致"

# 7. manifest 的 name 与 package.json 的 name 一致
MANIFEST_NAME=$(jq -r .name "$MANIFEST")
PACKAGE_NAME=$(jq -r .name "$PACKAGE_JSON")
assert_json_eq "$MANIFEST_NAME" "$PACKAGE_NAME" "manifest name 与 package.json name 一致"

# 8. 必填字段不为空
DISPLAY_NAME=$(jq -r '.interface.displayName' "$MANIFEST")
if [[ -n "$DISPLAY_NAME" && "$DISPLAY_NAME" != "null" ]]; then
    pass "interface.displayName 非空"
else
    fail "interface.displayName 非空 (实际值: $DISPLAY_NAME)"
fi

if [[ $FAILURES -ne 0 ]]; then
    echo ""
    echo "FAILED: $FAILURES assertion(s) failed."
    exit 1
fi

echo ""
echo "PASS"
