# Sprint Contract: harness-design DESIGN.md 生成能力

## Definition of Done
- [ ] `skills/harness-design/references/design-md-spec.md` 已创建，包含：YAML frontmatter 结构（colors / typography / rounded / spacing / components）、9 个 section 模板、从 HTML 提取 token 的生成流程指令
- [ ] `skills/harness-design/SKILL.md` 5 处改动到位：前置问询、协议补充（Step 5 模板后）、路由表新增行、工作流末尾新增步骤、核心提醒新增一条
- [ ] `brand-spec.md` 模板内容未被修改（保持原有资产采集角色）
- [ ] 不涉及品牌时（无 brand-spec.md），DESIGN.md 仍可从 HTML 代码独立生成
- [ ] SKILL.md frontmatter description 更新，包含 DESIGN.md 生成能力关键词

## Boundary Conditions
- Must support: 有 brand-spec.md 和无 brand-spec.md 两种场景
- Must not break: 现有 HTML 生成流程、brand-spec.md 资产协议、现有 references 路由表
- Performance: 无性能影响（纯 markdown 文本生成）

## Acceptance Criteria
- Computational: `references/design-md-spec.md` 文件存在且包含 9 个 section 标题
- Inferential: 人工 review SKILL.md 5 处改动是否位置正确、内容对齐 spec

## Negotiation Record
- Generator Round 1: 初始 4 条标准
- Evaluator Round 1: 挑战 C1 模糊、C3 超范围、C4 未在 spec 中、缺少"不破坏现有功能"标准
- Generator Round 2: 修订为 5 条，具体化 C1 的 YAML 字段，新增 C3（不涉及品牌场景）、C4（brand-spec 不变）、C5（frontmatter 更新）
- Evaluator Round 2: 接受，所有标准可二元验证
