# SDD Workspace 清理 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use agent-harness:subagent-driven-development (recommended) or agent-harness:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 finishing-a-development-branch 收尾时自动清空 `.agent-harness/sdd/` 工作区，避免临时 artifacts 跨 session 累积。

**Architecture:** 新增独立 `cleanup-workspace` bash 脚本封装清理逻辑（失败不阻断），`finishing-a-development-branch` skill 在每个收尾选项末尾调用它。脚本直接拼路径 `<root>/.agent-harness/sdd`，不依赖 `sdd-workspace`（避免 mkdir/mkgitignore 副作用）。

**Tech Stack:** Bash（脚本），Markdown（skill 文本改动），shell 单测（参考 `tests/learnings-scripts/test-learnings.sh` 风格）

**Spec:** `docs/agent-harness/specs/2026-06-18-sdd-workspace-cleanup-design.md`

---

## File Structure

**新增文件 (2)**：

1. `skills/subagent-driven-development/scripts/cleanup-workspace` — bash 脚本，单一职责：清空 SDD 工作区内容，保留空目录，失败 exit 0
2. `tests/sdd-scripts/test-cleanup-workspace.sh` — shell 单测，3 个用例（目录不存在 / 内容清空含 .gitignore / rm 失败不阻断）

**修改文件 (1)**：

3. `skills/finishing-a-development-branch/SKILL.md` — 5 处文本改动：
   - Step 4 每个 Option（共 4 处）的 "Then: Done" 前加 cleanup 调用
   - Quick Reference 表格加 "Cleanup SDD Workspace" 列
   - Common Mistakes 加 "Forgetting SDD workspace cleanup"
   - Red Flags → Always 加一条
   - Integration 加 "Calls:" 小节

**不改**：`sdd-workspace` / `task-brief` / `review-package` / `CLAUDE.md` / CI 配置 / 其他 skills

---

## Task 1: 新增 cleanup-workspace 脚本

**Files:**
- Create: `skills/subagent-driven-development/scripts/cleanup-workspace`

- [ ] **Step 1: 创建脚本文件**

写入以下完整内容到 `skills/subagent-driven-development/scripts/cleanup-workspace`：

```bash
#!/usr/bin/env bash
# Clean the SDD working tree's short-lived artifacts: task briefs, implementer
# reports, review packages, and the progress ledger. Keeps the directory itself
# (empty) so sdd-workspace doesn't need to recreate it on next use.
#
# Failure does NOT block callers: warnings go to stderr, exit code is always 0.
# Rationale: this is best-effort cleanup after finishing a development branch;
# a cleanup error should not undo an otherwise-successful merge/PR.
#
# Usage: cleanup-workspace
set -euo pipefail

dir=$(git rev-parse --show-toplevel 2>/dev/null)/.agent-harness/sdd

if [ ! -d "$dir" ]; then
  exit 0
fi

shopt -s dotglob nullglob
if rm -rf "${dir:?}/"*; then
  echo "cleaned: $dir"
else
  echo "warning: cleanup-workspace failed to remove contents of $dir" >&2
fi

exit 0
```

- [ ] **Step 2: 赋予可执行权限**

Run: `chmod +x skills/subagent-driven-development/scripts/cleanup-workspace`
Expected: 无输出，`ls -la` 该文件权限含 `x`

- [ ] **Step 3: 手动冒烟测试 — 目录不存在场景**

Run:
```bash
cd $(mktemp -d) && git init -q && \
bash /Users/arwen/Desktop/Arwen/evanfang/agent-harness/skills/subagent-driven-development/scripts/cleanup-workspace; \
echo "exit=$?"
```
Expected: `exit=0`，无 stdout 输出（`.agent-harness/sdd/` 不存在，静默退出）

- [ ] **Step 4: 手动冒烟测试 — 目录有内容场景**

Run:
```bash
cd $(mktemp -d) && git init -q && \
mkdir -p .agent-harness/sdd && \
touch .agent-harness/sdd/.gitignore .agent-harness/sdd/progress.md \
      .agent-harness/sdd/task-1-brief.md .agent-harness/sdd/review-aaa..bbb.diff && \
bash /Users/arwen/Desktop/Arwen/evanfang/agent-harness/skills/subagent-driven-development/scripts/cleanup-workspace && \
echo "---after---" && ls -la .agent-harness/sdd/
```
Expected:
- stdout 含一行 `cleaned: <绝对路径>/.agent-harness/sdd`
- `---after---` 之后 `ls -la` 只显示 `.` 和 `..`（空目录，`.gitignore` 也被清掉）

- [ ] **Step 5: Commit**

```bash
git add skills/subagent-driven-development/scripts/cleanup-workspace
git commit -m "feat(sdd): add cleanup-workspace script

清空 .agent-harness/sdd/ 内容（含 .gitignore、progress、task brief/report、
review diff），保留空目录。失败不阻断（exit 0 + stderr warning），供
finishing-a-development-branch 收尾时调用。"
```

---

## Task 2: 新增 cleanup-workspace shell 单测

**Files:**
- Create: `tests/sdd-scripts/test-cleanup-workspace.sh`

**测试设计说明**：参考 `tests/learnings-scripts/test-learnings.sh` 的风格（SCRIPT_DIR/PLUGIN_DIR 推导、`mktemp -d` 临时目录、trap cleanup、setup 函数、PASS/FAIL 计数、彩色输出）。3 个用例对应 spec Section 4。

- [ ] **Step 1: 创建测试目录与文件**

Run: `mkdir -p tests/sdd-scripts`

写入以下完整内容到 `tests/sdd-scripts/test-cleanup-workspace.sh`：

```bash
#!/usr/bin/env bash
# Test cleanup-workspace script
# Usage: ./test-cleanup-workspace.sh
#
# Tests:
# 1. 目录不存在 → exit 0，无输出
# 2. 目录有内容（含 .gitignore）→ 全部清空，保留空目录
# 3. rm 失败时不阻断 → 仍 exit 0，stderr 有 warning（root 用户跳过）

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
SCRIPT="$PLUGIN_DIR/skills/subagent-driven-development/scripts/cleanup-workspace"
TEST_DIR="/tmp/agent-harness-cleanup-test-$$"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

PASS=0
FAIL=0

log_pass() { echo -e "${GREEN}✅ PASS${NC}: $1"; ((PASS++)); }
log_fail() { echo -e "${RED}❌ FAIL${NC}: $1"; ((FAIL++)); }

cleanup() { rm -rf "$TEST_DIR"; }
trap cleanup EXIT

# 每个用例在独立临时 git repo 中运行，互不影响
setup_repo() {
    rm -rf "$TEST_DIR"
    mkdir -p "$TEST_DIR"
    cd "$TEST_DIR"
    git init -q
    git config user.email "test@test.local"
    git config user.name "test"
}

echo "=== cleanup-workspace Tests ==="
echo "Script: $SCRIPT"
echo "Test dir: $TEST_DIR"
echo ""

# ==========================================
# Test 1: 目录不存在 → exit 0，无输出
# ==========================================
echo "--- Test 1: 目录不存在 → exit 0 ---"
setup_repo

out=$(bash "$SCRIPT" 2>/tmp/cleanup-stderr-1); rc=$?
if [ "$rc" = "0" ] && [ -z "$out" ] && [ ! -d ".agent-harness/sdd" ]; then
    log_pass "exit=0, stdout empty, dir not created"
else
    log_fail "rc=$rc, out='$out', stderr='$(cat /tmp/cleanup-stderr-1)'"
fi

# ==========================================
# Test 2: 目录有内容（含 .gitignore）→ 全部清空，保留空目录
# ==========================================
echo "--- Test 2: 目录有内容 → 清空 ---"
setup_repo
mkdir -p .agent-harness/sdd
touch .agent-harness/sdd/.gitignore
touch .agent-harness/sdd/progress.md
touch .agent-harness/sdd/task-1-brief.md
touch .agent-harness/sdd/task-1-report.md
touch .agent-harness/sdd/review-aaa..bbb.diff

out=$(bash "$SCRIPT" 2>/tmp/cleanup-stderr-2); rc=$?
remaining=$(ls -A .agent-harness/sdd/ 2>/dev/null | wc -l | tr -d ' ')
if [ "$rc" = "0" ] && \
   echo "$out" | grep -q "^cleaned:" && \
   [ -d ".agent-harness/sdd" ] && \
   [ "$remaining" = "0" ]; then
    log_pass "exit=0, 'cleaned:' printed, dir kept empty (.gitignore removed)"
else
    log_fail "rc=$rc, out='$out', remaining=$remaining, stderr='$(cat /tmp/cleanup-stderr-2)'"
fi

# ==========================================
# Test 3: rm 失败时不阻断 → exit 0，stderr 有 warning
# ==========================================
echo "--- Test 3: rm 失败 → 不阻断 ---"
if [ "$(id -u)" = "0" ]; then
    echo "    (skipped: running as root, permission test unreliable)"
else
    setup_repo
    mkdir -p .agent-harness/sdd
    touch .agent-harness/sdd/.gitignore .agent-harness/sdd/progress.md
    # 父目录改只读，rm 无法删除内部文件
    chmod 555 .agent-harness/sdd

    out=$(bash "$SCRIPT" 2>/tmp/cleanup-stderr-3); rc=$?
    chmod 755 .agent-harness/sdd  # 恢复以便 trap cleanup 能清理
    err=$(cat /tmp/cleanup-stderr-3)
    if [ "$rc" = "0" ] && \
       echo "$err" | grep -q "warning: cleanup-workspace failed"; then
        log_pass "exit=0 even on rm failure, stderr has warning"
    else
        log_fail "rc=$rc, out='$out', stderr='$err'"
    fi
fi

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
[ "$FAIL" = "0" ] || exit 1
```

- [ ] **Step 2: 赋予可执行权限**

Run: `chmod +x tests/sdd-scripts/test-cleanup-workspace.sh`
Expected: 无输出

- [ ] **Step 3: 运行测试，验证全部通过**

Run: `./tests/sdd-scripts/test-cleanup-workspace.sh`
Expected:
```
=== cleanup-workspace Tests ===
Script: .../skills/subagent-driven-development/scripts/cleanup-workspace
Test dir: /tmp/agent-harness-cleanup-test-XXXX

--- Test 1: 目录不存在 → exit 0 ---
✅ PASS: exit=0, stdout empty, dir not created
--- Test 2: 目录有内容 → 清空 ---
✅ PASS: exit=0, 'cleaned:' printed, dir kept empty (.gitignore removed)
--- Test 3: rm 失败 → 不阻断 ---
✅ PASS: exit=0 even on rm failure, stderr has warning

=== Results: 3 passed, 0 failed ===
```
exit code = 0

- [ ] **Step 4: Commit**

```bash
git add tests/sdd-scripts/test-cleanup-workspace.sh
git commit -m "test(sdd): add cleanup-workspace shell unit tests

3 个用例：目录不存在静默退出 / 清空内容含 .gitignore / rm 失败不阻断。
风格参考 tests/learnings-scripts/test-learnings.sh，root 用户自动跳过权限用例。"
```

---

## Task 3: 修改 finishing-a-development-branch SKILL.md

**Files:**
- Modify: `skills/finishing-a-development-branch/SKILL.md`

**改动说明**：共 5 处文本改动。所有改动都在同一个文件，但语义独立，分步骤提交（无需分 commit，一次性 commit 整个 skill 改动）。先读后改。

- [ ] **Step 1: 读取当前 SKILL.md 确认行号**

Run: `Read skills/finishing-a-development-branch/SKILL.md`
Expected: 文件存在，约 180 行，包含 Step 4 四个 Option、Quick Reference 表格、Common Mistakes、Red Flags、Integration 五个小节

- [ ] **Step 2: 改动 1 — Option 1 (Merge Locally) 末尾加 cleanup**

找到 Option 1 末尾（当前约 84-87 行）：

```markdown
# If tests pass
git branch -d <feature-branch>
```

Then: Done
```

在 `Then: Done` 前插入 cleanup 调用，改为：

```markdown
# If tests pass
git branch -d <feature-branch>
```

Then: Run SDD workspace cleanup:

```bash
bash "${CLAUDE_PLUGIN_ROOT}/skills/subagent-driven-development/scripts/cleanup-workspace"
```

Then: Done
```

- [ ] **Step 3: 改动 2 — Option 2 (Push and Create PR) 末尾加 cleanup**

找到 Option 2 末尾（当前约 100-106 行）的 `Then: Done`，在它前面插入同样的 cleanup 块（与 Step 2 相同的 bash 命令段）：

```markdown
Then: Run SDD workspace cleanup:

```bash
bash "${CLAUDE_PLUGIN_ROOT}/skills/subagent-driven-development/scripts/cleanup-workspace"
```

Then: Done
```

- [ ] **Step 4: 改动 3 — Option 3 (Keep As-Is) 加 cleanup**

找到 Option 3（当前约 108-110 行）：

```markdown
#### Option 3: Keep As-Is

Report: "Keeping branch <name>."

**Don't cleanup.**
```

把 `**Don't cleanup.**` 改为 cleanup 调用：

```markdown
#### Option 3: Keep As-Is

Report: "Keeping branch <name>."

Then: Run SDD workspace cleanup:

```bash
bash "${CLAUDE_PLUGIN_ROOT}/skills/subagent-driven-development/scripts/cleanup-workspace"
```
```

**注意**：原 `**Don't cleanup.**` 指的是"不删分支"，不是"不清理 SDD 工作区"。SDD 工作区与分支保留状态无关，四个选项都应清理。

- [ ] **Step 5: 改动 4 — Option 4 (Discard) 末尾加 cleanup**

找到 Option 4 末尾（当前约 125-133 行）：

```markdown
If confirmed:
```bash
git checkout <base-branch>
git branch -D <feature-branch>
```

Then: Done
```

在末尾 `Then: Done` 前插入 cleanup 块：

```markdown
If confirmed:
```bash
git checkout <base-branch>
git branch -D <feature-branch>
```

Then: Run SDD workspace cleanup:

```bash
bash "${CLAUDE_PLUGIN_ROOT}/skills/subagent-driven-development/scripts/cleanup-workspace"
```

Then: Done
```

- [ ] **Step 6: 改动 5 — Quick Reference 表格加列**

找到当前表格（约 137-142 行）：

```markdown
| Option | Merge | Push | Cleanup Branch |
|--------|-------|------|----------------|
| 1. Merge locally | ✓ | - | ✓ |
| 2. Create PR | - | ✓ | - |
| 3. Keep as-is | - | - | - |
| 4. Discard | - | - | ✓ (force) |
```

改为（加 "Cleanup SDD Workspace" 列，四行全部 `✓`）：

```markdown
| Option | Merge | Push | Cleanup Branch | Cleanup SDD Workspace |
|--------|-------|------|----------------|----------------------|
| 1. Merge locally | ✓ | - | ✓ | ✓ |
| 2. Create PR | - | ✓ | - | ✓ |
| 3. Keep as-is | - | - | - | ✓ |
| 4. Discard | - | - | ✓ (force) | ✓ |
```

- [ ] **Step 7: 改动 6 — Common Mistakes 加一条**

找到 `## Common Mistakes` 小节末尾（约 158-159 行，"No confirmation for discard" 的 Fix 行之后），在 `## Red Flags` 之前插入：

```markdown
**Forgetting SDD workspace cleanup**
- **Problem:** `.agent-harness/sdd/` accumulates dozens of brief/report/diff files across sessions
- **Fix:** Always run `cleanup-workspace` after every option, including Keep As-Is

```

- [ ] **Step 8: 改动 7 — Red Flags → Always 加一条**

找到 `**Always:**`（约 173-176 行），在最后一行 `- Get typed confirmation for Option 4` 之后追加：

```markdown
- Run SDD workspace cleanup after executing any option
```

- [ ] **Step 9: 改动 8 — Integration 加 Calls 小节**

找到 `## Integration` 下的 `**Called by:**` 小节（约 177-179 行），在它之前或之后插入新的 `**Calls:**` 小节：

```markdown
**Calls:**
- **subagent-driven-development** cleanup script (`scripts/cleanup-workspace`) - Removes SDD workspace artifacts after branch completion
```

- [ ] **Step 10: 通读修改后的 SKILL.md 确认一致性**

Run: `Read skills/finishing-a-development-branch/SKILL.md`
Expected:
- 四个 Option 的 `Then: Done` 前都有 cleanup bash 块
- Quick Reference 表格有 5 列，"Cleanup SDD Workspace" 列四行全为 `✓`
- Common Mistakes 有 "Forgetting SDD workspace cleanup" 条目
- Red Flags Always 有 "Run SDD workspace cleanup" 条目
- Integration 有 `**Calls:**` 小节

- [ ] **Step 11: Commit**

```bash
git add skills/finishing-a-development-branch/SKILL.md
git commit -m "feat(finishing): clean SDD workspace on branch completion

在 finishing-a-development-branch 收尾时自动清理 .agent-harness/sdd/：
- Step 4 四个选项末尾均调用 cleanup-workspace
- Quick Reference 加列标记所有选项都清理
- Common Mistakes / Red Flags / Integration 同步说明"
```

---

## Self-Review 清单（计划完成后自查）

**Spec 覆盖**：
- ✅ Section 1（脚本接口）→ Task 1
- ✅ Section 2（脚本实现）→ Task 1 Step 1（完整代码）
- ✅ Section 3（finishing skill 改动）→ Task 3（5 处文本改动全覆盖，含 Step 4/Quick Reference/Common Mistakes/Red Flags/Integration）
- ✅ Section 4（测试 3 用例）→ Task 2
- ✅ Section 5（改动清单 + 风险）→ File Structure 对齐

**Placeholder 扫描**：每个 Step 都有具体代码块、具体路径、具体命令；无 "TBD" / "similar to" / "add appropriate"。

**类型一致性**：脚本路径 `skills/subagent-driven-development/scripts/cleanup-workspace` 在所有 Task 中一致；bash 命令段在四个 Option 中完全相同（避免漂移）。

---

## Execution Handoff

Plan complete and saved to `docs/agent-harness/plans/2026-06-18-sdd-workspace-cleanup.md`. Two execution options:

**1. Subagent-Driven (recommended)** - 每个 Task 派发独立 subagent，Task 间 review，快速迭代

**2. Inline Execution** - 在当前 session 按 executing-plans 批量执行，带 checkpoint

Which approach?
