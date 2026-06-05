# harness-design 集成 DESIGN.md 生成能力

> 日期：2026-06-05
> 状态：Approved
> 范围：增强 `skills/harness-design/` skill，使其在生成 HTML 原型时可选输出标准化的 DESIGN.md

## 背景

Google Stitch 提出了 DESIGN.md 规范——一种纯文本设计系统文档，AI agent 可以读取它来生成一致的 UI。DESIGN.md 与 AGENTS.md（告诉 AI 怎么构建）互补，专注于「项目应该看起来和感觉怎样」。

awesome-design-md 仓库（87.6k stars）已收录 50+ 品牌的 DESIGN.md 文件，形成了事实标准。

harness-design skill 目前有 `brand-spec.md` 作为品牌资产采集输出，但缺少面向消费端的设计系统标准化文档。本次增强填补这个空白。

## 设计决策

| 决策 | 选择 | 理由 |
|------|------|------|
| 触发方式 | 前期问询，用户确认后自动生成 | 不强制所有任务都输出，但让用户容易选择 |
| 规格级别 | 完整版 9 section + YAML frontmatter | 对齐 awesome-design-md 社区标准 |
| 与 brand-spec.md 关系 | 承接：brand-spec.md 是输入采集，DESIGN.md 是标准化输出 | 不破坏现有流程，在其上增值 |
| 生成方式 | 后处理：HTML 交付后从实际代码反向提取 token | 输出最准确（反映真实代码而非设计意图） |

## 改动范围

### 1. 新增 `references/design-md-spec.md`

DESIGN.md 生成模板和规范参考文件，包含：

- YAML frontmatter 标准结构（colors / typography / rounded / spacing / components）
- 9 个 markdown section 模板：
  1. Visual Theme & Atmosphere
  2. Color Palette & Roles
  3. Typography Rules
  4. Component Stylings
  5. Layout Principles
  6. Depth & Elevation
  7. Do's and Don'ts
  8. Responsive Behavior
  9. Agent Prompt Guide
- 生成指令（从 HTML 代码提取 token 的流程）
- Linear / Stripe 等示例引用（指向 awesome-design-md 仓库）

### 2. 修改 `SKILL.md`（5 处）

#### 2.1 前置问询（`references/workflow.md` 的需求确认阶段）

在工作流的需求明确阶段，增加一个标准问询项：

```
你是否需要我同步生成 DESIGN.md（设计系统规范文件）？
这个文件可以被其他 AI agent 读取，用来生成与本项目视觉风格一致的 UI。
```

#### 2.2 核心资产协议 Step 5 后补说明

在 `brand-spec.md` 模板末尾增加提示：

```
> 如果用户在需求确认阶段选择了生成 DESIGN.md，brand-spec.md 中的资产信息将作为 DESIGN.md 的输入之一。
> 不需要修改 brand-spec.md 的结构，它保持原有的资产采集角色。
```

#### 2.3 References 路由表新增一行

```
| **生成 DESIGN.md**（设计系统规范） | `references/design-md-spec.md` |
```

#### 2.4 工作流末尾新增步骤

在现有验证步骤之后，新增 DESIGN.md 生成步骤（仅当用户确认时执行）：

```markdown
### Step N · 生成 DESIGN.md（可选，用户确认时执行）

当用户在需求确认阶段选择生成 DESIGN.md 时，HTML 交付并验证完成后执行：

1. **读取 `references/design-md-spec.md`** 了解输出格式要求
2. **提取设计 token**（从实际 HTML 代码中反向提取）：
   - 颜色：从 CSS 变量 / Tailwind classes / inline styles 提取实际使用的 hex 值
   - 字体：从 `<link>` / `font-family` 提取字体栈
   - 圆角：从 `border-radius` / `rounded-*` 提取使用的半径值
   - 间距：从 padding / margin / gap 中提取规律性间距值
3. **合并 brand-spec.md 信息**：将品牌资产协议采集的品牌名、气质关键词、禁区等融入对应 section
4. **按 9 section 模板填充**：每个 section 基于实际设计决策描述，不写空话
5. **写入 `DESIGN.md`** 到项目目录（与 HTML 文件同级）

**质量标准**：
- YAML frontmatter 中每个 token 必须来自实际代码中存在的值，不凭空编造
- Component stylings 至少覆盖 5 个核心组件
- Do's and Don'ts 至少各 3 条，基于实际设计中的决策
- 总长度控制在 300-600 行（参考 Linear 548 行 / Stripe 487 行）
```

#### 2.5 核心提醒新增一条

```markdown
- **用户选择生成 DESIGN.md 时**：在 HTML 验证通过后执行后处理生成，token 从实际代码提取，品牌信息承接 brand-spec.md。
```

## 不做的事

- **不修改 brand-spec.md 的现有结构或流程**——它保持原有的资产采集角色
- **不添加自动化脚本**——DESIGN.md 生成由 agent 在对话中完成，不需要额外脚本
- **不改变现有 HTML 生成流程**——DESIGN.md 是附加输出，不影响主流程
- **不强制所有任务生成 DESIGN.md**——仅在用户确认时触发

## 文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `skills/harness-design/references/design-md-spec.md` | 新增 | DESIGN.md 规范模板和生成指令 |
| `skills/harness-design/SKILL.md` | 修改 | 5 处改动（问询/协议补充/路由表/工作流/提醒） |
