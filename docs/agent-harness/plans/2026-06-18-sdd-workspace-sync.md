# SDD Workspace 路径同步实施计划（上游 PR #1789）

> **For agentic workers:** REQUIRED SUB-SKILL: Use agent-harness:subagent-driven-development (recommended) or agent-harness:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 1:1 移植上游 PR #1789 的 5 处改动到本 fork，消除子代理写 `.git/sdd/` 时触发 Claude Code 敏感路径保护的问题。

**Architecture:** 新增 `scripts/sdd-workspace` 作为 SDD 临时 artifacts 路径的唯一来源，`task-brief` 与 `review-package` 改为调用它；路径从 `<git-dir>/sdd/` 迁到工作树下 `<repo-root>/.agent-harness/sdd/`，用自忽略 `.gitignore` 让该目录对 Git 完全不可见。

**Tech Stack:** Bash（`set -euo pipefail`）、Git plumbing（`git rev-parse --show-toplevel`）、shell 测试（`tests/claude-code/`）。

**Spec:** `docs/agent-harness/specs/2026-06-18-sdd-workspace-sync-design.md`

---

## File Structure

| 文件 | 责任 | 操作 |
|---|---|---|
| `skills/subagent-driven-development/scripts/sdd-workspace` | 解析并创建 `.agent-harness/sdd/`，写自忽略 `.gitignore`，打印绝对路径 | 新增 |
| `skills/subagent-driven-development/scripts/task-brief` | 从 plan 文件抽取单个 task 文本，写入 workspace | 修改 dir 解析（L7-8 注释 + L23-25 代码） |
| `skills/subagent-driven-development/scripts/review-package` | 生成 commit list + diff 包，写入 workspace | 修改 dir 解析（L8-10 注释 + L27-29 代码） |
| `skills/subagent-driven-development/SKILL.md` | SDD 行为塑造文档 | 修改 L290 progress ledger 路径 |
| `tests/claude-code/test-sdd-workspace.sh` | 验证 workspace 路径、自忽略、git add -A 安全、worktree 隔离 | 新增 |

---

### Task 1: 新增 `scripts/sdd-workspace` 辅助脚本

**Files:**
- Create: `skills/subagent-driven-development/scripts/sdd-workspace`

- [ ] **Step 1: 创建脚本文件**

写入以下完整内容：

```bash
#!/usr/bin/env bash
# Resolve and ensure the working-tree directory SDD uses for its short-lived
# artifacts: task briefs, implementer reports, review packages, and the
# progress ledger. Print the directory's absolute path.
#
# The workspace lives in the working tree (not under .git/) because Claude Code
# treats .git/ as a protected path and denies agent writes there — which blocks
# an implementer subagent from writing its report file. A self-ignoring
# .gitignore keeps the workspace out of `git status` and out of accidental
# commits without modifying any tracked file.
#
# Single source of truth for the workspace location, so task-brief and
# review-package cannot drift to different directories.
#
# Usage: sdd-workspace
set -euo pipefail

root=$(git rev-parse --show-toplevel)
dir="$root/.agent-harness/sdd"
mkdir -p "$dir"
printf '*\n' > "$dir/.gitignore"
cd "$dir" && pwd
```

- [ ] **Step 2: 赋予可执行权限**

Run: `chmod +x skills/subagent-driven-development/scripts/sdd-workspace`
Expected: 无输出，`ls -l` 显示 `-rwxr-xr-x`

- [ ] **Step 3: 手动 smoke test**

Run:
```bash
tmp=$(mktemp -d) && git init -q -b main "$tmp/r" && (cd "$tmp/r" && "$(pwd)/skills/subagent-driven-development/scripts/sdd-workspace")
```
Expected: 输出形如 `/private/var/.../r/.agent-harness/sdd` 的绝对路径；该目录下存在内容为 `*` 的 `.gitignore`。

- [ ] **Step 4: Commit**

```bash
git add skills/subagent-driven-development/scripts/sdd-workspace
git commit -m "feat(sdd): add sdd-workspace helper for working-tree artifacts dir"
```

---

### Task 2: 修改 `scripts/task-brief` 调用 sdd-workspace

**Files:**
- Modify: `skills/subagent-driven-development/scripts/task-brief:7-8`（注释）
- Modify: `skills/subagent-driven-development/scripts/task-brief:23-25`（代码）

- [ ] **Step 1: 更新头部注释（L7-8）**

将：
```
# Default OUTFILE: <git-dir>/sdd/task-<N>-brief.md — unique per repo
# instance, so concurrent sessions cannot collide.
```
改为：
```
# Default OUTFILE: <repo-root>/.agent-harness/sdd/task-<N>-brief.md
# (per worktree; concurrent runs in the same working tree share it).
```

- [ ] **Step 2: 替换 dir 解析（L23-25）**

将：
```bash
  dir=$(git rev-parse --git-path sdd)
  mkdir -p "$dir"
  dir=$(cd "$dir" && pwd)
```
改为：
```bash
  dir=$("$(cd "$(dirname "$0")" && pwd)/sdd-workspace")
```

- [ ] **Step 3: 验证脚本仍可运行**

Run:
```bash
tmp=$(mktemp -d) && git init -q -b main "$tmp/r" && cp skills/subagent-driven-development/scripts/* "$tmp/r/" 2>/dev/null
cat > "$tmp/r/plan.md" <<'EOF'
# Plan
## Task 1: First
Do it.
EOF
(cd "$tmp/r" && ./task-brief plan.md 1)
```
Expected: 输出 `wrote /.../r/.agent-harness/sdd/task-1-brief.md: N lines`，文件确实落在 `.agent-harness/sdd/` 下。

- [ ] **Step 4: Commit**

```bash
git add skills/subagent-driven-development/scripts/task-brief
git commit -m "refactor(sdd): task-brief resolves workspace via sdd-workspace"
```

---

### Task 3: 修改 `scripts/review-package` 调用 sdd-workspace

**Files:**
- Modify: `skills/subagent-driven-development/scripts/review-package:8-10`（注释）
- Modify: `skills/subagent-driven-development/scripts/review-package:27-29`（代码）

- [ ] **Step 1: 更新头部注释（L8-10）**

将：
```
# Default OUTFILE: <git-dir>/sdd/review-<base7>..<head7>.diff — unique per
# repo instance and per range, so concurrent sessions cannot collide and a
# re-review after fixes always gets a distinctly named fresh file.
```
改为：
```
# Default OUTFILE: <repo-root>/.agent-harness/sdd/review-<base7>..<head7>.diff
# (named per range, so a re-review after fixes gets a distinct fresh file).
```

- [ ] **Step 2: 替换 dir 解析（L27-29）**

将：
```bash
  dir=$(git rev-parse --git-path sdd)
  mkdir -p "$dir"
  dir=$(cd "$dir" && pwd)
```
改为：
```bash
  dir=$("$(cd "$(dirname "$0")" && pwd)/sdd-workspace")
```

- [ ] **Step 3: 验证脚本仍可运行**

Run:
```bash
tmp=$(mktemp -d) && git init -q -b main "$tmp/r" && cp skills/subagent-driven-development/scripts/* "$tmp/r/" 2>/dev/null
cd "$tmp/r"
git config user.email t@e.com && git config user.name t && git config commit.gpgsign false
echo a > a && git add a && git commit -qm c1
echo b > b && git add b && git commit -qm c2
./review-package HEAD~1 HEAD
```
Expected: 输出 `wrote /.../r/.agent-harness/sdd/review-<base7>..<head7>.diff: 1 commit(s), N bytes`。

- [ ] **Step 4: Commit**

```bash
git add skills/subagent-driven-development/scripts/review-package
git commit -m "refactor(sdd): review-package resolves workspace via sdd-workspace"
```

---

### Task 4: 修改 `SKILL.md` progress ledger 路径

**Files:**
- Modify: `skills/subagent-driven-development/SKILL.md:290`

- [ ] **Step 1: 替换 L290 路径**

将：
```
  `cat "$(git rev-parse --git-path sdd)/progress.md"`. Tasks listed there
```
改为：
```
  `cat "$(git rev-parse --show-toplevel)/.agent-harness/sdd/progress.md"`. Tasks listed there
```

- [ ] **Step 2: 确认无残留 `.git/sdd` 引用**

Run: `grep -rn "git-path sdd\|\.git/sdd" skills/`
Expected: 无输出（所有引用已迁移）。

- [ ] **Step 3: Commit**

```bash
git add skills/subagent-driven-development/SKILL.md
git commit -m "docs(sdd): point progress ledger path at .agent-harness/sdd/"
```

---

### Task 5: 新增 `tests/claude-code/test-sdd-workspace.sh` 测试

**Files:**
- Create: `tests/claude-code/test-sdd-workspace.sh`

- [ ] **Step 1: 创建测试文件**

写入以下完整内容（与上游 PR #1789 一致）：

```bash
#!/usr/bin/env bash
# Tests for the SDD workspace: scripts/sdd-workspace resolves a self-ignoring
# working-tree directory for SDD artifacts, and the SDD scripts write into it.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SDD_SCRIPTS="$REPO_ROOT/skills/subagent-driven-development/scripts"

FAILURES=0
TEST_ROOT=""

pass() { echo "  [PASS] $1"; }
fail() {
    echo "  [FAIL] $1"
    FAILURES=$((FAILURES + 1))
}

cleanup() {
    if [[ -n "$TEST_ROOT" && -d "$TEST_ROOT" ]]; then
        rm -rf "$TEST_ROOT"
    fi
}

main() {
    echo "=== Test: sdd-workspace ==="

    TEST_ROOT="$(mktemp -d)"
    trap cleanup EXIT

    # Resolve repo to its physical path so string comparisons match the
    # helper's output (git rev-parse --show-toplevel resolves symlinks; on
    # macOS mktemp lives under /var -> /private/var).
    git init -q -b main "$TEST_ROOT/repo"
    local repo
    repo="$(cd "$TEST_ROOT/repo" && git rev-parse --show-toplevel)"

    local dir
    dir="$(cd "$repo" && "$SDD_SCRIPTS/sdd-workspace")"

    if [[ "$dir" == "$repo/.agent-harness/sdd" ]]; then
        pass "prints <repo-root>/.agent-harness/sdd"
    else
        fail "prints <repo-root>/.agent-harness/sdd"
        echo "    got: $dir"
    fi

    if [[ -f "$repo/.agent-harness/sdd/.gitignore" && "$(cat "$repo/.agent-harness/sdd/.gitignore")" == "*" ]]; then
        pass "self-ignoring .gitignore created with '*'"
    else
        fail "self-ignoring .gitignore created with '*'"
    fi

    printf 'x\n' > "$repo/.agent-harness/sdd/artifact.md"
    local status
    status="$(cd "$repo" && git status --porcelain)"
    if [[ -z "$status" ]]; then
        pass "workspace invisible to git status"
    else
        fail "workspace invisible to git status"
        echo "    status: $status"
    fi

    ( cd "$repo" && git add -A )
    local staged
    staged="$(cd "$repo" && git diff --cached --name-only)"
    if [[ -z "$staged" ]]; then
        pass "git add -A does not stage the workspace"
    else
        fail "git add -A does not stage the workspace"
        echo "    staged: $staged"
    fi

    cat > "$repo/plan.md" <<'PLAN'
# Plan

## Task 1: First thing

Do the first thing.
PLAN

    local brief_out brief_path
    brief_out="$(cd "$repo" && "$SDD_SCRIPTS/task-brief" plan.md 1)"
    brief_path="$(printf '%s\n' "$brief_out" | sed -n 's/^wrote \(.*\): [0-9][0-9]* lines$/\1/p')"
    case "$brief_path" in
        "$repo/.agent-harness/sdd/"*) pass "task-brief writes its brief under the workspace" ;;
        *)
            fail "task-brief writes its brief under the workspace"
            echo "    got: $brief_path"
            ;;
    esac

    local git_id=(-c user.email=t@example.com -c user.name=t -c commit.gpgsign=false)
    ( cd "$repo" \
        && git add plan.md \
        && git "${git_id[@]}" commit -qm c1 \
        && printf 'y\n' > f && git add f \
        && git "${git_id[@]}" commit -qm c2 )
    local rp_out rp_path
    rp_out="$(cd "$repo" && "$SDD_SCRIPTS/review-package" HEAD~1 HEAD)"
    rp_path="$(printf '%s\n' "$rp_out" | sed -n 's/^wrote \(.*\): [0-9].*$/\1/p')"
    case "$rp_path" in
        "$repo/.agent-harness/sdd/"*) pass "review-package writes its diff under the workspace" ;;
        *)
            fail "review-package writes its diff under the workspace"
            echo "    got: $rp_path"
            ;;
    esac

    # --- Worktree isolation: a linked worktree resolves its own workspace ---
    local wt="$TEST_ROOT/wt"
    ( cd "$repo" && git worktree add -q "$wt" -b wt-feature )
    local wt_root wt_dir
    wt_root="$(cd "$wt" && git rev-parse --show-toplevel)"
    wt_dir="$(cd "$wt" && "$SDD_SCRIPTS/sdd-workspace")"
    if [[ "$wt_dir" == "$wt_root/.agent-harness/sdd" && "$wt_dir" != "$dir" ]]; then
        pass "linked worktree resolves its own distinct workspace"
    else
        fail "linked worktree resolves its own distinct workspace"
        echo "    main: $dir"
        echo "    wt:   $wt_dir"
    fi

    printf 'y\n' > "$wt/.agent-harness/sdd/artifact.md"
    local wt_status
    wt_status="$(cd "$wt" && git status --porcelain)"
    if [[ -z "$wt_status" ]]; then
        pass "worktree workspace invisible to git status"
    else
        fail "worktree workspace invisible to git status"
        echo "    status: $wt_status"
    fi

    echo ""
    if [[ "$FAILURES" -ne 0 ]]; then
        echo "FAILED: $FAILURES assertion(s)."
        exit 1
    fi
    echo "PASS"
}

main "$@"
```

- [ ] **Step 2: 赋予可执行权限**

Run: `chmod +x tests/claude-code/test-sdd-workspace.sh`
Expected: 无输出。

- [ ] **Step 3: 运行测试验证全绿**

Run: `./tests/claude-code/test-sdd-workspace.sh`
Expected: 7 个 `[PASS]`，最后一行 `PASS`，退出码 0。

- [ ] **Step 4: Commit**

```bash
git add tests/claude-code/test-sdd-workspace.sh
git commit -m "test(sdd): lock in per-worktree workspace isolation (#1780)"
```

---

### Task 6: 全量回归验证

**Files:** 无（仅验证）

- [ ] **Step 1: 全仓 grep 确认无 `.git/sdd` 残留**

Run: `grep -rn "git-path sdd\|\.git/sdd" skills/ tests/ docs/ 2>/dev/null`
Expected: 无输出。

- [ ] **Step 2: 确认 SDD 既有集成测试仍可跑（如适用）**

Run: `ls tests/claude-code/test-subagent-driven-development*.sh 2>/dev/null`
Expected: 列出既有 SDD 测试文件；若环境允许可运行 `./tests/claude-code/test-subagent-driven-development.sh`，但不强制（依赖 Claude Code CLI）。

- [ ] **Step 3: 总结改动并提示用户审阅**

打印 `git log --oneline feat/sdd-v6-sync~6..feat/sdd-v6-sync`（或本分支新增的 5 个 commit），提示用户在合并前做最终 diff 审阅。

---

## Self-Review

**Spec 覆盖：**
- spec §"改动清单" 5 项 → Task 1-5 一一对应 ✓
- spec §"错误处理"（`set -euo pipefail`、非 git 仓库失败冒泡）→ Task 1 脚本内嵌 ✓
- spec §"验证" 自动化测试 7 条断言 → Task 5 测试代码全部覆盖 ✓
- spec §"非目标"（不动 prose、不引入依赖、不动 fork 定制）→ 计划无相关改动 ✓

**Placeholder scan：** 所有步骤均含完整代码/命令，无 TBD/TODO ✓

**类型/命名一致性：** `sdd-workspace`、`task-brief`、`review-package`、`.agent-harness/sdd`、`--show-toplevel` 在所有 task 中一致 ✓
