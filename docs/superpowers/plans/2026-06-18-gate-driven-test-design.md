# Gate Driven Test Design Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新建 `skills/gate-driven-test-design/` skill（含三文件）并对 `skills/brainstorming/SKILL.md` 做两处最小侵入衔接改动，把 `gdd-spec-prompt.md` 结构化为 brainstorming 与 writing-plans 之间的可选递归测试用例设计层。

**Architecture:** skill 目录 `skills/gate-driven-test-design/` 下三文件：SKILL.md（骨架，< 400 词）+ references/gate-capability-table.md（照搬原 prompt 两表）+ references/generation-prompt.md（7 步递归算法译化 + Self-Review）。brainstorming 改动限于 Process Flow dot 图末段 + terminal state 段落两处。无脚本依赖，纯 markdown。

**Tech Stack:** Markdown（skill 文档），dot graphviz（brainstorming 流程图）

---

## File Structure

| 文件 | 操作 | 责任 |
|------|------|------|
| `skills/gate-driven-test-design/SKILL.md` | 新增 | 骨架：when_to_use、核心递归流程概述、与 brainstorming/writing-plans 衔接 |
| `skills/gate-driven-test-design/references/gate-capability-table.md` | 新增 | 15 种 Gate 能力表 + L1-L4 视角表（逐字照搬） |
| `skills/gate-driven-test-design/references/generation-prompt.md` | 新增 | 7 步递归生成内部指令 + Coverage Ownership Rules + Assertion Rules + Output Format + Blocking Output + Self-Review |
| `skills/brainstorming/SKILL.md` | 修改 | 两处：Process Flow dot 图末段 + terminal state 段落 |

### Task 依赖

```
Task 1 (gate-capability-table.md) ─┐
                                   ├─→ Task 4 (generation-prompt.md) ─→ Task 5 (SKILL.md) ─→ Task 6 (brainstorming 改动) ─→ Task 7 (DoD 校验)
Task 2/3 (RED baseline) ──────────┘
```

Task 1 和 Task 2/3 可并行（Task 1 是纯照搬文件，Task 2/3 是 RED baseline 观察）。Task 4 依赖 Task 1（要在 generation-prompt.md 顶部引用 gate-capability-table.md）。Task 5 依赖 Task 4。Task 6 独立于 GDD skill 文件，可在 Task 5 后任意时间做。Task 7 是全量 DoD 校验，必须最后。

---

### Task 1: 新增 `references/gate-capability-table.md`（逐字照搬两表）

**Files:**
- Create: `skills/gate-driven-test-design/references/gate-capability-table.md`
- Source: `gdd-spec-prompt.md:36-61`

- [ ] **Step 1: 用 Read 读取 gdd-spec-prompt.md 第 36-61 行**

Run: `Read gdd-spec-prompt.md offset=35 limit=26`
Expected: 看到 Gate Capability Table（15 行）和 L1-L4 视角表（4 行）

- [ ] **Step 2: 创建 gate-capability-table.md，逐字照搬两表**

文件内容（头部加一句引用说明，表内容逐字复制）：

```markdown
# Gate Capability Table

> 逐字照搬自 `gdd-spec-prompt.md`。这是静态字典，价值在准确完整，不要改写。

## Gate Capability Table

| Gate                 | Proves                                                                                                                                   |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `e2e gate`           | A real user path or external invocation path can complete from entry point to visible result.                                            |
| `smoke gate`         | A runnable target can start, be accessed, and satisfy the minimum healthy path.                                                          |
| `release gate`       | Release candidate inputs, compatibility, versioning, and release constraints are satisfied.                                              |
| `observability gate` | New behavior can be observed, diagnosed, alerted, or rolled back through metrics, logs, traces, alerts, or rollback signals.             |
| `integration gate`   | Modules, components, services, or storage layers collaborate correctly in a controlled environment.                                      |
| `contract gate`      | API, event, CLI, SDK, or public interface producer and consumer boundaries remain stable.                                                |
| `schema gate`        | Data, message, or document structure matches field, hierarchy, and structural expectations.                                              |
| `config gate`        | Environment values, runtime config, feature flags, or deployment config are complete and consistent.                                     |
| `migration gate`     | Persistent data or state changes can apply safely and remain compatible with existing data.                                              |
| `unit gate`          | A function, class, module, or pure logic unit handles inputs, outputs, branches, and errors correctly.                                   |
| `fixture gate`       | Representative examples, fixtures, or snapshots produce stable expected behavior.                                                        |
| `property gate`      | Invariants, boundary properties, or input-class rules hold beyond a single example.                                                      |
| `type-check gate`    | Static type relationships, parameter shapes, return shapes, and exhaustiveness constraints prove a concrete feature-risk constraint.     |
| `lint gate`          | Static rules, forbidden patterns, dependency boundaries, naming, or dead-code constraints prove a concrete feature-risk constraint.      |
| `build gate`         | Build, packaging, or asset processing proves a build-consumed declaration or registration needed for a concrete feature-risk constraint. |

## Level Perspective Table

| Gate level | Perspective                                 | Common Gates                                                                        | Project facts to inspect                                                                                                                                    | Candidate expansion explains                                                                                                       |
| ---------- | ------------------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| L4         | Visible behavior and operability            | `e2e gate`, `smoke gate`, `release gate`, `observability gate`                      | User paths, page/API entry points, e2e specs, smoke scripts, release docs, observability conventions                                                        | How real users or external callers complete the path, what they see, and which minimal runtime or release signals prove usability. |
| L3         | System collaboration and boundary contracts | `integration gate`, `contract gate`, `schema gate`, `config gate`, `migration gate` | Module collaboration, service calls, storage reads/writes, API contracts, data structures, runtime config, state migrations                                 | Which boundaries collaborate, which contracts and schemas stay stable, and which config or state changes are necessary.            |
| L2         | Logic rules and branches                    | `unit gate`, `fixture gate`, `property gate`                                        | Domain rules, function behavior, error branches, boundary cases, fixtures, existing unit tests                                                              | Which inputs, outputs, branches, errors, boundary cases, fixtures, and invariants define correct logic.                            |
| L1         | Feature-specific static constraints         | `type-check gate`, `lint gate`, `schema gate`, `build gate`                         | Type declarations, public schemas, generated client shapes, registries, config maps, dependency boundaries, forbidden patterns, build-consumed declarations | Which static gate proves a concrete risk constraint that protects a higher-level behavior, boundary, or rule.                      |
```

- [ ] **Step 3: 验证两表与原文件逐字一致**

Run: `diff <(sed -n '38,54p' gdd-spec-prompt.md) <(sed -n '7,23p' skills/gate-driven-test-design/references/gate-capability-table.md)`
Expected: 无差异（exit 0）

- [ ] **Step 4: Commit**

```bash
git add skills/gate-driven-test-design/references/gate-capability-table.md
git commit -m "feat(gdd): 新增 gate-capability-table.md 逐字照搬 Gate 能力表与 L1-L4 视角表"
```

---

### Task 2: RED baseline — 无 GDD skill 时 agent 生成测试的典型失败

**Files:**
- Create: `docs/superpowers/notes/2026-06-18-gdd-baseline-red.md`（临时观察记录，验证后可删）

**说明**：此任务是 writing-skills 的 RED phase——在写 skill 前观察 agent 不带 skill 时的自然行为。它是**观察记录**，不是失败测试代码。GDD skill 是 Technique skill（非 discipline skill），baseline 用于后续调优参考，不是 gate。

- [ ] **Step 1: 用 Agent 工具派一个 subagent，给它一个简单 design spec 片段，让它「生成测试用例」，不带任何 GDD 指令**

subagent prompt 示例：
```
你是一个测试工程师。请基于以下 design spec 生成测试用例清单。

Design spec 片段：
"用户登录功能。用户输入邮箱+密码，后端校验后返回 JWT。
错误场景：邮箱为空、密码错误、账号锁定。成功场景：返回 token。"

请列出你要写的测试，按你认为是合理的顺序输出。
```

- [ ] **Step 2: 记录 baseline 行为**

在 `docs/superpowers/notes/2026-06-18-gdd-baseline-red.md` 记录：
- subagent 产出的测试清单（原始文本）
- 标注典型失败模式是否出现：
  - [ ] 是否一上来就写 unit test，没有 e2e 路径覆盖？
  - [ ] 是否在同层穷举所有错误码（如把"邮箱为空""密码错误""账号锁定"全部写在同一层）？
  - [ ] 是否有跨层结构（L4/L3/L2 分层）？
  - [ ] 是否出现了 pyramid 形状（多底少顶）还是扁平清单？

- [ ] **Step 3: Commit baseline 记录**

```bash
git add docs/superpowers/notes/2026-06-18-gdd-baseline-red.md
git commit -m "docs(gdd): 记录 RED baseline - 无 GDD skill 时测试生成典型失败模式"
```

---

### Task 3: RED baseline — blocking 场景观察

**Files:**
- Modify: `docs/superpowers/notes/2026-06-18-gdd-baseline-red.md`（追加段落）

- [ ] **Step 1: 派 subagent，给一个**故意缺关键决策**的 spec 片段，让它生成测试**

subagent prompt 示例：
```
你是一个测试工程师。请基于以下 design spec 生成完整测试覆盖清单。

Design spec 片段：
"用户登录功能。错误场景：邮箱为空、密码错误。"

注意：spec 没说成功场景返回什么，也没说账号锁定怎么处理。

请列出完整测试用例清单。
```

- [ ] **Step 2: 记录 baseline 行为**

追加到 `docs/superpowers/notes/2026-06-18-gdd-baseline-red.md`：
- subagent 是否硬编补全了 spec 没说的行为（如自己编"成功返回 JWT"）？
- 是否直接 block 并反问，还是强行生成？
- 原始输出文本

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/notes/2026-06-18-gdd-baseline-red.md
git commit -m "docs(gdd): 追加 RED baseline - blocking 场景的硬编倾向观察"
```

---

### Task 4: 新增 `references/generation-prompt.md`（7 步译化 + Self-Review）

**Files:**
- Create: `skills/gate-driven-test-design/references/generation-prompt.md`
- Source: `gdd-spec-prompt.md:63-324`（Coverage Ownership Rules、Process 7 步、Output Format、Assertion Rules、Blocking Output）

- [ ] **Step 1: Read gdd-spec-prompt.md 第 63-324 行作为译化源**

Run: `Read gdd-spec-prompt.md offset=62 limit=262`

- [ ] **Step 2: 创建 generation-prompt.md，结构如下**

文件完整内容：

````markdown
# GDD Generation Prompt（内部执行指令）

> 译化自 `gdd-spec-prompt.md`。本文件是 gate-driven-test-design skill 的执行主体。
> Gate 能力字典见 `references/gate-capability-table.md`，不要在本文件重复。

## 引用关系

- 原 prompt：仓库根目录 `gdd-spec-prompt.md`（保留作历史参考）
- 本文件：将其结构化为 skill 内部指令，删除 Inputs/Purpose 段（已被 SKILL.md 的 Entry Contract 覆盖）

## Level Item Rules

- Keep the design portion as the authority.
- Level Items may originate at any level reflected by the spec. Do not force the
  first extracted item to be L4.
- Every Level Item must be traceable to the design spec or to project gate facts
  required by that design.
- Create a Level Item only when it catches an important failure. Good candidates
  protect core user value, data correctness, permissions, public contracts,
  cross-module collaboration, explicit out-of-scope boundaries, complex rules,
  or likely regressions introduced by the change.
- A child Level Item must explain a lower-level requirement that helps prove its
  parent. Do not create children that merely restate the parent.
- Do not create Level Items for routine project checks that do not catch a
  feature-specific failure.
- Do not invent behavior, states, fields, commands, fixtures, or release
  requirements that are absent from the approved design or project facts.
- If a useful Level Item depends on a missing design decision, stop and report a
  blocking question instead of guessing.

## Coverage Ownership Rules

Use these rules to keep the generated GDD compatible with the level model above
without duplicating the same proof at several test layers:

- For each business rule or user-visible behavior, identify the cheapest gate
  that can own the detailed oracle. Higher-level gates may prove that the real
  path reaches a representative outcome, but should not repeat the lower-level
  branch matrix, exact field matrix, or detailed error-code matrix.
- Multiple gates may cover the same business point only when each gate proves a
  different failure mode. For example, an e2e gate proves the real user path and
  visible recovery, an integration gate proves boundary collaboration, and a unit
  gate proves deterministic branch classification.
- Treat an assertion as redundant when another assertion for the same feature
  uses the same input class, action, and expected oracle at a cheaper gate. Keep
  the cheaper assertion and rewrite the higher-level assertion as a path-level
  smoke or representative flow when that flow still adds value.
- Do not add lower-level assertions merely to make the shape look like a pyramid.
  Add them only when they catch a distinct implementation, boundary, or rule
  failure.
- Implementation-implied failure modes are allowed only when they follow from an
  explicit design dependency or project gate fact, such as database writes,
  network calls, external services, concurrency, time, storage, generated
  contracts, or background workers. Keep these at the lowest useful level and do
  not invent new product behavior; if the externally visible behavior is
  undecided, block on a design question.

## Process

### 1. Read Source Material

1. Read the approved design spec.
2. Identify the design summary, goals, non-goals, architecture decisions,
   contracts, data shapes, behavior rules, errors, rollout constraints, and any
   user-confirmed decisions supplied with this prompt.
3. Read project gate facts relevant to the feature. Use project-specific gates
   when they exist; otherwise use the generic Gate names above.

### 2. Extract Initial Level Items

Extract initial Level Items directly from the approved spec. Choose only
risk-significant requirements whose failure would affect user value, data
correctness, permissions, public contracts, cross-module collaboration, explicit
scope boundaries, complex rules, or likely regressions. Classify each selected
requirement at its closest abstraction level:

- L4: visible behavior, user paths, runtime health, release-facing or
  operator-visible outcomes.
- L3: API/module/service/storage/config/migration collaboration and public
  boundary contracts.
- L2: rules, states, branches, errors, edge cases, permissions, invariants, and
  deterministic behavior.
- L1: feature-specific static constraints proven by type-check, lint, build,
  schema, or similar static gates, where the assertion names the concrete risk
  constraint being protected.

For each initial item, internally record:

- Level
- Short title
- Requirement statement
- Source section or design fact
- Why this level fits
- The important failure this Level Item catches
- Likely parent, if the spec already implies one

Initial Level Items can be siblings at different levels. Do not create gates yet.

### 3. Recursively Expand Child Level Items

For each initial Level Item, recursively ask:

> What lower-level requirement must hold for this item to be true?

Also ask:

> What important failure would this child catch?

If the answer is unclear, do not create the child.

Expand downward only:

- L4 items may produce L3, L2, or L1 descendants.
- L3 items may produce L2 or L1 descendants.
- L2 items may produce L1 descendants.
- L1 items do not produce lower-level children.

Expansion rules:

1. Prefer one-level-at-a-time expansion when a meaningful intermediate level
   exists.
2. Skip a level only when the spec makes the intermediate level unnecessary.
3. Stop expanding when a child would repeat an existing item, invent design, or
   provide no independent proof value.
4. When multiple parents could own a child, attach it to the parent whose
   contract it most directly proves. If truly shared, keep one Level Item and
   mention the other coverage in `Covers` under its Gate Item instead of
   duplicating the item.
5. If expansion exposes a missing design decision, stop and return the blocking
   output. Do not write a partial GDD section.

### 4. Consolidate Level Item Tree

Before writing gates, normalize the generated tree:

- Assign stable IDs in level order: `L4-1`, `L4-2`, `L3-1`, and so on.
- Set `PARENT_ID` to `ROOT` or the nearest higher-level item that the child
  helps prove.
- Merge obvious duplicates before generating assertions.
- Remove items that only restate another item without adding a distinct
  requirement or proof perspective.
- Preserve enough structure for downstream planning; do not collapse distinct
  contracts merely because they affect the same file.

### 5. Generate Gate Items And Assertions

For each Level Item:

1. Select Gate items whose abstraction level matches the Level Item.
2. Use project-specific gate names and commands when project facts provide them;
   otherwise use the generic Gate names.
3. Write ordered `Assertions` under each Gate item.
4. Assertions should state what the gate proves, not how to implement the
   feature.
5. Keep assertion order stable after review.

### 6. Audit Assertion Ownership

After generating Gate items and Assertions, run a cross-layer ownership audit
before updating the spec:

- Group assertions by business rule or risk point.
- Within each group, compare input class, action, expected oracle, gate cost, and
  failure mode.
- Merge or rewrite assertions that prove the same oracle at multiple gates.
- Slim L4/e2e assertions that enumerate detailed error codes, wording, boundary
  values, field matrices, sorting rules, pagination rules, or role matrices
  unless the approved design makes that exact visible matrix the core user value
  or a high-risk release boundary.
- Check whether explicit implementation dependencies introduce important L2/L3
  failure modes that the design did not spell out, such as timeout, failed
  persistence, late response, stale cache, concurrent update, null/missing
  relation, or external-service failure. Add the lowest-level assertion that
  proves the technical risk only when the behavior follows from existing design
  or project facts; otherwise block on a design question.
- Do not write a separate audit report into the GDD section. Use this pass only
  to improve the Level Items, Gate Items, and Assertions.

### 7. Review And Merge Redundant Level Items

Before updating the spec, run an internal review pass:

- Source alignment: every Level Item and assertion traces to the design portion
  or project facts.
- Coverage: every risk-significant design requirement has enough assertion
  coverage.
- Level fit: each Level Item and Gate item matches the L4/L3/L2/L1 perspective.
- No scope creep: no new behavior, fields, states, gates, or edge cases are
  invented.
- Redundancy: merge Level Items that express the same requirement, collapse
  parent/child pairs where the child merely repeats the parent, and remove
  siblings that have no independent proof value.
- Cross-layer ownership: no two assertions at different gates prove the same
  input/action/oracle unless their distinct failure modes are explicit.
- E2E economy: L4/e2e assertions stay representative and user-path focused; any
  detailed matrix at L4 is justified by core user value, safety, permissions,
  data leakage, or release-risk concerns.
- Value filter: remove assertions that are merely more exhaustive but do not
  catch a distinct important failure.

After merging, update parent IDs and assertion structure so ids remain
parseable. Then write or update the GDD section.

## Output Format

```markdown
## Gate Driven Development

### ROOT

<One-paragraph summary of the approved design portion.>

### Level Items

#### L4-1

PARENT_ID：ROOT
视角下的需求：...
Gate Items：

- Gate：`e2e gate`
  Covers：...
  Assertions：
  1. ...
  2. ...

#### L3-1

PARENT_ID：L4-1
视角下的需求：...
Gate Items：

- Gate：`contract gate`
  Covers：...
  Assertions：
  1. ...
```

## Assertion Rules

- Do not create a separate `Assertion Index`.
- Assertions must be ordered lists under `Assertions：`.
- An assertion id is derived from structure:
  `<LevelItemID>-G<GateItemOrder>-A<AssertionOrder>`. Example: the first
  assertion in the second Gate item under `L3-1` is `L3-1-G2-A1`.
- Keep assertion order stable after review; reordering changes structural ids.
- Every assertion must be specific enough for downstream planning to map it to
  one or more verification steps.
- Assertions should state what the gate proves, not how to implement the
  feature.
- Assertions must name the feature-specific constraint being proven; a gate
  command passing is not enough by itself.
- A missing assertion is blocking only when the omitted behavior is central to
  user value, data correctness, permissions, public contract stability,
  cross-module collaboration, explicit scope boundaries, complex rules, or a
  likely regression introduced by the change.
- Do not include "Does not prove" sections.
- Do not add requirements beyond the design portion. If a useful assertion
  depends on an unstated decision, report a blocking question instead.

## Blocking Output

If generation cannot continue because the design portion lacks a necessary
decision, do not write a partial GDD section. Return:

```text
gdd_result: blocked
blocking_questions:
- <question that must be resolved in the design portion>
why_it_blocks_assertions:
- <which Level Item/Gate/assertion cannot be written without this decision>
```

## Self-Review（写入 spec 前自检）

对照 brainstorming 的 Spec Self-Review 模式，写入 `## Gate Driven Development` 段前，用以下五问自检：

1. 每个 Level Item 能否追溯到 design spec 的具体段或项目 Gate 事实？追溯不到 → 删除。
2. 是否有 Level Item 只是在复述父项、无独立证明价值？是 → 删除。
3. 同一业务点是否有多个 Gate 证明同一 oracle？是 → 保留最便宜的，其余下沉或合并。
4. L4 e2e 是否在穷举错误码/字段矩阵？是 → 下沉到 L2/L3，L4 只留代表路径。
5. 有没有凭空发明的行为/字段/状态？有 → 删除或 block 提问。

任一项不通过，修复后再写入，不写半成品。
````

- [ ] **Step 3: 验证 12 个具名 section 全部存在**

Run（应输出 12）：
```bash
grep -c -E '^## (Level Item Rules|Coverage Ownership Rules|Process|Output Format|Assertion Rules|Blocking Output|Self-Review)|^### [0-9]+\. ' skills/gate-driven-test-design/references/generation-prompt.md
```
更精确的逐 section 校验：
```bash
for s in "Level Item Rules" "Coverage Ownership Rules" "Read Source Material" "Extract Initial Level Items" "Recursively Expand Child Level Items" "Consolidate Level Item Tree" "Generate Gate Items And Assertions" "Audit Assertion Ownership" "Review And Merge Redundant Level Items" "Output Format" "Assertion Rules" "Blocking Output" "Self-Review"; do
  grep -q "$s" skills/gate-driven-test-design/references/generation-prompt.md && echo "OK: $s" || echo "MISSING: $s"
done
```
Expected: 13 行 OK（Level Item Rules + Coverage Ownership Rules + 7 步 + Output Format + Assertion Rules + Blocking Output + Self-Review）

- [ ] **Step 4: Commit**

```bash
git add skills/gate-driven-test-design/references/generation-prompt.md
git commit -m "feat(gdd): 新增 generation-prompt.md 译化 7 步递归算法 + Self-Review"
```

---

### Task 5: 新增 `SKILL.md`（骨架）

**Files:**
- Create: `skills/gate-driven-test-design/SKILL.md`

- [ ] **Step 1: 创建 SKILL.md**

文件完整内容：

```markdown
---
name: gate-driven-test-design
description: Use after brainstorming produces an approved design spec, before writing-plans, when you need to recursively derive a risk-based test coverage tree (Level Items + Gates + Assertions) from the design.
when_to_use: "[feedforward] Triggered between brainstorming and writing-plans for features with non-trivial behavior, contracts, or regression risk."
---

# Gate Driven Test Design (GDD)

## Overview

从已批准的设计 spec 出发，按风险显著性提取 Level Items（L1-L4 抽象层级），递归向下展开「为让父项成立，子项必须满足什么」，得到树状测试覆盖结构。树状结构天然构成金字塔形状——多底少顶，且每个叶子指向一个具体 Gate 与断言。

**核心原则**：测试结构不是事后校验，而是事前递归生成的产物。

## When to Use

- brainstorming 已写完 design spec 且用户复核通过
- 功能涉及：用户路径、跨模块协作、公共契约、数据正确性、权限、复杂规则、回归风险
- **不适用**：单行 typo、纯文档、无行为变更的改动

## Entry Contract（进入前置）

- 已存在 `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`
- 用户明确说「生成测试用例 / 生成 GDD 段 / 进入测试设计」
- 若 spec 缺关键决策 → 返回 blocking questions，不写半成品

## Process（骨架）

执行流程详见 `references/generation-prompt.md`，共 7 步：

1. Read Source → 2. Extract Initial Level Items → 3. Recursively Expand Children → 4. Consolidate Tree → 5. Generate Gates & Assertions → 6. Audit Cross-Layer Ownership → 7. Merge Redundant

Gate 能力字典见 `references/gate-capability-table.md`。

## Output

在 spec 文件**追加或更新** `## Gate Driven Development` 段（不另存新文件），格式见 generation-prompt.md 的 Output Format 节。

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

- [ ] **Step 2: 验证 frontmatter 合规**

Run:
```bash
grep -E '^name: gate-driven-test-design$' skills/gate-driven-test-design/SKILL.md
grep -E '^description: Use after brainstorming' skills/gate-driven-test-design/SKILL.md
```
Expected: 两条都命中

- [ ] **Step 3: 验证七段正文存在**

Run:
```bash
for s in "## Overview" "## When to Use" "## Entry Contract" "## Process" "## Output" "## Exit & Handoff" "## Rationalization Table"; do
  grep -q "$s" skills/gate-driven-test-design/SKILL.md && echo "OK: $s" || echo "MISSING: $s"
done
```
Expected: 7 行 OK

- [ ] **Step 4: Commit**

```bash
git add skills/gate-driven-test-design/SKILL.md
git commit -m "feat(gdd): 新增 gate-driven-test-design SKILL.md 骨架"
```

---

### Task 6: 改 brainstorming/SKILL.md 两处衔接

**Files:**
- Modify: `skills/brainstorming/SKILL.md:36-61`（Process Flow dot 图 + terminal state 段）

- [ ] **Step 1: 用 Edit 替换 Process Flow dot 图末段**

old_string（精确匹配 brainstorming/SKILL.md 第 55-58 行）：

```
    "Spec self-review\n(fix inline)" -> "User reviews spec?";
    "User reviews spec?" -> "Write design doc" [label="changes requested"];
    "User reviews spec?" -> "Invoke writing-plans skill" [label="approved"];
}
```

new_string：

```
    "Spec self-review\n(fix inline)" -> "User reviews spec?";
    "User reviews spec?" -> "Write design doc" [label="changes requested"];
    "User reviews spec?" -> "GDD step?" [label="approved"];
    "GDD step?" -> "Invoke gate-driven-test-design" [label="yes, user opts in"];
    "GDD step?" -> "Invoke writing-plans skill" [label="no, skip"];
    "Invoke gate-driven-test-design" -> "Invoke writing-plans skill";
}
```

同时需要在前面的节点声明区（第 42-46 行）新增 `"GDD step?"` 和 `"Invoke gate-driven-test-design"` 节点声明。

具体 old_string（第 46-47 行）：

```
    "User reviews spec?" [shape=diamond];
    "Invoke writing-plans skill" [shape=doublecircle];
```

new_string：

```
    "User reviews spec?" [shape=diamond];
    "GDD step?" [shape=diamond];
    "Invoke gate-driven-test-design" [shape=box];
    "Invoke writing-plans skill" [shape=doublecircle];
```

- [ ] **Step 2: 用 Edit 替换 terminal state 段（第 61 行）**

old_string：

```
**The terminal state is invoking writing-plans.** Do NOT invoke frontend-design, mcp-builder, or any other implementation skill. The ONLY skill you invoke after brainstorming is writing-plans.
```

new_string：

```
**The terminal state is invoking writing-plans.** Between design approval and writing-plans, you MAY optionally invoke superpowers:gate-driven-test-design when the user asks for test case generation or the feature carries non-trivial behavior/contract/regression risk. The ONLY skills you invoke after brainstorming are gate-driven-test-design (optional) and writing-plans (required). Do NOT invoke frontend-design, mcp-builder, or any other implementation skill.
```

- [ ] **Step 3: 验证 Process Flow 图含 GDD step 节点**

Run:
```bash
grep -c '"GDD step\?"' skills/brainstorming/SKILL.md
grep -c 'yes, user opts in' skills/brainstorming/SKILL.md
grep -c 'no, skip' skills/brainstorming/SKILL.md
```
Expected: 三条都 ≥ 1

- [ ] **Step 4: 验证 terminal state 含三要素**

Run:
```bash
grep -c 'superpowers:gate-driven-test-design' skills/brainstorming/SKILL.md
grep -c 'optional' skills/brainstorming/SKILL.md
grep -c 'writing-plans (required)' skills/brainstorming/SKILL.md
```
Expected: 三条都 ≥ 1

- [ ] **Step 5: 验证 checklist 八步未变**

Run:
```bash
grep -c -E '^[0-9]+\. \*\*' skills/brainstorming/SKILL.md
```
Expected: 至少 8（八步 checklist 完整）

- [ ] **Step 6: Commit**

```bash
git add skills/brainstorming/SKILL.md
git commit -m "feat(brainstorming): 衔接 GDD skill - Process Flow 分支 + terminal state 描述"
```

---

### Task 7: DoD 全量校验 + 干跑验证

**Files:**
- 无新增文件，仅运行校验命令和干跑

- [ ] **Step 1: DoD 第 1-6 条结构校验**

Run（应全部 OK）：
```bash
# DoD 1: SKILL.md frontmatter
grep -E '^name: gate-driven-test-design$' skills/gate-driven-test-design/SKILL.md && echo "DoD1a OK"
grep -E '^description: Use after brainstorming' skills/gate-driven-test-design/SKILL.md && echo "DoD1b OK"

# DoD 2: 七段正文
for s in "## Overview" "## When to Use" "## Entry Contract" "## Process" "## Output" "## Exit & Handoff" "## Rationalization Table"; do
  grep -q "$s" skills/gate-driven-test-design/SKILL.md && echo "DoD2 OK: $s" || echo "DoD2 FAIL: $s"
done

# DoD 3: 两表逐字照搬（与原文件 diff）
diff <(sed -n '38,54p' gdd-spec-prompt.md) <(sed -n '7,23p' skills/gate-driven-test-design/references/gate-capability-table.md) && echo "DoD3a OK (Gate Capability Table)"
diff <(sed -n '56,61p' gdd-spec-prompt.md) <(sed -n '25,30p' skills/gate-driven-test-design/references/gate-capability-table.md) && echo "DoD3b OK (Level Perspective Table)"

# DoD 4: generation-prompt.md 12 个具名 section
for s in "Level Item Rules" "Coverage Ownership Rules" "Read Source Material" "Extract Initial Level Items" "Recursively Expand Child Level Items" "Consolidate Level Item Tree" "Generate Gate Items And Assertions" "Audit Assertion Ownership" "Review And Merge Redundant Level Items" "Output Format" "Assertion Rules" "Blocking Output" "Self-Review"; do
  grep -q "$s" skills/gate-driven-test-design/references/generation-prompt.md && echo "DoD4 OK: $s" || echo "DoD4 FAIL: $s"
done

# DoD 5: brainstorming Process Flow 含 GDD step
grep -q '"GDD step\?"' skills/brainstorming/SKILL.md && grep -q 'yes, user opts in' skills/brainstorming/SKILL.md && grep -q 'no, skip' skills/brainstorming/SKILL.md && echo "DoD5 OK"

# DoD 6: brainstorming terminal state 三要素
grep -q 'superpowers:gate-driven-test-design' skills/brainstorming/SKILL.md && grep -q 'writing-plans (required)' skills/brainstorming/SKILL.md && echo "DoD6 OK"
```
Expected: 所有行 OK，无 FAIL

- [ ] **Step 2: DoD 第 7 条干跑 — 用本 spec 作为输入，调用 GDD skill 产出 GDD 段**

派一个 subagent，给它：
- 本设计 spec 文件路径：`docs/superpowers/specs/2026-06-18-gate-driven-test-design-design.md`
- GDD skill 三文件路径
- 指令：「按照 gate-driven-test-design skill 的流程，为本 spec 生成 `## Gate Driven Development` 段」

subagent 完成后，校验产出：
- [ ] 至少 1 个 L4 或 L3 Level Item（`#### L4-1` 或 `#### L3-1`）
- [ ] 至少 1 个 Gate Item（`- Gate：`）
- [ ] 至少 1 条 Assertion（`1.` 编号列表）
- [ ] PARENT_ID 链合法（ROOT 或上级 LevelItemID）

- [ ] **Step 3: DoD 第 8 条 blocking 验证**

派一个 subagent，给它：
- 故意缺决策的 spec 片段（如 Task 3 用的片段）
- GDD skill 三文件路径
- 指令：「按照 gate-driven-test-design skill 的流程，生成完整 GDD 段」

校验产出：
- [ ] 输出含 `gdd_result: blocked`
- [ ] 输出含 `blocking_questions:` 至少一条
- [ ] **未**写入 `## Gate Driven Development` 段

- [ ] **Step 4: 清理临时 baseline 记录（可选）**

如 `docs/superpowers/notes/2026-06-18-gdd-baseline-red.md` 不再需要，删除：
```bash
git rm docs/superpowers/notes/2026-06-18-gdd-baseline-red.md 2>/dev/null || true
```
如保留作参考，跳过此步。

- [ ] **Step 5: Commit 验证记录**

如产出了干跑 GDD 段样本，保存到 `docs/superpowers/notes/2026-06-18-gdd-dry-run-sample.md` 并提交：
```bash
git add docs/superpowers/notes/2026-06-18-gdd-dry-run-sample.md
git commit -m "docs(gdd): DoD 干跑验证 - GDD 段产出样本 + blocking 验证记录"
```

---

## Self-Review

**1. Spec coverage**（对照 spec 各节）：

| Spec 节 | 覆盖 Task |
|---------|----------|
| 背景与洞察 | 不需要实现 task（仅上下文） |
| 设计决策表 | 体现在 Task 1/4/5/6 的具体处理方式 |
| 架构调用链定位 | Task 6 改 brainstorming 衔接 |
| 文件结构三文件 | Task 1 + Task 4 + Task 5 |
| SKILL.md 骨架 | Task 5 |
| references 两份设计 | Task 1（gate-capability-table）+ Task 4（generation-prompt） |
| brainstorming 两处改动 | Task 6 |
| 范围切分 | Task 7 干跑验证覆盖范围内 DoD 7/8 |
| 风险与缓解 | 体现在 generation-prompt.md 的 Blocking Output + Self-Review（Task 4） |
| 验证策略 RED/GREEN/REFACTOR | Task 2/3 是 RED baseline；GREEN/REFACTOR 在 Out of Scope（contract 已声明） |

**2. Placeholder scan**：已检查，无 TBD/TODO，所有 code block 含完整内容。

**3. Type/naming consistency**：
- skill 目录名 `gate-driven-test-design` 在所有 task 中一致
- 三个文件名 `SKILL.md` / `references/gate-capability-table.md` / `references/generation-prompt.md` 一致
- brainstorming 改动的节点名 `"GDD step?"` 与 `"Invoke gate-driven-test-design"` 在 Task 6 的 old/new string 中一致
- frontmatter `name: gate-driven-test-design` 与调用方 `superpowers:gate-driven-test-design` 命名一致

**4. Contract 对齐**：
- DoD 1 → Task 5 Step 2
- DoD 2 → Task 5 Step 3
- DoD 3 → Task 1 Step 3 + Task 7 Step 1
- DoD 4 → Task 4 Step 3 + Task 7 Step 1
- DoD 5 → Task 6 Step 3 + Task 7 Step 1
- DoD 6 → Task 6 Step 4 + Task 7 Step 1
- DoD 7 → Task 7 Step 2
- DoD 8 → Task 7 Step 3

无 spec 遗漏，无 contract 遗漏。
