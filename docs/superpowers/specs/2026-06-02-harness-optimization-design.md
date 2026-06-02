# Harness 优化设计文档

**日期：** 2026-06-02
**状态：** Draft
**适用平台：** 仅 Claude Code
**兼容性：** 完全向后兼容

---

## 1. 背景与动机

### 1.1 Harness 工程定义

**Agent = Model + Harness**

Harness 工程是指围绕 AI 模型设计的一切内容：工具、上下文策展、反馈循环、记忆机制、安全钩子。好的 harness 让相同模型表现更稳定、更可靠。

### 1.2 业界最新实践（2025-2026）

通过对 Martin Fowler（Thoughtworks）、LangChain、Anthropic Labs、Augment Code 的最新 harness 实践研究，提炼出以下核心模式：

| 模式 | 来源 | 核心思想 |
|------|------|---------|
| Feedforward vs Feedback | Thoughtworks | 预防性约束 vs 纠正性反馈，两者缺一不可 |
| Computational vs Inferential | Augment Code | 确定性检查（linter/test）优先于语义检查（LLM-as-judge） |
| Three-Layer Architecture | Augment Code | Constraints → Feedback Loops → Quality Gates |
| Self-Verification Loop | LangChain | Build-Verify-Fix 循环替代 write-and-stop |
| Loop Detection | LangChain | 追踪 per-file edit count 检测 doom loop |
| Sprint Contract | Anthropic | Generator 与 Evaluator 在实现前协商完成标准 |
| Reasoning Sandwich | LangChain | 规划/验证高推理，执行中等推理 |
| Generator-Evaluator Separation | Anthropic | GAN 式多 agent 架构，生成与评估独立 |

### 1.3 当前 Superpowers 项目现状

**已有 skill 数量：** 23 个
**已有 scripts：** 4 个（bump-version.sh, setup-ralph-loop.sh, log-learning.sh, search-learnings.sh）
**已有 hook 机制：** SessionStart + Stop（Ralph Loop）
**已有学习持久化：** `.superpowers/learnings.jsonl`

### 1.4 Claude Code Skill Frontmatter 官方支持字段

通过 Claude Code 官方文档（https://code.claude.com/docs/en/skills）确认，以下 YAML frontmatter 字段被原生支持：

| 字段 | 用途 |
|------|------|
| `name` | 显示名 |
| `description` | Claude 判断何时使用（计入 1536 字符上限） |
| `when_to_use` | 补充触发条件（计入 1536 字符上限） |
| `model` | 覆盖当前 turn 的模型 |
| `effort` | 调整 effort level（low/medium/high/xhigh/max） |
| `disable-model-invocation` | 阻止自动加载 |
| `user-invocable` | 是否出现在 `/` 菜单 |
| `allowed-tools` | 免确认工具白名单 |
| `argument-hint` / `arguments` | 参数定义 |

**关键结论：** 不需要自定义 `control_type` 和 `recommended_model` 字段——官方 `model` + `effort` + `when_to_use` 已能满足所有优化需求。

---

## 2. 设计原则

- **完全向后兼容：** 所有变更均为增量扩展或 frontmatter 添加，不修改现有 skill 的核心逻辑
- **Claude Code Only：** 仅针对 Claude Code 平台，不考虑 Cursor / Copilot 兼容性
- **KISS + YAGNI：** 每个新增组件都有明确的需求驱动，避免过度设计
- **渐进式增强：** 8 个优化方向可独立实施，不强制依赖

---

## 3. 优化矩阵

| 优先级 | 方向 | 类别 | 实施复杂度 |
|--------|------|------|-----------|
| P0 | Loop Detection | Feedback | 中 |
| P0 | Computational Sensors | Feedforward + Feedback | 低 |
| P1 | Sprint Contract | Feedforward | 中 |
| P1 | Reasoning Budget | Meta | 低 |
| P2 | Trace Analysis | Feedback | 中 |
| P2 | Feedforward/Feedback 分类 | Meta | 低 |
| P3 | Harness Templates | Onboarding | 中 |
| P3 | Harness Coverage Metrics | Meta | 低 |

---

## 4. 详细设计

### 4.1 P0: Loop Detection

#### 目标

检测 per-file 编辑循环，防止 agent 陷入 doom loop（在同一文件上反复修改而无法收敛）。

#### 方案

**新建文件：**

```
scripts/loop-detector.sh                    # 检测脚本
skills/loop-detection/SKILL.md             # 新 skill
```

**loop-detector.sh 设计：**

- 输入：session_id（通过环境变量或参数传入）
- 数据源：`/tmp/superpowers-edit-tracker/{session_id}/edits.json`
- 数据结构：
  ```json
  {
    "files": {
      "src/foo.ts": { "edit_count": 6, "last_edit": "2026-06-02T10:30:00Z" },
      "src/bar.ts": { "edit_count": 2, "last_edit": "2026-06-02T10:25:00Z" }
    },
    "session_start": "2026-06-02T10:00:00Z"
  }
  ```
- 阈值：
  - `edit_count >= 5`：输出 WARNING，建议 agent 重新审视方法
  - `edit_count >= 8`：输出 HARD STOP，建议 agent 停止当前路径并寻求帮助
- 输出格式：结构化文本，可直接被 agent 解读
- 触发方式：
  - 在 `verification-before-completion` skill 中作为前置检查调用
  - 也可手动通过 `bash scripts/loop-detector.sh` 调用

**loop-detection SKILL.md 设计：**

- `name: loop-detection`
- `description: Use when an agent suspects it is stuck in a doom loop editing the same file repeatedly without converging, or when verification-before-completion requires loop analysis.`
- `when_to_use: [feedback] Triggered after multiple edits to the same file or when verification detects repeated unsuccessful changes.`
- 内容：
  - 解释 doom loop 的常见征兆
  - 如何调用 loop-detector.sh
  - 如何解读输出（WARNING vs HARD STOP）
  - 触发后的恢复策略（回退到上一个已知良好状态、寻求外部输入、重新规划）

**修改文件：**

- `skills/verification-before-completion/SKILL.md`
  - 在现有 verification 流程的「前置检查」阶段添加 loop detection 调用
  - 格式：先运行 loop-detector，如果返回 HARD STOP 则中断 verification 并提示 agent

---

### 4.2 P0: Computational Sensors

#### 目标

将 lint、type-check、test-coverage 等确定性检查集成到 verification 流程中，遵循「Computational 优先于 Inferential」原则。

#### 方案

**新建文件：**

```
skills/computational-sensors/SKILL.md      # sensor 协议定义
```

**Computational Sensor 协议：**

- 定义：sensor 是一个 shell 命令，输出 exit code（0=通过，非 0=失败）+ 可选的 stdout
- 分类：
  - `lint`：代码风格检查（eslint / biome / ruff / golangci-lint）
  - `typecheck`：类型检查（tsc / mypy / pyright）
  - `test`：单元测试（vitest / jest / pytest / go test）
  - `coverage`：覆盖率检查（c8 / coverage.py / go test -cover）
  - `build`：构建检查（tsc / cargo build / go build）
- 配置方式：项目根目录的 `.superpowers/sensors.json`（可选）
  ```json
  {
    "sensors": [
      { "name": "lint", "command": "npx eslint . --max-warnings 0" },
      { "name": "typecheck", "command": "npx tsc --noEmit" },
      { "name": "test", "command": "npx vitest run" }
    ]
  }
  ```
- 如果不存在 `sensors.json`，agent 在首次使用时通过启发式探测项目技术栈并提示用户确认

**computational-sensors SKILL.md 设计：**

- `name: computational-sensors`
- `description: Use when setting up deterministic checks (lint/type/test/coverage) for a project, or when verification-before-completion needs to run computational checks before semantic review.`
- `when_to_use: [feedforward] Configure before implementation begins; [feedback] Run during verification to catch issues early.`
- 内容：
  - Sensor 协议说明
  - 各技术栈的 sensor 模板（TypeScript / Python / Go / Rust）
  - 如何在项目中初始化 `sensors.json`
  - 如何在 verification 流程中调用

**修改文件：**

- `skills/verification-before-completion/SKILL.md`
  - 在 verification 流程中插入「Computational Sensor」阶段，位于 loop detection 之后、semantic review 之前
  - 流程变为：Loop Detection → Computational Sensors → Semantic Review → Done

---

### 4.3 P1: Sprint Contract

#### 目标

Generator 和 Evaluator 在实现前协商完成标准，防止「完成了但不符合预期」的常见失败模式。

#### 方案

**新建文件：**

```
skills/sprint-contract/SKILL.md            # 新 skill
```

**Sprint Contract 流程：**

```
brainstorming → spec → sprint-contract → contract.md → writing-plans → plan.md
```

**Contract 文件格式：**

```markdown
# Sprint Contract: <feature name>

## Definition of Done
- [ ] <具体可验证的完成标准 1>
- [ ] <具体可验证的完成标准 2>
- [ ] <具体可验证的完成标准 3>

## 边界条件
- 必须支持：<约束 1>
- 不得破坏：<约束 2>
- 性能要求：<约束 3>

## 验收方式
- Computational: <sensor 名称与阈值>
- Inferential: <review 方式>

## 协商记录
- Generator: <初始提议>
- Evaluator: <修改意见>
- 最终共识: <双方确认的版本>
```

**sprint-contract SKILL.md 设计：**

- `name: sprint-contract`
- `description: Use after brainstorming produces a spec and before writing-plans begins, to negotiate explicit Definition of Done between generator and evaluator perspectives.`
- `when_to_use: [feedforward] Triggered between brainstorming and writing-plans to prevent ambiguity in completion criteria.`
- 内容：
  - 何时需要 sprint contract（默认：所有非 trivial 任务）
  - 何时可以跳过（仅限：单行 typo 修复、纯文档变更）
  - Generator-Evaluator 对话流程
  - Contract 模板
  - 如何在 writing-plans 中验证 contract 存在

**修改文件：**

- `skills/brainstorming/SKILL.md`
  - 在「After the Design」部分添加：spec 写完后提示执行 sprint-contract
- `skills/writing-plans/SKILL.md`
  - 在输入验证阶段检查 contract 文件是否存在；若不存在则提示先执行 sprint-contract（可由用户跳过）

**Contract 存储位置：** `docs/superpowers/contracts/{feature-name}.contract.md`

---

### 4.4 P1: Reasoning Budget

#### 目标

利用 Claude Code 原生 `effort` frontmatter 字段，为不同 skill 阶段推荐不同推理强度，实现 Reasoning Sandwich 模式。

#### 方案

完全使用官方 frontmatter，不引入新字段。

**Frontmatter 变更清单：**

| Skill | 新增 `effort` | 理由 |
|-------|--------------|------|
| `brainstorming` | `high` | 规划阶段需要深度思考 |
| `writing-plans` | `high` | 计划质量直接决定执行质量 |
| `plan-ceo-review` | `max` | 战略层面审查需要最强推理 |
| `plan-eng-review` | `high` | 工程审查需要严谨推理 |
| `verification-before-completion` | `high` | 验证阶段不能遗漏细节 |
| `executing-plans` | `medium` | 执行阶段依赖计划，无需重复推理 |
| `systematic-debugging` | `high` | 调试需要深度根因分析 |

**不修改的 skills：** 其他 skill 保持默认（继承 session level effort）。

**实施方式：** 在每个上述 skill 的 `SKILL.md` frontmatter 中添加 `effort: <level>` 一行。

**示例（brainstorming）：**

```yaml
---
name: brainstorming
description: Help turn ideas into fully formed designs and specs through natural collaborative dialogue.
effort: high
---
```

---

### 4.5 P2: Trace Analysis

#### 目标

自动分析历史失败模式，在 stop-hook 和 retrospective 中提供数据驱动的改进建议。

#### 方案

**新建文件：**

```
scripts/trace-analyzer.sh                  # 分析脚本
skills/trace-analysis/SKILL.md            # 新 skill
```

**trace-analyzer.sh 设计：**

- 输入数据源：
  - `.superpowers/learnings.jsonl`（session learnings）
  - `docs/superpowers/specs/`（历史 spec 文档）
  - 可选：`/tmp/superpowers-edit-tracker/`（loop detector 数据）
- 分析维度：
  - **失败频率：** 按 skill / 按文件 / 按错误类型 统计
  - **Pattern 分类：** loop / drift / oversight / scope-creep / verification-gap
  - **趋势分析：** 按周/月统计失败率变化
  - **建议生成：** 基于高频失败模式输出改进建议
- 输出格式：
  ```
  === Trace Analysis Report ===
  Session: 2026-06-02
  
  Top Failure Patterns:
  1. [loop] src/foo.ts — 6 edits without convergence (3 occurrences this week)
  2. [verification-gap] Missing typecheck before completion (5 occurrences this month)
  3. [scope-creep] Plan included unrequested refactoring (2 occurrences this week)
  
  Recommendations:
  1. Add computational-sensors configuration for TypeScript projects
  2. Enable loop-detection by default in verification-before-completion
  3. Review writing-plans template to enforce scope discipline
  
  Trends:
  - Loop failures: ↑ 40% this week
  - Verification gaps: ↓ 15% this month
  ```

**trace-analysis SKILL.md 设计：**

- `name: trace-analysis`
- `description: Use during retrospective or when trying to understand recurring failure patterns across sessions, based on historical learnings data.`
- `when_to_use: [feedback] Triggered during retrospective or when stop-hook detects 3+ learnings in a session.`
- 内容：
  - 如何调用 trace-analyzer.sh
  - 如何解读输出（pattern 分类、趋势、建议）
  - 如何将建议转化为具体的 skill 改进项
  - 与 session-learnings 的集成方式

**修改文件：**

- `skills/retrospective/SKILL.md`
  - 在 retrospective 流程的「数据收集」阶段添加 trace-analyzer 调用

---

### 4.6 P2: Feedforward/Feedback 分类

#### 目标

为每个 skill 标注控制类型，帮助 agent 理解当前处于「预防」还是「纠正」阶段。

#### 方案

完全使用官方 `when_to_use` frontmatter 字段，不新增自定义字段。

**标签格式：**

在 `when_to_use` 中加入方括号标签：
- `[feedforward]` — 预防性，在错误发生前介入
- `[feedback]` — 纠正性，在错误发生后介入
- `[feedforward, feedback]` — 两者兼具

**分类清单：**

| Skill | 控制类型 | 理由 |
|-------|---------|------|
| `brainstorming` | `[feedforward]` | 在编码前明确方向 |
| `writing-plans` | `[feedforward]` | 在执行前规划路径 |
| `sprint-contract` | `[feedforward]` | 在实现前协商标准 |
| `test-driven-development` | `[feedforward]` | 在编码前写测试 |
| `computational-sensors` | `[feedforward, feedback]` | 配置为预防，运行为纠正 |
| `verification-before-completion` | `[feedback]` | 在完成后验证 |
| `systematic-debugging` | `[feedback]` | 在 bug 出现后调查 |
| `receiving-code-review` | `[feedback]` | 在提交后接收反馈 |
| `retrospective` | `[feedback]` | 在完成后复盘 |
| `loop-detection` | `[feedback]` | 在循环发生后检测 |
| `trace-analysis` | `[feedback]` | 在失败发生后分析 |
| `executing-plans` | `[feedforward, feedback]` | 计划引导 + 中途纠偏 |
| `subagent-driven-development` | `[feedforward, feedback]` | 分派 + 监督 |
| `requesting-code-review` | `[feedback]` | 在完成后请求审查 |

**实施方式：**

对每个 skill 的 `SKILL.md` frontmatter，在 `when_to_use` 字段开头添加标签。如果 skill 已有 `when_to_use`，则前置标签；如果没有，则新增。

**示例（verification-before-completion）：**

```yaml
---
name: verification-before-completion
description: Use when...
when_to_use: "[feedback] Triggered before declaring a task complete to verify quality."
---
```

---

### 4.7 P3: Harness Templates

#### 目标

预设常见技术栈的 harness 配置，降低新项目接入 superpowers 的成本。

#### 方案

**新建目录与文件：**

```
templates/
  react-typescript/
    sensors.json              # 推荐的 sensor 配置
    skills-recommended.md     # 推荐启用的 skill 清单
    hooks-config.json         # 推荐的 hook 配置片段
    README.md                 # 模板说明
  python-fastapi/
    sensors.json
    skills-recommended.md
    hooks-config.json
    README.md
  go-cli/
    sensors.json
    skills-recommended.md
    hooks-config.json
    README.md
skills/harness-init/SKILL.md  # 初始化引导 skill
```

**模板内容规范：**

每个模板包含：

1. **sensors.json**：对应技术栈的 computational sensor 配置
2. **skills-recommended.md**：推荐的 skill 子集 + 理由
3. **hooks-config.json**：推荐的 hook 配置片段（可选合并到用户项目）
4. **README.md**：模板适用场景、使用方式、自定义建议

**harness-init SKILL.md 设计：**

- `name: harness-init`
- `description: Use when initializing superpowers in a new project or reconfiguring an existing project for a specific tech stack.`
- `when_to_use: "[feedforward] Triggered at project setup to bootstrap harness configuration."
- `user-invocable: true`
- `disable-model-invocation: true`（仅手动触发，避免误激活）
- 内容：
  - 列出可用模板
  - 引导用户选择模板
  - 复制模板文件到项目 `.superpowers/` 目录
  - 提示用户确认并自定义

---

### 4.8 P3: Harness Coverage Metrics

#### 目标

在 retrospective 中量化 harness 覆盖率，提供持续改进的量化依据。

#### 方案

**新建文件：**

```
scripts/coverage-metrics.sh                # 覆盖率计算脚本
```

**Coverage 维度：**

| 维度 | 满分条件 | 计算方式 |
|------|---------|---------|
| Feedforward 覆盖率 | 100% | (有 [feedforward] 标签的 skill 数) / (理论应有数) |
| Feedback 覆盖率 | 100% | (有 [feedback] 标签的 skill 数) / (理论应有数) |
| Computational Sensor 覆盖率 | 100% | (已配置的 sensor 数) / (技术栈理论应有数) |
| Loop Detection 覆盖率 | 100% | (是否启用 loop detector) ? 100 : 0 |
| Sprint Contract 覆盖率 | 100% | (近 N 个 spec 中有 contract 的比例) |
| Trace Analysis 覆盖率 | 100% | (近 N 次 retrospective 中调用 trace-analyzer 的比例) |
| Reasoning Budget 覆盖率 | 100% | (已配置 effort 的 skill 数) / (理论推荐数) |

**coverage-metrics.sh 设计：**

- 扫描范围：
  - `skills/*/SKILL.md` frontmatter
  - `.superpowers/sensors.json`（如果存在）
  - `docs/superpowers/contracts/`（如果存在）
  - `.superpowers/learnings.jsonl`（retrospective 调用记录）
- 输出格式：
  ```
  === Harness Coverage Report ===
  
  Feedforward Coverage:     85% (6/7 skills labeled)
  Feedback Coverage:        100% (8/8 skills labeled)
  Computational Sensor:     66% (2/3 expected sensors configured)
  Loop Detection:           100% (enabled)
  Sprint Contract:          50% (3/6 recent specs have contracts)
  Trace Analysis:           33% (1/3 recent retros used trace-analyzer)
  Reasoning Budget:         70% (7/10 recommended skills configured)
  
  Overall Score: 72/100
  
  Gaps:
  - Missing sensor: build (recommended for TypeScript projects)
  - 3 recent specs missing sprint contracts
  - 2 recent retros missing trace-analyzer invocation
  ```

**修改文件：**

- `skills/retrospective/SKILL.md`
  - 在 retrospective 流程的「数据收集」阶段添加 coverage-metrics 调用
  - 与 trace-analyzer 并行运行，共同作为 retrospective 的输入

---

## 5. 变更影响清单

### 5.1 新增文件

| 路径 | 类别 | 说明 |
|------|------|------|
| `scripts/loop-detector.sh` | Script | Doom loop 检测 |
| `scripts/trace-analyzer.sh` | Script | 失败模式分析 |
| `scripts/coverage-metrics.sh` | Script | 覆盖率计算 |
| `skills/loop-detection/SKILL.md` | Skill | Loop Detection 使用指南 |
| `skills/computational-sensors/SKILL.md` | Skill | Sensor 协议与配置 |
| `skills/sprint-contract/SKILL.md` | Skill | Sprint Contract 流程 |
| `skills/trace-analysis/SKILL.md` | Skill | Trace Analysis 使用指南 |
| `skills/harness-init/SKILL.md` | Skill | 模板初始化引导 |
| `templates/react-typescript/` | Template | React + TS 模板 |
| `templates/python-fastapi/` | Template | Python FastAPI 模板 |
| `templates/go-cli/` | Template | Go CLI 模板 |

### 5.2 修改文件

| 路径 | 修改内容 |
|------|---------|
| `skills/verification-before-completion/SKILL.md` | 添加 loop detection + computational sensors 集成 |
| `skills/brainstorming/SKILL.md` | 添加 sprint-contract 提示 + `effort: high` |
| `skills/writing-plans/SKILL.md` | 添加 sprint-contract 输入验证 + `effort: high` |
| `skills/plan-ceo-review/SKILL.md` | 添加 `effort: max` |
| `skills/plan-eng-review/SKILL.md` | 添加 `effort: high` |
| `skills/executing-plans/SKILL.md` | 添加 `effort: medium` |
| `skills/systematic-debugging/SKILL.md` | 添加 `effort: high` |
| `skills/retrospective/SKILL.md` | 添加 trace-analyzer + coverage-metrics 集成 |
| 14 个 skills 的 frontmatter | 添加 `when_to_use` 中的 `[feedforward]` / `[feedback]` 标签 |

### 5.3 不修改

- `hooks/hooks.json` — 不变更（loop detector 由 skill 调用，不通过 hook）
- `hooks/stop-hook.sh` — 不变更
- `hooks/session-start` — 不变更
- `.superpowers/learnings.jsonl` — 数据文件，不变更
- 现有 scripts — 不变更

---

## 6. 实施约束

**所有新增 skill 必须使用 `superpowers:writing-skills` skill 创建。** 即遵循 TDD 流程：先运行 baseline 压力测试（RED）→ 编写 skill（GREEN）→ 闭环漏洞（REFACTOR）。不得直接手写 SKILL.md 后跳过测试。

实施顺序按优先级推进，每一阶段完成后验证再进入下一阶段：

### Phase 1: P0（基础能力）
1. Loop Detection（新 skill + script + verification 集成）
2. Computational Sensors（新 skill + verification 集成）

### Phase 2: P1（流程增强）
3. Sprint Contract（新 skill + brainstorming/writing-plans 集成）
4. Reasoning Budget（现有 skill frontmatter 添加 effort）

### Phase 3: P2（数据分析）
5. Trace Analysis（新 skill + script + retrospective 集成）
6. Feedforward/Feedback 分类（现有 skill frontmatter 添加 when_to_use 标签）

### Phase 4: P3（生态完善）
7. Harness Templates（新目录 + 新 skill）
8. Harness Coverage Metrics（新 script + retrospective 集成）

---

## 7. 验收标准

本设计文档自身的验收标准（Sprint Contract 思想应用）：

- [ ] 所有 8 个优化方向都有明确的新增/修改文件清单
- [ ] 每个新增 skill 有 `name` 和 `description` 定义
- [ ] 所有 frontmatter 变更使用 Claude Code 官方支持字段
- [ ] 完全向后兼容：不修改任何现有文件的核心逻辑
- [ ] 实施顺序清晰，每个 phase 可独立验证

---

## 8. 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| loop-detector 误报 | Agent 不必要地中断 | 阈值可配置；WARNING 级别不强制中断 |
| sensors.json 探测不准 | Sensor 缺失 | 首次使用时提示用户确认，不静默失败 |
| Sprint Contract 增加流程 | 开发速度下降 | 明确跳过条件（typo 修复、纯文档变更） |
| effort 字段覆盖模型选择 | 推理资源消耗增加 | 仅在确实需要的 skill 上添加，其他继承默认 |
| Trace Analysis 数据不足 | 建议质量低 | 初期以提示为主，数据积累后逐步增强分析能力 |
| Template 覆盖技术栈有限 | 用户找不到匹配模板 | 初期 3 个模板验证模式，后续按需扩展 |

---

## 9. 未来扩展（不在本次范围）

- 跨 session 的 harness 性能对比
- 基于 ML 的失败模式预测
- 与外部 CI/CD 系统集成
- 多语言项目的模板扩展
- 实时 effort 自适应（根据 session 状态动态调整）
