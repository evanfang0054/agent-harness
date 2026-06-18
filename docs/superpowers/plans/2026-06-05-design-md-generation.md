# harness-design DESIGN.md 生成能力 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 harness-design skill 集成标准化 DESIGN.md 输出能力，使其在用户确认后能从生成的 HTML 代码反向提取设计 token，输出符合 awesome-design-md 社区标准的 DESIGN.md 文件。

**Architecture:** 新增 `references/design-md-spec.md` 作为生成模板和规范参考；在 SKILL.md 5 个位置注入 DESIGN.md 相关指令（frontmatter description / 前置问询 / 协议 Step 5 补充 / 路由表 / 工作流末尾步骤 / 核心提醒）。不修改 brand-spec.md 模板本身，保持原有资产采集角色。

**Tech Stack:** Markdown（skill 内容），YAML frontmatter（DESIGN.md 结构）

**Spec:** `docs/superpowers/specs/2026-06-05-design-md-generation-design.md`
**Contract:** `docs/superpowers/contracts/design-md-generation.contract.md`

---

## File Structure

| 文件 | 操作 | 责任 |
|------|------|------|
| `skills/harness-design/references/design-md-spec.md` | 新增 | DESIGN.md 标准模板（9 section + YAML frontmatter）+ 从 HTML 提取 token 的生成指令 |
| `skills/harness-design/SKILL.md` | 修改 | 5 处改动，使 DESIGN.md 生成成为 skill 工作流的可选部分 |

---

## Task 1: 创建 references/design-md-spec.md

**Files:**
- Create: `skills/harness-design/references/design-md-spec.md`

- [ ] **Step 1: 创建 design-md-spec.md 文件骨架（YAML frontmatter + 9 section 标题）**

写入以下内容到 `skills/harness-design/references/design-md-spec.md`：

```markdown
# DESIGN.md 规范与生成指南

> 本文件是 harness-design skill 生成 DESIGN.md 的权威模板。
> DESIGN.md 是一种纯文本设计系统文档，遵循 Google Stitch 提出的规范，
> 对齐 awesome-design-md 仓库（https://github.com/VoltAgent/awesome-design-md）的社区标准。
>
> 它可以被其他 AI agent 读取，用来生成与本项目视觉风格一致的 UI。
> 与 AGENTS.md（告诉 AI 怎么构建）互补，DESIGN.md 告诉 AI 项目应该看起来和感觉怎样。

## 标准结构

每个 DESIGN.md 必须包含两个部分：

1. **YAML frontmatter**（结构化 token，机器可读）
2. **9 个 markdown section**（人类可读的设计决策描述）

---

## YAML Frontmatter 标准

```yaml
---
name: <项目/品牌名>
description: <一句话设计哲学>
colors:
  - name: <语义名 e.g. canvas>
    hex: "#XXXXXX"
  - name: <语义名 e.g. primary>
    hex: "#XXXXXX"
  - name: <语义名 e.g. accent>
    hex: "#XXXXXX"
typography:
  - role: display
    fontFamily: "<font stack>"
    fontSize: "<e.g. 80px>"
    fontWeight: <number>
    lineHeight: <number>
    letterSpacing: "<e.g. -0.03em>"
  - role: body
    fontFamily: "<font stack>"
    fontSize: "<e.g. 16px>"
    fontWeight: <number>
    lineHeight: <number>
rounded:
  - name: <e.g. sm>
    value: "<e.g. 6px>"
  - name: <e.g. md>
    value: "<e.g. 12px>"
  - name: <e.g. full>
    value: "9999px"
spacing:
  - name: <e.g. xs>
    value: "<e.g. 4px>"
  - name: <e.g. md>
    value: "<e.g. 24px>"
components:
  - name: <e.g. Button>
    backgroundColor: "<hex>"
    textColor: "<hex>"
    typography: <引用 typography role>
    rounded: <引用 rounded name>
    padding: "<e.g. 12px 24px>"
---
```

---

## 9 个 Markdown Section 模板

### 1. Visual Theme & Atmosphere

描述项目的整体视觉气质和氛围。3-5 句话。

**必须回答**：
- 整体视觉印象是什么？（暗色/亮色/渐变/材质）
- 想传达的情绪是什么？（专业/活泼/安静/未来感）
- 一句话总结这个设计语言的"灵魂"

### 2. Color Palette & Roles

列出所有实际使用的颜色及其语义角色。

**必须包含**：表格列出每个颜色的语义名、hex 值、用途、使用比例。
**数据来源**：从 HTML 实际代码（CSS 变量 / Tailwind classes / inline styles）反向提取，不凭空编造。

### 3. Typography Rules

描述字体层级和使用规则。

**必须包含**：
- 字体栈（Display / Body / Mono）
- 完整字号层级（H1-H6 / Body / Caption / Code）
- 字重、行高、字间距的具体数值
- 特殊规则（如 tabular figures / 特定语言切换 / 数字字体）

### 4. Component Stylings

每个核心组件的视觉规格。

**质量标准**：至少覆盖 5 个核心组件（如 Button / Input / Card / Nav / Modal）。
每个组件包含：背景色、文字色、圆角、内边距、边框、阴影、状态（hover / active / disabled）。

### 5. Layout Principles

布局哲学和栅格系统。

**必须包含**：
- 栅格系统（列数 / gutter / max-width）
- 页面级布局模式（如左 fixed + 右 fluid / 居中容器）
- 关键间距尺度
- 内容如何组织（F 型 / Z 型 / 卡片网格）

### 6. Depth & Elevation

阴影、层级、深度的使用规则。

**必须包含**：
- 阴影层级（至少 3 级：subtle / default / prominent）
- 何时使用阴影 vs 边框
- z-index 使用规则

### 7. Do's and Don'ts

**质量标准**：Do 和 Don't 各至少 3 条，必须基于实际设计中的决策（不写空话）。

格式：
- ✅ Do: <具体规则> —— <原因>
- ❌ Don't: <具体规则> —— <原因>

### 8. Responsive Behavior

响应式策略。

**必须包含**：
- 断点定义
- 移动端 vs 桌面端的核心差异（不只是「缩小」）
- 触摸交互 vs 鼠标交互的差异

### 9. Agent Prompt Guide

给 AI agent 的"如何用本文件生成 UI"的指引。

模板：
```
当基于本 DESIGN.md 生成 UI 时：
1. 优先使用 YAML frontmatter 中定义的 colors / typography / rounded / spacing token
2. 遵循 Component Stylings 中定义的组件规格
3. 触碰不在本文件中的新设计决策时，参考 Do's and Don'ts 决定方向
4. 输出前对照 Visual Theme & Atmosphere 检查整体气质一致性
```

---

## 从 HTML 反向提取 Token 的流程

### Step A · 提取颜色

从实际 HTML 代码中提取颜色：

```bash
# 从 HTML/CSS 文件提取所有 hex 值，按出现频次排序
grep -hoE '#[0-9A-Fa-f]{6}' <html-files> | sort | uniq -c | sort -rn | head -20
```

**角色映射规则**：
- 出现频次最高 + 大面积使用 → canvas / background
- 品牌资产协议采集的 primary 色值 → primary
- 强调色 / CTA → accent
- 文字色（深色）→ ink / foreground
- 文字色（浅色，用于深底）→ muted

### Step B · 提取字体

从 HTML 代码中提取字体栈：

```bash
# 从 link 标签和 font-family 提取
grep -hoE 'font-family:[^;"]+' <html-files> | sort -u
grep -hoE 'family=[^&"]+' <html-files> | sort -u
```

**层级推断**：
- 最大字号 + 高字重 → display
- 正文默认 → body
- 等宽字体（如 JetBrains Mono / SF Mono）→ mono

### Step C · 提取圆角

```bash
grep -hoE 'border-radius:[^;"]+' <html-files> | sort | uniq -c | sort -rn
grep -hoE 'rounded-(sm|md|lg|xl|full|2xl|3xl)' <html-files> | sort | uniq -c | sort -rn
```

### Step D · 提取间距

从 padding / margin / gap 中找规律：

```bash
grep -hoE '(padding|margin|gap):\s*[^;"]+' <html-files> | sort | uniq -c | sort -rn | head -10
```

将常见值归类为 t-shirt 尺度（xs / sm / md / lg / xl）。

### Step E · 提取组件规格

挑出 5+ 核心组件，从其 JSX / CSS 中读取实际样式值（背景色、文字色、圆角、padding 等），填入 components 字段。

---

## 质量标准（自检清单）

生成 DESIGN.md 后必须逐项核对：

- [ ] YAML frontmatter 中每个 hex 值都来自实际 HTML 代码，不凭空编造
- [ ] typography 至少包含 display / body / mono 三个 role
- [ ] Component stylings 至少覆盖 5 个核心组件
- [ ] Do's 和 Don'ts 各至少 3 条，每条带原因
- [ ] 总长度控制在 300-600 行（参考 Linear 548 行 / Stripe 487 行）
- [ ] 不写空话（如"现代/优雅"等无信息量形容词）

---

## 示例引用

完整 DESIGN.md 示例可参考 awesome-design-md 仓库：
- Linear: `design-md/linear/DESIGN.md`（548 行，深色 + 紫蓝 accent，21 个组件定义）
- Stripe: `design-md/stripe/DESIGN.md`（487 行，渐变 mesh + indigo，15 个组件定义）
- 仓库地址：https://github.com/VoltAgent/awesome-design-md

---

## 生成时机

DESIGN.md 在以下条件下生成：
1. 用户在需求确认阶段明确选择「生成 DESIGN.md」
2. HTML 已交付并通过验证（不是 hi-fi 还没做完就提前生成）

不适用场景：
- 用户明确说"不要"
- 纯动画 / 纯幻灯片任务（这些不是 UI 系统，DESIGN.md 没有意义）
- 未完成 placeholder 大量存在时（先补完，再生成）
```

- [ ] **Step 2: 验证文件已创建且包含 9 个 section 标题**

运行：
```bash
grep -c "^### [0-9]\." /Users/arwen/Desktop/Arwen/evanfang/superpowers/skills/harness-design/references/design-md-spec.md
```
Expected: `9`

- [ ] **Step 3: 提交**

```bash
git add skills/harness-design/references/design-md-spec.md
git commit -m "feat(harness-design): 新增 DESIGN.md 规范模板和生成指南"
```

---

## Task 2: 修改 SKILL.md frontmatter description

**Files:**
- Modify: `skills/harness-design/SKILL.md:3`

- [ ] **Step 1: 在 frontmatter description 末尾追加 DESIGN.md 能力关键词**

在现有 description 文本最后一段（"**交付后可选**：专家级 5 维度评审..."）之后、`---` 之前，追加：

```
**可选输出 DESIGN.md**：用户确认后在 HTML 交付并验证通过时，从实际代码反向提取颜色/字体/圆角/间距 token，输出符合 awesome-design-md 社区标准的设计系统规范文件（9 section + YAML frontmatter），可被其他 AI agent 读取生成风格一致 UI。
```

- [ ] **Step 2: 验证 frontmatter 仍为单行（无换行破坏）**

运行：
```bash
awk '/^---$/{n++; next} n==1{print}' /Users/arwen/Desktop/Arwen/evanfang/superpowers/skills/harness-design/SKILL.md | wc -l
```
Expected: `1`（frontmatter 中间不应有多行）

- [ ] **Step 3: 不单独提交，与 Task 3-6 一起提交**

---

## Task 3: 在核心资产协议 Step 5 模板后添加 DESIGN.md 提示

**Files:**
- Modify: `skills/harness-design/SKILL.md:260`（在 `### 气质关键词` 块结束后、代码块 ``` 之后）

- [ ] **Step 1: 在 brand-spec.md 模板代码块（```）结束后、下一个"写完 spec 后的执行纪律"标题之前，插入提示段落**

定位：SKILL.md 中 `### 气质关键词` 下方的 `- <3-5 个形容词>` 紧接着 ``` 结束代码块的那一行之后。

在 `\n` 之后的「**写完 spec 后的执行纪律（硬要求）**：」之前插入：

```markdown

> **与 DESIGN.md 的关系**：如果用户在需求确认阶段选择了生成 DESIGN.md，`brand-spec.md` 中采集的品牌名、气质关键词、禁区等信息将作为 DESIGN.md 对应 section 的输入。`brand-spec.md` 结构保持不变，仍是品牌资产的采集载体——DESIGN.md 是消费端的设计系统文档，由 agent 在 HTML 验证通过后从实际代码反向提取 token 生成。详见 `references/design-md-spec.md`。
```

- [ ] **Step 2: 不单独提交，与 Task 2、4-6 一起提交**

---

## Task 4: 在 References 路由表新增一行

**Files:**
- Modify: `skills/harness-design/SKILL.md:745-764`（References 路由表区域）

- [ ] **Step 1: 在路由表「输出完后验证」行之前插入 DESIGN.md 行**

定位 SKILL.md 中 References 路由表的这一行：
```
| 输出完后验证 | `references/verification.md` + `scripts/verify.py` |
```

在其**前面**插入新行：
```
| **生成 DESIGN.md**（设计系统规范，可选） | `references/design-md-spec.md` |
```

- [ ] **Step 2: 不单独提交，与 Task 2-3、5-6 一起提交**

---

## Task 5: 在工作流末尾新增「生成 DESIGN.md」步骤

**Files:**
- Modify: `skills/harness-design/SKILL.md`（在 References 路由表之前、跨 Agent 环境适配说明之前）

- [ ] **Step 1: 找到 SKILL.md 中 References 路由表前的位置**

References 路由表的开头是 `## References路由表`。在这一行**之前**（前面是「## 跨 Agent 环境适配说明」之前的内容或工作流相关内容），插入新 section。

由于 SKILL.md 没有显式的「Step N · 验证」标题，定位到 `## References路由表` 之前，插入一个新的二级 section。

在 `## References路由表` 这一行之前插入：

```markdown
## 工作流末尾 · 生成 DESIGN.md（可选 · 用户确认时执行）

**触发条件**：用户在需求确认阶段回答「是否需要生成 DESIGN.md」时选择「是」。
**不触发的场景**：纯动画任务、纯幻灯片任务、用户明确说"不需要"、HTML 仍含大量 placeholder 未完成。

### 执行步骤

1. **读取 `references/design-md-spec.md`** 了解完整输出格式和质量标准

2. **从 HTML 代码反向提取 token**（不凭记忆，必须实际读代码）：
   - 颜色：`grep -hoE '#[0-9A-Fa-f]{6}' <html文件>` 按频次排序，过滤黑白灰，映射语义角色
   - 字体：从 `<link>` 标签和 `font-family` 提取字体栈，按字号层级推断 display / body / mono
   - 圆角：从 `border-radius` 和 `rounded-*` Tailwind classes 提取使用频次
   - 间距：从 padding / margin / gap 中提取规律性值，归类为 t-shirt 尺度
   - 组件：挑出 5+ 核心组件（Button / Card / Input / Nav / Modal 等），读取实际样式

3. **合并 brand-spec.md 信息**（如存在）：
   - 品牌名 → frontmatter `name` + Section 1 标题
   - 气质关键词 → Section 1「Visual Theme & Atmosphere」
   - 禁区 → Section 7「Don'ts」
   - 品牌色值 → 与从代码提取的色值交叉验证（如有冲突，以代码实际值为准，差异处加注释）

4. **按 9 section 模板填充**，每个 section 基于实际设计决策描述，不写空话

5. **写入 `DESIGN.md`** 到项目目录（与 HTML 文件同级，不要写到 `assets/` 或 `~/Downloads`）

### 质量自检（生成后必须执行）

- [ ] YAML frontmatter 中每个 hex 值都来自实际 HTML 代码
- [ ] typography 至少包含 display / body / mono 三个 role
- [ ] Component stylings 至少覆盖 5 个核心组件
- [ ] Do's 和 Don'ts 各至少 3 条，每条带原因
- [ ] 总长度 300-600 行

不达标 → 重新提取 token / 补充 section，直到达标。

```

- [ ] **Step 2: 不单独提交，与 Task 2-4、6 一起提交**

---

## Task 6: 在核心提醒新增一条 + 在前置问询清单新增一项

**Files:**
- Modify: `skills/harness-design/SKILL.md:817`（核心提醒末尾）
- Modify: `skills/harness-design/references/workflow.md`（必问清单）

- [ ] **Step 1: 在 SKILL.md 核心提醒列表末尾（最后一条 `手写 Stage / Sprite...` 之后）新增一条**

在 SKILL.md 末尾 `- **手写 Stage / Sprite**...` 那一行之后追加：

```markdown
- **生成 DESIGN.md（可选）**：用户在需求确认阶段选择「是」时执行。HTML 验证通过后从实际代码反向提取 token（颜色/字体/圆角/间距），合并 brand-spec.md 信息，按 `references/design-md-spec.md` 的 9 section + YAML frontmatter 模板生成，写入项目根目录。
```

- [ ] **Step 2: 在 references/workflow.md 的必问清单中新增「DESIGN.md 输出」类问题**

定位 `references/workflow.md` 中 `### 5. 问题专属（至少4个）` section。在它**之前**插入新的 section：

```markdown
### 5. DESIGN.md 输出（harness-design 专属）

- 是否需要我同步生成 DESIGN.md（设计系统规范文件）？
- 这个文件可被其他 AI agent 读取，用来生成与本项目视觉风格一致的 UI
- 如果不需要，跳过；如果需要，HTML 验证通过后自动生成

> 默认问，用户答"不需要"则跳过；用户答"需要"或"好"则在交付阶段触发。
> 详见 `references/design-md-spec.md`。

```

并将原来的 `### 5. 问题专属` 改为 `### 6. 问题专属`。

- [ ] **Step 3: 提交所有 SKILL.md 和 workflow.md 改动**

```bash
git add skills/harness-design/SKILL.md skills/harness-design/references/workflow.md
git commit -m "feat(harness-design): SKILL.md 集成 DESIGN.md 生成能力（5 处改动）"
```

---

## Task 7: 最终验证（对照 Contract Definition of Done）

**Files:**
- Verify: 所有改动文件

- [ ] **Step 1: 验证 references/design-md-spec.md 已创建且包含 9 个 section**

```bash
test -f /Users/arwen/Desktop/Arwen/evanfang/superpowers/skills/harness-design/references/design-md-spec.md && \
grep -c "^### [0-9]\." /Users/arwen/Desktop/Arwen/evanfang/superpowers/skills/harness-design/references/design-md-spec.md
```
Expected: 输出 `9`

- [ ] **Step 2: 验证 SKILL.md 5 处改动到位**

```bash
# 改动 1: frontmatter 包含 DESIGN.md 关键词
grep -c "DESIGN.md" /Users/arwen/Desktop/Arwen/evanfang/superpowers/skills/harness-design/SKILL.md
# Expected: ≥ 4（frontmatter + 协议补充 + 路由表 + 工作流 + 核心提醒）

# 改动 2: brand-spec.md 模板本身未被修改
# 定位 SKILL.md 中 brand-spec.md 模板代码块内的关键字段
grep -c "Logo" /Users/arwen/Desktop/Arwen/evanfang/superpowers/skills/harness-design/SKILL.md
# Expected: 保持原有数量（品牌资产协议的 Logo 字段未删除）

# 改动 3: 路由表新增 DESIGN.md 行
grep -c "生成 DESIGN.md" /Users/arwen/Desktop/Arwen/evanfang/superpowers/skills/harness-design/SKILL.md
# Expected: ≥ 1

# 改动 4: 工作流末尾步骤
grep -c "工作流末尾 · 生成 DESIGN.md" /Users/arwen/Desktop/Arwen/evanfang/superpowers/skills/harness-design/SKILL.md
# Expected: 1

# 改动 5: 核心提醒新增
grep -c "生成 DESIGN.md（可选）" /Users/arwen/Desktop/Arwen/evanfang/superpowers/skills/harness-design/SKILL.md
# Expected: 1
```

- [ ] **Step 3: 验证 brand-spec.md 模板内容未被修改**

```bash
# 检查 SKILL.md 中 brand-spec.md 模板的关键字段仍在
grep -c "## 🎯 核心资产（一等公民）" /Users/arwen/Desktop/Arwen/evanfang/superpowers/skills/harness-design/SKILL.md
# Expected: 1

grep -c "## 🎨 辅助资产" /Users/arwen/Desktop/Arwen/evanfang/superpowers/skills/harness-design/SKILL.md
# Expected: 1
```

- [ ] **Step 4: 验证无品牌场景下也能独立生成 DESIGN.md**

读 `references/design-md-spec.md`，确认其中描述了「从 HTML 代码反向提取 token」的独立流程，不依赖 brand-spec.md 存在。具体检查：

```bash
grep -c "从 HTML 反向提取 Token 的流程" /Users/arwen/Desktop/Arwen/evanfang/superpowers/skills/harness-design/references/design-md-spec.md
# Expected: 1
```

- [ ] **Step 5: 最终提交（如有未提交的修复）**

```bash
git status
# 如有未提交的修复，commit；否则跳过
```

---

## Self-Review Checklist

实施完成后对照 spec 逐项核对：

- [x] **Spec §1 新增 references/design-md-spec.md** → Task 1
- [x] **Spec §2.1 前置问询** → Task 6 Step 2（修改 references/workflow.md）
- [x] **Spec §2.2 核心资产协议 Step 5 后补说明** → Task 3
- [x] **Spec §2.3 References 路由表新增一行** → Task 4
- [x] **Spec §2.4 工作流末尾新增步骤** → Task 5
- [x] **Spec §2.5 核心提醒新增一条** → Task 6 Step 1
- [x] **Spec 不做的事**：不修改 brand-spec.md 模板本身 → Task 7 Step 3 验证
- [x] **Contract DoD #1**：design-md-spec.md 包含 YAML + 9 section → Task 7 Step 1
- [x] **Contract DoD #2**：SKILL.md 5 处改动 → Task 7 Step 2
- [x] **Contract DoD #3**：brand-spec.md 模板未修改 → Task 7 Step 3
- [x] **Contract DoD #4**：无 brand-spec.md 场景仍可独立生成 → Task 7 Step 4
- [x] **Contract DoD #5**：frontmatter description 更新 → Task 2

---

## 执行说明

**Plan complete and saved to `docs/superpowers/plans/2026-06-05-design-md-generation.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — 我每个 task 派一个 fresh subagent 执行，task 之间做 review，迭代快

**2. Inline Execution** — 在当前会话内批量执行，关键节点检查

**Which approach?**
