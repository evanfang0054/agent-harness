# Auto-Loop: 会话分析到 PR 的全自动自我提升闭环

**日期**: 2026-06-24
**状态**: Draft → 待用户 review
**作者**: brainstorming session

## 背景与动机

Agent Harness 项目通过 session-learnings 记录经验教训，但"从会话发现问题 → 提 issue → SDD 修复 → PR"这条链路目前完全靠人肉执行（今天面板 %28 + %33 手动做了一遍，耗时且容易漏步骤）。

本设计创建一个脚本，将这条链路完全自动化：输入一句话需求，脚本调用 `claude -p` 全程自主完成分析、提 issue、SDD 修复、push、创建 PR，最终只把一个待审核的 PR 交到用户手中。

## 目标

1. **全自动闭环**：从自然语言需求到可审核 PR，中间无需人类干预
2. **可观测**：实时输出完整链路状态，绝不"卡住无声"
3. **可恢复**：任何环节中断（崩溃/休眠/主动暂停）后可从断点继续
4. **可介入**：遇到真正需要人类决策的点，优雅暂停并等待用户介入后续接
5. **扫描范围灵活**：默认当前项目，支持指定其他项目或全电脑扫描

## 非目标 (YAGNI)

- 不做多 agent 并行（串行单 PR 足够）
- 不做 Web Dashboard（终端三层输出足够）
- 不做数据库存储（state.json 单文件足够）
- 不做自定义 issue 模板配置（agent-harness 现有模板足够）

## 用户故事

```
# 默认扫当前项目
./scripts/auto-loop.sh "分析今天的会话，找出问题并修复"

# 指定其他项目扫描
./scripts/auto-loop.sh --project ~/Desktop/Arwen/dragonpass "分析本周会话"

# 全电脑扫描
./scripts/auto-loop.sh --all-projects "找出所有项目最近的问题"

# 恢复中断的运行
./scripts/auto-loop.sh --resume
# → "检测到未完成运行 run-2026-06-24-205800，当前在 fixing_issue_2。继续/从头/放弃?"
```

所有情况下，issues 和 PR 都提到 `evanfang0054/agent-harness` 仓库。

## 架构

### 三层结构

```
┌─ auto-loop.sh（薄壳 bash 脚本）─────────────────────────┐
│ 职责：                                                  │
│ 1. 解析参数（--project / --all-projects / --resume）    │
│ 2. 管理 state.json checkpoint                           │
│ 3. 调用 claude -p --output-format stream-json --verbose │
│ 4. 解析事件流 → 三层可观测性输出                         │
│ 5. 捕获 SIGINT/SIGTERM → 写 checkpoint 退出             │
└────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─ claude -p（无状态主大脑）──────────────────────────────┐
│ 每次启动读 state.json 重建上下文                         │
│                                                         │
│ Prompt 注入：                                            │
│ - 用户自然语言需求                                       │
│ - 扫描范围（项目路径 / 全电脑）                           │
│ - state.json 内容（断点）                                │
│ - 8 步链路指令                                           │
│ - 介入协议（4 种触发点 → 写 intervention 退出）          │
│ - 最保守决策原则                                         │
│                                                         │
│ 自主使用的 skills（--plugin-dir agent-harness）：           │
│ claude-code-log / brainstorming / writing-plans /        │
│ subagent-driven-development / verification-before-       │
│ completion / finishing-a-development-branch              │
└────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─ state.json（.claude/auto-loop/state.json）─────────────┐
│ - run_id / branch / request / current_step              │
│ - progress（每步状态 + 已提 issue 号 + 已修 issue 号）   │
│ - artifacts（中间产物路径）                              │
│ - intervention（人类决策请求）                           │
└────────────────────────────────────────────────────────┘
```

### 8 步链路

```
[1] 创建 worktree + 分支   git worktree add .claude/worktrees/auto-loop-<run_id> -b feat/auto-improvement-<date>
     ↓                      脚本 cd 进 worktree
[2] 导出会话    claude-code-log --detail low --format md --compact
     ↓          支持 --project <path> 或 --all-projects
[3] 分析会话    识别问题 → 分类（代码 bug / 流程问题 / skill 改进）
     ↓
[4] 提 issues   全部提到 evanfang0054/agent-harness
     ↓          gh issue list 去重
[5] 逐个 SDD    对每个 issue：brainstorming → writing-plans → SDD
     ↓          每完成一个 → checkpoint 更新
[6] 验证        verification-before-completion
     ↓
[7] push        git push -u origin <branch>
     ↓
[8] 创建 PR + 清理   gh pr create，body 关联 closes #N
                      → git worktree remove → cd 回原目录
```

## Worktree 隔离机制

**所有代码修复在独立 git worktree 进行，不碰当前工作区。**

### 生命周期

| 阶段 | 操作 |
|------|------|
| 启动 | `git worktree add .claude/worktrees/auto-loop-<run_id> -b feat/auto-improvement-<date>` |
| 运行中 | 脚本 `cd` 进 worktree，所有 git/文件操作和 `claude -p` 都在 worktree 内 |
| 中断恢复 | worktree 保留，`--resume` 时 cd 到 worktree 继续 |
| 完成 | push 分支 → 创建 PR → `git worktree remove` 清理 → cd 回原目录 |
| 失败/放弃 | state.json 记录 worktree 路径，用户可手动 `git worktree remove` |

### 路径策略

- **worktree 位置**: `.claude/worktrees/auto-loop-<run_id>/`（项目内，`.gitignore` 放行）
- **脚本启动时**: 记录原 `$PWD` → 创建 worktree → `cd worktree`
- **脚本退出前**: `cd 回原 $PWD` → 如果运行完成则 `git worktree remove`
- **Claude 的 PWD**: 继承 worktree 路径，所有改动天然隔离

### 为什么用 worktree 而不是当前工作区

1. **零污染** — 当前工作区始终干净，你的在途工作不会被脚本碰到
2. **可放弃** — 中途放弃直接 `git worktree remove`，原工作区无影响
3. **可并行** — 理论上可同时跑多个 run（不同 worktree），虽然 spec 说串行单 PR
4. **分支隔离** — worktree 绑定独立分支，不会和当前分支冲突

## 文件结构

```
agent-harness/
├── scripts/
│   └── auto-loop.sh                          # 入口薄壳脚本
├── skills/
│   └── auto-loop/
│       └── orchestrator-prompt.md            # 注入给 claude -p 的主指令
└── .claude/
    ├── auto-loop/
    │   ├── state.json                        # 当前 checkpoint（含 worktree_path）
    │   └── runs/
    │       └── <run_id>/
    │           ├── sessions.md               # 导出的会话
    │           ├── analysis.json             # 分析结果
    │           ├── issues.json               # issue 清单
    │           ├── plan.md                   # SDD plan
    │           └── stream.log                # 原始 stream-json 审计日志
    └── worktrees/
        └── auto-loop-<run_id>/               # git worktree（隔离工作区）
            └── ...                           # 修复在此进行
```

**orchestrator-prompt.md 单独成文件**的理由：prompt 是可版本化、可迭代的"代码"。调优 prompt 不用改脚本。

## 可观测性设计

### 三层输出

```
┌─ 状态行（终端顶部单行刷新）─────────────────────────────┐
│ [3/8] 🔧 Issue #1 SDD执行中 | 思考 2s | 累计 3.2K tok  │
└───────────────────────────────────────────────────────┘

┌─ 事件流（滚动）────────────────────────────────────────┐
│ 20:58:01 ✅ [1/8] 分支已创建: feat/auto-...            │
│ 20:58:15 ✅ [2/8] 会话导出: 73 sessions, 120KB         │
│ 20:58:42 ✅ [3/8] 分析完成: 发现 4 个问题              │
│ 20:59:01 ✅ [4/8] Issue #1 已创建: "路径不一致"        │
│ 21:00:00 🔧 [5/8] Issue #1 brainstorming 开始...       │
│ 21:00:15 ⏳ [5/8] API 限流，重试 1/5，ETA 2s           │
│ 21:02:30 ✅ [5/8] Issue #1 brainstorming → spec 已写   │
└───────────────────────────────────────────────────────┘

┌─ 日志层（文件）────────────────────────────────────────┐
│ .claude/auto-loop/runs/<run_id>/stream.log             │
│ 完整 stream-json 原始事件，供事后审计回放               │
└───────────────────────────────────────────────────────┘
```

### stream-json 事件消费

脚本用 `claude -p --output-format stream-json --verbose --include-partial-messages` 调用，实时解析：

| 事件类型 | 用途 |
|---------|------|
| `stream_event` (text_delta) | Token 级实时输出，防"静默卡死" |
| `stream_event` (tool_use) | 工具调用 → 映射到 8 步进度 |
| `system` (api_retry) | 限流/错误 → 显示 ETA |
| `result` | 完成 → 更新 checkpoint |

解析用 `jq` + bash，不引入 Node/Python（KISS）。

### 心跳机制

如果 60 秒内无任何事件（无 token delta、无 tool_use、无 system 事件），打印：
```
⏳ [5/8] 等待 Claude 响应中... (已等待 60s)
```
每 30 秒重复一次，让你知道脚本没死。

## 异常恢复与介入协议

### Checkpoint 机制

每次关键步骤成功后更新 `state.json`：
- branch 创建成功
- 会话导出成功
- 每个 issue 提成功（记录 issue 号）
- 每个 issue 修复完成（记录 commit hash）
- PR 创建成功

### 恢复逻辑

脚本启动时检查 state.json：

| 情况 | 处理 |
|------|------|
| 不存在 | 全新运行 |
| 存在，`intervention == null` | 问："检测到未完成运行，当前在 X。继续/从头/放弃?" |
| 存在，`intervention != null` | 显示介入原因+选项，等你回复后继续 |

### 介入方式：退出 + 重启恢复（选项 B）

脚本遇到介入点时**退出**，把介入请求写入 state.json。下次运行 `--resume` 时自动恢复。

**理由**：
- 不要求用户守终端
- 支持关机/换会话/隔天继续
- `claude -p` 无状态，重启时读 state.json + artifacts 重建上下文

### 人类决策触发点（4 种）

Claude 遇到以下情况时**主动退出并请求介入**：

1. **不可逆风险**：所有方案都涉及 force push / 删分支 / 删文件
2. **矛盾**：两个 issue 互相冲突，修一个会坏另一个
3. **低置信度**：issue 可能是误报（置信度 < 70%）
4. **架构变更**：修复需要改变系统架构，超出"最保守"边界

### 场景处理表

| 场景 | 检测 | 处理 |
|------|------|------|
| API 瞬时失败 | `system/api_retry` 事件 | 自动等待重试（最多 5 次），显示 ETA；超限 → checkpoint 退出 |
| 死循环/卡住 | 同步 attempt ≥ 3 或 30 分钟无 token delta | checkpoint 退出；重启时 Claude 换策略或请求介入 |
| 需人类决策 | Claude 主动判断 | 写 `intervention` 退出；`--resume` 时显示原因+选项 |
| 部分成功 | state.json progress 字段 | 跳过已完成步骤，从断点继续；`gh issue list` 去重 |
| 主动暂停 | Ctrl+C | SIGINT 处理器写 checkpoint 后退出 |

### 介入提示格式

```
⚠️  需要你的介入
─────────────────────────────────────
运行 ID: 2026-06-24-205800
当前步骤: 修复 Issue #2「路径不一致」
介入原因: Claude 发现修复需要改动 5 个脚本的路径解析逻辑，
          其中 2 个脚本被其他 skill 依赖。改动范围超出"最保守"
          边界，需要你确认是否继续。

选项:
  [1] 批准 Claude 的修复方案（详见 plan.md）
  [2] 拒绝此修复，跳过 Issue #2，继续 Issue #3
  [3] 我来手动处理 Issue #2，脚本继续 Issue #3
  [4] 完全停止，保留所有已完成的产物

恢复方式: ./scripts/auto-loop.sh --resume
```

## 扫描范围

| 参数 | 行为 |
|------|------|
| 无 `--project` | 默认 `$PWD` |
| `--project <path>` | 扫描指定项目 |
| `--all-projects` | 扫描 `~/.claude/projects/` 下所有项目 |
| 自然语言含路径 | Claude 自主解析（如"分析 ~/Desktop/Arwen 下所有项目"） |

**所有情况下，issues 和 PR 都提到 `evanfang0054/agent-harness`**。

issue body 标注问题来源：
```
**发现问题于**: dragonpass/standard-benefit-fe 项目会话
**时间范围**: 2026-06-20 ~ 2026-06-24
```

## 最保守决策原则

AI 在所有决策点取**最小改动、最低风险、可逆**的路径：
- 方案选择：选 A（最小改动）而非 C（彻底重构）
- spec 审批：跳过等待，直接进 writing-plans，spec 随 PR 供事后 review
- finishing-branch：硬编码选项 2（push + create PR），不 merge 不 force push
- 不可逆决策：留给用户在 PR review 时做

每个决策都在 PR 描述里标注理由：
```
## 自动决策记录
- Issue #1: 选择了方案 A（最小改动），理由：仅改 2 行，风险最低
- Issue #2: 选择了方案 B（新增 hook），理由：方案 A 无法根治
```

## CLI 接口

```bash
# 全新运行
./scripts/auto-loop.sh "<自然语言需求>"
./scripts/auto-loop.sh --project <path> "<需求>"
./scripts/auto-loop.sh --all-projects "<需求>"

# 恢复
./scripts/auto-loop.sh --resume

# 清理（删除 state.json 和 runs/）
./scripts/auto-loop.sh --cleanup
```

## 错误处理

| 错误 | 处理 |
|------|------|
| 工作区脏 | 拒绝运行，提示 commit/stash 后重试 |
| 无 git remote | 拒绝运行，提示配置 remote |
| `claude` CLI 不可用 | 报错退出 |
| `uv` 不可用（claude-code-log 依赖） | 报错退出 |
| `gh` 未认证 | 报错退出，提示 `gh auth login` |
| API 配额耗尽 | checkpoint 退出，提示配额恢复后 `--resume` |

## 测试策略

1. **Dry-run 模式**：`--dry-run` 只到分析+提 issue 步骤，不执行修复，验证前半段链路
2. **单元测试**：state.json 读写、stream-json 解析、去重逻辑用 `tests/` 下 shell 测试
3. **集成测试**：在 demo 项目上跑完整闭环，验证 PR 创建成功
4. **错误注入**：模拟 API 失败、工作区脏、无 remote 等场景

## 开放问题

无。所有关键决策已在 brainstorming 中确定。

---

## 决策记录（brainstorming 确认）

| 维度 | 决策 | 理由 |
|------|------|------|
| 脚本职责 | 薄壳，Claude 自主 | 核心价值在语义分析，纯正则做不到 |
| 筛选条件 | 自然语言 | 灵活，Claude 自主理解 |
| 目标仓库 | 硬编码 agent-harness | 自我提升工具，所有改进归本项目 |
| 闭环范围 | 分支→导出→分析→issue→SDD→push→PR | 完整闭环 |
| 人类决策点 | AI 自主取最保守 | 用户只需 review PR |
| 多问题处理 | 串行单 PR | 简单无冲突 |
| 可观测性 | 三层（状态行+事件流+日志） | 绝不静默 |
| 介入方式 | 退出+重启恢复（B） | 不要求守终端 |
| 扫描范围 | 默认 $PWD，可指定/全电脑 | 灵活 |
