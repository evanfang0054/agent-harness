#!/usr/bin/env bash
# loop-detector.sh - Detect doom loops by tracking per-file edit counts
#
# Usage:
#   loop-detector.sh [session_id]
#   loop-detector.sh --track <file> [session_id]
#   loop-detector.sh --reset [session_id]
#
# Modes:
#   (default)     Read edit counts and output WARNING/HARD STOP
#   --track <file> Increment edit count for <file>
#   --reset        Clear edit tracker for session
#
# Thresholds (configurable via env):
#   LOOP_WARN_THRESHOLD=5   (default)
#   LOOP_HARD_THRESHOLD=8   (default)
#
# Storage: /tmp/superpowers-edit-tracker/{session_id}/edits.json
#
# Exit codes:
#   0 = OK (no warning)
#   1 = WARNING threshold reached
#   2 = HARD STOP threshold reached

set -euo pipefail

WARN_THRESHOLD="${LOOP_WARN_THRESHOLD:-5}"
HARD_THRESHOLD="${LOOP_HARD_THRESHOLD:-8}"
SESSION_ID="${1:-${CLAUDE_SESSION_ID:-default}}"
# Override: if user passes session_id as env var instead of arg, respect it
if [ "${1:-}" = "--track" ] || [ "${1:-}" = "--reset" ] || [ "${1:-}" = "analyze" ] || [ -z "${1:-}" ]; then
    SESSION_ID="${CLAUDE_SESSION_ID:-default}"
fi
TRACKER_DIR="/tmp/superpowers-edit-tracker/${SESSION_ID}"
TRACKER_FILE="${TRACKER_DIR}/edits.json"

init_tracker() {
    mkdir -p "${TRACKER_DIR}"
    if [ ! -f "${TRACKER_FILE}" ]; then
        echo '{"files":{},"session_start":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}' > "${TRACKER_FILE}"
    fi
}

get_count() {
    local file="$1"
    python3 -c "
import json, sys
with open('${TRACKER_FILE}') as f:
    data = json.load(f)
print(data['files'].get('${file}', {}).get('edit_count', 0))
" 2>/dev/null || echo "0"
}

track_edit() {
    local file="$1"
    init_tracker
    python3 -c "
import json, datetime
with open('${TRACKER_FILE}', 'r+') as f:
    data = json.load(f)
    if '${file}' not in data['files']:
        data['files']['${file}'] = {'edit_count': 0, 'last_edit': ''}
    data['files']['${file}']['edit_count'] += 1
    data['files']['${file}']['last_edit'] = datetime.datetime.utcnow().isoformat() + 'Z'
    f.seek(0)
    json.dump(data, f, indent=2)
    f.truncate()
"
    echo "Tracked: ${file} (count=$(get_count '${file}'))"
}

reset_tracker() {
    rm -rf "${TRACKER_DIR}"
    echo "Reset tracker for session: ${SESSION_ID}"
}

analyze() {
    init_tracker
    local max_count=0
    local max_file=""
    local warnings=""
    local hard_stops=""

    while IFS=$'\t' read -r count file; do
        if [ "${count}" -ge "${HARD_THRESHOLD}" ]; then
            hard_stops="${hard_stops}  HARD STOP: ${file} (${count} edits >= ${HARD_THRESHOLD})\n"
        elif [ "${count}" -ge "${WARN_THRESHOLD}" ]; then
            warnings="${warnings}  WARNING: ${file} (${count} edits >= ${WARN_THRESHOLD})\n"
        fi
        if [ "${count}" -gt "${max_count}" ]; then
            max_count="${count}"
            max_file="${file}"
        fi
    done < <(python3 -c "
import json
with open('${TRACKER_FILE}') as f:
    data = json.load(f)
for file, info in sorted(data['files'].items(), key=lambda x: -x[1]['edit_count']):
    print(f\"{info['edit_count']}\t{file}\")
")

    if [ -n "${hard_stops}" ]; then
        echo "=== LOOP DETECTION: HARD STOP ==="
        printf "%b" "${hard_stops}"
        echo ""
        echo "Action required: Stop current approach. Seek external input or revert."
        exit 2
    elif [ -n "${warnings}" ]; then
        echo "=== LOOP DETECTION: WARNING ==="
        printf "%b" "${warnings}"
        echo ""
        echo "Suggestion: Reconsider approach before more edits."
        exit 1
    else
        echo "=== LOOP DETECTION: OK ==="
        echo "Max edit count: ${max_count} (${max_file})"
        exit 0
    fi
}

case "${1:-analyze}" in
    --track)
        [ -z "${2:-}" ] && { echo "Error: --track requires file path" >&2; exit 1; }
        track_edit "$2"
        ;;
    --reset)
        reset_tracker
        ;;
    analyze|"")
        analyze
        ;;
    *)
        # Treat first arg as session_id when no flag given, then run analyze
        SESSION_ID="$1"
        TRACKER_DIR="/tmp/superpowers-edit-tracker/${SESSION_ID}"
        TRACKER_FILE="${TRACKER_DIR}/edits.json"
        analyze
        ;;
esac
