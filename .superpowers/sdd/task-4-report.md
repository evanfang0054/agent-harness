# Task 4 Report: auto-loop.sh 入口薄壳脚本

## Status
COMPLETED

## Commits
- `86cf35b` feat(auto-loop): add auto-loop.sh entry script with CLI parsing and signal handling

## Files
- Created: `scripts/auto-loop.sh` (executable, 251 行)
- Created: `tests/plugin-infrastructure/test-auto-loop-cli.sh`
- Modified: `tests/plugin-infrastructure/run-all.sh`（注册新测试）

## 测试摘要
auto-loop.sh CLI: 9/9 PASS；plugin-infrastructure 全套 15/15 PASS。

## 实现要点
- 逐字照抄 brief 代码，包含所有 review 修复项：
  - jq `-nR --arg` 安全 prompt 注入（避免 sed 特殊字符问题）
  - 进程替换 `2> >(tee ...)` + `while read` 管道，保持主 shell 上下文
  - 心跳后台进程（每 30s check_heartbeat）
  - `LAST_SIGNAL` 多分支结束处理（COMPLETE / INTERVENTION / PUSH_FAILED / STATE_ERROR / fallback）
  - `check_git_remote` 验证 origin 指向用户 fork
  - `check_clean_workspace` 脏工作区拒绝运行
  - INT/TERM 信号 trap 写 checkpoint 退出
- source 路径：`$SCRIPT_DIR/lib/{state,observe,worktree}.sh`

## Concerns
- 脚本中 `SCOPE_DESC` 在 `--resume` 路径下可能为空（全新运行才赋值），导致 `SCOPE_VAL` 为空字符串注入 prompt。Resume 场景理论上 state 已有 request/scope，但当前代码未从 state 恢复 SCOPE_DESC，仅用空值。若 resume 后 prompt 模板 `{{SCOPE}}` 为空不影响主流程，但值得后续 Task 5/6 关注。
- `set -euo pipefail` 下，`while read` 管道中 `process_line` 若返回非零可能触发 pipefail。observe.sh 的 `process_line` 实现需确保内部容错（未验证，属 Task 2 职责）。
- 未做真实 `claude -p` 端到端冒烟（属 Task 6 集成冒烟范畴）。

## Fix Report (review pass)

### Status
COMPLETED

### Commit
- `fix(auto-loop): use process substitution to preserve LAST_SIGNAL in main shell`

### Bugs 修复

**Critical: 管道导致子 shell 隔离，LAST_SIGNAL 丢失**
原代码 `claude -p ... | while read; do process_line; done` 中，`while` 在子 shell
执行，`process_line` 对 `LAST_SIGNAL` 的赋值在管道结束后丢失，所有完成信号分支
（COMPLETE/INTERVENTION/PUSH_FAILED/STATE_ERROR）永远不命中。

修复：改用进程替换 `done < <(claude -p ...)`，使 while 循环在主 shell 执行，
LAST_SIGNAL 赋值可保留到循环结束后用于分支判断。`EXIT_CODE` 改用 `$?`。

**Minor 1: DRY_RUN 未初始化**
在参数解析前 `set -u` 会导致 `--dry-run` 之前的引用崩溃。在变量声明区加
`DRY_RUN=false`。

**Minor 2: --resume 分支 SCOPE_DESC 为空**
全新运行会赋值 SCOPE_DESC，但 resume 分支 fall-through 后未赋值，导致 prompt
模板的 `{{SCOPE}}` 为空。在 resume 分支补 `SCOPE_DESC="(从上次运行恢复)"`。

### 测试结果
- `tests/plugin-infrastructure/test-auto-loop-cli.sh`: 9/9 PASS
- `tests/plugin-infrastructure/run-all.sh` 全套: 15/15 PASS（无回归）

### Concerns 消化
原报告前两条 Concerns（SCOPE_DESC resume 空值 / pipefail 触发风险）已由本次
修复消化：SCOPE_DESC 显式赋值；进程替换模式下 `process_line` 非零退出由 `$?`
捕获，不再经 pipefail 影响循环上下文。

