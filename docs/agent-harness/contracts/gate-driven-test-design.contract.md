# Sprint Contract: gate-driven-test-design skill

## Definition of Done

- [ ] `skills/gate-driven-test-design/SKILL.md` 存在且 frontmatter `name: gate-driven-test-design`、`description` 以 "Use when..." 开头、第三方、不含流程摘要（对照 writing-skills CSO 原则）
- [ ] `skills/gate-driven-test-design/SKILL.md` 正文含 Overview / When to Use / Entry Contract / Process 骨架 / Output / Exit & Handoff / Rationalization Table 七段
- [ ] `skills/gate-driven-test-design/references/gate-capability-table.md` 逐字照搬 `gdd-spec-prompt.md` 的 Gate Capability Table（15 行）+ L1-L4 视角表（4 行）
- [ ] `skills/gate-driven-test-design/references/generation-prompt.md` 含以下具名 section：Read Source Material / Extract Initial Level Items / Recursively Expand Child Level Items / Consolidate Level Item Tree / Generate Gate Items And Assertions / Audit Assertion Ownership / Review And Merge Redundant Level Items / Output Format / Assertion Rules / Blocking Output / Coverage Ownership Rules / Self-Review
- [ ] `skills/brainstorming/SKILL.md` 的 Process Flow 图含节点 `GDD step?`，分支标签含 `yes, user opts in` 与 `no, skip`
- [ ] `skills/brainstorming/SKILL.md` 的 terminal state 段落含 `agent-harness:gate-driven-test-design` 全名 + "optional" 字样 + 仍保留 "writing-plans (required)"
- [ ] 干跑验证：以本 spec 为输入，调用 GDD skill 产出结构合法的 `## Gate Driven Development` 段（至少 1 个 L4 或 L3 Level Item + 至少 1 个 Gate Item + 至少 1 条 Assertion）
- [ ] blocking 验证：构造缺关键决策的 spec 片段，调用 GDD skill 返回 `gdd_result: blocked`，不写半成品段

## Boundary Conditions

- Must support: 从任意已批准 design spec 递归生成测试覆盖树
- Must not break: 现有 brainstorming 主流程（checklist 八步不变）
- Must not break: 现有 writing-plans / test-driven-development 调用
- Performance: GDD skill 本身不引入脚本依赖，纯 markdown 指令

## Acceptance Criteria

- Computational: `ls skills/gate-driven-test-design/{SKILL.md,references/gate-capability-table.md,references/generation-prompt.md}` 三文件齐全
- Computational: `grep -c "Use when" skills/gate-driven-test-design/SKILL.md` ≥ 1
- Computational: `grep "GDD step\?" skills/brainstorming/SKILL.md` 命中
- Inferential: 人工 diff 审查 brainstorming 的两处改动是否最小侵入
- Inferential: 干跑产出的 `## Gate Driven Development` 段格式是否匹配 generation-prompt.md 的 Output Format
- Inferential: blocking 验证是否真的拒绝写半成品

## Negotiation Record

- Generator Round 1：列出 7 条粗 DoD（文件存在 + 两表 + 7 步 + 改 brainstorming + 保留原文件）
- Evaluator Round 1：挑战 7 条——frontmatter 不可证伪、照搬未声明"逐字"、7 步未列名、改对未定义、缺功能验证、缺负面验证、保留原文件不算 DoD
- Generator Round 2：每条改为 yes/no 可判，补干跑验证 + blocking 验证，section 全列名，照搬声明"逐字"
- Evaluator Round 2：接受，所有 criterion 覆盖结构/内容/功能/负面四维

## Out of Scope

- TDD baseline / GREEN / REFACTOR 完整压力测试（后续独立 task）
- demo/fruit-shop 实战验证（后续独立 task）
- 上游 PR 同步（fork 定制，不回 PR）
