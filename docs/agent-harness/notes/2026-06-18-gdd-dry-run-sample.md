# GDD Dry-Run 验证样本

**日期**：2026-06-18
**对应 spec**：`docs/agent-harness/specs/2026-06-18-gate-driven-test-design-design.md`
**阶段**：DoD 第 7 条干跑（GDD 段产出）+ DoD 第 8 条 blocking 验证
**执行方式**：以 GDD skill 三文件为流程主体，按 7 步递归生成算法对 spec 跑一遍完整产出

---

## Part 1：DoD 第 7 条 — GDD 段产出（GREEN）

### 7 步执行摘要

1. **Read Source**：读完 design spec 全文（背景、设计决策表、架构调用链、文件结构、SKILL.md 骨架、references 设计、brainstorming 衔接改动、范围切分、风险与缓解、验证策略、文件清单）。
2. **Extract Initial Level Items**：从「风险显著性」出发，识别出 GDD skill 自身的行为契约（输出格式正确、blocking 真触发、brainstorming 衔接不破）三类顶层风险，分别落 L4 / L3 / L2。
3. **Recursively Expand Children**：每个顶层 item 向下展开「为让父项成立，子项必须满足什么」，得到 L3、L2、L1 后代。
4. **Consolidate Tree**：稳定 ID、PARENT_ID 合法、合并重复。
5. **Generate Gates & Assertions**：按层级匹配 Gate、写有序断言。
6. **Audit Cross-Layer Ownership**：检查同一业务点是否多 Gate 证明同一 oracle，下沉 / 合并。
7. **Merge Redundant**：自检五问通过，写入 GDD 段。

### 产出：`## Gate Driven Development` 段（应追加到 spec 文件，本笔记仅存样本）

```markdown
## Gate Driven Development

### ROOT

GDD skill 是 brainstorming 与 writing-plans 之间的可选递归测试设计层。从已批准设计 spec 出发，按风险显著性提取 Level Items（L1-L4），递归向下展开得到树状测试覆盖结构，输出为 spec 内的 `## Gate Driven Development` 段；缺关键决策时必须 blocking，不写半成品。

### Level Items

#### L4-1

PARENT_ID：ROOT
视角下的需求：agent 调用 GDD skill 后，能对一份已批准的设计 spec 完整产出符合 Output Format 的 `## Gate Driven Development` 段，作为下游 writing-plans 的输入。
Gate Items：

- Gate：`e2e gate`
  Covers：GDD skill 从被触发到产出 spec 段的完整调用链
  Assertions：
  1. 给定一份完整、已批准的设计 spec 与三份 GDD skill 文件，agent 产出包含 `### ROOT`、`### Level Items`、`PARENT_ID`、`Gate Items`、`Assertions` 五要素的 GDD 段
  2. 产出的 GDD 段中至少存在一个 L4 或 L3 Level Item，且至少有一个 Gate Item 与一条编号断言

#### L3-1

PARENT_ID：L4-1
视角下的需求：GDD skill 的 Output Format 必须与 generation-prompt.md 定义的结构逐字一致，保证下游 writing-plans 能解析 GDD 段、并把每条 assertion 映射到 plan task。
Gate Items：

- Gate：`contract gate`
  Covers：generation-prompt.md 的 Output Format 与 agent 实际产出之间的结构契约
  Assertions：
  1. 每个 Level Item 都有形如 `#### L<n>-<m>` 的标题与 `PARENT_ID：` 字段
  2. PARENT_ID 取值为 `ROOT` 或上游 LevelItemID（如 `L4-1`），不出现悬空引用
  3. 每个 Gate Item 形如 `- Gate：\`<gate-name> gate\``，其下有 `Covers：` 与 `Assertions：` 两行
  4. 断言以有序数字列表 `1. 2. 3.` 形式出现，可被 grep `\d+\.` 命中

#### L3-2

PARENT_ID：L4-1
视角下的需求：brainstorming skill 的 Process Flow 必须正确衔接 GDD —— opt-in 而非自动触发，且 terminal state 描述明确「gate-driven-test-design (optional) + writing-plans (required)」。
Gate Items：

- Gate：`contract gate`
  Covers：brainstorming SKILL.md 中 GDD step 分支节点与 terminal state 描述
  Assertions：
  1. brainstorming SKILL.md 的 Process Flow 图中存在 `"GDD step?"` 节点，且其出边分别标注 `yes, user opts in`（指向 Invoke gate-driven-test-design）与 `no, skip`（指向 Invoke writing-plans）
  2. terminal state 段落同时出现 `agent-harness:gate-driven-test-design` 与 `writing-plans (required)` 两处字面量，禁止把 GDD 写成 required

#### L3-3

PARENT_ID：L4-1
视角下的需求：GDD skill 三文件结构（SKILL.md + gate-capability-table.md + generation-prompt.md）必须真实存在且各自承担设计职责，不能出现 frontmatter 缺失、references 路径断裂。
Gate Items：

- Gate：`config gate`
  Covers：skill 目录结构与 frontmatter 完整性
  Assertions：
  1. `skills/gate-driven-test-design/SKILL.md` frontmatter 同时含 `name: gate-driven-test-design` 与以 `Use after brainstorming` 开头的 description
  2. `skills/gate-driven-test-design/references/gate-capability-table.md` 与 `generation-prompt.md` 均存在且非空
  3. SKILL.md 正文出现 7 段：`## Overview`、`## When to Use`、`## Entry Contract`、`## Process`、`## Output`、`## Exit & Handoff`、`## Rationalization Table`

#### L2-1

PARENT_ID：L3-1
视角下的需求：generation-prompt.md 的 7 步算法（Read Source / Extract Initial / Recursively Expand / Consolidate / Generate Gates / Audit Ownership / Merge Redundant）必须完整保留，否则 agent 在执行时会跳步、产出半成品树。
Gate Items：

- Gate：`unit gate`
  Covers：generation-prompt.md 中 13 个具名 section 是否齐全
  Assertions：
  1. grep 命中 `Level Item Rules`、`Coverage Ownership Rules`、`Read Source Material`、`Extract Initial Level Items`、`Recursively Expand Child Level Items`、`Consolidate Level Item Tree`、`Generate Gate Items And Assertions`、`Audit Assertion Ownership`、`Review And Merge Redundant Level Items`、`Output Format`、`Assertion Rules`、`Blocking Output`、`Self-Review` 全部 13 个 section 标题

#### L2-2

PARENT_ID：L3-1
视角下的需求：Blocking Output 段必须真实存在且语义可被 agent 触发 —— 当 spec 缺关键决策时返回 `gdd_result: blocked` 与 `blocking_questions:`，而不是写半成品 GDD 段。
Gate Items：

- Gate：`unit gate`
  Covers：generation-prompt.md 的 Blocking Output 规则
  Assertions：
  1. generation-prompt.md 含字面量 `gdd_result: blocked`、`blocking_questions:`、`why_it_blocks_assertions:`
  2. SKILL.md 的 Entry Contract 与 Rationalization Table 中都出现「blocking」「不写半成品」表述，形成双锚定

#### L2-3

PARENT_ID：L3-1
视角下的需求：Gate 能力字典逐字照搬自 `gdd-spec-prompt.ai.md`（原 `gdd-spec-prompt.md` 草案），不增不减，保证静态字典的准确性。
Gate Items：

- Gate：`unit gate`
  Covers：gate-capability-table.md 与源文件之间的 0 偏差
  Assertions：
  1. Gate Capability Table 15 行表体（e2e / smoke / release / observability / integration / contract / schema / config / migration / unit / fixture / property / type-check / lint / build）与源文件 `gdd-spec-prompt.ai.md` 第 38-54 行 diff 为空
  2. Level Perspective Table 6 行表体（header + 分隔 + L4/L3/L2/L1 四行）与源文件 `gdd-spec-prompt.ai.md` 第 56-61 行 diff 为空

#### L1-1

PARENT_ID：L2-1
视角下的需求：generation-prompt.md 中具名 section 标题拼写稳定，便于上层断言用 grep 精确命中。
Gate Items：

- Gate：`lint gate`
  Covers：section 标题字面量与上层 grep 模式的一致性
  Assertions：
  1. 13 个 section 标题在文件中唯一出现，没有重复拼写 / 大小写漂移

#### L1-2

PARENT_ID：L2-3
视角下的需求：gate-capability-table.md 顶部有「逐字照搬」声明，作为静态字典的来源标记，防止后续误改。
Gate Items：

- Gate：`lint gate`
  Covers：reference 文件顶部的来源声明
  Assertions：
  1. gate-capability-table.md 第 3 行附近出现 `逐字照搬` 与 `gdd-spec-prompt` 字样，明确这是静态字典
```

### 结构校验

- 至少 1 个 L4 或 L3：`#### L4-1`、`#### L3-1`、`#### L3-2`、`#### L3-3` —— 通过
- 至少 1 个 Gate Item（`- Gate：`）：每个 Level Item 下都有 ≥1 个 —— 通过
- 至少 1 条 Assertion（编号 `1.`）：每条 Gate Item 下都至少 1 条 —— 通过
- PARENT_ID 链合法：ROOT → L4-1 → L3-1/L3-2/L3-3 → L2-1/L2-2/L2-3 → L1-1/L1-2，全部为 ROOT 或上游 LevelItemID，无悬空 —— 通过

---

## Part 2：DoD 第 8 条 — Blocking 验证

**测试输入**：故意缺关键决策的 spec 片段（如下，仿 baseline-red 中的登录 spec，但去掉了 success-path 行为描述）。

```
# 登录功能设计 spec（残缺片段）

用户输入邮箱+密码，后端校验后返回某种凭证。
错误场景：邮箱为空、密码错误、账号锁定。

（未声明：成功时返回什么类型的 token？JWT 还是 session？
未声明：账号锁定后是否可解锁？解锁条件？
未声明：返回的凭证有效期多长？是否需要刷新？）
```

**应用 GDD 7 步流程**：

1. Read Source —— 读完上述残缺片段
2. Extract Initial Level Items —— 试图立 L4「用户登录成功路径可达 + 返回凭证可被后续受保护资源识别」时发现：
   - 设计 spec 只说「返回某种凭证」，没说 JWT 还是 session
   - 没说凭证有效期、刷新机制
   - 没说账号锁定后是否可解锁
3. 触发 Blocking Output（缺决策 → 不写半成品，按 generation-prompt.md 的 Blocking Output 段要求返回结构化结果）

**Blocking 输出**（按 generation-prompt.md 第 263-272 行的格式）：

```text
gdd_result: blocked
blocking_questions:
- 成功登录时后端返回的凭证类型是什么？JWT 还是 session cookie？该凭证包含哪些 claim / scope？
- 账号锁定是永久还是可恢复？若可恢复，解锁条件（时间窗口 / 管理员操作 / 验证码）是什么？锁定状态下是否仍允许尝试登录（用于触发额外告警）？
- 凭证有效期与刷新策略？是否支持 refresh token、滑动续期、单设备登出？
- 后续受保护资源如何验证该凭证（中间件 / 远程校验 / 本地签名验证）？这决定 L3-1 的 contract gate 断言能否成立。
why_it_blocks_assertions:
- L4「登录成功路径可达」的 e2e gate 第一条断言（用户从登录页拿到凭证后能用凭证访问受保护资源）无法写出——不知凭证形态就无法断言「访问」是否成功。
- L3 contract gate 断言（凭证结构与字段）无法写出——凭证类型未定。
- L2 unit gate 断言（锁定/解锁状态机）无法写出——状态机未定义。
```

### 结构校验

- 输出含 `gdd_result: blocked` —— 通过
- 输出含 `blocking_questions:` 至少一条（共 4 条）—— 通过
- **未**写入 `## Gate Driven Development` 段（上述输出全程未出现该 markdown 标题）—— 通过

---

## Part 3：DoD 1-6 结构校验汇总

| DoD | 检查 | 结果 |
|-----|------|------|
| 1a | `grep -E '^name: gate-driven-test-design$' SKILL.md` | OK |
| 1b | `grep -E '^description: Use after brainstorming' SKILL.md` | OK |
| 2 | 七段正文（Overview / When to Use / Entry Contract / Process / Output / Exit & Handoff / Rationalization Table）全 OK | OK ×7 |
| 3a | Gate Capability Table 与 `gdd-spec-prompt.ai.md` 第 38-54 行 diff 为空 | OK |
| 3b | Level Perspective Table 6 行表体与 `gdd-spec-prompt.ai.md` 第 56-61 行 diff 为空 | OK |
| 4 | generation-prompt.md 13 个具名 section 全部 grep 命中 | OK ×13 |
| 5 | brainstorming Process Flow 含 `"GDD step?"` + `yes, user opts in` + `no, skip` | OK |
| 6 | brainstorming terminal state 含 `agent-harness:gate-driven-test-design` + `writing-plans (required)` | OK |

**8/8 DoD 全部通过。**

---

## Part 4：清理策略

`docs/agent-harness/notes/2026-06-18-gdd-baseline-red.md` 记录了 RED 阶段的 unguided agent 典型失败模式（一上来就写 unit、错误码平铺），对后续 GDD 调优、Rationalization Table 漏洞补强有直接参考价值。**保留**作历史参考，不删除。

---

## Self-Review（本笔记写入前的五问自检）

1. 每个 Level Item 是否能追溯到 design spec 的具体段？
   - L4-1 / L3-1 / L3-3 / L2-1 / L2-3 / L1-2 → 直接对应 spec 的「文件结构」「SKILL.md 骨架」「references 设计」段
   - L3-2 → 对应 spec 的「brainstorming skill 衔接改动」段（改动 1 + 改动 2）
   - L2-2 → 对应 spec 的「设计决策表」「风险与缓解」段
   - L1-1 → 对应 spec 的「references 设计 / generation-prompt.md」段（13 section 译化）
   - 全部可追溯，无凭空发明。
2. 是否有 Level Item 只是在复述父项？
   - L1-1 / L1-2 是 L2 级静态约束的细化，不与 L2-1 / L2-3 重复 —— 通过。
3. 同一业务点是否有多个 Gate 证明同一 oracle？
   - L4-1 与 L3-1 都谈「产出 GDD 段」，但 L4-1 是「路径可达」、L3-1 是「结构契约」，failure mode 不同 —— 通过。
4. L4 e2e 是否在穷举错误码/字段矩阵？
   - L4-1 只两条断言，全是路径级 —— 通过。
5. 有没有凭空发明的行为/字段/状态？
   - 所有断言都能映射到 spec 字面量（15 Gate、13 section、7 段正文、GDD step 节点等）—— 通过。

任一项均通过，写入本笔记。
