# Gate Driven Test Design Skill 设计

> 日期：2026-06-18
> 状态：Approved
> 范围：新建 `skills/gate-driven-test-design/` skill，作为 brainstorming 与 writing-plans 之间的可选递归测试用例设计层；并对 `skills/brainstorming/SKILL.md` 做两处衔接改动

## 背景

### 问题

AI 编程中「写测试」很重要，测试领域有「测试金字塔」原则：底部多（单测）、顶部少（e2e）。常见做法是告诉 AI「请生成符合金字塔结构的测试用例」，但效果差——因为做的事（写用例）是微观的，校验的事（测试结构）是宏观的，两者抽象层级不匹配。

### 洞察

把测试结构从「事后校验」前移为「事前递归生成」：从需求所在抽象层级出发，先设计该层级的测试，然后针对每个测试递归向下展开「为让父项成立，子项必须满足什么」，直到最底层。递归执行的结果是树状结构，天然构成金字塔形状。

### 现状

仓库根目录已有 `gdd-spec-prompt.md`，是一份独立的 GDD（Gate Driven Development）内部 prompt 草案，定义了：

- 15 种 Gate 能力（e2e / smoke / release / observability / integration / contract / schema / config / migration / unit / fixture / property / type-check / lint / build）
- L1-L4 四层抽象视角（L4 可见行为 / L3 系统协作 / L2 逻辑规则 / L1 静态约束）
- 7 步递归生成算法（Read Source → Extract Initial Level Items → Recursively Expand Children → Consolidate Tree → Generate Gates & Assertions → Audit Cross-Layer Ownership → Merge Redundant）
- Coverage Ownership Rules、Assertion Rules、Blocking Output 等约束

但该文件是裸 prompt，未接入 agent-harness 的 skill 工作流，无法被 agent 自动发现和调用。本次设计将其结构化为标准 skill。

## 设计决策

| 决策 | 选择 | 理由 |
|------|------|------|
| 落点 | 新建独立 skill `skills/gate-driven-test-design/` | 与 brainstorming、writing-plans 解耦，可独立调优；符合 agent-harness 单一职责的 skill 拆分惯例 |
| 触发范围 | 仅从 brainstorming 后挂接，opt-in 触发 | 避免给简单任务强加负担；brainstorming 产出的 design spec 是 GDD 的必要输入 |
| 文件拆分 | 三文件：SKILL.md + gate-capability-table.md + generation-prompt.md | 对照 writing-skills 的 token efficiency 原则——SKILL.md 频繁加载必须瘦，reference 按需 Read |
| Gate 能力表处理 | 照搬 gdd-spec-prompt.md 的两张表，不增不减 | 静态字典，价值在准确完整；重写引入偏差 |
| 7 步算法处理 | 完整译化为 skill 内部指令，保留 Coverage Ownership / Assertion Rules / Blocking Output | 这些约束是防止 agent 硬编、膨胀、穷举错误码的关键护栏，不能删 |
| 输出位置 | 在 spec 文件追加或更新 `## Gate Driven Development` 段，不另存新文件 | 与 brainstorming 产出的 spec 保持同源，writing-plans 自然读到 |
| brainstorming 改动 | 仅两处：Process Flow 图末段分支 + terminal state 描述 | 最小侵入；不自动触发，必须用户 opt-in |

## 架构

### 调用链定位

```
brainstorming (产出 design spec)
       │
       ▼ (可选，用户确认后 opt-in)
gate-driven-test-design (产出 ## Gate Driven Development 段)
       │
       ▼
writing-plans (按 GDD assertions 拆 task)
       │
       ▼
test-driven-development (每个 assertion → RED→GREEN→REFACTOR)
```

GDD 位于执行层的 brainstorming 与 writing-plans 之间，是可选的递归测试设计层。

### 核心思想

不在微观写完用例后用宏观标准（金字塔）校验，而是从需求所在层级出发，逐层向下递归展开「为让父项成立，子项必须满足什么」。树状展开天然构成金字塔——多底少顶，且每个叶子指向一个具体 Gate 与断言。

## 文件结构

```
skills/gate-driven-test-design/
├── SKILL.md                          # 骨架：when_to_use、核心递归流程、与 brainstorming/writing-plans 的衔接
├── references/
│   ├── gate-capability-table.md      # 15 种 Gate 能力表 + L1-L4 视角表（照搬 gdd-spec-prompt.md）
│   └── generation-prompt.md          # 译化后的 7 步递归生成内部指令（流程主体）
```

### 职责切分

| 文件 | 职责 | 长度目标 | 加载时机 |
|------|------|---------|---------|
| `SKILL.md` | 告诉 agent「何时进入 GDD、产出什么、如何衔接」——骨架级元信息 | < 400 词 | skill 被调用时全文加载 |
| `references/gate-capability-table.md` | Gate 能力字典 + L1-L4 视角表（重 reference，按需查） | 不限 | 生成 Level Items 时显式 Read |
| `references/generation-prompt.md` | 7 步递归算法的完整执行指令 | 不限 | 进入生成阶段时显式 Read |

**为什么三文件拆分**（对照 writing-skills 的 token efficiency 原则）：

- SKILL.md 是「触发与骨架」，频繁加载，必须瘦
- 两份 reference 各 200+ 行，是「执行时才需要」的细节，不该进 SKILL.md
- 把 Gate 表与算法流程分开，因为前者是静态字典（查），后者是动态流程（走），更新节奏不同

## SKILL.md 骨架设计

### frontmatter

遵循 writing-skills 的 CSO 原则——description 只写触发条件，不泄露流程，避免 agent 走描述捷径跳过正文。

```yaml
---
name: gate-driven-test-design
description: Use after brainstorming produces an approved design spec, before writing-plans, when you need to recursively derive a risk-based test coverage tree (Level Items + Gates + Assertions) from the design.
when_to_use: "[feedforward] Triggered between brainstorming and writing-plans for features with non-trivial behavior, contracts, or regression risk."
---
```

### 正文骨架（约 350 词，分 5 段）

```markdown
# Gate Driven Test Design (GDD)

## Overview
从已批准的设计 spec 出发，按风险显著性提取 Level Items（L1-L4 抽象层级），
递归向下展开「为让父项成立，子项必须满足什么」，得到树状测试覆盖结构。
树状结构天然构成金字塔形状——多底少顶，且每个叶子指向一个具体 Gate 与断言。

**核心原则**：测试结构不是事后校验，而是事前递归生成的产物。

## When to Use
- brainstorming 已写完 design spec 且用户复核通过
- 功能涉及：用户路径、跨模块协作、公共契约、数据正确性、权限、复杂规则、回归风险
- **不适用**：单行 typo、纯文档、无行为变更的改动

## Entry Contract（进入前置）
- 已存在 `docs/agent-harness/specs/YYYY-MM-DD-<topic>-design.md`
- 用户明确说「生成测试用例 / 生成 GDD 段 / 进入测试设计」
- 若 spec 缺关键决策 → 返回 blocking questions，不写半成品

## Process（骨架）
执行流程详见 `references/generation-prompt.md`，共 7 步：
1. Read Source → 2. Extract Initial Level Items → 3. Recursively Expand Children
→ 4. Consolidate Tree → 5. Generate Gates & Assertions
→ 6. Audit Cross-Layer Ownership → 7. Merge Redundant

Gate 能力字典见 `references/gate-capability-table.md`。

## Output
在 spec 文件**追加或更新** `## Gate Driven Development` 段（不另存新文件），
格式见 generation-prompt.md 的 Output Format 节。

## Exit & Handoff
- GDD 段写入后，回到 brainstorming 的 User Review Gate，让用户复核 GDD 段
- 复核通过 → 调用 writing-plans，plan task 须与 GDD assertions 一一对应

## Rationalization Table
| Excuse | Reality |
|--------|---------|
| "测试结构等写完代码再校验" | 事后校验是宏观打微观，效果差；递归生成才能自然成形 |
| "Level Items 越多越好" | 只为风险显著性而设，冗余项稀释覆盖焦点 |
| "L4 的 e2e 要穷举所有错误码" | L4 只证路径可达，详细矩阵下沉到 L2/L3 |
| "缺决策先猜一个" | blocking——返回提问，不写半成品 |
```

## references 设计

### `references/gate-capability-table.md`

直接照搬 `gdd-spec-prompt.md` 的两张表，**不增不减、不改写**：

1. **Gate Capability Table**（15 种 Gate：e2e / smoke / release / observability / integration / contract / schema / config / migration / unit / fixture / property / type-check / lint / build）
2. **L1-L4 视角表**（L4 可见行为与运维 / L3 系统协作与边界契约 / L2 逻辑规则与分支 / L1 特性级静态约束）

**理由**：这是静态字典，价值在准确完整，不在原创。重写反而引入偏差。

### `references/generation-prompt.md`

把 `gdd-spec-prompt.md` 的 7 步算法**译化为 skill 内部指令**，关键调整：

| 原文件元素 | 处理方式 |
|-----------|---------|
| `## Inputs` / `## Purpose` 段 | 删除（已被 SKILL.md 的 Entry Contract 覆盖） |
| Gate 能力表 + 视角表 | 抽出到 gate-capability-table.md，本文只留一句「见 references/...」 |
| `## Process` 的 7 步 | **完整保留**，包括 Coverage Ownership Rules、Assertion Rules、Blocking Output |
| `## Output Format` | 完整保留（`## Gate Driven Development` 段的 markdown 模板） |
| `## Blocking Output` | 完整保留——缺决策时返回 `gdd_result: blocked` |

**新增一段**（对照 brainstorming 的 Spec Self-Review 模式）：

```markdown
## Self-Review（写入 spec 前自检）
1. 每个 Level Item 能否追溯到 design spec 的具体段或项目 Gate 事实？
2. 是否有 Level Item 只是在复述父项、无独立证明价值？删除。
3. 同一业务点是否有多个 Gate 证明同一 oracle？保留最便宜的，其余下沉或合并。
4. L4 e2e 是否在穷举错误码/字段矩阵？下沉到 L2/L3，L4 只留代表路径。
5. 有没有凭空发明的行为/字段/状态？删除或 block 提问。
```

## brainstorming skill 衔接改动

GDD skill 作为独立 skill 存在，但**仅从 brainstorming 挂接**触发。需要改 `skills/brainstorming/SKILL.md` 两处。

### 改动 1：Process Flow 图末段分支

原图末段：

```
"User reviews spec?" -> "Write design doc" [label="changes requested"];
"User reviews spec?" -> "Invoke writing-plans skill" [label="approved"];
```

改为：

```
"User reviews spec?" -> "Write design doc" [label="changes requested"];
"User reviews spec?" -> "GDD step?" [label="approved"];
"GDD step?" -> "Invoke gate-driven-test-design" [label="yes, user opts in"];
"GDD step?" -> "Invoke writing-plans skill" [label="no, skip"];
"Invoke gate-driven-test-design" -> "Invoke writing-plans skill";
```

### 改动 2：terminal state 描述

原文：

```
**The terminal state is invoking writing-plans.** Do NOT invoke frontend-design,
mcp-builder, or any other implementation skill. The ONLY skill you invoke
after brainstorming is writing-plans.
```

改为：

```
**The terminal state is invoking writing-plans.** Between design approval and
writing-plans, you MAY optionally invoke agent-harness:gate-driven-test-design
when the user asks for test case generation or the feature carries non-trivial
behavior/contract/regression risk. The ONLY skills you invoke after
brainstorming are gate-driven-test-design (optional) and writing-plans (required).
Do NOT invoke frontend-design, mcp-builder, or any other implementation skill.
```

### 不做的事

- **不**让 brainstorming 自动触发 GDD——必须用户明确选择，避免给简单任务强加负担
- **不**修改 brainstorming 的 checklist 八步——GDD 是 spec 写完后的可选挂载，不影响主流程
- **不**改 writing-plans——GDD 段已经在 spec 里，writing-plans 自然会读

## 范围切分

### 范围内（本 spec 覆盖）

- GDD skill 三文件结构（SKILL.md + 两份 reference）
- brainstorming 两处衔接改动（Process Flow + terminal state）
- 递归算法的 7 步译化（含 Coverage Ownership Rules / Assertion Rules / Blocking Output）
- `## Gate Driven Development` 输出格式

### 范围外（后续处理）

- TDD baseline / GREEN / REFACTOR 测试脚本（由后续 writing-plans 拆 task 或交给 skill-creator 执行）
- 在 demo/fruit-shop 跑实战验证
- 上游同步（这是 fork 定制，不回 PR 到 obra/agent-harness）
- 与 computational-sensors 的整合（如有）

## 风险与缓解

| 风险 | 缓解 |
|------|------|
| agent 在缺决策时硬编 | generation-prompt.md 保留 Blocking Output 段，强制返回 `gdd_result: blocked` |
| Level Items 爆炸膨胀 | Self-Review 第 2、3 步强制删冗余；Coverage Ownership Rules 保留 |
| 用户简单任务被强加 GDD | brainstorming 改动明确「opt-in」，skill 不自动触发 |
| gdd-spec-prompt.md 原文件与新 skill 重复 | 原文件保留作历史参考；新 skill 是其结构化载体，引用关系在 generation-prompt.md 顶部注明 |

## 验证策略（不在本 spec 范围，但约定）

本 skill 属于 writing-skills 的「Technique skill」类型。按 writing-skills 的 Iron Law（NO SKILL WITHOUT A FAILING TEST FIRST），真正部署前需要：

1. **RED**：拿 2-3 个真实设计 spec，**不**给 GDD skill，让 agent 生成测试用例，记录 baseline 行为（典型失败：一上来就写 unit test，没有 e2e；或 L4 穷举错误码）
2. **GREEN**：给 GDD skill，跑同样 spec，验证是否产出树状结构、是否 blocking 缺决策
3. **REFACTOR**：补 Rationalization Table 漏洞

这一步不在本 spec 内，由后续 writing-plans 阶段拆成独立 task。

## 文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `skills/gate-driven-test-design/SKILL.md` | 新增 | 骨架：when_to_use、核心递归流程、与 brainstorming/writing-plans 衔接 |
| `skills/gate-driven-test-design/references/gate-capability-table.md` | 新增 | 15 种 Gate 能力表 + L1-L4 视角表（照搬） |
| `skills/gate-driven-test-design/references/generation-prompt.md` | 新增 | 7 步递归生成内部指令（译化） |
| `skills/brainstorming/SKILL.md` | 修改 | 两处：Process Flow 图末段分支 + terminal state 描述 |
| `gdd-spec-prompt.md` | 保留不动 | 作历史参考，新 skill 在 generation-prompt.md 顶部注明引用关系 |
