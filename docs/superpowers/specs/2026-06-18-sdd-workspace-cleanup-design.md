# SDD Workspace 清理设计

- **日期**：2026-06-18
- **类型**：功能增强（生命周期收尾）
- **状态**：已与用户确认设计

## 背景与动机

Subagent-Driven Development（SDD）在执行过程中会在 `.superpowers/sdd/` 下累积大量短生命周期的临时 artifacts：

- `task-N-brief.md`（每个 task 一份，最多 17+ 份）
- `task-N-report.md`（每个 task 一份，含 fix 报告）
- `review-<base>..<head>.diff`（每轮 review 一份，单个可达 776 KB）
- `progress.md`（进度账本）
- `final-review-fix-report.md`（最终修复报告）
- `.gitignore`（自忽略文件）

实测在最近一次 server 基础设施增强任务结束后，该目录残留 70+ 个文件，总计数 MB。这些文件是**会话级临时产物**——任务一旦完成并通过 final review，它们就失去了价值。git 历史已经完整记录了每个 task 的 commits 和改动内容，这些 artifacts 只是过程中的脚手架。

当前 SDD 工作流在 `finishing-a-development-branch` 之后没有清理步骤，导致：

1. 工作区文件无界增长，跨 session 累积
2. 磁盘空间浪费（单个 review diff 可达数百 KB）
3. 下一次 SDD 启动时，旧的 `progress.md` 可能被误读为"已有进度"，引发 SDD SKILL.md 中警告过的"re-dispatch completed tasks"风险（参见 `subagent-driven-development/SKILL.md` 第 286-298 行的 Durable Progress 警告）
4. 目录视觉污染，`ls` 输出混乱

## 目标

在 SDD 流程收尾时自动清理 `.superpowers/sdd/` 工作区，让目录回到"下次 SDD 从空状态开始"的初始形态。

## 非目标

- 不归档任何 artifacts（git 历史是唯一证据来源）
- 不重构现有 `sdd-workspace` / `task-brief` / `review-package` 脚本
- 不修改 SDD 执行流程（仅在 finishing 阶段加清理）
- 不引入 CI matrix 改动
- 不动 CLAUDE.md（artifacts 是临时产物，不需要文档化其生命周期）
- 不清理 `.superpowers/` 下其他子目录（如 `learnings.jsonl`、`session-analysis/`）

## 设计

### 架构：独立 cleanup 脚本 + finishing skill 调用

新增一个独立 shell 脚本负责清理，`finishing-a-development-branch` skill 在收尾时调用它。两者职责分离：

- `cleanup-workspace` 脚本：**只负责清空工作区**，不知道何时该清
- `finishing-a-development-branch` skill：**只负责决定何时清**，不知道清理细节

```
┌──────────────────────────────────────────────────┐
│ finishing-a-development-branch (调用方)          │
│   Step 4 每个 Option 末尾 → 调用 cleanup 脚本    │
└────────────────┬─────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────┐
│ cleanup-workspace (新增脚本)                     │
│   1. 拼路径 <root>/.superpowers/sdd              │
│   2. 不存在 → exit 0                             │
│   3. 存在 → rm -rf 内容（含隐藏文件）            │
│   4. 失败 → stderr warning + exit 0              │
└──────────────────────────────────────────────────┘
```

### 组件 1：cleanup-workspace 脚本

**路径**：`skills/subagent-driven-development/scripts/cleanup-workspace`

**接口**：无参数。路径在脚本内部解析。

**行为**：

1. 通过 `git rev-parse --show-toplevel` 解析仓库根，拼接 `.superpowers/sdd`
2. 若目录不存在：直接 `exit 0`（说明没跑过 SDD，没事可做）
3. 若存在：开启 `dotglob nullglob` 后 `rm -rf "${dir:?}/"*`，清掉所有内容（含 `.gitignore`、`progress.md`、所有 task/report/diff 文件），保留空目录本身
4. 不重建 `.gitignore`——下次 `task-brief` / `review-package` 调用 `sdd-workspace` 时会自动 `mkdir -p` + 重写 `.gitignore`
5. 失败不阻断：`rm` 失败时 stderr 打印 `warning: cleanup-workspace failed to remove contents of <dir>`，仍 `exit 0`

**实现要点**：

- `#!/usr/bin/env bash` + `set -euo pipefail`（与同层脚本一致）
- `shopt -s dotglob nullglob` 确保 `.gitignore` 等隐藏文件被匹配
- `${dir:?}` 防止变量意外为空导致 `rm -rf /*` 的经典 footgun
- `rm -rf` 包在 `if/then/else` 里：`set -e` 在条件位置不触发退出，落到 else 分支打 warning

**实现**：

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

dir=$(git rev-parse --show-toplevel 2>/dev/null)/.superpowers/sdd

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

### 组件 2：finishing-a-development-branch SKILL.md 改动

四处改动：

**改动 1：Step 4 每个 Option 末尾加 cleanup 调用**

在 Option 1 / Option 2 / Option 3 / Option 4 的 "Then: Done" 前插入同一段：

```markdown
Then: Run SDD workspace cleanup:
```bash
bash "$(git rev-parse --show-toplevel)/skills/subagent-driven-development/scripts/cleanup-workspace"
```

Then: Done
```

四个选项都清理（含 Keep As-Is）。理由：SDD 工作区是会话级临时产物，跟分支保留与否无关。

**改动 2：Quick Reference 表格加一列**

```markdown
| Option | Merge | Push | Cleanup Branch | Cleanup SDD Workspace |
|--------|-------|------|----------------|----------------------|
| 1. Merge locally | ✓ | - | ✓ | ✓ |
| 2. Create PR | - | ✓ | - | ✓ |
| 3. Keep as-is | - | - | - | ✓ |
| 4. Discard | - | - | ✓ (force) | ✓ |
```

**改动 3：Common Mistakes 加一条**

```markdown
**Forgetting SDD workspace cleanup**
- **Problem:** `.superpowers/sdd/` accumulates dozens of brief/report/diff files across sessions
- **Fix:** Always run `cleanup-workspace` after every option, including Keep As-Is
```

**改动 4：Red Flags → Always 加一条**

```markdown
- Run SDD workspace cleanup after executing any option
```

**改动 5：Integration 加 "Calls:" 小节**

```markdown
**Calls:**
- **subagent-driven-development** cleanup script (`scripts/cleanup-workspace`) - Removes SDD workspace artifacts after branch completion
```

### 组件 3：测试

**路径**：`tests/sdd-scripts/test-cleanup-workspace.sh`（新建 `tests/sdd-scripts/` 目录，与 `tests/learnings-scripts/` 平级）

**模式**：参考 `tests/learnings-scripts/test-learnings.sh` 的 shell 单测风格。

**测试用例**（3 个；`.gitignore` 清理并入用例 2 的断言，不单列）：

1. **目录不存在 → exit 0，无输出**
   - 临时 git repo 里 `.superpowers/sdd/` 未建
   - 跑 cleanup → `exit 0`，stdout 空，目录仍未建

2. **目录有内容（含 `.gitignore`）→ 全部清空，保留空目录**
   - 造 `.superpowers/sdd/{.gitignore,progress.md,task-1-brief.md,review-aaa..bbb.diff}`
   - 跑 cleanup → `exit 0`，stdout 含 `cleaned:`，目录还在
   - 断言：目录内无任何文件（含 `.gitignore` 被清掉）

3. **rm 失败时不阻断 → 仍 exit 0，stderr 有 warning**
   - `chmod 555` 把目录改成不可写模拟失败，跑完 `chmod 755` 恢复
   - root 用户绕过权限检查，CI 跑 root 时用 `[ "$(id -u)" = 0 ] && skip` 跳过

**运行入口**：可独立 `./test-cleanup-workspace.sh` 跑，与 `tests/learnings-scripts/test-learnings.sh` 一致。不接入 CI matrix。

### 数据流

```
finishing-a-development-branch
  ├─ Step 1: Verify tests pass
  ├─ Step 2: Determine base branch
  ├─ Step 3: Present 4 options
  ├─ Step 4: Execute user's choice (merge / push+PR / keep / discard)
  └─ [NEW] Step 4 末尾（每个 option）:
       └─ bash cleanup-workspace
            ├─ git rev-parse --show-toplevel
            ├─ 检查 .superpowers/sdd/ 是否存在
            └─ rm -rf 内容（含 .gitignore）
```

### 错误处理

| 失败场景 | 行为 |
|---|---|
| `.superpowers/sdd/` 不存在 | 静默 `exit 0`（正常情况） |
| `rm` 权限不足（非 root） | stderr warning + `exit 0` |
| `rm` 其他失败 | stderr warning + `exit 0` |
| `git rev-parse` 失败（非 git 仓库） | `set -e` 触发，脚本非零退出——但 finishing skill 本身就要求在 git 仓库里运行，不会发生 |

**核心原则**：清理失败永远不阻断 finishing 流程。finishing 的本质是结束分支（merge/PR/keep/discard），这些动作已经完成后，清理只是锦上添花，不应让一个外围失败推翻整个收尾。

## 改动清单

**新增文件 (2)**：

1. `skills/subagent-driven-development/scripts/cleanup-workspace` — bash 脚本
2. `tests/sdd-scripts/test-cleanup-workspace.sh` — shell 单测（3 用例）

**修改文件 (1)**：

3. `skills/finishing-a-development-branch/SKILL.md` — Step 4 四处 + Quick Reference + Common Mistakes + Red Flags + Integration（共 5 处文本改动）

**不改的内容**：

- `scripts/sdd-workspace` / `task-brief` / `review-package` — 不动
- `CLAUDE.md` — 不需要加说明
- CI 配置 — 不接入 matrix
- 其他 skills — 不动

## 风险与缓解

| 风险 | 缓解 |
|---|---|
| 误清仍在进行中的 SDD 会话产物 | 仅在 `finishing-a-development-branch` 调用，该 skill 本身要求 "all tasks complete"，时机天然是 SDD 流程结束之后 |
| 路径常量 `<root>/.superpowers/sdd` 在 `sdd-workspace` 和 `cleanup-workspace` 重复 | 两脚本都从 `git rev-parse --show-toplevel` 派生，路径漂移风险低；未来若路径变了，两处一起改。不抽公共脚本（YAGNI） |
| 跨 worktree 误清 | `git rev-parse --show-toplevel` 返回当前 worktree 根，per-worktree 天然隔离，不会影响其他 worktree 的 `.superpowers/sdd/` |
| 用户手动跑 cleanup 清掉了想保留的产物 | git 历史保留所有 task commits，artifacts 本就是可重建的派生物；且 progress.md 是 append-only 的进度记录，重建代价低 |

## 成功标准

1. 跑完一次完整 SDD 流程（implementer → task reviewer → final review → finishing）后，`.superpowers/sdd/` 为空目录
2. cleanup 脚本可独立执行，exit code 恒为 0
3. `tests/sdd-scripts/test-cleanup-workspace.sh` 3 个用例全部通过
4. `finishing-a-development-branch` skill 的 Quick Reference 表格正确反映"所有 4 个选项都清理"
5. cleanup 失败时 finishing 流程不受影响（warning 但继续 Done）
