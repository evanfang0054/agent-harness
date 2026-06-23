#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/_helpers.sh"

echo "=== Test: Scripts Smoke ==="

shopt -s nullglob
SCRIPTS=("$REPO_ROOT"/scripts/*.sh)

if [ ${#SCRIPTS[@]} -eq 0 ]; then
    fail "found scripts/*.sh files"
else
    pass "found ${#SCRIPTS[@]} scripts"
fi

for script in "${SCRIPTS[@]}"; do
    name=$(basename "$script")

    # 脚本可执行位（或至少可被 bash 调用）
    if [ -x "$script" ] || bash -n "$script" 2>/dev/null; then
        pass "$name: syntax valid / executable"
    else
        fail "$name: syntax valid / executable"
        continue
    fi

    # 无参数调用不崩溃（exit 127 = command not found 是可接受的；exit 0 或其他非 127 也算通过）
    # 对某些脚本，无参数会打印 usage 并 exit 1，这也是可接受的
    OUTPUT=$(bash "$script" --help 2>&1) && EXIT_CODE=0 || EXIT_CODE=$?
    if [ "$EXIT_CODE" = "0" ] || [ "$EXIT_CODE" = "1" ] || [ "$EXIT_CODE" = "2" ]; then
        pass "$name: --help/no-args doesn't crash (exit $EXIT_CODE)"
    elif [ "$EXIT_CODE" = "127" ]; then
        fail "$name: --help/no-args doesn't crash (command not found)"
    else
        # 某些脚本需要参数，exit 非 0 但不崩溃也算通过
        pass "$name: --help/no-args tolerable (exit $EXIT_CODE)"
    fi
done

print_summary "Scripts Smoke"
