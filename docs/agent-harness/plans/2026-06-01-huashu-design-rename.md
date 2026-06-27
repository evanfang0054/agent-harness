# huashu-design → design 重命名 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use agent-harness:subagent-driven-development (recommended) or agent-harness:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 skill `huashu-design` 重命名为 `design`，删除所有"花叔Design"品牌引用。

**Architecture:** 目录重命名 + 全局文本替换。保留外部 GitHub release URL 不变（那些是已发布的资源地址）。

**Tech Stack:** git mv, sed/编辑工具

---

### Task 1: 重命名目录

**Files:**
- Move: `skills/huashu-design/` → `skills/design/`

- [ ] **Step 1: git mv 重命名目录**

```bash
cd /Users/arwen/Desktop/Arwen/evanfang/agent-harness
git mv skills/huashu-design skills/design
```

- [ ] **Step 2: 验证目录结构完整**

```bash
ls skills/design/SKILL.md skills/design/README.md skills/design/README.en.md skills/design/assets/banner.svg
```

Expected: 所有文件存在

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "refactor: rename skills/huashu-design to skills/design"
```

---

### Task 2: 更新 SKILL.md

**Files:**
- Modify: `skills/design/SKILL.md`

- [ ] **Step 1: 修改 name 字段**

Line 2: `name: huashu-design` → `name: design`

- [ ] **Step 2: 删除标题中的花叔Design**

Line 6: `# 花叔Design · Huashu-Design` → `# Design`

- [ ] **Step 3: 删除 description 中的花叔Design**

Line 3 的 description 字段：移除"花叔Design"相关内容，保留描述核心功能的文本。先读取该行完整内容再决定替换。

- [ ] **Step 4: 处理其余 huashu-design 引用**

Line 744: `huashu-design hero v9` → `design hero v9`

- [ ] **Step 5: 处理其余花叔引用**

- Line 73: 读取完整内容，删除"花叔Design"
- Line 174: `花叔原话` → 删除或改为通用引用
- Line 192: `花叔的哲学` → 改为通用表述
- Line 286: `花叔原话` → 删除或改为通用引用

- [ ] **Step 6: Commit**

```bash
git add skills/design/SKILL.md
git commit -m "refactor: update SKILL.md name and remove 花叔Design branding"
```

---

### Task 3: 更新 README.md

**Files:**
- Modify: `skills/design/README.md`

- [ ] **Step 1: 替换 huashu-design 引用**

所有 `huashu-design` → `design`（约 13 处），但保留外部 GitHub release URL 中的 `alchaincyf/huashu-design` 不变（那是已发布的资源地址）。

- [ ] **Step 2: 处理花叔品牌区域**

Line 274: `## Connect · 花生（花叔）` → `## Connect`
Lines 281-284: 社交媒体表格中的"花叔"→ 改为通用标签或删除整个 Connect 区域（取决于是否保留作者署名）

- [ ] **Step 3: Commit**

```bash
git add skills/design/README.md
git commit -m "refactor: update README.md references and remove branding"
```

---

### Task 4: 更新 README.en.md

**Files:**
- Modify: `skills/design/README.en.md`

- [ ] **Step 1: 替换 huashu-design 引用**

所有 `huashu-design` → `design`（约 16 处），保留外部 GitHub release URL 不变。

- [ ] **Step 2: 处理花叔品牌区域**

Lines 294-297: 社交媒体表格中的"花叔"→ 同 README.md 处理方式。

- [ ] **Step 3: Commit**

```bash
git add skills/design/README.en.md
git commit -m "refactor: update README.en.md references and remove branding"
```

---

### Task 5: 更新 references/*.md

**Files:**
- Modify: `skills/design/references/apple-gallery-showcase.md`
- Modify: `skills/design/references/audio-design-rules.md`
- Modify: `skills/design/references/hero-animation-case-study.md`
- Modify: `skills/design/references/sfx-library.md`
- Modify: `skills/design/references/animation-best-practices.md`

- [ ] **Step 1: 替换 huashu-design 引用**

在以下文件中将 `huashu-design` → `design`：
- `apple-gallery-showcase.md` (2 处)
- `audio-design-rules.md` (5 处)
- `hero-animation-case-study.md` (3 处)
- `sfx-library.md` (1 处)

- [ ] **Step 2: 替换花叔引用**

- `audio-design-rules.md` line 4: `花叔` → 删除或通用化
- `animation-best-practices.md` line 502: `花叔项目目录` → 通用化
- `sfx-library.md` line 4: `花叔动画` → `动画`

- [ ] **Step 3: Commit**

```bash
git add skills/design/references/
git commit -m "refactor: update references to use design naming"
```

---

### Task 6: 更新 demos 和 assets

**Files:**
- Modify: `skills/design/assets/banner.svg`
- Modify: `skills/design/demos/c1-ios-prototype-en.html`
- Modify: `skills/design/demos/c1-ios-prototype.html`
- Modify: `skills/design/demos/c3-motion-design-en.html`
- Modify: `skills/design/demos/c3-motion-design.html`
- Modify: `skills/design/demos/hero-animation-v10-en.html`

- [ ] **Step 1: 更新 banner.svg**

Line 113: `huashu-design` → `design`

- [ ] **Step 2: 更新 demo HTML title 标签**

- `c1-ios-prototype-en.html` line 5: title 中 `huashu-design` → `design`
- `c1-ios-prototype.html` line 5: title 中 `huashu-design` → `design`
- `c3-motion-design-en.html` line 5: title 中 `huashu-design` → `design`
- `c3-motion-design.html` line 5: title 中 `huashu-design` → `design`

- [ ] **Step 3: 更新 hero-animation-v10-en.html**

- Line 944: `huasheng.ai/huashu-design-hero` → 保留或更新（这是品牌 URL，视情况决定）
- Line 1119: `/huashu-design 做一份发布会PPT` → `/design 做一份发布会PPT`

- [ ] **Step 4: Commit**

```bash
git add skills/design/assets/ skills/design/demos/
git commit -m "refactor: update demos and assets references"
```

---

### Task 7: 更新项目根目录文件

**Files:**
- Modify: `RELEASE-NOTES.md`

- [ ] **Step 1: 更新 RELEASE-NOTES.md**

Line 7: `新增/huashu-design skill` → `新增/design skill`

- [ ] **Step 2: Commit**

```bash
git add RELEASE-NOTES.md
git commit -m "refactor: update RELEASE-NOTES.md reference"
```

---

### Task 8: 全局验证

- [ ] **Step 1: 验证无残留 huashu-design 引用**

```bash
grep -r "huashu-design" skills/design/ RELEASE-NOTES.md --include="*.md" --include="*.html" --include="*.svg" | grep -v "alchaincyf/huashu-design"
```

Expected: 0 results（排除外部 GitHub URL）

- [ ] **Step 2: 验证无残留花叔引用**

```bash
grep -r "花叔" skills/design/ --include="*.md"
```

Expected: 0 results

- [ ] **Step 3: 验证目录结构完整**

```bash
ls skills/design/SKILL.md skills/design/README.md skills/design/README.en.md
ls skills/design/references/ skills/design/demos/ skills/design/assets/
```

Expected: 所有文件和目录存在
