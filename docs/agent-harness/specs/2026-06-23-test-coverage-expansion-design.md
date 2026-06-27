# 测试覆盖率补全设计

**日期**: 2026-06-23
**状态**: 已批准（设计阶段）
**作者**: evanfang0054 + Claude Code

## 背景

当前 `tests/` 目录已清理失效套件并修复 headless 兼容性（commit `8165e11`）。现有测试套件覆盖以下层面：

| 套件 | 类型 | 覆盖 |
|---|---|---|
| `codex-plugin-sync` | 纯脚本 | codex plugin manifest 一致性（8 项） |
| `learnings-scripts` | 纯脚本 | log/search-learnings.sh（12 项） |
| `ralph-loop-scripts` | 纯脚本 | stop-hook promise 检测（3 项） |
| `sdd-scripts` | 纯脚本 | cleanup-workspace（3 项） |
| `pi` | tsx | Pi 扩展（6 项） |
| `claude-code` | headless | subagent-driven-development 深度行为（10 项） |
| `explicit-skill-requests` | headless | 4 个 skill 显式触发 |
| `skill-triggering` | headless | 6 个 skill 隐式触发 |
| `subagent-driven-dev` | headless | SDD 端到端（svelte-todo/go-fractals） |

**核心缺口**：
1. **Plugin 基础设施层零散**：hooks 配置、session-start 注入、plugin/marketplace manifest、commands/agents frontmatter、scripts 工具脚本——除了 codex-plugin-sync 外无系统覆盖。
2. **Skill 行为测试覆盖严重不足**：仓库共 29 个 skill，仅 10 个（subagent-driven-development + explicit-skill-requests 的 4 个 + skill-triggering 的 6 个，去重后）有任何行为测试。剩余 ~28 个 skill 无任何行为断言，skill 修改后只能靠人工 review 发现回归。

## 目标

为 agent-harness 仓库补齐测试覆盖率，确保每个公共表面（plugin 基础设施 + 所有 skill）都有测试兜底，同时保持现有运行方式（每个套件独立运行，无强制统一入口）。

## 非目标（YAGNI）

- 不引入 obra/agent-harness-evals 的 `drill` harness（外部依赖、setup 重）
- 不引入 skill-creator 的 benchmark 机制（需要额外插件）
- 不引入 bats-core / Node tsx 作为新测试框架（保持纯 bash + stream-json + grep）
- 不做 A/B 对比、token 统计、并发执行器（本次只关注"有没有触发 + 关键行为对不对"）
- 不新增统一 `run-all.sh` 顶层入口（保持现状，每个套件独立运行）
- 不新增 CI workflow 配置（仓库现有 CI 策略由维护者决定）

## 总体架构

分两阶段实施：

| 阶段 | 范围 | 技术栈 | 单次耗时 |
|---|---|---|---|
| 阶段 1：plugin 基础设施测试 | hooks 配置、session-start 注入、plugin/marketplace manifest、commands/agents frontmatter、scripts 工具脚本、stop-hook | bash + jq + 纯脚本断言 | 秒级（< 10s） |
| 阶段 2：28 个 skill 行为测试 | 每个 skill 在 `tests/skill-behavior/<skill-name>/` 下放 prompts + 断言；headless `claude -p` 触发 skill，stream-json 解析，3-5 个关键行为点断言 | bash + stream-json + grep | 单 skill ~30-90s，全量 15-40 分钟 |

### 新增目录结构

```
tests/
├── plugin-infrastructure/              ← 阶段 1（新增）
│   ├── test-plugin-manifest.sh
│   ├── test-marketplace-manifest.sh
│   ├── test-hooks-config.sh
│   ├── test-session-start-injection.sh
│   ├── test-stop-hook.sh
│   ├── test-commands-frontmatter.sh
│   ├── test-agents-frontmatter.sh
│   ├── test-bump-version.sh
│   ├── test-scripts-smoke.sh
│   └── run-all.sh
└── skill-behavior/                     ← 阶段 2（新增）
    ├── _helpers/
    │   ├── run-skill.sh
    │   └── assert-skill-triggered.sh
    ├── brainstorming/
    │   ├── prompts/
    │   │   ├── naive-feature-request.txt
    │   │   └── explicit-invoke.txt
    │   └── run-test.sh
    ├── computational-sensors/
    ├── dispatching-parallel-agents/
    ├── documentation-sync/
    ├── executing-plans/
    ├── finishing-a-development-branch/
    ├── gate-driven-test-design/
    ├── harness-design/
    ├── harness-init/
    ├── harness-optimizer/
    ├── loop-detection/
    ├── office-hours/
    ├── plan-ceo-review/
    ├── plan-eng-review/
    ├── post-deploy-monitoring/
    ├── qa-testing/
    ├── receiving-code-review/
    ├── requesting-code-review/
    ├── retrospective/
    ├── session-learnings/
    ├── sprint-contract/
    ├── subagent-driven-development/
    ├── systematic-debugging/
    ├── test-driven-development/
    ├── trace-analysis/
    ├── using-agent-harness/
    ├── verification-before-completion/
    ├── writing-plans/
    └── writing-skills/
```

**约束**：保留现有 `tests/*` 目录不动；新内容独立成目录；CLAUDE.md 同步更新。

---

## 阶段 1：Plugin 基础设施测试

### 测试矩阵

| 测试脚本 | 验证内容 | 关键断言 |
|---|---|---|
| `test-plugin-manifest.sh` | `.claude-plugin/plugin.json` 结构合法、与 package.json 一致、引用的资源存在 | name/version 与 package.json 同步；keywords 是数组；homepage/repository 非空 |
| `test-marketplace-manifest.sh` | `.claude-plugin/marketplace.json` 结构合法、与 plugin.json 版本同步、source 指向有效路径 | plugins[0].version == plugin.json.version；source 目录存在 |
| `test-hooks-config.sh` | `hooks/hooks.json` 和 `hooks/hooks-cursor.json` 都能被 `jq` 解析；SessionStart/Stop 必备；引用的脚本文件存在 | jq 解析成功；session-start/stop-hook.sh 有可执行位；run-hook.cmd 存在 |
| `test-session-start-injection.sh` | `hooks/session-start` 在受控环境下能输出合法 JSON，且包含 `using-agent-harness` skill 内容块 | 用管道喂一份假的 stdin JSON，捕获 stdout，jq 提取 `hookSpecificOutput.additionalContext` 包含 "using-agent-harness" |
| `test-stop-hook.sh` | `hooks/stop-hook.sh` 能识别 promise 行（已有 ralph-loop-scripts 测了一部分，这里补全局 stop-hook 路径） | 喂入含 COMPLETE 的假 transcript 行，断言 exit 0 且输出含 promise 提取结果 |
| `test-commands-frontmatter.sh` | `commands/*.md` 每个都有合法 YAML frontmatter（description 必填；`allowed-tools` 若存在是数组） | grep `^---`；每个文件都有 `description:`；allowed-tools 格式合法 |
| `test-agents-frontmatter.sh` | `agents/code-reviewer.md` frontmatter 合法、引用的资源存在 | description 非空；model 字段（若有）值合法 |
| `test-bump-version.sh` | `scripts/bump-version.sh --check` 在当前仓库能成功执行且报告无 drift；`--audit` 能跑通 | 两个子命令 exit 0；--check 输出含当前版本号；--audit 无 drift |
| `test-scripts-smoke.sh` | `scripts/*.sh` 所有脚本至少 `--help` 或无参数调用不崩溃（smoke test） | loop-detector.sh、trace-analyzer.sh、coverage-metrics.sh 每个都能 exit 0 或非 127（命令找不到） |

### run-all.sh 行为

- 顺序执行 9 个测试，每个独立 exit code
- 默认不调用 headless claude（纯脚本，秒级完成）
- 失败汇总在末尾打印
- 与现有 `tests/learnings-scripts/test-learnings.sh` 风格一致（PASS/FAIL 计数）

### 与现有套件的关系

- `test-plugin-manifest.sh` 和现有 `tests/codex-plugin-sync/test-sync-to-codex-plugin.sh` **不冲突**：后者测 codex-plugin 同步，前者测主 plugin.json 本身的结构合法性
- `learnings-scripts/test-learnings.sh` 已覆盖 log/search-learnings 的功能行为，新套件**不重复**，只在 `test-scripts-smoke.sh` 里做 smoke 检查保证脚本不崩

### 已知约束

- `hooks/session-start` 依赖 `CLAUDE_PLUGIN_ROOT`、`CLAUDE_ENV_FILE` 等环境变量，测试需要 mock 这些
- `scripts/bump-version.sh --audit` 会跑 `grep` 扫全仓库，相对慢（约 1-3 秒），可接受

---

## 阶段 2：28 个 Skill 行为测试

### 通用运行器

`_helpers/run-skill.sh` 一处定义、28 处复用：

**接口**：
```
run-skill.sh <skill-name> <prompt-file> [max-turns]
```

**职责**：
1. 在 `/tmp/agent-harness-tests/<ts>/skill-behavior/<skill>/` 建独立工作目录
2. 用独立 `HOME=$(mktemp -d)` 隔离用户配置（参考 explicit-skill-requests/run-test.sh 的做法）
3. 调用 `claude -p "$(cat prompt-file)" --plugin-dir <repo-root> --permission-mode bypassPermissions --output-format stream-json --verbose --max-turns ${3:-3}`
4. 把完整输出落盘到 `claude-output.json`
5. 暴露给调用方做断言

### 通用断言函数

`_helpers/assert-skill-triggered.sh`：
- 输入 skill-name + 日志文件
- 断言 `"name":"Skill"` 出现 且 `"skill":"agent-harness:<name>"` 出现
- 断言 Skill 调用前无非 TodoWrite/system 的 tool_use（防止"先干活再补 skill"）

### 单 skill 测试骨架

每个 skill 的 `run-test.sh` 5-15 行 bash：

```bash
#!/usr/bin/env bash
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../_helpers/run-skill.sh"
source "$SCRIPT_DIR/../_helpers/assert-skill-triggered.sh"

# 阶段 A：skill 是否触发（基础断言，所有 skill 都做）
run_skill "brainstorming" "$SCRIPT_DIR/prompts/naive-feature-request.txt" 3
assert_skill_triggered "brainstorming" "$LOG_FILE"

# 阶段 B：关键行为点（核心闭环 skill 做 1-3 条）
assert_output_contains "design\|spec\|方案\|问题" "$LOG_FILE"
```

### 三类断言组合

不是每个 skill 都三类全做，按 skill 性质选：

| 类型 | 用途 | 适用范围 | 示例 |
|---|---|---|---|
| **触发断言** | skill 工具被调用，且前置无 premature action | 所有 28 个 skill | `assert_skill_triggered` |
| **行为断言** | skill 执行后输出/动作符合预期 | 核心闭环 skill | brainstorming 后应出现 "design"/"spec"/"方案"；TDD 后应出现 "red"/"green"/"失败"/"通过" |
| **边界断言** | 对抗性场景下不应触发或应正确拒绝 | 少数易误触发的 skill | "写个 hello world" 不应触发 subagent-driven-development |

### Prompts 设计原则

- **naive prompt**（核心）：用自然语言描述需求，不带 skill 名字，测隐式触发。例如 brainstorming 用 "I want to add a notification feature to my app, help me think about it"
- **explicit prompt**（仅核心闭环 skill）：显式 `/agent-harness:<skill-name>` 调用，测 user-invocable 路径
- **negative prompt**（仅易误触发的 skill）：测不该触发的场景

### 28 个 skill 的断言矩阵（按功能分组）

| 组 | Skill | 必做断言（最少） |
|---|---|---|
| **决策层** | office-hours、plan-ceo-review、plan-eng-review | 触发 + 输出含决策关键词（review/approve/质疑/评审） |
| **执行层-设计** | brainstorming、sprint-contract、writing-plans、gate-driven-test-design | 触发 + 输出含 design/spec/plan/test coverage/方案/规格 |
| **执行层-实现** | subagent-driven-development、executing-plans、dispatching-parallel-agents、test-driven-development | 触发 + 输出含 implement/plan/TDD/red-green/实现/计划 |
| **执行层-审查** | requesting-code-review、receiving-code-review、verification-before-completion | 触发 + 输出含 review/verify/complete/审查/验证/完成 |
| **质量层** | qa-testing、post-deploy-monitoring、retrospective、trace-analysis | 触发 + 输出含 qa/monitor/retro/analyze/监控/复盘/分析 |
| **基础设施** | session-learnings、loop-detection、systematic-debugging、documentation-sync、finishing-a-development-branch | 触发 + 输出含 learning/loop/debug/sync/finish/学习/循环/调试/同步/收尾 |
| **元/Harness** | using-agent-harness、writing-skills、harness-design、harness-init、harness-optimizer、computational-sensors | 触发 + 输出含对应核心概念（skills/harness/sensor/coverage） |

### 与现有 tests/claude-code/test-subagent-driven-development.sh 的关系

**互补不重复**：
- 现有的是深度行为验证（10 个测试点，每个 skill 用 run_claude 单独提问）
- 新的 skill-behavior 版本只做轻量触发 + 1-2 个核心断言
- subagent-driven-development 在新套件中只验证"触发 + task-brief 提及"，不重复 10 点深度测试

### 已知约束与权衡

- 28 skill × ~30-90s/skill = 单次全量跑 15-40 分钟，会消耗大量 Claude API 配额。这是项目方接受的代价
- skill 触发结果取决于 headless Claude 当前行为，非纯脚本断言。已有先例（skill-triggering 套件）说明这条路可行
- prompts 和断言需要迭代调试（参考本次改 test-subagent-driven-development.sh 的过程）。初始版本可能需要 2-3 轮微调才能稳定
- 中英文混合回答问题：断言模式需同时覆盖英文和中文关键词（本次修复已验证此模式可行）

---

## 错误处理与清理

### 失败处理策略

| 失败类型 | 行为 |
|---|---|
| `claude` CLI 不可用 | 测试脚本早期 exit 1，打印 "Install Claude Code first"（复用 run-skill-tests.sh:31-35 的检查） |
| `claude -p` 超时 | `_helpers/run-skill.sh` 内部用 perl fallback 的 timeout 包裹，超时 exit 124，测试标记 FAIL 并保留部分输出供调试 |
| stream-json 解析失败 | 断言函数用 `grep -q` 而非 `jq`（更宽容），只在必要处用 jq 提字段 |
| skill 未触发 | 明确 FAIL，打印 "Skill '<name>' was NOT triggered"，并在日志中显示实际触发的 skill 列表（参考 explicit-skill-requests/run-test.sh:107） |
| API 限流/配额耗尽 | 单 skill 失败不阻断其他 skill；run-test.sh 各自独立，父 runner 不用 `set -e` 包裹 |

### 隔离与清理

- 每个 skill 测试用独立 `HOME=$(mktemp -d)` 和工作目录，避免相互污染
- 测试结束保留 `/tmp/agent-harness-tests/<ts>/` 供事后排查（不主动清理，依赖系统 tmp 轮转）
- ralph-loop 状态文件遵循现有 `test-subagent-driven-development.sh:175-189` 的备份/恢复 pattern

---

## CI 集成（不强制）

按"保持现状"原则：

- 不新增 `.github/workflows/`（现有仓库无 CI 配置，不擅自引入）
- 所有测试脚本保证 **退出码语义正确**：成功 0、失败非 0，便于将来接入 CI 时零改动
- 不新增统一的 `run-all.sh` 顶层入口（用户明确选"保持现状"）

---

## 文档同步

实施时更新 `CLAUDE.md`：

- "其他测试套件"小节新增两条：
  - `tests/plugin-infrastructure/` — 纯脚本套件，秒级完成，覆盖 hooks/scripts/manifest/commands/agents
  - `tests/skill-behavior/` — 全部 28 个 skill 的 headless 行为测试（依赖 `claude -p` + Claude API 配额）
- 已有的 "headless 依赖说明" 段落补一句：skill-behavior 套件全量运行约 15-40 分钟

---

## 实施顺序

1. **阶段 1**：创建 `tests/plugin-infrastructure/` 9 个脚本 + run-all.sh，本地跑通
2. **阶段 1**：更新 CLAUDE.md
3. **阶段 1**：提交 PR
4. **阶段 2**：创建 `_helpers/` 通用运行器和断言函数
5. **阶段 2**：分批补 28 个 skill 目录（每批 5-8 个，每批独立提交）
6. **阶段 2**：每个 skill 的 prompts 和断言需实际 headless 跑通后才能标完成
7. **阶段 2**：更新 CLAUDE.md

**预计工作量**：阶段 1 约 1 个 PR；阶段 2 分 4-6 个 PR（按功能分组）。

---

## 风险与缓解

| 风险 | 缓解 |
|---|---|
| skill 行为测试在 headless 下不稳定（模型行为漂移） | 断言模式覆盖中英文关键词、放宽到关键词而非精确匹配；失败时保留日志供排查 |
| prompts 设计不当导致触发率低 | 每个 skill 至少迭代 2-3 轮调优（参考本次 SDD 测试迭代过程） |
| 全量跑耗时过长影响迭代 | 单 skill 可独立运行（`./run-test.sh`），不依赖父 runner |
| API 配额耗尽 | 单 skill 失败不阻断其他 skill；按功能分组提交，每组独立验证 |
