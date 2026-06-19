# SDD 路径一致性 v2 设计

- **日期**：2026-06-19
- **类型**：Bug 修复 + 基础设施加固
- **状态**：已与用户确认设计
- **前置**：`2026-06-18-sdd-workspace-cleanup-design.md`（v1 cleanup 机制，已实现）

## 背景与动机

v1 的 SDD workspace cleanup 实现后，在 fruit-shop demo（独立 git repo 嵌套在 superpowers plugin repo 内）真实运行一次 SDD，暴露了四个相关问题：

1. **SDD 产物路径分叉**：task brief/report/diff 落在 `superpowers/.superpowers/sdd/`（外层），progress.md 落在 `demo/fruit-shop/.superpowers/sdd/`（内层）。根因是各脚本独立调用 `git rev-parse --show-toplevel`，cwd 不同解析到不同 repo 根。
2. **cleanup 只清一个位置**：cleanup-workspace 也用 `git rev-parse` 解析路径，只能清掉它解析到的那个目录，另一个目录的产物（progress.md）残留。
3. **learnings.jsonl 读写分叉**：`log-learning.sh` 用相对路径 `.superpowers/`（依赖 cwd），`search-learnings.sh` 也用相对路径。写和读在不同 cwd 时落点不同，session-start hook 读不到 log 写的内容。
4. **ralph-loop stop hook 的 promise 检测窗口过窄**：`hooks/stop-hook.sh` 的 jq 表达式 `| last` 只取最后一条 assistant text block，当 Claude 输出 `<promise>COMPLETE</promise>` 后又输出其他 text（如 learnings 总结）时，promise 不在 `last` 取到的那条里 → 检测失败 → 循环多转几轮。

四个问题共享一个主题：**Claude Code 基础设施脚本对"项目根"的解析方式不统一**。`git rev-parse --show-toplevel` 在嵌套 git repo / 跨 cwd 调用场景下不稳定；Claude Code 提供的 `${CLAUDE_PROJECT_DIR}` 是更权威的单一来源。

## 目标

把 SDD 相关的所有路径解析统一到 `${CLAUDE_PROJECT_DIR}`，并顺手修复 stop hook 的 promise 检测窗口。v2 实现后：

- SDD brief/report/diff/progress/cleanup 全部读写同一个 `.superpowers/sdd/`
- `log-learning.sh` 写的和 `search-learnings.sh` 读的是同一个 `.superpowers/learnings.jsonl`
- stop hook 在 Claude 输出 `<promise>...</promise>` 后**第一次** stop 就能检测到

## 非目标

- 不合并已经分裂的 learnings.jsonl（外层 24 行属于 plugin 仓库自身，内层 7 行属于 fruit-shop 业务；它们属于不同项目，分裂是合理的）
- 不改 `task-brief` / `review-package`（它们通过 `sdd-workspace` 拿路径，单一来源设计）
- 不改 `setup-ralph-loop.sh` / `hooks/session-start` / `CLAUDE.md`
- 不动 `${CLAUDE_PLUGIN_ROOT}` 相关逻辑（v1 已修对）
- 不清理 `.superpowers/session-analysis/`（另一套机制，不在 SDD 范畴）
- 不新增 Cursor `${CURSOR_PLUGIN_ROOT}` fallback（与本次问题无关）

## 设计

### 统一路径解析模式

所有受影响脚本采用同一 fallback 链：

```bash
# 旧
root=$(git rev-parse --show-toplevel)

# 新
root="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null)}"
```

**为什么这个 fallback**：

- 在 Claude Code 会话内：`${CLAUDE_PROJECT_DIR}` 由 harness 注入，等于用户启动 `claude` 的目录，整个 session 恒定，不受子目录 `cd` / 嵌套 repo 影响 —— 权威
- 在手动跑脚本 / CI 环境：`${CLAUDE_PROJECT_DIR}` 未设置，退回 `git rev-parse --show-toplevel` —— 向后兼容 v1

依据：Claude Code 官方 plugin 文档（https://code.claude.com/docs/en/plugins-reference）：

> `${CLAUDE_PROJECT_DIR}`: the project root. This is the same directory hooks receive in their `CLAUDE_PROJECT_DIR` variable. Use this to reference project-local scripts or config files.

### 改动 1：sdd-workspace 路径解析

**文件**：`skills/subagent-driven-development/scripts/sdd-workspace:18`

```bash
# 旧
root=$(git rev-parse --show-toplevel)

# 新
root="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null)}"
```

这是 SDD 路径单一来源。改完后 `task-brief` / `review-package` 自动跟随。

### 改动 2：cleanup-workspace 路径解析

**文件**：`skills/subagent-driven-development/scripts/cleanup-workspace:13`

```bash
# 旧
dir=$(git rev-parse --show-toplevel 2>/dev/null)/.superpowers/sdd

# 新
dir="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null)}/.superpowers/sdd"
```

### 改动 3：SKILL.md progress ledger 路径

**文件**：`skills/subagent-driven-development/SKILL.md:290`

```markdown
# 旧
`cat "$(git rev-parse --show-toplevel)/.superpowers/sdd/progress.md"`

# 新
`cat "${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null)}/.superpowers/sdd/progress.md"`
```

### 改动 4：log-learning.sh 改绝对路径

**文件**：`scripts/log-learning.sh`

```bash
# 旧 (line 61-62)
mkdir -p .superpowers

# 新
LEARNINGS_DIR="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null)}"
mkdir -p "$LEARNINGS_DIR/.superpowers"

# 旧 (line 75)
python3 << PYTHON >> .superpowers/learnings.jsonl

# 新
python3 << PYTHON >> "$LEARNINGS_DIR/.superpowers/learnings.jsonl"
```

从相对路径（依赖 cwd）改为绝对路径（基于 `${CLAUDE_PROJECT_DIR}`）。无论从哪调用，都写到同一个文件。

### 改动 5：search-learnings.sh 改绝对路径

**文件**：`scripts/search-learnings.sh`

```bash
# 旧 (line 18)
LEARNINGS_FILE=".superpowers/learnings.jsonl"

# 新
LEARNINGS_DIR="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null)}"
LEARNINGS_FILE="$LEARNINGS_DIR/.superpowers/learnings.jsonl"
```

读写对齐：`log-learning.sh` 和 `search-learnings.sh` 读同一个文件。

### 改动 6：stop-hook promise 检测窗口

**文件**：`hooks/stop-hook.sh:129-131`

```bash
# 旧
LAST_OUTPUT=$(echo "$LAST_LINES" | jq -rs '
  map(.message.content[]? | select(.type == "text") | .text) | last // ""
')

# 新
LAST_OUTPUT=$(echo "$LAST_LINES" | jq -rs '
  map(.message.content[]? | select(.type == "text") | .text) | join("\n")
')
```

**变更说明**：

- `| last` 只取最后一条 text block，promise 不在最后一条时检测失败
- `| join("\n")` 把最后 100 条 assistant 行的所有 text blocks 拼起来，perl 正则 (`s/.*?<promise>(.*?)<\/promise>.*/$1/s`) 用 `.*?` 非贪婪匹配第一个 `<promise>` 标签，仍正确工作
- 变量名仍叫 `LAST_OUTPUT`（保留，避免扩大改动面）

**为什么用 `join` 而不是 `.[range(-3;)]`**：

- `join` 逻辑简单，jq 表达式只改一处
- perl 正则已经用 `.*?` 非贪婪，扫多几条 text blocks 不会有误检风险
- 100 行 cap（`tail -n 100` 在 line 115）限制了输入规模，性能不受影响

### 改动 7：test-cleanup-workspace.sh 改用 CLAUDE_PROJECT_DIR

**文件**：`tests/sdd-scripts/test-cleanup-workspace.sh`

```bash
# 旧 setup_repo：用 git init 造临时 repo，依赖 git rev-parse 解析
setup_repo() {
    rm -rf "$TEST_DIR"
    mkdir -p "$TEST_DIR"
    cd "$TEST_DIR"
    git init -q
    git config user.email "test@test.local"
    git config user.name "test"
}

# 新 setup_repo：用 CLAUDE_PROJECT_DIR 直接指定路径，不需要 git
setup_repo() {
    rm -rf "$TEST_DIR"
    mkdir -p "$TEST_DIR"
    cd "$TEST_DIR"
    export CLAUDE_PROJECT_DIR="$TEST_DIR"
}
```

3 个测试用例逻辑不变，只是不再依赖 git。

### 改动 8：test-learnings.sh 改用 CLAUDE_PROJECT_DIR

**文件**：`tests/learnings-scripts/test-learnings.sh`

同步改为 `CLAUDE_PROJECT_DIR` 驱动的 setup（参照 test-cleanup-workspace.sh）。

### 改动 9：新增 test-stop-hook-promise.sh

**文件**：`tests/ralph-loop-scripts/test-stop-hook-promise.sh`（新建目录 `tests/ralph-loop-scripts/`，与 `tests/sdd-scripts/` 平级）

**测试构造**：造一个 fake transcript JSONL 文件（符合 Claude Code 格式），跑 stop-hook.sh 的 jq 表达式 + perl 正则，断言 promise 提取结果。

**Fake transcript 格式**（每行一个 JSON）：

```json
{"role":"assistant","message":{"content":[{"type":"text","text":"..."}]}}
```

**3 个用例**：

1. **promise 在最后一条 text block** → 检测成功（兼容旧行为）
   - Fake transcript 最后一条 text block 内容含 `<promise>COMPLETE</promise>`
   - 期望：perl 正则提取出 `COMPLETE`

2. **promise 在倒数第二条，最后一条是其他 text**（本次修复的核心场景）
   - Fake transcript 倒数第二条 text block 含 `<promise>COMPLETE</promise>`
   - 最后一条是 `"已记录 4 条 learnings"`
   - 期望：jq join 后仍能被 perl 正则提取出 `COMPLETE`（v1 的 `last` 会失败）

3. **完全没有 promise** → 不检测
   - Fake transcript 全部 text block 不含 `<promise>`
   - 期望：perl 正则提取结果为空字符串

**测试边界**：只测 `stop-hook.sh:129-150` 的 jq + perl 这段提取逻辑（作为 shell 函数或直接 inline），不跑完整 stop-hook.sh（那需要构造完整 hook input、transcript 路径、state file，过度复杂）。

### 数据流（改完后）

```
用户启动 claude 在 ~/.../demo/fruit-shop
  └─ CLAUDE_PROJECT_DIR = ~/.../demo/fruit-shop （harness 注入，整个 session 恒定）

SDD 执行：
  ├─ sdd-workspace        → ~/.../demo/fruit-shop/.superpowers/sdd/
  ├─ task-brief           → 调 sdd-workspace，写入同上
  ├─ review-package       → 调 sdd-workspace，写入同上
  └─ progress.md (SKILL:290) → cat/append 同上目录

SDD 收尾：
  └─ cleanup-workspace    → 清 ~/.../demo/fruit-shop/.superpowers/sdd/ (全部产物)

learnings 全程：
  ├─ log-learning.sh      → 写 ~/.../demo/fruit-shop/.superpowers/learnings.jsonl
  └─ search-learnings.sh  → 读 ~/.../demo/fruit-shop/.superpowers/learnings.jsonl
  └─ session-start hook   → 调 search-learnings --summary，读同一个文件

ralph-loop stop：
  └─ stop-hook jq join    → 合并最后 100 行所有 text blocks
  └─ perl 正则提取 promise → 第一次 stop 就能检测到
```

### 错误处理

| 失败场景 | 行为 |
|---|---|
| `CLAUDE_PROJECT_DIR` 未设置（手动/CI） | fallback 到 `git rev-parse --show-toplevel`，行为同 v1 |
| `CLAUDE_PROJECT_DIR` 和 `git rev-parse` 都失败（非 git 仓库 + 无 env var） | 路径变成空字符串 + `/.superpowers/sdd` —— 但这种场景在 Claude Code 会话内不会发生（harness 总会注入 `CLAUDE_PROJECT_DIR`） |
| stop-hook jq `join` 后字符串很长 | 100 行 cap 已限制；perl 正则用 `.*?` 非贪婪，性能 O(n) |
| stop-hook jq 失败（transcript 格式异常） | 现有 `$JQ_EXIT` 检查（line 136）仍会兜底，行为不变 |

## 改动清单

**修改文件 (6)**：

1. `skills/subagent-driven-development/scripts/sdd-workspace:18`
2. `skills/subagent-driven-development/scripts/cleanup-workspace:13`
3. `skills/subagent-driven-development/SKILL.md:290`
4. `scripts/log-learning.sh:62,75`
5. `scripts/search-learnings.sh:18`
6. `hooks/stop-hook.sh:129-131`

**修改测试 (2)**：

7. `tests/sdd-scripts/test-cleanup-workspace.sh`
8. `tests/learnings-scripts/test-learnings.sh`

**新增测试 (1)**：

9. `tests/ralph-loop-scripts/test-stop-hook-promise.sh`

**不改的内容**：

- `task-brief` / `review-package`（通过 sdd-workspace 跟随）
- `setup-ralph-loop.sh` / `hooks/session-start`
- `CLAUDE.md`
- `${CLAUDE_PLUGIN_ROOT}` 相关逻辑（v1 已修对）

## 风险与缓解

| 风险 | 缓解 |
|---|---|
| `CLAUDE_PROJECT_DIR` 未设置（手动跑/CI） | fallback 到 `git rev-parse --show-toplevel`，保持向后兼容 |
| `log-learning.sh` 改绝对路径后破坏现有 `cd X && log-learning.sh` 定向写入用法 | 语义变化是预期内的 —— 旧用法本来就错（分裂的根因）。调用方仍用 `${CLAUDE_PLUGIN_ROOT}/scripts/log-learning.sh`，只是写入位置变确定 |
| `search-learnings.sh` 绝对路径化后，老 JSONL 文件读不到 | 不会 —— 读的是同一个 `${CLAUDE_PROJECT_DIR}/.superpowers/learnings.jsonl`，跟 log-learning 写的位置一致 |
| stop-hook jq 改 `join` 后性能 | 100 行 cap 限制了输入规模，join 是 O(n)，可忽略 |
| 新增 stop-hook 测试依赖 fake transcript 格式 | 测试自己造 JSONL，格式参照实际 Claude Code transcript；不依赖真实运行 |
| fruit-shop 当前残留 `demo/fruit-shop/.superpowers/sdd/progress.md`（2205 字节） | v2 实现后手动跑一次 `bash cleanup-workspace`（在 fruit-shop cwd 下），验证被清掉；若没清掉说明改动有遗漏 |

## 成功标准

1. `cleanup-workspace` 在 fruit-shop cwd 下运行，清掉 `demo/fruit-shop/.superpowers/sdd/` 里残留的 progress.md（v1 遗留验证用例）
2. 一次完整 SDD 流程后，brief/report/diff/progress 全部落在同一个 `.superpowers/sdd/` 目录，cleanup 能一次清干净
3. `log-learning.sh` 从任何 cwd 调用，都写到 `${CLAUDE_PROJECT_DIR}/.superpowers/learnings.jsonl`；`search-learnings.sh` 读同一个文件
4. stop-hook 在 Claude 输出 `<promise>COMPLETE</promise>` 后**第一次** stop 就检测到（即使后面还有其他 text block），不重复触发 orchestrator prompt
5. `tests/sdd-scripts/test-cleanup-workspace.sh` 3 用例通过（改为 CLAUDE_PROJECT_DIR 驱动后）
6. `tests/learnings-scripts/test-learnings.sh` 用例通过（改为 CLAUDE_PROJECT_DIR 驱动后）
7. `tests/ralph-loop-scripts/test-stop-hook-promise.sh` 3 用例通过
8. `CLAUDE_PROJECT_DIR` 未设置时（CI/手动），所有脚本退回 `git rev-parse` 行为，跟 v1 一致

## 验证计划

- **单元测试**：跑 3 个测试文件（改动 7/8/9），全绿
- **集成验证（手动）**：在 `demo/fruit-shop/` 目录下启动新 claude 会话，跑一次完整 SDD，检查：
  - 所有 SDD 产物是否都在 `demo/fruit-shop/.superpowers/sdd/`
  - cleanup 是否一次清干净
  - log-learning 是否写到 `demo/fruit-shop/.superpowers/learnings.jsonl`
  - stop hook 是否在第一次 stop 就检测到 promise
- **回归验证**：在 `superpowers/` 根目录（plugin 开发场景）跑一次 SDD，检查：
  - SDD 产物在 `superpowers/.superpowers/sdd/`（这个仓库自己的）
  - 不影响 fruit-shop 的 `.superpowers/sdd/`
