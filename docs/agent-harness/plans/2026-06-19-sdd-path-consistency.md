# SDD 路径一致性 v2 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use agent-harness:subagent-driven-development (recommended) or agent-harness:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 SDD 基础设施脚本对 `.agent-harness/` 路径的解析统一到 `${CLAUDE_PROJECT_DIR}`，并修复 ralph-loop stop hook 的 promise 检测窗口。

**Architecture:** 所有受影响脚本采用同一 fallback 链 `${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null)}`，在 Claude Code 会话内用权威 env var，手动/CI 退回 git rev-parse 保持向后兼容。stop hook 的 jq 表达式从 `| last` 改为 `| join("\n")` 扩大 promise 扫描窗口。

**Tech Stack:** Bash（脚本改动），Markdown（SKILL.md），shell 单测（参考 `tests/sdd-scripts/` 风格）

**Spec:** `docs/agent-harness/specs/2026-06-19-sdd-path-consistency-design.md`

---

## File Structure

**修改文件 (6)**：

1. `skills/subagent-driven-development/scripts/sdd-workspace` — SDD 路径单一来源，line 18
2. `skills/subagent-driven-development/scripts/cleanup-workspace` — line 13
3. `skills/subagent-driven-development/SKILL.md` — line 290 progress ledger 路径
4. `scripts/log-learning.sh` — line 62 + line 75 改绝对路径
5. `scripts/search-learnings.sh` — line 18 改绝对路径
6. `hooks/stop-hook.sh` — line 129-131 jq 表达式

**修改测试 (2)**：

7. `tests/sdd-scripts/test-cleanup-workspace.sh` — 改用 CLAUDE_PROJECT_DIR 驱动
8. `tests/learnings-scripts/test-learnings.sh` — 改用 CLAUDE_PROJECT_DIR 驱动

**新增测试 (1)**：

9. `tests/ralph-loop-scripts/test-stop-hook-promise.sh` — 3 个用例验证 promise 检测窗口

**不改**：`task-brief` / `review-package`（通过 sdd-workspace 跟随）、`setup-ralph-loop.sh`、`hooks/session-start`、`CLAUDE.md`、`${CLAUDE_PLUGIN_ROOT}` 相关（v1 已修对）。

---

## Task 1: sdd-workspace + cleanup-workspace + SKILL.md 路径统一

**Files:**
- Modify: `skills/subagent-driven-development/scripts/sdd-workspace:18`
- Modify: `skills/subagent-driven-development/scripts/cleanup-workspace:13`
- Modify: `skills/subagent-driven-development/SKILL.md:290`

这三处共享同一个 fallback 链，一起改一起提交，避免中间状态导致路径分叉。

- [ ] **Step 1: 修改 sdd-workspace**

找到 `skills/subagent-driven-development/scripts/sdd-workspace:18`：

```bash
root=$(git rev-parse --show-toplevel)
```

改为：

```bash
root="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null)}"
```

- [ ] **Step 2: 修改 cleanup-workspace**

找到 `skills/subagent-driven-development/scripts/cleanup-workspace:13`：

```bash
dir=$(git rev-parse --show-toplevel 2>/dev/null)/.agent-harness/sdd
```

改为：

```bash
dir="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null)}/.agent-harness/sdd"
```

- [ ] **Step 3: 修改 SKILL.md progress ledger 路径**

找到 `skills/subagent-driven-development/SKILL.md:290`：

```markdown
`cat "$(git rev-parse --show-toplevel)/.agent-harness/sdd/progress.md"`. Tasks listed there
```

改为：

```markdown
`cat "${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null)}/.agent-harness/sdd/progress.md"`. Tasks listed there
```

- [ ] **Step 4: 验证三处改动一致**

Run:
```bash
grep -n 'CLAUDE_PROJECT_DIR' skills/subagent-driven-development/scripts/sdd-workspace skills/subagent-driven-development/scripts/cleanup-workspace skills/subagent-driven-development/SKILL.md
```
Expected: 三行输出，每行都包含 `${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null)}`

- [ ] **Step 5: Commit**

```bash
git add skills/subagent-driven-development/scripts/sdd-workspace \
        skills/subagent-driven-development/scripts/cleanup-workspace \
        skills/subagent-driven-development/SKILL.md
git commit -m "refactor(sdd): unify .agent-harness/ path resolution via CLAUDE_PROJECT_DIR

sdd-workspace / cleanup-workspace / SKILL.md:290 三处统一用
\${CLAUDE_PROJECT_DIR:-\$(git rev-parse --show-toplevel 2>/dev/null)} 解析路径。
在 Claude Code 会话内用权威 env var，手动/CI 退回 git rev-parse 保持兼容。

修复 fruit-shop 嵌套 repo 场景下 brief/report/diff 落外层、progress 落内层
导致 cleanup 只清掉一半的问题。"
```

---

## Task 2: log-learning.sh + search-learnings.sh 改绝对路径

**Files:**
- Modify: `scripts/log-learning.sh:62,75`
- Modify: `scripts/search-learnings.sh:18`

这两处共享同一 fallback 链，一起改一起提交，确保读写位置对齐。

- [ ] **Step 1: 修改 log-learning.sh line 61-62**

找到 `scripts/log-learning.sh:61-62`：

```bash
# Create directory if needed
mkdir -p .agent-harness
```

改为：

```bash
# Resolve project root: prefer CLAUDE_PROJECT_DIR (set by Claude Code harness),
# fall back to git rev-parse for manual runs / CI.
LEARNINGS_DIR="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null)}"
# Create directory if needed
mkdir -p "$LEARNINGS_DIR/.agent-harness"
```

- [ ] **Step 2: 修改 log-learning.sh line 75（python heredoc 写入路径）**

找到 `scripts/log-learning.sh:75`：

```bash
python3 << PYTHON >> .agent-harness/learnings.jsonl
```

改为：

```bash
python3 << PYTHON >> "$LEARNINGS_DIR/.agent-harness/learnings.jsonl"
```

- [ ] **Step 3: 修改 search-learnings.sh line 18**

找到 `scripts/search-learnings.sh:18`：

```bash
LEARNINGS_FILE=".agent-harness/learnings.jsonl"
```

改为：

```bash
# Resolve project root: prefer CLAUDE_PROJECT_DIR (set by Claude Code harness),
# fall back to git rev-parse for manual runs / CI. Keep read location aligned
# with log-learning.sh write location.
LEARNINGS_DIR="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null)}"
LEARNINGS_FILE="$LEARNINGS_DIR/.agent-harness/learnings.jsonl"
```

- [ ] **Step 4: 手动冒烟测试 — log + search 对齐**

Run:
```bash
cd $(mktemp -d) && \
export CLAUDE_PROJECT_DIR=$(pwd) && \
LOG=/Users/arwen/Desktop/Arwen/evanfang/agent-harness/scripts/log-learning.sh && \
SEARCH=/Users/arwen/Desktop/Arwen/evanfang/agent-harness/scripts/search-learnings.sh && \
bash "$LOG" pattern "smoke_test" "v2 path alignment check" 8 observed && \
echo "--- search ---" && \
bash "$SEARCH" --recent 5
```
Expected:
- `Learning recorded: smoke_test (pattern, confidence: 8)`
- `--- search ---` 之后能看到刚写入的 `smoke_test` 条目
- 文件落在 `$CLAUDE_PROJECT_DIR/.agent-harness/learnings.jsonl`，而不是 cwd 对应的相对路径

- [ ] **Step 5: Commit**

```bash
git add scripts/log-learning.sh scripts/search-learnings.sh
git commit -m "refactor(learnings): unify read/write path via CLAUDE_PROJECT_DIR

log-learning.sh 和 search-learnings.sh 都改用
\${CLAUDE_PROJECT_DIR:-\$(git rev-parse --show-toplevel 2>/dev/null)} 解析
.agent-harness/learnings.jsonl 位置。从相对路径（依赖 cwd）改为绝对路径，
确保 session-start hook 读到的就是 log-learning 写入的那份。

修复 learnings.jsonl 在外层/内层 repo 间分裂导致 session-start 读不到
新写入内容的问题。"
```

---

## Task 3: stop-hook promise 检测窗口修复

**Files:**
- Modify: `hooks/stop-hook.sh:129-131`

修复 promise 检测只看最后一条 text block 的问题。

- [ ] **Step 1: 修改 stop-hook.sh jq 表达式**

找到 `hooks/stop-hook.sh:128-131`：

```bash
# (Briefly disable errexit so a jq failure can be caught by the $? check.)
set +e
LAST_OUTPUT=$(echo "$LAST_LINES" | jq -rs '
  map(.message.content[]? | select(.type == "text") | .text) | last // ""
' 2>&1)
```

改为（注释也更新）：

```bash
# Join all text blocks from the last 100 assistant lines, not just the last
# one. When Claude emits <promise>COMPLETE</promise> followed by other text
# (e.g. "logged N learnings"), `last` misses the promise; join("\n") lets
# the perl regex below find it anywhere in the captured output.
# (Briefly disable errexit so a jq failure can be caught by the $? check.)
set +e
LAST_OUTPUT=$(echo "$LAST_LINES" | jq -rs '
  map(.message.content[]? | select(.type == "text") | .text) | join("\n")
' 2>&1)
```

- [ ] **Step 2: 手动验证 jq 表达式**

构造一个 fake 两条 text block 的输入，promise 在倒数第二条：

Run:
```bash
echo '{"role":"assistant","message":{"content":[{"type":"text","text":"stuff before"}]}}
{"role":"assistant","message":{"content":[{"type":"text","text":"<promise>COMPLETE</promise>"}]}}
{"role":"assistant","message":{"content":[{"type":"text","text":"logged 4 learnings"}]}}' | \
jq -rs 'map(.message.content[]? | select(.type == "text") | .text) | join("\n")' | \
perl -0777 -pe 's/.*?<promise>(.*?)<\/promise>.*/$1/s; s/^\s+|\s+$//g; s/\s+/ /g'
```
Expected: 输出 `COMPLETE`（v1 的 `last` 会取到 `"logged 4 learnings"` 检测失败；v2 的 `join` 能拼起来被 perl 正则找到）

- [ ] **Step 3: Commit**

```bash
git add hooks/stop-hook.sh
git commit -m "fix(ralph-loop): widen promise detection window in stop hook

jq 表达式从 | last 改为 | join(\"\n\")，合并最后 100 行 assistant 的所有
text blocks 而非只取最后一条。当 Claude 在 <promise>COMPLETE</promise>
之后又输出其他 text（如 learnings 总结）时，v1 的 last 会漏检，导致
循环多转几轮；join 后 perl 正则的 .*? 非贪婪匹配能正确找到 promise。

100 行 cap 已限制输入规模，性能不受影响。"
```

---

## Task 4: 更新 test-cleanup-workspace.sh 改用 CLAUDE_PROJECT_DIR

**Files:**
- Modify: `tests/sdd-scripts/test-cleanup-workspace.sh`

v1 的 setup 用 `git init` 造临时 repo 依赖 `git rev-parse`。v2 脚本改用 `CLAUDE_PROJECT_DIR` 后，测试要同步驱动方式。

- [ ] **Step 1: 修改 setup_repo 函数**

找到 `tests/sdd-scripts/test-cleanup-workspace.sh` 里的 `setup_repo()` 函数（约 44-51 行）：

```bash
# 每个用例在独立临时 git repo 中运行，互不影响
setup_repo() {
    rm -rf "$TEST_DIR"
    mkdir -p "$TEST_DIR"
    cd "$TEST_DIR"
    git init -q
    git config user.email "test@test.local"
    git config user.name "test"
}
```

改为：

```bash
# 每个用例在独立临时目录中运行，通过 CLAUDE_PROJECT_DIR 指定路径
# （与 v2 脚本的 fallback 链一致：CLAUDE_PROJECT_DIR 优先，git rev-parse 备用）
setup_repo() {
    rm -rf "$TEST_DIR"
    mkdir -p "$TEST_DIR"
    cd "$TEST_DIR"
    export CLAUDE_PROJECT_DIR="$TEST_DIR"
}
```

- [ ] **Step 2: 运行测试，验证 3 用例通过**

Run: `./tests/sdd-scripts/test-cleanup-workspace.sh`
Expected:
```
=== cleanup-workspace Tests ===
...
--- Test 1: 目录不存在 → exit 0 ---
✅ PASS: exit=0, stdout empty, dir not created
--- Test 2: 目录有内容 → 清空 ---
✅ PASS: exit=0, 'cleaned:' printed, dir kept empty (.gitignore removed)
--- Test 3: rm 失败 → 不阻断 ---
✅ PASS: exit=0 even on rm failure, stderr has warning

=== Results: 3 passed, 0 failed ===
```
exit code = 0

- [ ] **Step 3: Commit**

```bash
git add tests/sdd-scripts/test-cleanup-workspace.sh
git commit -m "test(sdd): drive cleanup-workspace tests via CLAUDE_PROJECT_DIR

setup_repo 从 git init + git rev-parse 改为 export CLAUDE_PROJECT_DIR，
匹配 v2 cleanup-workspace 脚本的 fallback 链。不再需要 git 依赖。"
```

---

## Task 5: 更新 test-learnings.sh 改用 CLAUDE_PROJECT_DIR

**Files:**
- Modify: `tests/learnings-scripts/test-learnings.sh`

与 Task 4 同理，确保 log/search 脚本的测试用 `${CLAUDE_PROJECT_DIR}` 驱动。

- [ ] **Step 1: 读取 test-learnings.sh，定位 setup 函数**

Run: `Read tests/learnings-scripts/test-learnings.sh`

找到 `setup()` 函数（约 41-47 行）：

```bash
# Setup test environment (clean slate each time)
setup() {
    rm -rf "$TEST_DIR"
    mkdir -p "$TEST_DIR"
    cd "$TEST_DIR"
    # Don't create .agent-harness yet - let tests create it as needed
}
```

- [ ] **Step 2: 修改 setup 函数**

把上面的 `setup()` 改为：

```bash
# Setup test environment (clean slate each time)
# v2: drive log/search via CLAUDE_PROJECT_DIR so write and read align
setup() {
    rm -rf "$TEST_DIR"
    mkdir -p "$TEST_DIR"
    cd "$TEST_DIR"
    export CLAUDE_PROJECT_DIR="$TEST_DIR"
    # Don't create .agent-harness yet - let scripts create it as needed
}
```

- [ ] **Step 3: 运行测试，验证通过**

Run: `./tests/learnings-scripts/test-learnings.sh`
Expected: 所有用例通过（v1 大约 4-5 个用例），结果汇总显示 0 failed。

- [ ] **Step 4: Commit**

```bash
git add tests/learnings-scripts/test-learnings.sh
git commit -m "test(learnings): drive log/search tests via CLAUDE_PROJECT_DIR

setup 从相对路径改为 export CLAUDE_PROJECT_DIR，匹配 v2 log-learning.sh
和 search-learnings.sh 的绝对路径 fallback 链。"
```

---

## Task 6: 新增 test-stop-hook-promise.sh

**Files:**
- Create: `tests/ralph-loop-scripts/test-stop-hook-promise.sh`

新建目录 `tests/ralph-loop-scripts/`，与 `tests/sdd-scripts/` 平级。3 个用例验证 promise 检测窗口。

**测试设计说明**：只测 `stop-hook.sh:129-150` 的 jq + perl 这段提取逻辑（作为 inline 函数），不跑完整 stop-hook.sh（那需要构造完整 hook input、transcript 路径、state file，过度复杂）。

- [ ] **Step 1: 创建测试目录与文件**

Run: `mkdir -p tests/ralph-loop-scripts`

写入以下完整内容到 `tests/ralph-loop-scripts/test-stop-hook-promise.sh`：

```bash
#!/usr/bin/env bash
# Test stop-hook promise detection window (v2 fix)
# Usage: ./test-stop-hook-promise.sh
#
# Tests only the jq + perl extraction logic from hooks/stop-hook.sh:129-150.
# Does not run the full hook (which would require hook input, transcript path,
# state file — out of scope for this unit test).
#
# Test cases:
# 1. promise 在最后一条 text block → 检测成功（兼容旧行为）
# 2. promise 在倒数第二条，最后一条是其他 text → 检测成功（v2 修复核心场景）
# 3. 完全没有 promise → 不检测

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

PASS=0
FAIL=0

log_pass() { echo -e "${GREEN}✅ PASS${NC}: $1"; ((PASS++)); }
log_fail() { echo -e "${RED}❌ FAIL${NC}: $1"; ((FAIL++)); }

# Extracts promise text from a fake transcript using the SAME jq + perl
# pipeline as hooks/stop-hook.sh:129-150 (v2 version with join("\n")).
# Args: $1 = path to fake transcript JSONL
# Prints: extracted promise text (empty if none found)
extract_promise() {
    local transcript="$1"
    local last_lines
    last_lines=$(grep '"role":"assistant"' "$transcript" | tail -n 100)

    local last_output
    last_output=$(echo "$last_lines" | jq -rs '
      map(.message.content[]? | select(.type == "text") | .text) | join("\n")
    ' 2>&1)

    echo "$last_output" | perl -0777 -pe 's/.*?<promise>(.*?)<\/promise>.*/$1/s; s/^\s+|\s+$//g; s/\s+/ /g' 2>/dev/null || echo ""
}

# Writes a fake assistant text block to a JSONL file.
# Args: $1 = file path, $2 = text content
emit_text() {
    local file="$1"
    local text="$2"
    python3 -c "
import json
print(json.dumps({
    'role': 'assistant',
    'message': {'content': [{'type': 'text', 'text': '''$text'''}]}
}))
" >> "$file"
}

TEST_DIR="/tmp/agent-harness-stop-hook-test-$$"
cleanup() { rm -rf "$TEST_DIR"; }
trap cleanup EXIT

echo "=== stop-hook promise detection Tests ==="
echo ""

# ==========================================
# Test 1: promise 在最后一条 text block → 检测成功
# ==========================================
echo "--- Test 1: promise 在最后一条 → 检测成功 ---"
mkdir -p "$TEST_DIR"
T1="$TEST_DIR/t1.jsonl"
: > "$T1"
emit_text "$T1" "working on task"
emit_text "$T1" "<promise>COMPLETE</promise>"

PROMISE=$(extract_promise "$T1")
if [ "$PROMISE" = "COMPLETE" ]; then
    log_pass "提取出 COMPLETE"
else
    log_fail "期望 COMPLETE，实际 '$PROMISE'"
fi

# ==========================================
# Test 2: promise 在倒数第二条，最后一条是其他 text → 检测成功
# （v1 | last 会失败的核心场景）
# ==========================================
echo "--- Test 2: promise 在倒数第二条 → 检测成功（v2 修复核心） ---"
T2="$TEST_DIR/t2.jsonl"
: > "$T2"
emit_text "$T2" "starting work"
emit_text "$T2" "<promise>COMPLETE</promise>"
emit_text "$T2" "已记录 4 条 learnings"

PROMISE=$(extract_promise "$T2")
if [ "$PROMISE" = "COMPLETE" ]; then
    log_pass "v2 join 能在倒数第二条找到 promise"
else
    log_fail "期望 COMPLETE，实际 '$PROMISE'（v1 的 last 会取到 '已记录...'）"
fi

# ==========================================
# Test 3: 完全没有 promise → 不检测
# ==========================================
echo "--- Test 3: 完全没有 promise → 空字符串 ---"
T3="$TEST_DIR/t3.jsonl"
: > "$T3"
emit_text "$T3" "working on task"
emit_text "$T3" "all done, no promise emitted"

PROMISE=$(extract_promise "$T3")
if [ -z "$PROMISE" ]; then
    log_pass "无 promise 时返回空字符串"
else
    log_fail "期望空字符串，实际 '$PROMISE'"
fi

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
[ "$FAIL" = "0" ] || exit 1
```

- [ ] **Step 2: 赋予可执行权限**

Run: `chmod +x tests/ralph-loop-scripts/test-stop-hook-promise.sh`
Expected: 无输出

- [ ] **Step 3: 运行测试，验证 3 用例通过**

Run: `./tests/ralph-loop-scripts/test-stop-hook-promise.sh`
Expected:
```
=== stop-hook promise detection Tests ===

--- Test 1: promise 在最后一条 → 检测成功 ---
✅ PASS: 提取出 COMPLETE
--- Test 2: promise 在倒数第二条 → 检测成功（v2 修复核心） ---
✅ PASS: v2 join 能在倒数第二条找到 promise
--- Test 3: 完全没有 promise → 空字符串 ---
✅ PASS: 无 promise 时返回空字符串

=== Results: 3 passed, 0 failed ===
```
exit code = 0

- [ ] **Step 4: Commit**

```bash
git add tests/ralph-loop-scripts/test-stop-hook-promise.sh
git commit -m "test(ralph-loop): add stop-hook promise detection unit tests

3 个用例验证 v2 stop-hook.sh 的 jq join + perl 提取逻辑：
1. promise 在最后一条 → 检测成功（兼容旧行为）
2. promise 在倒数第二条，最后一条是其他 text → 检测成功（v2 修复核心）
3. 完全没有 promise → 返回空字符串

只测 stop-hook.sh:129-150 的 jq + perl 提取段（作为 inline 函数），
不跑完整 hook（避免依赖 hook input / transcript path / state file）。"
```

---

## Task 7: 集成验证 — 清理 fruit-shop 残留 + 全套测试

**Files:**
- 验证用：`demo/fruit-shop/.agent-harness/sdd/progress.md`（v1 残留）

这是 v2 实现完成后的**手动验证步骤**，确认 spec 成功标准 1/2 满足。

- [ ] **Step 1: 验证 cleanup-workspace 能清掉 fruit-shop 残留**

Run:
```bash
ls -la /Users/arwen/Desktop/Arwen/evanfang/agent-harness/demo/fruit-shop/.agent-harness/sdd/
echo "--- before cleanup ---"
cd /Users/arwen/Desktop/Arwen/evanfang/agent-harness/demo/fruit-shop && \
CLAUDE_PROJECT_DIR=$(pwd) \
bash /Users/arwen/Desktop/Arwen/evanfang/agent-harness/skills/subagent-driven-development/scripts/cleanup-workspace
echo "--- after cleanup ---"
ls -la /Users/arwen/Desktop/Arwen/evanfang/agent-harness/demo/fruit-shop/.agent-harness/sdd/
```
Expected:
- `--- before cleanup ---` 之前看到 `progress.md`（2205 字节）残留
- stdout 包含 `cleaned: /Users/arwen/.../demo/fruit-shop/.agent-harness/sdd`
- `--- after cleanup ---` 之后目录为空（progress.md 被清掉）

- [ ] **Step 2: 跑全套相关测试，验证全绿**

Run:
```bash
./tests/sdd-scripts/test-cleanup-workspace.sh && \
echo "=== cleanup-workspace OK ===" && \
./tests/learnings-scripts/test-learnings.sh && \
echo "=== learnings OK ===" && \
./tests/ralph-loop-scripts/test-stop-hook-promise.sh && \
echo "=== stop-hook-promise OK ==="
```
Expected: 三个测试文件全绿，三行 OK 标记都打印，exit code = 0

- [ ] **Step 3: 不 commit（验证步骤无文件改动）**

如果 Step 1/2 全部通过，本 Task 没有代码改动，不需要 commit。在 progress ledger 里记录验证结果即可。

如果 Step 1 失败（progress.md 没被清掉），说明 Task 1 的路径改动有遗漏 —— 回到 Task 1 排查。

如果 Step 2 某个测试失败，回到对应 Task 修复。

---

## Self-Review 清单

**Spec 覆盖**：

- ✅ Section 1（路径统一）→ Task 1（sdd-workspace + cleanup + SKILL.md）+ Task 2（log + search）
- ✅ Section 2（progress 残留）→ Task 7 Step 1（验证 cleanup 清掉残留）
- ✅ Section 3（learnings 读写对齐）→ Task 2（log + search 同步改）+ Task 5（测试同步）
- ✅ Section 4（stop-hook promise 窗口）→ Task 3（jq 改 join）+ Task 6（新增 3 用例测试）
- ✅ Section 5（改动清单 + 风险）→ File Structure 对齐

**Placeholder 扫描**：每个 Step 都有具体代码块、具体路径、具体命令；无 "TBD" / "similar to" / "add appropriate"。

**类型一致性**：fallback 链 `${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null)}` 在 Task 1/2 所有 5 处出现，字符串完全相同。jq 表达式 `| join("\n")` 在 Task 3 和 Task 6 完全一致。

---

## Execution Handoff

Plan complete and saved to `docs/agent-harness/plans/2026-06-19-sdd-path-consistency.md`. Two execution options:

**1. Subagent-Driven (recommended)** — 每个 Task 派发独立 subagent，Task 间 review，快速迭代。本 plan Task 独立性高（6 个改动 + 1 个验证），适合 SDD。

**2. Inline Execution** — 在当前 session 按 executing-plans 批量执行，带 checkpoint。

Which approach?
