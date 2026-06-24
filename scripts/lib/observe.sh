#!/usr/bin/env bash
# observe.sh — stream-json 解析 + 三层可观测性输出 + 信号检测
# Usage: source scripts/lib/observe.sh
#
# 关键设计：process_line 在主 shell 执行（不用管道），LAST_EVENT_TIME 对调用者可见。
# 调用者用 while read 循环逐行喂给 process_line，而非管道。

# 全局状态（主 shell 维护）
LAST_EVENT_TIME=$(date +%s)
LAST_SIGNAL=""  # COMPLETE | INTERVENTION | PUSH_FAILED | STATE_ERROR | ""
HEARTBEAT_THRESHOLD=60

# emit_event <icon> <step> <message>
emit_event() {
    local icon="$1" step="$2" msg="$3"
    local ts
    ts=$(date +"%H:%M:%S")
    echo "$ts $icon $step $msg" >&2
}

# emit_status <step> <phase> <think_time> <token_count>
emit_status() {
    local step="$1" phase="$2" think="$3" tokens="$4"
    printf "\r[%s] 🔧 %s | %s | %s tok" "$step" "$phase" "$think" "$tokens" >&2
}

# emit_heartbeat <step> <elapsed_seconds>
emit_heartbeat() {
    local step="$1" elapsed="$2"
    echo "⏳ $step 等待 Claude 响应中... (已等待 ${elapsed}s)" >&2
}

# process_line <json_line> — 处理单行 stream-json 事件
# 在主 shell 执行，直接修改全局 LAST_EVENT_TIME / LAST_SIGNAL
# 同时把心跳时间戳落盘，让后台心跳子 shell 能读到最新值（子 shell 无法共享父 shell 的变量）
process_line() {
    local line="$1"
    [ -z "$line" ] && return
    LAST_EVENT_TIME=$(date +%s)
    # 心跳子 shell 隔离问题：后台子 shell fork 后无法看到父 shell 对 LAST_EVENT_TIME 的更新。
    # 用一个共享文件做单向通信：process_line 写，子 shell 读。原子性足以支撑 30s 轮询。
    if [ -n "${HEARTBEAT_TIMESTAMP_FILE:-}" ] && [ -d "$(dirname "${HEARTBEAT_TIMESTAMP_FILE:-}")" ]; then
        echo "$LAST_EVENT_TIME" > "${HEARTBEAT_TIMESTAMP_FILE}" 2>/dev/null || true
    fi

    # 先检测信号关键字（result 事件的 result 字段里可能含完成/介入信号）
    local result_text
    result_text=$(echo "$line" | jq -r '.result // empty' 2>/dev/null)
    if [ -n "$result_text" ]; then
        if echo "$result_text" | grep -q "AUTO_LOOP_COMPLETE"; then
            LAST_SIGNAL="COMPLETE"
            emit_event "🏁" "" "Claude 完成（AUTO_LOOP_COMPLETE）"
            return
        fi
        if echo "$result_text" | grep -q "AUTO_LOOP_INTERVENTION_NEEDED"; then
            LAST_SIGNAL="INTERVENTION"
            emit_event "⚠️" "" "Claude 请求介入（AUTO_LOOP_INTERVENTION_NEEDED）"
            return
        fi
        if echo "$result_text" | grep -q "AUTO_LOOP_PUSH_FAILED"; then
            LAST_SIGNAL="PUSH_FAILED"
            emit_event "❌" "" "Claude push 失败"
            return
        fi
        if echo "$result_text" | grep -q "AUTO_LOOP_STATE_ERROR"; then
            LAST_SIGNAL="STATE_ERROR"
            emit_event "❌" "" "state.json 错误"
            return
        fi
    fi

    local type subtype
    type=$(echo "$line" | jq -r '.type // empty' 2>/dev/null)
    subtype=$(echo "$line" | jq -r '.subtype // empty' 2>/dev/null)

    case "$type" in
        stream_event)
            local event_type
            event_type=$(echo "$line" | jq -r '.event.type // empty' 2>/dev/null)
            case "$event_type" in
                tool_use)
                    local tool_name
                    tool_name=$(echo "$line" | jq -r '.event.name // "unknown"' 2>/dev/null)
                    emit_event "🔧" "" "工具调用: $tool_name"
                    ;;
                tool_result)
                    emit_event "✅" "" "工具返回"
                    ;;
            esac
            # text_delta 默认静默（防刷屏）
            ;;
        system)
            case "$subtype" in
                api_retry)
                    local attempt max delay error
                    attempt=$(echo "$line" | jq -r '.attempt // "?"' 2>/dev/null)
                    max=$(echo "$line" | jq -r '.max_retries // "?"' 2>/dev/null)
                    delay=$(echo "$line" | jq -r '.retry_delay_ms // "?"' 2>/dev/null)
                    error=$(echo "$line" | jq -r '.error // "unknown"' 2>/dev/null)
                    emit_event "⏳" "" "API 重试 ${attempt}/${max}，ETA ${delay}ms，原因: ${error}"
                    ;;
            esac
            ;;
        result)
            # 未匹配信号的 result
            emit_event "🏁" "" "Claude 完成"
            ;;
    esac
}

# log_raw <log_file> — 从 stdin 读，原样追加到日志
log_raw() {
    local log_file="$1"
    cat >> "$log_file"
}

# check_heartbeat <step> — 检查是否超阈值，超了打印心跳
# 优先从 HEARTBEAT_TIMESTAMP_FILE（由主 shell 的 process_line 实时更新）读取，
# 否则回退到本进程内的 LAST_EVENT_TIME（适用于前台同步调用场景）
check_heartbeat() {
    local step="$1"
    local now elapsed last_ts="${LAST_EVENT_TIME}"
    if [ -n "${HEARTBEAT_TIMESTAMP_FILE:-}" ] && [ -f "${HEARTBEAT_TIMESTAMP_FILE}" ]; then
        last_ts=$(cat "${HEARTBEAT_TIMESTAMP_FILE}" 2>/dev/null || echo "${LAST_EVENT_TIME}")
    fi
    now=$(date +%s)
    elapsed=$((now - last_ts))
    if [ "$elapsed" -ge "$HEARTBEAT_THRESHOLD" ]; then
        emit_heartbeat "$step" "$elapsed"
    fi
}
