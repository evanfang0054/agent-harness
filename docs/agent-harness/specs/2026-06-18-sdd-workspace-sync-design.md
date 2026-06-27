# SDD Workspace 路径同步设计（上游 PR #1789）

- **日期**：2026-06-18
- **类型**：Bug 修复（路径迁移）
- **上游 PR**：[obra/agent-harness#1789](https://github.com/obra/agent-harness/pull/1789) `fix(sdd): write artifacts to a working-tree dir, not .git/ (#1780)`
- **状态**：已与用户确认同步范围

## 背景与动机

Subagent-Driven Development（SDD）的临时 artifacts（task brief、implementer report、review package、progress ledger）目前写入 `<git-dir>/sdd/`（即 `.git/sdd/`）。当 implementer 子代理用 Write 工具直接往该路径写报告时，会触发 Claude Code 的敏感路径保护（`.git/` 是受保护路径），导致 permission denial 或二次确认，打断 Ralph Loop。

上游 PR #1780/#1789 已修复此问题：把工作目录从 `.git/sdd/` 迁到工作树下的 `.agent-harness/sdd/`，并用自忽略 `.gitignore` 让 Git 完全看不到这些文件。

## 目标

1:1 移植 PR #1789 的全部 5 处改动到本 fork，彻底消除子代理写 `.git/sdd/` 时的敏感路径拦截，同时保留 fork 已有的 SKILL.md 定制（argument-hint、when_to_use、Ralph Loop 内联模板）。

## 非目标

- 不修改任何行为塑造的 prompt prose
- 不重构 SDD 工作流
- 不引入第三方依赖
- 不动 fork SKILL.md 中与路径无关的定制内容

## 现状对比

fork 当前 SDD 模块与上游 main 的关系：

| 文件 | fork vs 上游 main | PR #1789 是否触及 |
|---|---|---|
| `scripts/task-brief` | 字节相同 | 是（改 dir 解析） |
| `scripts/review-package` | 字节相同 | 是（改 dir 解析） |
| `SKILL.md` | fork 有额外定制（argument-hint / when_to_use / Ralph Loop 模板） | 是（仅 L290 一行路径，与定制无冲突） |
| `scripts/sdd-workspace` | fork 缺失 | 是（新增） |
| `tests/claude-code/test-sdd-workspace.sh` | fork 缺失 | 是（新增） |

全仓库中 `.git/sdd` / `git-path sdd` 的引用仅 3 处，全部在 SDD 模块内（`SKILL.md:290`、`task-brief:23`、`review-package:27`），无外部引用。

## 设计

### 架构：单一可信路径来源

新增 `scripts/sdd-workspace` 作为所有 SDD 临时 artifacts 路径的唯一来源。`task-brief` 和 `review-package` 不再各自调用 `git rev-parse --git-path sdd`，而是调用 `sdd-workspace`。

```
┌─────────────────────────────────────────────────┐
│ sdd-workspace（新增，单一路径来源）             │
│  - git rev-parse --show-toplevel/.agent-harness/sdd│
│  - mkdir -p                                      │
│  - 写 .gitignore（内容：*）                      │
│  - 打印绝对路径                                  │
└────────────┬───────────────────────┬────────────┘
             │                       │
   ┌─────────▼────────┐    ┌────────▼─────────┐
   │ task-brief       │    │ review-package   │
   │ dir=$($0/        │    │ dir=$($0/        │
   │  sdd-workspace)  │    │  sdd-workspace)  │
   └──────────────────┘    └──────────────────┘
```

### 自忽略机制

`sdd-workspace` 创建目录后立即写一个内容只有 `*` 的 `.gitignore`。该 `.gitignore` 只作用于本目录，使整个 `.agent-harness/sdd/` 对 Git 完全不可见：

- 不会出现在 `git status`
- 不会被 `git add -A` 误提交
- 不修改任何已跟踪文件
- linked worktree 各自的 `.agent-harness/sdd/.gitignore` 独立生效

### Worktree 友好

用 `git rev-parse --show-toplevel`（工作树根）而非 `--git-path`（公共 `.git/`），每个 linked worktree 都解析出自己独立的 `.agent-harness/sdd/`，主仓库与 worktree、多个 worktree 之间互不干扰。

## 改动清单

| # | 文件 | 改动 |
|---|---|---|
| 1 | `skills/subagent-driven-development/scripts/sdd-workspace` | 新增（22 行，`set -euo pipefail`） |
| 2 | `skills/subagent-driven-development/scripts/task-brief` | 删除 `dir=$(git rev-parse --git-path sdd); mkdir -p "$dir"; dir=$(cd "$dir" && pwd)`（L23-25），替换为 `dir=$("$(cd "$(dirname "$0")" && pwd)/sdd-workspace")` |
| 3 | `skills/subagent-driven-development/scripts/review-package` | 同上（L27-29） |
| 4 | `skills/subagent-driven-development/SKILL.md` | L290：`cat "$(git rev-parse --git-path sdd)/progress.md"` → `cat "$(git rev-parse --show-toplevel)/.agent-harness/sdd/progress.md"` |
| 5 | `tests/claude-code/test-sdd-workspace.sh` | 新增（142 行，覆盖路径解析、自忽略、git add -A 安全、worktree 隔离） |

`task-brief` 和 `review-package` 的头部注释也同步更新：`<git-dir>/sdd/...` → `<repo-root>/.agent-harness/sdd/...`。

## 错误处理

- `sdd-workspace` 使用 `set -euo pipefail`；在非 git 仓库下 `git rev-parse --show-toplevel` 失败时立即非零退出，错误信号清晰。
- `mkdir -p` 和 `printf > .gitignore` 失败也会因 `set -e` 立即传播。
- 调用方（`task-brief` / `review-package`）已有 `set -euo pipefail`，子脚本失败会自然冒泡。

## 验证

### 自动化测试（`test-sdd-workspace.sh`）

在临时 git 仓库中断言：

1. `sdd-workspace` 输出 `<repo>/.agent-harness/sdd`
2. 目录下存在 `.gitignore`，内容为 `*`
3. 在 workspace 写文件后，`git status --porcelain` 为空
4. `git add -A` 不暂存任何 workspace 文件
5. `task-brief plan.md 1` 输出文件路径以 `<repo>/.agent-harness/sdd/` 开头
6. `review-package HEAD~1 HEAD` 输出文件路径以 `<repo>/.agent-harness/sdd/` 开头
7. linked worktree 解析出独立 workspace（与主仓库不同），且同样对 git 不可见

### 手动回归

- 在真实 SDD 会话中跑一遍 task-brief + review-package，确认子代理能用 Write 工具直接写入 `.agent-harness/sdd/...`，无 permission denial
- 确认 `git status` 在 SDD 运行后保持干净

## 风险与回滚

- **风险**：极低。纯机械路径调整，无行为塑造 prose 改动，无第三方依赖。
- **回滚**：`git revert` 单个 commit 即可恢复 `.git/sdd/` 路径。
- **兼容性**：已有的 `.git/sdd/` 残留文件不会自动迁移，但 SDD artifacts 是短生命周期文件，旧文件可忽略或手工清理。

## 参考链接

- 上游 PR：https://github.com/obra/agent-harness/pull/1789
- 上游 issue：#1780
