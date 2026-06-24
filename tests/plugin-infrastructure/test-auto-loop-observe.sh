#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/_helpers.sh"
source "$REPO_ROOT/scripts/lib/observe.sh"

echo "=== Test: auto-loop observe.sh ==="

LOG_FILE="/tmp/test-auto-loop-stream.log"
rm -f "$LOG_FILE"

# Case 1: emit_event 输出时间戳 + 消息
OUTPUT=$(emit_event "✅" "[1/8]" "分支已创建: feat/test" 2>&1)
if echo "$OUTPUT" | grep -q "✅"; then pass "emit_event has icon"; else fail "emit_event has icon"; fi
if echo "$OUTPUT" | grep -q "\[1/8\]"; then pass "emit_event has step"; else fail "emit_event has step"; fi
if echo "$OUTPUT" | grep -q "分支已创建"; then pass "emit_event has message"; else fail "emit_event has message"; fi

# Case 2: emit_status 单行刷新（含 \r）
OUTPUT=$(emit_status "[3/8]" "Issue #1 SDD执行中" "思考 2s" "3.2K tok" 2>&1)
if echo "$OUTPUT" | grep -q $'\r'; then pass "emit_status uses carriage return"; else fail "emit_status uses carriage return"; fi

# Case 3: process_line 处理 tool_use 事件
MOCK_TOOL_EVENT='{"type":"stream_event","event":{"type":"tool_use","name":"Bash","input":{"command":"git checkout -b feat/x"}}}'
RESULT=$(process_line "$MOCK_TOOL_EVENT" 2>&1)
if echo "$RESULT" | grep -q "🔧"; then pass "process tool_use emits wrench icon"; else fail "process tool_use emits wrench icon"; fi

# Case 4: process_line 处理 api_retry 事件
MOCK_RETRY='{"type":"system","subtype":"api_retry","attempt":1,"max_retries":5,"retry_delay_ms":2000,"error_status":429,"error":"rate_limit"}'
RESULT=$(process_line "$MOCK_RETRY" 2>&1)
if echo "$RESULT" | grep -q "⏳"; then pass "process api_retry emits hourglass"; else fail "process api_retry emits hourglass"; fi

# Case 5: process_line 处理 text_delta（静默丢弃）
MOCK_TEXT='{"type":"stream_event","event":{"delta":{"type":"text_delta","text":"some token"}}}'
RESULT=$(process_line "$MOCK_TEXT" 2>&1)
if [ -z "$RESULT" ]; then pass "text_delta suppressed by default"; else fail "text_delta suppressed (got: $RESULT)"; fi

# Case 6: process_line 检测 AUTO_LOOP_COMPLETE 信号
LAST_SIGNAL=""
process_line '{"type":"result","result":"All done.\nAUTO_LOOP_COMPLETE"}' >/dev/null 2>&1
if [ "$LAST_SIGNAL" = "COMPLETE" ]; then pass "detects AUTO_LOOP_COMPLETE"; else fail "detects AUTO_LOOP_COMPLETE (got: $LAST_SIGNAL)"; fi

# Case 7: process_line 检测 AUTO_LOOP_INTERVENTION_NEEDED 信号
LAST_SIGNAL=""
process_line '{"type":"result","result":"Stopped.\nAUTO_LOOP_INTERVENTION_NEEDED"}' >/dev/null 2>&1
if [ "$LAST_SIGNAL" = "INTERVENTION" ]; then pass "detects INTERVENTION_NEEDED"; else fail "detects INTERVENTION_NEEDED (got: $LAST_SIGNAL)"; fi

# Case 8: LAST_EVENT_TIME 在 process_line 后更新（主 shell 可见）
LAST_EVENT_TIME=0
process_line "$MOCK_TOOL_EVENT" >/dev/null 2>&1
if [ "$LAST_EVENT_TIME" -gt 0 ]; then pass "LAST_EVENT_TIME updated in main shell"; else fail "LAST_EVENT_TIME updated in main shell"; fi

# Case 9: check_heartbeat 超阈值时输出
LAST_EVENT_TIME=0  # 模拟很久以前
HEARTBEAT_THRESHOLD=0  # 立即触发
RESULT=$(check_heartbeat "[5/8]" 2>&1)
if echo "$RESULT" | grep -q "等待"; then pass "check_heartbeat emits when threshold exceeded"; else fail "check_heartbeat emits"; fi

# Case 10: log_raw 写入日志文件
echo "$MOCK_TOOL_EVENT" | log_raw "$LOG_FILE"
assert_file_exists "$LOG_FILE" "log_raw creates file"
COUNT=$(grep -c "tool_use" "$LOG_FILE" 2>/dev/null || echo 0)
if [ "$COUNT" = "1" ]; then pass "log_raw appends event"; else fail "log_raw appends (count=$COUNT)"; fi

rm -f "$LOG_FILE"
print_summary "auto-loop observe.sh"
