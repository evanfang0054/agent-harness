# Auto-Loop Skills 双子分离 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use agent-harness:subagent-driven-development (recommended) or agent-harness:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 扩展 `auto-loop.sh` 支持 `--fix-only` / `--max-issues`，并新增两个 wrapper skill（`generate-issues` / `fix-issues-and-pr`）+ 同名 slash 命令，把会话分析与 SDD 修复拆分成两个独立入口。

**Architecture:** 不重构 auto-loop.sh 现有链路。通过新增 `--fix-only` 参数 + orchestrator-prompt.md 的 mode 守卫实现「跳过分析直接修复」模式；两个 skill 是纯 wrapper，把用户语言映射到 auto-loop.sh 的不同参数组合，所有 SDD/分析逻辑保持在 auto-loop.sh 内部。

**Tech Stack:** Bash + jq + Markdown（skill 文档）；遵循仓库现有 skill 规范（writing-skills frontmatter 与 CSO 原则）。

**Spec:** `docs/agent-harness/specs/2026-06-26-auto-loop-skills-split-design.md`

---

## 文件结构

**修改:**
- `scripts/auto-loop.sh` — 新增 `--fix-only` / `--max-issues` 参数解析、互斥校验、mode 判断、jq `gsub` 扩展、分支命名逻辑
- `scripts/lib/state.sh` — `state_init` 新增 `mode` / `target_issues` / `max_issues` 参数与字段
- `skills/auto-loop/orchestrator-prompt.md` — 新增 `{{MODE}}` / `{{TARGET_ISSUES}}` / `{{MAX_ISSUES}}` 占位符、mode 守卫、`--fix-only` 分支链路、`all` 拉取协议、`--max-issues` 截断协议

**新建:**
- `skills/generate-issues/SKILL.md` — skill A
- `skills/fix-issues-and-pr/SKILL.md` — skill B
- `commands/generate-issues.md` — slash 命令
- `commands/fix-issues-and-pr.md` — slash 命令
- `tests/claude-code/test-auto-loop-fix-only-args.sh` — 参数解析与占位符注入测试

---

## Task 1: 扩展 state.sh 支持 mode/target_issues/max_issues 字段

**Files:**
- Modify: `scripts/lib/state.sh:1-40`

- [ ] **Step 1: 修改 state_init 签名**

把 `scripts/lib/state.sh` 的 `state_init` 函数签名扩展为 9 参数（在原 6 参数基础上加 3 个可选参数）。替换整个 `state_init() { ... }` 函数体：

```bash
# state_init <run_id> <branch> <request> <state_dir> [scan_target] [filter] [mode] [target_issues] [max_issues]
# 用 jq -R --arg 安全注入，防止 request / filter 含特殊字符破坏 JSON
# mode: "full" | "dry_run" | "fix_only"
# target_issues: 空串、"all"、或 "#12,#15" 形式的逗号分隔列表
# max_issues: 空串或正整数字符串
state_init() {
    local run_id="$1" branch="$2" request="$3" state_dir="$4" scan_target="${5:-}" filter="${6:-}"
    local mode="${7:-full}" target_issues="${8:-}" max_issues="${9:-}"
    mkdir -p "$state_dir/runs/$run_id"
    local wt_path="$state_dir/../worktrees/auto-loop-$run_id"
    local started_at; started_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    local orig_pwd="$PWD"

    # target_issues 字符串 → JSON 数组
    local target_issues_json='[]'
    if [ -n "$target_issues" ] && [ "$target_issues" != "all" ]; then
        target_issues_json=$(echo "$target_issues" | tr ',' '\n' | sed 's/^ *//;s/ *$//' | jq -R . | jq -s .)
    elif [ "$target_issues" = "all" ]; then
        target_issues_json='["all"]'
    fi

    # max_issues 字符串 → JSON number 或 null
    local max_issues_json='null'
    if [ -n "$max_issues" ]; then
        max_issues_json="$max_issues"
    fi

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
        --arg filter "$filter" \
        --arg mode "$mode" \
        --argjson target_issues "$target_issues_json" \
        --argjson max_issues "$max_issues_json" \
        '{
            run_id: $run_id,
            started_at: $started_at,
            branch: $branch,
            request: $request,
            scan_target: $scan_target,
            filter: $filter,
            mode: $mode,
            target_issues: $target_issues,
            max_issues: $max_issues,
            current_step: "init",
            progress: {
                branch_created: false,
                sessions_exported: false,
                analysis_completed: false,
                issues_created: [],
                fixes_completed: [],
                current_fix: null,
                pr_created: false,
                filtered_sessions: [],
                excluded_sessions: []
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
```

- [ ] **Step 2: 手测 state_init 新参数**

```bash
cd /tmp && rm -rf al-test && mkdir al-test && cd al-test
source /Users/arwen/Desktop/Arwen/evanfang/agent-harness/scripts/lib/state.sh
state_init run-x feat/x "test req" "$(pwd)/.claude/auto-loop" "" "" fix_only "#12,#15" 5
cat .claude/auto-loop/state.json | jq '.mode, .target_issues, .max_issues'
```

预期输出:
```
"fix_only"
[
  "#12",
  "#15"
]
5
```

- [ ] **Step 3: 手测 "all" 与空 max_issues**

```bash
state_init run-y feat/y "test2" "$(pwd)/.claude/auto-loop" "" "" dry_run "all" ""
cat .claude/auto-loop/state.json | jq '.mode, .target_issues, .max_issues'
```

预期输出:
```
"dry_run"
[
  "all"
]
null
```

- [ ] **Step 4: Commit**

```bash
cd /Users/arwen/Desktop/Arwen/evanfang/agent-harness
git add scripts/lib/state.sh
git commit -m "feat(auto-loop): state_init 支持 mode/target_issues/max_issues 字段"
```

---

## Task 2: auto-loop.sh 解析 --fix-only / --max-issues

**Files:**
- Modify: `scripts/auto-loop.sh:27-71`（参数变量声明与 case 分支）
- Modify: `scripts/auto-loop.sh:146-195`（全新运行分支，调用 state_init）

- [ ] **Step 1: 在变量声明区新增 3 个变量**

定位 `scripts/auto-loop.sh` 第 27-30 行附近的变量声明块，在 `FILTER=""` 之后追加 3 行。把:

```bash
PROJECT=""
ALL_PROJECTS=false
RESUME=false
CLEANUP=false
DRY_RUN=false
REQUEST=""
FILTER=""
ORIGINAL_PWD="$PWD"
```

替换为:

```bash
PROJECT=""
ALL_PROJECTS=false
RESUME=false
CLEANUP=false
DRY_RUN=false
FIX_ONLY=""
MAX_ISSUES=""
REQUEST=""
FILTER=""
ORIGINAL_PWD="$PWD"
```

- [ ] **Step 2: 在 usage() 补充新参数说明**

定位 `scripts/auto-loop.sh` 的 `usage()` 函数（约 32-52 行），把:

```bash
  --resume              恢复中断的运行
  --cleanup             清理 state 和 runs/
  --dry-run             只分析+提 issue，不修复
  -h, --help            显示帮助
```

替换为:

```bash
  --resume              恢复中断的运行
  --cleanup             清理 state 和 runs/
  --dry-run             只分析+提 issue，不修复
  --fix-only "[list]"   跳过分析，直接修复指定 issue（"all" 或 "#12,#15"，与 --dry-run 互斥）
  --max-issues N        最多提/修 N 个 issue（A 模式限噪音，B 模式 all 限批量）
  -h, --help            显示帮助
```

- [ ] **Step 3: 在 while case 里加两个分支**

定位 `scripts/auto-loop.sh` 的 `while [[ $# -gt 0 ]]; do case $1 in` 块，把 `--dry-run) DRY_RUN=true; shift ;;` 这一行后面追加:

```bash
        --dry-run) DRY_RUN=true; shift ;;
        --fix-only)
            if [ -z "${2:-}" ]; then
                echo "错误: --fix-only 需要一个参数（\"all\" 或 \"#12,#15\"）" >&2
                exit 1
            fi
            FIX_ONLY="$2"; shift 2 ;;
        --max-issues)
            if [ -z "${2:-}" ]; then
                echo "错误: --max-issues 需要一个正整数参数" >&2
                exit 1
            fi
            if ! [[ "$2" =~ ^[0-9]+$ ]] || [ "$2" -le 0 ]; then
                echo "错误: --max-issues 必须是正整数" >&2
                exit 1
            fi
            MAX_ISSUES="$2"; shift 2 ;;
```

- [ ] **Step 4: 加互斥校验**

在 `check_prerequisites` 函数定义之前（约第 81 行，`# ---------- 前置检查 ----------` 注释下方）插入新校验函数，把:

```bash
# ---------- 前置检查 ----------
check_prerequisites() {
```

替换为:

```bash
# ---------- 前置检查 ----------
check_mode_mutex() {
    if $DRY_RUN && [ -n "$FIX_ONLY" ]; then
        echo "错误: --dry-run 与 --fix-only 互斥" >&2
        exit 1
    fi
}

check_prerequisites() {
```

然后在全新运行分支里（`check_clean_workspace` 调用之后，`check_git_remote` 之后，或紧跟 `check_prerequisites` 之后）调用它。定位 `if $RESUME; then ... else` 块的 `else` 分支开头:

```bash
else
    # ---------- 全新运行 ----------
    check_prerequisites
    check_clean_workspace
    check_git_remote
```

替换为:

```bash
else
    # ---------- 全新运行 ----------
    check_mode_mutex
    check_prerequisites
    check_clean_workspace
    check_git_remote
```

- [ ] **Step 5: 推算 mode 字符串并传给 state_init**

在 `else`（全新运行）分支中，定位 `state_init "$RUN_ID" "$BRANCH" "$REQUEST" "$STATE_DIR" "$SCAN_TARGET" "$FILTER"` 这一行（约 174 行），把它替换为:

```bash
    # 推算 mode 字符串供 state_init 与 prompt 组装使用
    if $DRY_RUN; then
        MODE_VAL="dry_run"
    elif [ -n "$FIX_ONLY" ]; then
        MODE_VAL="fix_only"
    else
        MODE_VAL="full"
    fi
    state_init "$RUN_ID" "$BRANCH" "$REQUEST" "$STATE_DIR" "$SCAN_TARGET" "$FILTER" \
        "$MODE_VAL" "$FIX_ONLY" "$MAX_ISSUES"
```

- [ ] **Step 6: fix-only 模式的分支命名覆盖**

紧跟上一段 `state_init` 调用之后（在 `# 注意：state.json 是本地运行态文件` 注释之前），插入分支名覆盖逻辑。定位:

```bash
    state_init "$RUN_ID" "$BRANCH" "$REQUEST" "$STATE_DIR" "$SCAN_TARGET" "$FILTER" \
        "$MODE_VAL" "$FIX_ONLY" "$MAX_ISSUES"

    # 注意：state.json 是本地运行态文件（--resume 时读本地文件即可），不纳入 git 跟踪，
```

替换为:

```bash
    state_init "$RUN_ID" "$BRANCH" "$REQUEST" "$STATE_DIR" "$SCAN_TARGET" "$FILTER" \
        "$MODE_VAL" "$FIX_ONLY" "$MAX_ISSUES"

    # fix-only 模式用首个 issue 号命名分支，便于追溯；多 issue 单 PR
    if [ "$MODE_VAL" = "fix_only" ] && [ "$FIX_ONLY" != "all" ] && [ -n "$FIX_ONLY" ]; then
        local first_issue
        first_issue=$(echo "$FIX_ONLY" | sed 's/#//;s/,.*//;s/ *//')
        BRANCH="feat/fix-issues-${first_issue}-$(date +%Y-%m-%d)"
        state_set_str "$STATE_DIR" '.branch' "$BRANCH"
    fi

    # 注意：state.json 是本地运行态文件（--resume 时读本地文件即可），不纳入 git 跟踪，
```

- [ ] **Step 7: 在 dry-run 提示块附近新增 fix-only 提示块**

定位 `# ---------- dry-run 提示 ----------` 开头的块（约 212-221 行），把它替换为同时处理两种 mode:

```bash
# ---------- mode 提示 ----------
if [ "${DRY_RUN:-false}" = "true" ]; then
    PROMPT_DRY_RUN_NOTE="

注意：这是 --dry-run 模式。只执行到步骤 4（提 issue）后停止，不执行 SDD 修复。
完成步骤 4 后：
1. jq 更新 state.json 的 current_step = 'dry_run_done'
2. 输出 AUTO_LOOP_COMPLETE（脚本侧检测后会跳过 worktree 清理，因为 dry-run 不改代码）
"
    emit_event "🏃" "" "模式: dry-run（只生成 issue，不修复）"
elif [ -n "${FIX_ONLY:-}" ]; then
    PROMPT_FIX_ONLY_NOTE="

注意：这是 --fix-only 模式。跳过步骤 1-4（扫描/分析/提 issue），直接从步骤 5 开始。
issue 来源是 state.target_issues（不是 state.progress.issues_created）。
如果 state.target_issues = [\"all\"]，先在步骤 5 之前用 gh issue list 拉取 open issues 填充。
所有修复打到同一分支，最终一个 PR 关联多个 closes #N。
"
    emit_event "🔧" "" "模式: fix-only（直接修复，目标: $FIX_ONLY）"
fi
```

- [ ] **Step 8: jq gsub 注入新占位符**

定位 `scripts/auto-loop.sh` 第 237-252 行的 `PROMPT=$(jq --raw-input --slurp ...)` 调用。把它替换为:

```bash
PROMPT=$(jq --raw-input --slurp \
    --arg req "$REQUEST_VAL" \
    --arg scope "$SCOPE_VAL" \
    --arg branch "$BRANCH" \
    --arg state "$STATE_FILE" \
    --arg repo "$REPO_ROOT" \
    --arg scan_target "$SCAN_TARGET_VAL" \
    --arg filter "$FILTER_VAL" \
    --arg mode "$MODE_VAL" \
    --arg target_issues "$FIX_ONLY" \
    --arg max_issues "$MAX_ISSUES" \
    'gsub("{{REQUEST}}"; $req)
     | gsub("{{SCOPE}}"; $scope)
     | gsub("{{BRANCH}}"; $branch)
     | gsub("{{STATE_FILE}}"; $state)
     | gsub("{{REPO_ROOT}}"; $repo)
     | gsub("{{SCAN_TARGET}}"; $scan_target)
     | gsub("{{FILTER}}"; $filter)
     | gsub("{{MODE}}"; $mode)
     | gsub("{{TARGET_ISSUES}}"; $target_issues)
     | gsub("{{MAX_ISSUES}}"; $max_issues)' \
    < "$REPO_ROOT/skills/auto-loop/orchestrator-prompt.md")

PROMPT="${PROMPT}${PROMPT_DRY_RUN_NOTE:-}${PROMPT_FIX_ONLY_NOTE:-}"
```

注意: 上面需要把 `MODE_VAL` / `FIX_ONLY` / `MAX_ISSUES` 在 resume 分支也读到。在 resume 分支末尾（约 195 行 `# 继续 fall-through 到主流程` 之前）追加:

```bash
    MODE_VAL=$(state_get "$STATE_DIR" '.mode // "full"' 2>/dev/null || echo "full")
    FIX_ONLY=$(state_get "$STATE_DIR" '.target_issues | if . == ["all"] then "all" elif length == 0 then "" else map(gsub("^#"; "")) | join(",") | "#" + . end' 2>/dev/null || echo "")
    MAX_ISSUES=$(state_get "$STATE_DIR" '.max_issues // ""' 2>/dev/null || echo "")
```

> 备注: 上面 `FIX_ONLY` 反推仅用于 prompt 注入的占位符回填；orchestrator 真正读 issue 来源是 `state.target_issues`（JSON 数组），更可靠。

- [ ] **Step 9: 手测参数解析**

```bash
cd /Users/arwen/Desktop/Arwen/evanfang/agent-harness
./scripts/auto-loop.sh --dry-run --fix-only all "test" 2>&1 | head -2
./scripts/auto-loop.sh --max-issues 0 "test" 2>&1 | head -2
./scripts/auto-loop.sh --max-issues abc "test" 2>&1 | head -2
```

预期: 前两个报"互斥"和"必须正整数"错误退出；第三个也报"必须正整数"。

- [ ] **Step 10: 手测 dry-run 仍工作（回归）**

```bash
cd /Users/arwen/Desktop/Arwen/evanfang/agent-harness
./scripts/auto-loop.sh --help | grep -E "dry-run|fix-only|max-issues"
```

预期: 三个参数都出现在帮助里。

- [ ] **Step 11: Commit**

```bash
git add scripts/auto-loop.sh
git commit -m "feat(auto-loop): 解析 --fix-only / --max-issues 参数并注入 mode 占位符"
```

---

## Task 3: 扩展 orchestrator-prompt.md 支持 mode 守卫

**Files:**
- Modify: `skills/auto-loop/orchestrator-prompt.md`

- [ ] **Step 1: 在「上下文」section 追加 3 个字段**

定位 `skills/auto-loop/orchestrator-prompt.md` 的 `## 上下文` section（约第 14-26 行），在 `- **State checkpoint**: \`{{STATE_FILE}}\`` 这一行之前追加:

```markdown
- **运行模式**: {{MODE}}（`full` = 完整 8 步 / `dry_run` = 只到步骤 4 / `fix_only` = 跳过 1-4，从 5 开始）
- **目标 issues（fix_only 模式专用）**: {{TARGET_ISSUES}}（空 / `"all"` / `"#12,#15"`）
- **最多 issue 数**: {{MAX_ISSUES}}（空表示无上限）
```

- [ ] **Step 2: 在「8 步链路」之前加 mode 守卫说明**

定位 `## 8 步链路` 这一行之前（约第 73 行），插入新 section:

```markdown
## 模式分支守卫

按 `{{MODE}}` 决定执行哪段链路:

| MODE | 步骤 1-4 | 步骤 5-8 |
|------|---------|---------|
| `full` | ✅ 执行 | ✅ 执行 |
| `dry_run` | ✅ 执行 | ❌ 步骤 4 后输出 AUTO_LOOP_COMPLETE |
| `fix_only` | ❌ 跳过 | ✅ 执行（issue 来源见下方协议） |

**fix_only 模式 issue 来源协议:**

1. 启动时读 `state.target_issues`:
   - 若为 `["all"]` → 先执行 `gh issue list --repo evanfang0054/agent-harness --state open --limit {{MAX_ISSUES_LIMIT}} --json number,title` 拉取（limit 默认 10，由 max_issues 覆盖），把结果写回 `state.target_issues` 为 `["#N1","#N2",...]`
   - 若已是具体列表 `["#12","#15"]` → 直接使用
2. 步骤 5 的 SDD 链路里，issue 来源 **从 `state.target_issues` 读**，不要读 `state.progress.issues_created`（后者在 fix_only 模式恒为空数组）
3. 所有修复打到同一分支（已由脚本侧 `feat/fix-issues-<first>-<date>` 命名），最终一个 PR 关联多个 `closes #N`

**max_issues 协议（dry_run 与 full 模式）:**

步骤 4 提 issue 前:
1. `gh issue list` 去重（标题匹配），算出"将要新增的 issue 数"
2. 如果 `(已提数 + 将要新增数) > max_issues`，停止提更多，在 `analysis.json` 写 `issues_truncated_at: N`
```

- [ ] **Step 3: 修改「8 步链路」步骤 5 描述**

定位 `5. **逐个 SDD 修复**: 对每个 issue 走 brainstorming → writing-plans → subagent-driven-development`（约第 130 行），替换为:

```markdown
5. **逐个 SDD 修复**: issue 列表来源视模式而定
   - `full` 模式: 来自 `state.progress.issues_created`（步骤 4 提的）
   - `fix_only` 模式: 来自 `state.target_issues`（脚本侧已填充或刚通过 `gh issue list` 拉取）
   - 对每个 issue 走 brainstorming → writing-plans → subagent-driven-development
   - **fix_only 模式跳过 brainstorming 审批等待**（issue 描述即需求），直接进 writing-plans
```

- [ ] **Step 4: 修改步骤 8 描述**

定位 `8. **创建 PR**: \`gh pr create\`，body 关联 \`closes #N\``（约第 134 行），替换为:

```markdown
8. **创建 PR**: `gh pr create`，body 关联所有目标 issue
   - 单 issue: `closes #N`
   - 多 issue: `closes #12\ncloses #15\ncloses #18`（每行一个，GitHub 会全部自动关闭）
```

- [ ] **Step 5: 手测占位符填充正确**

```bash
cd /Users/arwen/Desktop/Arwen/evanfang/agent-harness
# 不实际跑 claude，只验证 jq gsub 能把新占位符替换掉
PROMPT=$(jq --raw-input --slurp \
    --arg mode "fix_only" --arg ti "#12,#15" --arg mi "5" \
    'gsub("{{MODE}}"; $mode) | gsub("{{TARGET_ISSUES}}"; $ti) | gsub("{{MAX_ISSUES}}"; $mi)' \
    < skills/auto-loop/orchestrator-prompt.md)
echo "$PROMPT" | grep -E "运行模式|fix_only" | head -3
echo "$PROMPT" | grep -c "{{MODE}}\|{{TARGET_ISSUES}}\|{{MAX_ISSUES}}"
```

预期: 第一条输出包含 `运行模式: fix_only`；第二条输出 `0`（无残留占位符）。

- [ ] **Step 6: 手测 dry-run 占位符填充（回归）**

```bash
cd /Users/arwen/Desktop/Arwen/evanfang/agent-harness
PROMPT=$(jq --raw-input --slurp \
    --arg mode "dry_run" --arg ti "" --arg mi "" \
    'gsub("{{MODE}}"; $mode) | gsub("{{TARGET_ISSUES}}"; $ti) | gsub("{{MAX_ISSUES}}"; $mi)' \
    < skills/auto-loop/orchestrator-prompt.md)
echo "$PROMPT" | grep "运行模式" | head -1
```

预期: 输出 `运行模式: dry_run`。

- [ ] **Step 7: Commit**

```bash
git add skills/auto-loop/orchestrator-prompt.md
git commit -m "feat(auto-loop): orchestrator-prompt 加 mode 守卫与新占位符"
```

---

## Task 4: 写 skill A — generate-issues

**Files:**
- Create: `skills/generate-issues/SKILL.md`

- [ ] **Step 1: 创建 skill 目录与 SKILL.md**

```bash
mkdir -p /Users/arwen/Desktop/Arwen/evanfang/agent-harness/skills/generate-issues
```

写入 `skills/generate-issues/SKILL.md`:

```markdown
---
name: generate-issues
description: Use when user wants to analyze Claude Code sessions and create GitHub issues from discovered problems without fixing them — wraps auto-loop.sh --dry-run
---

# Generate Issues

## Overview

封装 `scripts/auto-loop.sh --dry-run`：扫描 Claude Code 会话日志 → 识别问题模式 → 提交 GitHub issues 到 `evanfang0054/agent-harness`。**不修复、不写代码、不提 PR。**

## When to Use

- 用户说："分析今天的会话提 issue" / "找出最近的会话问题" / "只生成 issue 不修复" / "盘点会话问题"
- 用户调用 `/generate-issues [args]`
- 用户想批量从历史会话里挖掘问题，但暂时不想修复

**When NOT to use:**
- 想修复已有 issue → 用 `fix-issues-and-pr` skill
- 想一次完成分析+修复+PR → 直接调用 `scripts/auto-loop.sh`（不带 --dry-run）

## 参数映射

把用户的自然语言映射到 `auto-loop.sh --dry-run` 的 CLI 参数：

| 用户表达 | CLI 参数 |
|---------|---------|
| "今天的会话" / "本周会话" | 写入 REQUEST（auto-loop.sh 默认扫近 3 天，REQUEST 里写"今天"由 orchestrator 理解） |
| "调用了 X 相关 skill 的会话" | `--filter "调用了 X 相关 skill"` |
| 指定项目路径 | `--project <path>` |
| 所有项目 | `--all-projects` |
| "最多提 N 个" | `--max-issues N` |

## 调用示例

```bash
./scripts/auto-loop.sh --dry-run \
    --filter "调用了 brainstorming 相关 skill" \
    --max-issues 5 \
    "分析本周 agent-harness 相关会话"
```

```bash
./scripts/auto-loop.sh --dry-run --all-projects "盘点所有项目最近的问题"
```

## 前置检查

调用前确认（或让脚本自检）:
- `claude` CLI 可用
- `gh` 已 `gh auth login`
- `jq` / `uv` 已装
- 当前工作区干净（脚本会拒绝在脏工作区运行）

## 输出位置

- 会话快照: `.claude/auto-loop/runs/<run_id>/sessions.md`
- 分析结果: `.claude/auto-loop/runs/<run_id>/analysis.json`
- 提交的 issues: GitHub `evanfang0054/agent-harness` 仓库
- dry-run 模式保留 worktree 供检查（脚本侧已处理）

## 不做什么

- ❌ 不修复 issue（用 `fix-issues-and-pr`）
- ❌ 不提 PR
- ❌ 不写代码
- ❌ 不调用 brainstorming / writing-plans / SDD

完整能力请直接读 `scripts/auto-loop.sh` 与 `skills/auto-loop/orchestrator-prompt.md`。
```

- [ ] **Step 2: 验证 frontmatter 合规**

```bash
head -4 skills/generate-issues/SKILL.md
```

预期: `name: generate-issues`，description 以 "Use when" 开头，第三人称。

- [ ] **Step 3: 字数检查（CSO token 效率）**

```bash
wc -w skills/generate-issues/SKILL.md
```

预期: < 350 字（wrapper skill 不需要长篇说明）。

- [ ] **Step 4: Commit**

```bash
git add skills/generate-issues/
git commit -m "feat(skills): 新增 generate-issues skill（封装 auto-loop --dry-run）"
```

---

## Task 5: 写 skill B — fix-issues-and-pr

**Files:**
- Create: `skills/fix-issues-and-pr/SKILL.md`

- [ ] **Step 1: 创建 skill 目录与 SKILL.md**

```bash
mkdir -p /Users/arwen/Desktop/Arwen/evanfang/agent-harness/skills/fix-issues-and-pr
```

写入 `skills/fix-issues-and-pr/SKILL.md`:

```markdown
---
name: fix-issues-and-pr
description: Use when user wants to pull existing GitHub issues and fix them with SDD workflow then create a PR — wraps auto-loop.sh --fix-only
---

# Fix Issues And PR

## Overview

封装 `scripts/auto-loop.sh --fix-only`：拉取 GitHub 上已存在的 issue → 对每个 issue 走 SDD（brainstorming → writing-plans → subagent-driven-development）→ **多 issue 一个 PR** 关联所有目标 issue。**不重新分析会话、不提新 issue。**

## When to Use

- 用户说："修一下 #12" / "把 open issues 都修了提 PR" / "拉 issue 来修" / "fix issue #15"
- 用户调用 `/fix-issues-and-pr #12,#15` 或 `/fix-issues-and-pr all`
- 已有 issue（人工或 skill A 创建的），现在要批量修复

**When NOT to use:**
- 想从会话日志挖掘新问题 → 用 `generate-issues`
- 想一次完成分析+修复+PR → 直接调用 `scripts/auto-loop.sh`（不带参数）

## 关键约束

> ⚠️ 多 issue 一个 PR：所有修复打到同一分支，PR body 关联 `closes #N`（每行一个，GitHub 自动关闭）。

## 参数映射

| 用户表达 | CLI 参数 |
|---------|---------|
| "修 #12 #15" | `--fix-only "#12,#15"` |
| "修所有 open issues" | `--fix-only "all"` |
| "修最多 5 个" | `--max-issues 5`（与 `all` 配合，默认 10） |

## issue 来源决策

- **默认**: 用户必须明确给 issue 号。如果用户说"修那个性能 issue"而没给号，**引导用户给号**，不要自己猜
- **`all`**: 拉取 `evanfang0054/agent-harness` 所有 open issues，按更新时间排序，受 `--max-issues` 限制

## 调用示例

```bash
./scripts/auto-loop.sh --fix-only "#12,#15"
```

```bash
./scripts/auto-loop.sh --fix-only "all" --max-issues 10
```

## 前置检查

同 `generate-issues`：claude / gh（已登录） / jq / uv 已装，工作区干净。

## 输出

- 修复分支: `feat/fix-issues-<first_issue>-<date>`
- 单一 PR：body 包含 `closes #12\ncloses #15\n...`
- state.json: `.progress.fixes_completed` 记录每个 issue 的 commit hash

## 不做什么

- ❌ 不重新分析会话（用 `generate-issues`）
- ❌ 不提新 issue（issue 来源是已存在的）
- ❌ 不拆分多个 PR（除非用户显式要求，但当前实现只支持单 PR）

完整能力请读 `scripts/auto-loop.sh` 与 `skills/auto-loop/orchestrator-prompt.md` 的 `fix_only` 模式分支。
```

- [ ] **Step 2: 验证 frontmatter 合规**

```bash
head -4 skills/fix-issues-and-pr/SKILL.md
wc -w skills/fix-issues-and-pr/SKILL.md
```

预期: name 正确，description 以 "Use when" 开头，< 400 字。

- [ ] **Step 3: Commit**

```bash
git add skills/fix-issues-and-pr/
git commit -m "feat(skills): 新增 fix-issues-and-pr skill（封装 auto-loop --fix-only）"
```

---

## Task 6: 写 slash 命令

**Files:**
- Create: `commands/generate-issues.md`
- Create: `commands/fix-issues-and-pr.md`

- [ ] **Step 1: 参考现有 slash 命令格式**

```bash
cat commands/ralph-loop.md
```

观察现有 commands 的 frontmatter 格式（description 字段 + 正文调用 skill 的方式）。

- [ ] **Step 2: 创建 commands/generate-issues.md**

写入 `commands/generate-issues.md`:

```markdown
---
description: 只生成 issues，不修复（封装 auto-loop.sh --dry-run）
---

用户想分析会话并提交 GitHub issues，但不修复。参数：$ARGUMENTS

调用 `generate-issues` skill 处理。skill 会把用户的自然语言参数映射到 `scripts/auto-loop.sh --dry-run` 的 CLI 参数。
```

- [ ] **Step 3: 创建 commands/fix-issues-and-pr.md**

写入 `commands/fix-issues-and-pr.md`:

```markdown
---
description: 拉取 GitHub issue 并修复，提 PR（封装 auto-loop.sh --fix-only）
---

用户想拉取已存在的 GitHub issues 并修复，最后提一个 PR。参数：$ARGUMENTS（issue 列表如 "#12,#15" 或 "all"）

调用 `fix-issues-and-pr` skill 处理。skill 会把 issue 列表映射到 `scripts/auto-loop.sh --fix-only` 参数。
```

- [ ] **Step 4: 验证 slash 命令可被发现**

```bash
ls commands/ | grep -E "generate-issues|fix-issues-and-pr"
```

预期两行输出。

- [ ] **Step 5: Commit**

```bash
git add commands/generate-issues.md commands/fix-issues-and-pr.md
git commit -m "feat(commands): 新增 /generate-issues 与 /fix-issues-and-pr slash 命令"
```

---

## Task 7: 参数解析与占位符注入测试

**Files:**
- Create: `tests/claude-code/test-auto-loop-fix-only-args.sh`

- [ ] **Step 1: 参考现有测试结构**

```bash
ls tests/claude-code/
head -30 tests/claude-code/run-skill-tests.sh
```

- [ ] **Step 2: 创建测试文件**

写入 `tests/claude-code/test-auto-loop-fix-only-args.sh`:

```bash
#!/usr/bin/env bash
# 验证 auto-loop.sh 的 --fix-only / --max-issues 参数解析与占位符注入
# 不依赖 Claude API 配额，纯 shell 断言

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
AUTO_LOOP="$REPO_ROOT/scripts/auto-loop.sh"

source "$REPO_ROOT/scripts/lib/state.sh"

PASS=0
FAIL=0

assert_contains() {
    local desc="$1" actual="$2" pattern="$3"
    if echo "$actual" | grep -q "$pattern"; then
        echo "✓ $desc"
        PASS=$((PASS+1))
    else
        echo "✗ $desc"
        echo "  期望包含: $pattern"
        echo "  实际: $actual"
        FAIL=$((FAIL+1))
    fi
}

# Test 1: --dry-run 与 --fix-only 互斥
echo "--- Test 1: 互斥校验 ---"
OUT=$("$AUTO_LOOP" --dry-run --fix-only all "test" 2>&1 || true)
assert_contains "dry-run + fix-only 互斥报错" "$OUT" "互斥"

# Test 2: --max-issues 必须正整数
echo "--- Test 2: max-issues 校验 ---"
OUT=$("$AUTO_LOOP" --max-issues 0 "test" 2>&1 || true)
assert_contains "max-issues 0 被拒" "$OUT" "必须正整数"
OUT=$("$AUTO_LOOP" --max-issues abc "test" 2>&1 || true)
assert_contains "max-issues abc 被拒" "$OUT" "必须正整数"

# Test 3: --fix-only 缺参数
echo "--- Test 3: fix-only 缺参 ---"
OUT=$("$AUTO_LOOP" --fix-only 2>&1 || true)
assert_contains "fix-only 缺参报错" "$OUT" "需要"

# Test 4: state_init 写入 mode/target_issues/max_issues
echo "--- Test 4: state_init 字段 ---"
TMP=$(mktemp -d)
state_init run-t feat/t "req" "$TMP" "" "" fix_only "#12,#15" 5
MODE=$(jq -r '.mode' "$TMP/state.json")
TI=$(jq -c '.target_issues' "$TMP/state.json")
MI=$(jq -r '.max_issues' "$TMP/state.json")
assert_contains "mode=fix_only 写入" "$MODE" "fix_only"
assert_contains "target_issues 数组" "$TI" '#12'
assert_contains "target_issues 数组" "$TI" '#15'
assert_contains "max_issues=5 写入" "$MI" "^5$"

# Test 5: "all" 转 ["all"]
state_init run-t2 feat/t "req" "$TMP" "" "" dry_run "all" ""
TI=$(jq -c '.target_issues' "$TMP/state.json")
assert_contains "all → [\"all\"]" "$TI" '"all"'

# Test 6: 空 target_issues → []
state_init run-t3 feat/t "req" "$TMP" "" "" full "" ""
TI=$(jq -c '.target_issues' "$TMP/state.json")
assert_contains "空 target_issues → []" "$TI" '^\[\]'

# Test 7: 占位符注入（不跑 claude，只验证 jq gsub）
echo "--- Test 7: 占位符注入 ---"
PROMPT=$(jq --raw-input --slurp \
    --arg mode "fix_only" --arg ti "#12,#15" --arg mi "5" \
    'gsub("{{MODE}}"; $mode) | gsub("{{TARGET_ISSUES}}"; $ti) | gsub("{{MAX_ISSUES}}"; $mi)' \
    < "$REPO_ROOT/skills/auto-loop/orchestrator-prompt.md")
RESIDUAL=$(echo "$PROMPT" | grep -c '{{MODE}}\|{{TARGET_ISSUES}}\|{{MAX_ISSUES}}' || true)
if [ "$RESIDUAL" = "0" ]; then
    echo "✓ 无残留占位符"
    PASS=$((PASS+1))
else
    echo "✗ 仍有 $RESIDUAL 处残留占位符"
    FAIL=$((FAIL+1))
fi
assert_contains "运行模式: fix_only 出现" "$PROMPT" "运行模式: fix_only"

rm -rf "$TMP"

echo ""
echo "结果: $PASS 通过 / $FAIL 失败"
[ "$FAIL" = 0 ] || exit 1
```

- [ ] **Step 3: 跑测试验证全绿**

```bash
chmod +x tests/claude-code/test-auto-loop-fix-only-args.sh
./tests/claude-code/test-auto-loop-fix-only-args.sh
```

预期: 全部 ✓，末行 `结果: N 通过 / 0 失败`。

- [ ] **Step 4: 跑现有 plugin-infrastructure 测试（回归）**

```bash
./tests/plugin-infrastructure/run-all.sh 2>&1 | tail -5
```

预期: 全绿（验证 skill 与 command 添加没破坏 manifest 一致性等）。

- [ ] **Step 5: Commit**

```bash
git add tests/claude-code/test-auto-loop-fix-only-args.sh
git commit -m "test(auto-loop): 验证 --fix-only/--max-issues 参数解析与占位符注入"
```

---

## Task 8: 集成手测与 PR

**Files:** 无（仅运行验证）

- [ ] **Step 1: dry-run 端到端（A 路径）**

```bash
cd /Users/arwen/Desktop/Arwen/evanfang/agent-harness
git status  # 确认干净
./scripts/auto-loop.sh --dry-run --max-issues 2 "测试双子分离 dry-run"
```

观察:
- 启动日志含 `模式: dry-run`
- 步骤进行到 4 后输出 `AUTO_LOOP_COMPLETE`
- worktree 保留（dry-run 不清理）
- GitHub issues 创建（≤2 个）

> 如果不想真创建 issue，可在 PR review 阶段手动 close 测试 issue。

- [ ] **Step 2: fix-only 端到端（B 路径）**

准备一个测试 issue（先用 `gh issue create` 建一个明确的测试 issue，例如 `#999` 风格）:

```bash
TEST_ISSUE=$(gh issue create --title "[test] fix-only 端到端验证" --body "测试用，可关闭" --label "testing" 2>/dev/null || echo "")
echo "测试 issue: $TEST_ISSUE"
```

然后跑:

```bash
./scripts/auto-loop.sh --fix-only "${TEST_ISSUE#https://github.com/}" 2>&1 | tail -20
```

观察:
- 启动日志含 `模式: fix-only`
- 跳过步骤 1-4，直接从步骤 5 开始
- 单 PR 创建，body 关联 `closes #N`

> 如果 fix-only 链路有问题，先在小 issue 上调试，再清理测试 issue。

- [ ] **Step 3: 推分支**

```bash
git push -u origin HEAD
```

- [ ] **Step 4: 创建 PR**

```bash
gh pr create --title "feat(auto-loop): 双子分离 --dry-run/--fix-only + 两 skill" \
    --body "$(cat <<'EOF'
## Summary

- 新增 `scripts/auto-loop.sh --fix-only` / `--max-issues` 参数
- orchestrator-prompt.md 加 `{{MODE}}` / `{{TARGET_ISSUES}}` / `{{MAX_ISSUES}}` 占位符 + mode 守卫
- 新增 skill `generate-issues`（封装 --dry-run）与 `fix-issues-and-pr`（封装 --fix-only）
- 新增同名 slash 命令 `/generate-issues` 与 `/fix-issues-and-pr`

## Spec

`docs/agent-harness/specs/2026-06-26-auto-loop-skills-split-design.md`

## Test plan

- [x] `tests/claude-code/test-auto-loop-fix-only-args.sh` 通过
- [x] `tests/plugin-infrastructure/run-all.sh` 通过
- [ ] dry-run 端到端验证（A 路径）
- [ ] fix-only 端到端验证（B 路径）

## Existing PRs

（执行者填写：搜索 evanfang0054/agent-harness 已开放/已关闭 PR，引用相关项）
EOF
)"
```

- [ ] **Step 5: 通知用户 review PR**

把 PR URL 返回给用户，让用户决定是否合并。

---

## Self-Review 结果

**Spec coverage:**
- § 总体架构 → Task 1-6 全覆盖
- § auto-loop.sh 扩展 → Task 1 (state.sh) + Task 2 (auto-loop.sh)
- § orchestrator-prompt.md → Task 3
- § Skill A → Task 4
- § Skill B → Task 5
- § Slash 命令 → Task 6
- § 测试策略 → Task 7 + Task 8
- § 风险（多 issue 单 PR / `all` cap / 描述长度）→ Task 3 / Task 5 已在内容里覆盖

**Placeholder scan:** 无 TBD/TODO；每个 step 都有具体代码或命令。

**Type consistency:**
- `mode` 字段全程字符串 `"full" | "dry_run" | "fix_only"`（下划线，与 orchestrator 文档一致）
- `target_issues` JSON 数组（`[]` / `["all"]` / `["#12","#15"]`）
- `max_issues` JSON number 或 `null`
- 占位符 `{{MODE}}` / `{{TARGET_ISSUES}}` / `{{MAX_ISSUES}}` 在 auto-loop.sh、orchestrator-prompt.md、测试三处一致
