#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/_helpers.sh"
source "$REPO_ROOT/scripts/lib/state.sh"

echo "=== Test: auto-loop state.sh ==="

STATE_DIR="$REPO_ROOT/.claude/auto-loop"
rm -rf "$STATE_DIR" 2>/dev/null || true

# Case 1: state_init 创建 state.json 含正确默认值
state_init "test-run-001" "feat/auto-test" "测试需求" "$STATE_DIR"
assert_file_exists "$STATE_DIR/state.json" "state_init creates state.json"
assert_json_field "$STATE_DIR/state.json" '.run_id' 'test-run-001' "state has run_id"
assert_json_field "$STATE_DIR/state.json" '.branch' 'feat/auto-test' "state has branch"
assert_json_field "$STATE_DIR/state.json" '.request' '测试需求' "state has request"
assert_json_field "$STATE_DIR/state.json" '.current_step' 'init' "state default step"

# Case 2: state_set 更新字段（value 必须是合法 JSON 值表达式）
state_set "$STATE_DIR" '.current_step' '"exporting"'
assert_json_field "$STATE_DIR/state.json" '.current_step' 'exporting' "state_set updates step"

# Case 3: state_set 追加到 progress.issues_created 数组
state_set "$STATE_DIR" '.progress.issues_created' '["#1"]'
state_set "$STATE_DIR" '.progress.issues_created' '["#1","#2"]'
assert_json_field "$STATE_DIR/state.json" '.progress.issues_created | length' '2' "issues array grows"

# Case 4: state_get 读取字段
RESULT=$(state_get "$STATE_DIR" '.run_id')
if [ "$RESULT" = "test-run-001" ]; then pass "state_get reads field"; else fail "state_get reads field (got $RESULT)"; fi

# Case 5: state_clear 删除 state.json
state_clear "$STATE_DIR"
if [ ! -f "$STATE_DIR/state.json" ]; then pass "state_clear removes file"; else fail "state_clear removes file"; fi

# Case 6: state_init 安全处理含特殊字符的 request（引号、管道符）
state_init "test-special" "feat/x" '含"双引号"和|管道符的请求' "$STATE_DIR"
RESULT=$(state_get "$STATE_DIR" '.request')
if echo "$RESULT" | grep -q "双引号"; then pass "state_init escapes special chars"; else fail "state_init escapes special chars"; fi
# 验证 JSON 仍然有效
if jq empty "$STATE_DIR/state.json" 2>/dev/null; then pass "state.json valid with special chars"; else fail "state.json valid with special chars"; fi

# Case 7: state_set_str 安全写入字符串（含特殊字符）
state_init "test-str" "feat/y" "normal" "$STATE_DIR"
state_set_str "$STATE_DIR" '.current_step' '含"引号"的值'
RESULT=$(state_get "$STATE_DIR" '.current_step')
if echo "$RESULT" | grep -q "引号"; then pass "state_set_str escapes special chars"; else fail "state_set_str escapes"; fi

state_clear "$STATE_DIR"
print_summary "auto-loop state.sh"
