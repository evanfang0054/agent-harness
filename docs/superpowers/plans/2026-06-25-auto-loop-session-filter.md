# Auto-Loop `--filter` 参数实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 `scripts/auto-loop.sh` 新增 `--filter "<自然语言过滤条件>"` 参数，让 Claude 在分析阶段只盘点符合过滤条件的会话。

**Architecture:** 三层改动：(1) `scripts/lib/state.sh` 的 `state_init` 加第 6 个参数 `filter`，持久化到 state.json；(2) `auto-loop.sh` CLI 解析 `--filter`，通过 `{{FILTER}}` 占位符注入 prompt；(3) `skills/auto-loop/orchestrator-prompt.md` 新增"会话筛选协议"章节，Claude 按自然语言 filter 筛选会话。过滤发生在 Claude 分析阶段，不改 claude-code-log 导出逻辑。

**Tech Stack:** Bash + jq（脚本层），Markdown（prompt 层），纯脚本断言测试（无模型调用）。

---

## 文件结构

| 文件 | 职责 | 改动类型 |
|------|------|---------|
| `scripts/lib/state.sh` | state 初始化/读写，`state_init` 加 filter 参数 | Modify |
| `scripts/auto-loop.sh` | CLI 解析/state_init 调用/resume 读取/prompt 组装/usage | Modify |
| `skills/auto-loop/orchestrator-prompt.md` | Claude 主大脑指令，加会话筛选协议 | Modify |
| `tests/plugin-infrastructure/test-auto-loop-state.sh` | state.sh 单元测试，加 filter 字段断言 | Modify |
| `tests/plugin-infrastructure/test-auto-loop-cli.sh` | CLI 测试，加 `--filter` 参数和 usage 断言 | Modify |

---

## Task 1: `state_init` 加 filter 参数

**Files:**
- Modify: `scripts/lib/state.sh:5-48`
- Test: `tests/plugin-infrastructure/test-auto-loop-state.sh`

- [ ] **Step 1: 写失败测试 — state_init 接受第 6 参数 filter 并写入 state.json**

在 `tests/plugin-infrastructure/test-auto-loop-state.sh` 的 `print_summary` 之前插入：

```bash
# Case 8: state_init 接受第 6 参数 filter 并持久化
rm -rf "$STATE_DIR" 2>/dev/null || true
state_init "test-filter" "feat/f" "需求" "$STATE_DIR" "/scan/path" "调用了 superpower"
assert_file_exists "$STATE_DIR/state.json" "state_init with filter creates state.json"
assert_json_field "$STATE_DIR/state.json" '.filter' '调用了 superpower' "state has filter field"

# Case 9: state_init 不传 filter 时，filter 为空字符串（向后兼容）
rm -rf "$STATE_DIR" 2>/dev/null || true
state_init "test-no-filter" "feat/g" "需求" "$STATE_DIR"
assert_json_field "$STATE_DIR/state.json" '.filter' '' "state filter defaults to empty"

# Case 10: state_init filter 含特殊字符（双引号、管道符）安全注入
rm -rf "$STATE_DIR" 2>/dev/null || true
state_init "test-filter-special" "feat/h" "需求" "$STATE_DIR" "/path" '含"双引号"和|管道符'
RESULT=$(state_get "$STATE_DIR" '.filter')
if echo "$RESULT" | grep -q "双引号"; then pass "state_init filter escapes special chars"; else fail "state_init filter escapes special chars"; fi
if jq empty "$STATE_DIR/state.json" 2>/dev/null; then pass "state.json valid with special filter"; else fail "state.json valid with special filter"; fi
```

- [ ] **Step 2: 运行测试确认失败**

Run: `bash tests/plugin-infrastructure/test-auto-loop-state.sh`
Expected: FAIL — `state has filter field`、`state filter defaults to empty`、`state_init filter escapes special chars` 三个 case 失败（当前 `.filter` 字段不存在，jq 返回 `null`）

- [ ] **Step 3: 修改 `state_init` 加 filter 参数**

`scripts/lib/state.sh` 第 5-48 行替换为：

```bash
# state_init <run_id> <branch> <request> <state_dir> [scan_target] [filter]
# 用 jq -R --arg 安全注入，防止 request / filter 含特殊字符破坏 JSON
state_init() {
    local run_id="$1" branch="$2" request="$3" state_dir="$4" scan_target="${5:-}" filter="${6:-}"
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
        --arg filter "$filter" \
        '{
            run_id: $run_id,
            started_at: $started_at,
            branch: $branch,
            request: $request,
            scan_target: $scan_target,
            filter: $filter,
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

- [ ] **Step 4: 运行测试确认通过**

Run: `bash tests/plugin-infrastructure/test-auto-loop-state.sh`
Expected: PASS — 全部 case 通过

- [ ] **Step 5: commit**

```bash
git add scripts/lib/state.sh tests/plugin-infrastructure/test-auto-loop-state.sh
git commit -m "feat(auto-loop): state_init 支持 filter 参数持久化"
```

---

## Task 2: `auto-loop.sh` CLI 解析 `--filter`

**Files:**
- Modify: `scripts/auto-loop.sh:22-29`（变量声明）、`scripts/auto-loop.sh:51-61`（参数解析）、`scripts/auto-loop.sh:161`（state_init 调用）、`scripts/auto-loop.sh:31-48`（usage）

- [ ] **Step 1: 新增 FILTER 变量声明**

`scripts/auto-loop.sh` 第 22-29 行（变量声明区），在 `REQUEST=""` 之后插入：

```bash
FILTER=""
```

（实际位置：第 28 行 `REQUEST=""` 之后，第 29 行 `ORIGINAL_PWD="$PWD"` 之前）

- [ ] **Step 2: 新增 `--filter` 参数解析分支**

`scripts/auto-loop.sh` 第 51-61 行的 while 循环，在 `--dry-run) DRY_RUN=true; shift ;;` 之后插入：

```bash
        --filter) FILTER="$2"; shift 2 ;;
```

- [ ] **Step 3: 修改 state_init 调用，传入第 6 参数**

`scripts/auto-loop.sh` 第 161 行：

```bash
state_init "$RUN_ID" "$BRANCH" "$REQUEST" "$STATE_DIR" "$SCAN_TARGET" "$FILTER"
```

- [ ] **Step 4: 修改 usage 文档加 `--filter` 说明**

`scripts/auto-loop.sh` 第 31-48 行的 `usage()` 函数替换为：

```bash
usage() {
    cat << 'EOF'
用法: auto-loop.sh [选项] "<需求>"

选项:
  --project <path>      扫描指定项目（默认当前目录）
  --all-projects        扫描所有项目
  --filter "<条件>"     会话过滤条件（自然语言），只分析符合的会话
  --resume              恢复中断的运行
  --cleanup             清理 state 和 runs/
  --dry-run             只分析+提 issue，不修复
  -h, --help            显示帮助

示例:
  auto-loop.sh "分析今天的会话"
  auto-loop.sh --project ~/code/foo "分析本周会话"
  auto-loop.sh --all-projects "找出所有项目的问题"
  auto-loop.sh --filter "调用了 superpower 相关 skill" "只盘点相关会话"
  auto-loop.sh --resume
EOF
}
```

- [ ] **Step 5: 纯脚本冒烟测试 — `--help` 输出含 `--filter`**

Run: `bash scripts/auto-loop.sh --help 2>&1 | grep -q "filter"`
Expected: 退出码 0（找到 filter 字样）

- [ ] **Step 6: 不 commit（Task 2 与 Task 3 合并提交）**

Task 2 只改脚本侧的参数解析，prompt 还没加 `{{FILTER}}`，此时跑真实 auto-loop 会残留 `{{FILTER}}` 字面量。等 Task 3 完成后合并 commit。

---

## Task 3: `auto-loop.sh` resume 读取 + prompt 组装 `{{FILTER}}`

**Files:**
- Modify: `scripts/auto-loop.sh:131` 附近（resume 读取）、`scripts/auto-loop.sh:208-232`（prompt 组装）

- [ ] **Step 1: resume 模式从 state.json 读 filter**

`scripts/auto-loop.sh` 第 131 行附近（在 `SCAN_TARGET=$(...)` 之后）插入：

```bash
    FILTER=$(state_get "$STATE_DIR" '.filter // ""' 2>/dev/null || echo "")
```

（位置参考：在 `SCAN_TARGET=...` 行之后，`# 继续 fall-through 到主流程` 注释之前）

- [ ] **Step 2: prompt 组装新增 FILTER_VAL 和 `{{FILTER}}` 占位符**

`scripts/auto-loop.sh` 第 208-232 行替换为：

```bash
RUN_ID=$(state_get "$STATE_DIR" '.run_id')
BRANCH=$(state_get "$STATE_DIR" '.branch')
REQUEST_VAL=$(state_get "$STATE_DIR" '.request')
SCOPE_VAL="$SCOPE_DESC"
# scan_target 优先用本次 CLI 传入的，resume 时从 state.json 读
SCAN_TARGET_VAL="${SCAN_TARGET:-$(state_get "$STATE_DIR" '.scan_target // ""' 2>/dev/null || echo "")}"
# 空时回退到 REPO_ROOT（向后兼容旧 state.json）
[ -z "$SCAN_TARGET_VAL" ] && SCAN_TARGET_VAL="$REPO_ROOT"
# filter 优先用本次 CLI 传入的，resume 时从 state.json 读
FILTER_VAL="${FILTER:-$(state_get "$STATE_DIR" '.filter // ""' 2>/dev/null || echo "")}"

# 读模板，用 jq --raw-input slurp 把整个文件作为一个字符串读取
PROMPT=$(jq --raw-input --slurp \
    --arg req "$REQUEST_VAL" \
    --arg scope "$SCOPE_VAL" \
    --arg branch "$BRANCH" \
    --arg state "$STATE_FILE" \
    --arg repo "$REPO_ROOT" \
    --arg scan_target "$SCAN_TARGET_VAL" \
    --arg filter "$FILTER_VAL" \
    'gsub("{{REQUEST}}"; $req)
     | gsub("{{SCOPE}}"; $scope)
     | gsub("{{BRANCH}}"; $branch)
     | gsub("{{STATE_FILE}}"; $state)
     | gsub("{{REPO_ROOT}}"; $repo)
     | gsub("{{SCAN_TARGET}}"; $scan_target)
     | gsub("{{FILTER}}"; $filter)' \
    < "$REPO_ROOT/skills/auto-loop/orchestrator-prompt.md")
```

- [ ] **Step 3: commit Task 2 + Task 3 的脚本改动**

```bash
git add scripts/auto-loop.sh
git commit -m "feat(auto-loop): CLI 解析 --filter 并注入 {{FILTER}} 占位符"
```

---

## Task 4: `orchestrator-prompt.md` 加会话筛选协议章节

**Files:**
- Modify: `skills/auto-loop/orchestrator-prompt.md`

- [ ] **Step 1: 在步骤 2 和步骤 3 之间插入"会话筛选协议"章节**

`skills/auto-loop/orchestrator-prompt.md` 第 83 行（`2. **导出会话**...` 块结束）之后、第 84 行（`3. **分析会话**...`）之前，插入：

```markdown
## 会话筛选协议

用户指定的过滤条件: {{FILTER}}

**判定规则：**
- 如果 {{FILTER}} 为空 → 分析所有导出的会话（默认行为）
- 如果 {{FILTER}} 非空 → **只分析符合该条件的会话**，不符合的会话直接跳过，不计入问题识别

**筛选执行步骤（在步骤 3 分析之前）：**
1. 逐个会话判断是否符合 {{FILTER}} 条件
2. 在 analysis.json 里记录 `filtered_sessions`（保留的会话列表）和 `excluded_sessions`（排除的会话列表 + 排除原因）
3. 只对 `filtered_sessions` 识别问题

**判定示例（供参考，按自然语言理解执行）：**
- filter="调用了 superpower 相关 skill" → 会话内出现 Skill 工具调用且 skill 名匹配 superpowers skill 列表（brainstorming / writing-plans / subagent-driven-development / verification-before-completion / finishing-a-development-branch / auto-loop 等）
- filter="出现 hook 报错" → 会话内有 PreToolUse / SessionStart / Stop hook 的报错文本
- filter="会话时长 > 30 分钟" → 按 timestamp 跨度判断

**重要：**
- 如果 filter 条件模糊或无法判定，宁可保留会话（宁可多分析，不要漏掉）
- excluded_sessions 必须给出明确排除原因，便于用户审计
- 不要因为筛选而跳过 state.json 的步骤更新
- 如果所有会话都被排除（filtered_sessions 为空），在 analysis.json 里说明"无符合条件的会话"，不提 issue，直接跳到步骤 7
```

- [ ] **Step 2: 占位符验证 — 渲染 prompt 确认 `{{FILTER}}` 被替换**

Run:
```bash
cd /Users/arwen/Desktop/Arwen/evanfang/superpowers
# 模拟空 filter 渲染
FILTER_VAL=""
jq --raw-input --slurp --arg filter "$FILTER_VAL" \
  'gsub("{{FILTER}}"; $filter)' \
  < skills/auto-loop/orchestrator-prompt.md > /tmp/prompt-test-empty.txt
grep -c "{{FILTER}}" /tmp/prompt-test-empty.txt
# 模拟非空 filter 渲染
FILTER_VAL="调用了 superpower"
jq --raw-input --slurp --arg filter "$FILTER_VAL" \
  'gsub("{{FILTER}}"; $filter)' \
  < skills/auto-loop/orchestrator-prompt.md > /tmp/prompt-test-filled.txt
grep -c "{{FILTER}}" /tmp/prompt-test-filled.txt
grep -c "调用了 superpower" /tmp/prompt-test-filled.txt
```
Expected: 两个 `grep -c "{{FILTER}}"` 都输出 `0`（无残留），最后一个 `grep -c "调用了 superpower"` 输出 `>=2`（章节标题 + 判定示例各 1 处）

- [ ] **Step 3: commit**

```bash
git add skills/auto-loop/orchestrator-prompt.md
git commit -m "feat(auto-loop): orchestrator prompt 加会话筛选协议"
```

---

## Task 5: 扩展 CLI 测试覆盖 `--filter`

**Files:**
- Modify: `tests/plugin-infrastructure/test-auto-loop-cli.sh`

- [ ] **Step 1: 加 `--filter` 在 usage 输出中的断言**

在 `tests/plugin-infrastructure/test-auto-loop-cli.sh` 的 `print_summary` 之前插入：

```bash
# Case 9: --help 输出包含 --filter 说明
OUTPUT=$(bash "$SCRIPT" --help 2>&1)
if echo "$OUTPUT" | grep -q -- "--filter"; then pass "--help shows --filter option"; else fail "--help shows --filter option"; fi
if echo "$OUTPUT" | grep -q "会话过滤条件"; then pass "--help describes filter semantics"; else fail "--help describes filter semantics"; fi

# Case 10: 脚本源码包含 FILTER 变量和 --filter 解析分支
if grep -q "^FILTER=\"\"" "$SCRIPT"; then pass "script declares FILTER var"; else fail "script declares FILTER var"; fi
if grep -q -- "--filter) FILTER=" "$SCRIPT"; then pass "script parses --filter arg"; else fail "script parses --filter arg"; fi

# Case 11: 脚本源码包含 {{FILTER}} 占位符注入
if grep -q "{{FILTER}}" "$SCRIPT"; then pass "script injects {{FILTER}} placeholder"; else fail "script injects {{FILTER}} placeholder"; fi
if grep -q -- '--arg filter' "$SCRIPT"; then pass "script passes filter to jq"; else fail "script passes filter to jq"; fi

# Case 12: orchestrator-prompt 包含会话筛选协议
PROMPT_FILE="$REPO_ROOT/skills/auto-loop/orchestrator-prompt.md"
if grep -q "会话筛选协议" "$PROMPT_FILE"; then pass "prompt has filter protocol section"; else fail "prompt has filter protocol section"; fi
if grep -q "{{FILTER}}" "$PROMPT_FILE"; then pass "prompt has {{FILTER}} placeholder"; else fail "prompt has {{FILTER}} placeholder"; fi
if grep -q "filtered_sessions" "$PROMPT_FILE"; then pass "prompt records filtered_sessions"; else fail "prompt records filtered_sessions"; fi
```

- [ ] **Step 2: 运行测试确认通过**

Run: `bash tests/plugin-infrastructure/test-auto-loop-cli.sh`
Expected: PASS — 全部新增 case 通过

- [ ] **Step 3: commit**

```bash
git add tests/plugin-infrastructure/test-auto-loop-cli.sh
git commit -m "test(auto-loop): CLI 测试覆盖 --filter 参数和占位符注入"
```

---

## Task 6: 全套件回归 + dry-run 端到端验证

**Files:**
- 无新文件，运行验证

- [ ] **Step 1: 运行 plugin-infrastructure 全套件**

Run: `bash tests/plugin-infrastructure/run-all.sh`
Expected: 全部 suite PASSED，0 failed

- [ ] **Step 2: dry-run 端到端验证 — filter 注入正确**

找一个有 Claude 会话记录的项目路径（或用 `--dry-run` 不实际跑完整流程，只看 state.json）。

Run:
```bash
cd /Users/arwen/Desktop/Arwen/evanfang/superpowers
# 确保 git 工作区干净（auto-loop.sh 前置检查）
git status --porcelain
# 跑 dry-run 带 filter，但注意 auto-loop.sh 会真的调 Claude
# 这里只验证 state.json 的 filter 字段被持久化
# 用 timeout 限制只跑到 state_init 之后
timeout 5 bash scripts/auto-loop.sh --dry-run --filter "调用了 superpower" "测试" 2>&1 || true
# 如果脚本启动了，检查 state.json
jq '.filter' .claude/auto-loop/state.json 2>/dev/null
```
Expected: `jq '.filter'` 输出 `"调用了 superpower"`（如果脚本跑到了 state_init）；或脚本因为前置检查/超时退出但 state.json 已写入

- [ ] **Step 3: 清理 dry-run 产生的 state**

Run: `bash scripts/auto-loop.sh --cleanup`
Expected: 输出 `已清理 ...`，worktree 和 state 被清理干净

- [ ] **Step 4: 最终回归确认**

Run: `bash tests/plugin-infrastructure/run-all.sh`
Expected: 全部 PASSED

- [ ] **Step 5: 不需要 commit（验证步骤无代码改动）**

---

## Self-Review

**Spec coverage:**
- ✅ CLI 接口 `--filter` → Task 2
- ✅ state_init 持久化 filter → Task 1
- ✅ resume 读取 filter → Task 3 Step 1
- ✅ prompt `{{FILTER}}` 占位符 → Task 3 Step 2
- ✅ orchestrator-prompt 会话筛选协议章节 → Task 4
- ✅ usage 文档 → Task 2 Step 4
- ✅ 纯脚本单元测试 → Task 1 Step 1 + Task 5
- ✅ dry-run 端到端验证 → Task 6 Step 2
- ✅ 向后兼容（不传 filter 时 `.filter` 为空字符串）→ Task 1 Case 9 + Task 4 判定规则第一条
- ✅ 特殊字符安全 → Task 1 Case 10
- ✅ state.json 新增 `filtered_sessions` / `excluded_sessions` 字段 → Task 1 Step 3 的 JSON 构造

**Placeholder scan:** 无 TODO/TBD，每个 step 都有具体代码或命令。

**Type consistency:** `FILTER` 变量名在 auto-loop.sh 全程一致；`{{FILTER}}` 占位符在 prompt 和脚本中一致；`filter` 字段名在 state.json 和 jq 读取路径中一致；`filtered_sessions` / `excluded_sessions` 在 prompt 和 state.json 中一致。
