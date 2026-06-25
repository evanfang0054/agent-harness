#!/usr/bin/env bash
# state.sh — Checkpoint 读写库 for auto-loop
# Usage: source scripts/lib/state.sh

# state_init <run_id> <branch> <request> <state_dir> [scan_target]
# 用 jq -R --arg 安全注入，防止 request 含特殊字符破坏 JSON
state_init() {
    local run_id="$1" branch="$2" request="$3" state_dir="$4" scan_target="${5:-}"
    mkdir -p "$state_dir/runs/$run_id"
    local wt_path="$state_dir/../worktrees/auto-loop-$run_id"
    local started_at; started_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    local orig_pwd="$PWD"
    jq -n \
        --arg run_id "$run_id" \
        --arg branch "$branch" \
        --arg request "$request" \
        --arg started_at "$started_at" \
        --arg sessions_md "$state_dir/runs/$run_id/sessions.md" \
        --arg analysis_json "$state_dir/runs/$run_id/analysis.json" \
        --arg issues_json "$state_dir/runs/$run_id/issues.json" \
        --arg wt_path "$wt_path" \
        --arg orig_pwd "$orig_pwd" \
        --arg scan_target "$scan_target" \
        '{
            run_id: $run_id,
            started_at: $started_at,
            branch: $branch,
            request: $request,
            scan_target: $scan_target,
            current_step: "init",
            progress: {
                branch_created: false,
                sessions_exported: false,
                analysis_completed: false,
                issues_created: [],
                fixes_completed: [],
                current_fix: null,
                pr_created: false
            },
            artifacts: {
                sessions_md: $sessions_md,
                analysis_json: $analysis_json,
                issues_json: $issues_json
            },
            worktree_path: $wt_path,
            original_pwd: $orig_pwd,
            intervention: null
        }' > "$state_dir/state.json"
}

# state_get <state_dir> <jq_path>
state_get() {
    local state_dir="$1" path="$2"
    jq -r "$path" "$state_dir/state.json"
}

# state_set <state_dir> <jq_path> <value_json>
# value_json 必须是合法 JSON 值表达式（如 '["#1"]'、'"feat/x"'、'true'）
state_set() {
    local state_dir="$1" path="$2" value="$3"
    local tmp="$state_dir/state.json.tmp"
    jq "$path = $value" "$state_dir/state.json" > "$tmp" && mv "$tmp" "$state_dir/state.json"
}

# state_set_str <state_dir> <jq_path> <raw_string>
# 安全版：自动用 jq -R 转义字符串，调用者传普通字符串即可
state_set_str() {
    local state_dir="$1" path="$2" raw="$3"
    local tmp="$state_dir/state.json.tmp"
    jq --arg v "$raw" "$path = \$v" "$state_dir/state.json" > "$tmp" && mv "$tmp" "$state_dir/state.json"
}

# state_clear <state_dir>
state_clear() {
    rm -f "$1/state.json"
}
